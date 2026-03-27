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
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/repository/postgres"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/storage"
	"github.com/jferrl/anklyze/internal/supabase"
	"github.com/jferrl/anklyze/migrations"
	"github.com/joho/godotenv"
	"gorm.io/gorm"

	_ "github.com/jferrl/anklyze/docs"
)

// @title Anklyze API
// @version 1.0
// @description Ankle fracture classification API. Classifies fractures according to Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek systems.

// @contact.name API Support
// @contact.url https://github.com/jferrl/anklyze

// @license.name Apache 2.0
// @license.url https://opensource.org/licenses/MIT

// @host api.anklyze.es
// @BasePath /
// @schemes https

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

	var auditRepo api.AuditRepository
	var analyticsRepo api.AnalyticsRepository
	var userRepo repository.UserRepository
	var caseRepo repository.CaseRepository
	var caseResponseRepo repository.CaseResponseRepository
	var caseAnalyticsRepo repository.CaseAnalyticsRepository
	var studyRepo repository.StudyRepository
	var studyResponseRepo repository.StudyResponseRepository

	// Database connection (captured for shutdown)
	var db *gorm.DB

	// dbHealthy tracks whether the database connection succeeded at startup.
	// Used to report degraded mode in the /health endpoint.
	var dbHealthy bool

	// Initialize Supabase Auth Admin for syncing roles to app_metadata
	var authAdmin *supabase.AuthAdmin
	if cfg.HasSupabase() && cfg.SupabaseServiceRoleKey != "" {
		authAdmin = supabase.NewAuthAdmin(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
		slog.Info("Supabase auth admin enabled for role syncing")
	}

	if cfg.HasDatabase() {
		var err error
		db, err = database.Connect(cfg.DatabaseURL)
		if err != nil {
			slog.Warn("database connection failed, running in degraded mode (NoOp repositories)", "error", err)
			dbHealthy = false
			auditRepo, analyticsRepo, userRepo, caseRepo, caseResponseRepo, caseAnalyticsRepo, studyRepo, studyResponseRepo = initNoOpRepositories()
		} else {
			if err := database.RunMigrations(migrations.FS, cfg.DatabaseURL); err != nil {
				slog.Error("database migration failed", "error", err)
				os.Exit(1)
			}
			dbHealthy = true
			slog.Info("database connected, audit trail and analytics enabled")
			auditRepo = postgres.NewAuditRepository(db, cfg.AuditBufferSize)
			analyticsRepo = postgres.NewAnalyticsRepository(db)
			userRepo = postgres.NewUserRepository(db)
			caseRepo = postgres.NewCaseRepository(db)
			caseResponseRepo = postgres.NewCaseResponseRepository(db, cfg.AuditBufferSize)
			caseAnalyticsRepo = postgres.NewCaseAnalyticsRepository(db)
			studyRepo = postgres.NewStudyRepository(db)
			studyResponseRepo = postgres.NewStudyResponseRepository(db)
		}
	} else {
		slog.Info("no DATABASE_URL configured, running in degraded mode (NoOp repositories)")
		dbHealthy = false
		auditRepo, analyticsRepo, userRepo, caseRepo, caseResponseRepo, caseAnalyticsRepo, studyRepo, studyResponseRepo = initNoOpRepositories()
	}

	// Create user service that orchestrates DB and Supabase operations
	userService := service.NewUserService(userRepo, authAdmin)

	// Initialize classification service (wraps rule engine with caching hook and service boundary)
	ruleEngine := rules.NewEngine()
	classificationService := service.NewClassificationService(ruleEngine, caseResponseRepo)

	// Initialize Supabase Auth validator if configured
	ctx := context.Background()
	var authValidator *auth.Validator
	if cfg.HasSupabase() {
		validator, err := auth.NewValidator(ctx, cfg.SupabaseURL)
		if err != nil {
			slog.Warn("Supabase auth initialization failed, authentication disabled", "error", err)
		} else {
			authValidator = validator
			slog.Info("Supabase authentication enabled", "url", cfg.SupabaseURL)
		}
	} else {
		slog.Info("no SUPABASE_URL configured, authentication disabled (all routes public)")
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
	studyService := service.NewStudyService(studyRepo, studyResponseRepo, caseRepo, caseResponseRepo, statsService, statsCache)

	dbStatus := "connected"
	if !dbHealthy {
		dbStatus = "degraded (NoOp)"
	}

	slog.Info("server starting", "port", cfg.Port, "db_status", dbStatus)

	router := gin.Default()
	api.SetupRoutes(router, cfg, authValidator, userService, auditRepo, analyticsRepo, classificationService, dbHealthy, jwksReady)
	responseHandler := api.SetupCaseRoutes(router, authValidator, userService, userRepo, caseRepo, caseResponseRepo, caseAnalyticsRepo, studyService, caseStorage, statsService)
	api.SetupStudyRoutes(router, authValidator, userService, studyRepo, studyResponseRepo, caseRepo, studyService)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
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

	// Wait for background goroutines in response handler to finish
	responseHandler.Close()

	// Close audit repositories to flush pending writes
	if err := auditRepo.Close(); err != nil {
		slog.Error("failed to close audit repository", "error", err)
	}
	if err := caseResponseRepo.Close(); err != nil {
		slog.Error("failed to close case response repository", "error", err)
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
	if db != nil {
		slog.Info("closing database connection")
		sqlDB, err := db.DB()
		if err != nil {
			slog.Error("failed to get sql.DB for closing", "error", err)
		} else if err := sqlDB.Close(); err != nil {
			slog.Error("failed to close database", "error", err)
		}
	}

	slog.Info("server exited")
}

// initNoOpRepositories creates all NoOp repository implementations for degraded mode.
func initNoOpRepositories() (
	api.AuditRepository,
	api.AnalyticsRepository,
	repository.UserRepository,
	repository.CaseRepository,
	repository.CaseResponseRepository,
	repository.CaseAnalyticsRepository,
	repository.StudyRepository,
	repository.StudyResponseRepository,
) {
	return repository.NewNoOpAuditRepository(),
		repository.NewNoOpAnalyticsRepository(),
		repository.NewNoOpUserRepository(),
		repository.NewNoOpCaseRepository(),
		repository.NewNoOpCaseResponseRepository(),
		repository.NewNoOpCaseAnalyticsRepository(),
		repository.NewNoOpStudyRepository(),
		repository.NewNoOpStudyResponseRepository()
}
