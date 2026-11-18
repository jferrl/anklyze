// Package main is the main package for the Anklyze API server.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/api"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/config"
	"github.com/jferrl/anklyze/internal/database"
	"github.com/jferrl/anklyze/internal/logger"
	"github.com/jferrl/anklyze/internal/repository/postgres"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/storage"
	"github.com/jferrl/anklyze/internal/supabase"
	"github.com/jferrl/anklyze/migrations"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if present (for local development)
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid configuration", "error", err)
		os.Exit(1)
	}

	if cfg.IsProduction() {
		if err := cfg.ValidateProduction(); err != nil {
			slog.Error("production security requirements not met — refusing to start", "error", err)
			os.Exit(1)
		}
		slog.Info("production security validation passed")
	}

	// Initialize logger
	logger.Setup(logger.Config{
		Level:  cfg.LogLevel,
		Format: cfg.LogFormat,
	})

	// Initialize Supabase Auth Admin for syncing roles to app_metadata
	var authAdmin *supabase.AuthAdmin
	if cfg.HasSupabase() && cfg.SupabaseServiceRoleKey != "" {
		authAdmin = supabase.NewAuthAdmin(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
		slog.Info("Supabase auth admin enabled for role syncing")
	}

	// The server never runs without a database: a no-op fallback would accept
	// writes and silently drop them.
	if !cfg.HasDatabase() {
		slog.Error("DATABASE_URL is not set — refusing to start")
		os.Exit(1)
	}
	// ~25s of backoff covers Postgres starting slightly after the server.
	db, err := database.ConnectWithRetry(cfg.DatabaseURL, database.PoolConfig{
		MaxOpenConns: cfg.DBMaxOpenConns,
		MaxIdleConns: cfg.DBMaxIdleConns,
	}, 6, time.Second, 10*time.Second)
	if err != nil {
		slog.Error("database connection failed — refusing to start", "error", err)
		os.Exit(1)
	}
	if err := database.RunMigrations(migrations.FS, cfg.DatabaseURL); err != nil {
		slog.Error("database migration failed", "error", err)
		os.Exit(1)
	}
	slog.Info("database connected")
	auditRepo := postgres.NewAuditRepository(db, cfg.AuditBufferSize)
	analyticsRepo := postgres.NewAnalyticsRepository(db)
	userRepo := postgres.NewUserRepository(db)
	caseRepo := postgres.NewCaseRepository(db)
	caseResponseRepo := postgres.NewCaseResponseRepository(db)
	caseAnalyticsRepo := postgres.NewCaseAnalyticsRepository(db)
	studyRepo := postgres.NewStudyRepository(db)
	studyResponseRepo := postgres.NewStudyResponseRepository(db)

	// Create user service that orchestrates DB and Supabase operations
	userService := service.NewUserService(userRepo, authAdmin)

	// Initialize classification service (wraps rule engine with caching hook and service boundary)
	ruleEngine := rules.NewEngine()
	classificationService := service.NewClassificationService(ruleEngine, caseResponseRepo)

	ctx := context.Background()
	authValidator, err := initAuth(ctx, cfg)
	if err != nil {
		slog.Error("auth initialization failed, refusing to start", "error", err)
		os.Exit(1)
	}

	// JWKS endpoint reachability probe (production only)
	jwksReady := &atomic.Bool{}
	jwksReady.Store(true) // default: ready (non-production or no auth)

	var probeCancel context.CancelFunc
	if cfg.IsProduction() && authValidator != nil {
		jwksURL := cfg.SupabaseURL + "/auth/v1/.well-known/jwks.json"
		if err := auth.ProbeJWKS(ctx, jwksURL); err != nil {
			jwksReady.Store(false)
			slog.Warn("JWKS endpoint unreachable at startup — auth may reject tokens until resolved",
				"url", jwksURL, "error", err)
			// Create a cancellable context for the retry goroutine
			probeCtx, cancel := context.WithCancel(context.Background())
			probeCancel = cancel
			go auth.RetryJWKSProbe(probeCtx, jwksURL, jwksReady)
		} else {
			slog.Info("JWKS endpoint reachable", "url", jwksURL)
		}
	}

	// Initialize storage
	var caseStorage storage.Storage
	if cfg.HasS3Storage() {
		s3Storage, err := storage.NewS3Storage(cfg.S3Endpoint, cfg.S3AccessKey, cfg.S3SecretKey, cfg.StudyBucketName, cfg.S3UseSSL)
		if err != nil {
			slog.Error("failed to initialize S3 storage", "error", err)
			if probeCancel != nil {
				probeCancel()
			}
			os.Exit(1)
		}
		caseStorage = s3Storage
		slog.Info("S3 storage enabled", "endpoint", cfg.S3Endpoint, "bucket", cfg.StudyBucketName)
	} else {
		caseStorage = storage.NewNoOpStorage()
		slog.Info("no storage configured, case image storage disabled")
	}

	// Initialize statistics service for reliability metrics
	statsService := service.NewStatisticsService()

	// Initialize TTL cache for study reliability metrics (5-minute TTL).
	// Avoids recalculating kappa on every page load for the same study.
	statsCache := service.NewTTLStatsCache(5 * time.Minute)

	// Initialize study service — orchestrates case-study relationships, response validation,
	// reliability metrics, and divergence analysis.
	studyService := service.NewStudyService(studyRepo, studyResponseRepo, caseRepo, caseResponseRepo, statsService, statsService, statsCache)

	slog.Info("server starting", "port", cfg.Port)

	router := gin.Default()
	api.SetupRoutes(router, cfg, authValidator, userService, auditRepo, analyticsRepo, classificationService, jwksReady)
	api.SetupCaseRoutes(router, authValidator, userService, userRepo, caseRepo, caseResponseRepo, caseAnalyticsRepo, studyService, caseStorage, statsService)
	api.SetupStudyRoutes(router, authValidator, userService, userRepo, studyRepo, studyResponseRepo, caseRepo, studyService)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      60 * time.Second, // Prevent slow responses from holding connections
	}

	// Start server in goroutine with error channel pattern (Uber Go Style Guide)
	errChan := make(chan error, 1)
	go func() {
		errChan <- srv.ListenAndServe()
	}()

	// Check for immediate startup errors (e.g., port already in use)
	select {
	case err := <-errChan:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed to start", "error", err)
			return
		}
	case <-time.After(100 * time.Millisecond):
		slog.Info("server started successfully", "port", cfg.Port)
	}

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Wait for either shutdown signal or server error
	select {
	case <-quit:
		slog.Info("shutting down server...")
	case err := <-errChan:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "error", err)
		}
	}

	// Give outstanding requests 5 seconds to complete
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}

	// Close audit repositories to flush pending writes
	if err := auditRepo.Close(); err != nil {
		slog.Error("failed to close audit repository", "error", err)
	}
	// Stop JWKS retry probe goroutine if running
	if probeCancel != nil {
		probeCancel()
	}

	// Close auth validator
	if authValidator != nil {
		if err := authValidator.Close(); err != nil {
			slog.Error("failed to close auth validator", "error", err)
		}
	}

	// Close database connection pool
	slog.Info("closing database connection")
	if sqlDB, err := db.DB(); err != nil {
		slog.Error("failed to get sql.DB for closing", "error", err)
	} else if err := sqlDB.Close(); err != nil {
		slog.Error("failed to close database", "error", err)
	}

	slog.Info("server exited")
}
