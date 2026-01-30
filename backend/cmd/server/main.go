package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/api"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/config"
	"github.com/jferrl/anklyze/internal/database"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/llm"
	"github.com/jferrl/anklyze/internal/logger"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/repository/postgres"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/storage"
	"github.com/joho/godotenv"

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

	cfg := config.Load()

	// Initialize logger
	logger.Setup(logger.Config{
		Level:  cfg.LogLevel,
		Format: cfg.LogFormat,
	})

	ctx := context.Background()

	var auditRepo api.AuditRepository
	var analyticsRepo api.AnalyticsRepository
	var chatAuditRepo api.ChatAuditRepository
	var chatAnalyticsRepo api.ChatAnalyticsRepository
	var userRepo auth.UserRepository
	var studyRepo repository.StudyRepository
	var studyResponseRepo repository.StudyResponseRepository
	var studyAnalyticsRepo repository.StudyAnalyticsRepository

	if cfg.HasDatabase() {
		db, err := database.Connect(cfg.DatabaseURL)
		if err != nil {
			slog.Warn("database connection failed, audit disabled", "error", err)
			auditRepo = repository.NewNoOpAuditRepository()
			analyticsRepo = repository.NewNoOpAnalyticsRepository()
			chatAuditRepo = repository.NewNoOpChatAuditRepository()
			chatAnalyticsRepo = repository.NewNoOpChatAnalyticsRepository()
			userRepo = repository.NewNoOpUserRepository()
			studyRepo = repository.NewNoOpStudyRepository()
			studyResponseRepo = repository.NewNoOpStudyResponseRepository()
			studyAnalyticsRepo = repository.NewNoOpStudyAnalyticsRepository()
		} else {
			if err := db.AutoMigrate(
				&domain.AuditEntry{},
				&domain.ChatSession{},
				&domain.ChatMessage{},
				&domain.ChatFeedback{},
				&domain.User{},
				&domain.Study{},
				&domain.StudyImage{},
				&domain.StudyResponse{},
				&domain.StudyUser{},
			); err != nil {
				slog.Warn("database migration failed", "error", err)
			}
			slog.Info("database connected, audit trail and analytics enabled")
			auditRepo = postgres.NewAuditRepository(db, cfg.AuditBufferSize)
			analyticsRepo = postgres.NewAnalyticsRepository(db)
			chatAuditRepo = postgres.NewChatAuditRepository(db, cfg.AuditBufferSize)
			chatAnalyticsRepo = postgres.NewChatAnalyticsRepository(db)
			userRepo = postgres.NewUserRepository(db)
			studyRepo = postgres.NewStudyRepository(db)
			studyResponseRepo = postgres.NewStudyResponseRepository(db, cfg.AuditBufferSize)
			studyAnalyticsRepo = postgres.NewStudyAnalyticsRepository(db)
		}
	} else {
		slog.Info("no DATABASE_URL configured, audit trail disabled")
		auditRepo = repository.NewNoOpAuditRepository()
		analyticsRepo = repository.NewNoOpAnalyticsRepository()
		chatAuditRepo = repository.NewNoOpChatAuditRepository()
		chatAnalyticsRepo = repository.NewNoOpChatAnalyticsRepository()
		userRepo = repository.NewNoOpUserRepository()
		studyRepo = repository.NewNoOpStudyRepository()
		studyResponseRepo = repository.NewNoOpStudyResponseRepository()
		studyAnalyticsRepo = repository.NewNoOpStudyAnalyticsRepository()
	}

	// Initialize chat service if Gemini is configured
	var chatService service.ChatService
	if cfg.HasGemini() {
		llmClient, err := llm.NewClient(ctx, cfg.GeminiAPIKey, cfg.GeminiModel)
		if err != nil {
			slog.Warn("Gemini client creation failed, chat disabled", "error", err)
		} else {
			ruleEngine := rules.NewEngine()
			classifier := service.NewClassifierService(ruleEngine)
			chatService = service.NewChatService(llmClient, classifier)
			slog.Info("Gemini configured, chat classification enabled")
		}
	} else {
		slog.Info("no GEMINI_API_KEY configured, chat classification disabled")
	}

	// Initialize Supabase Auth validator if configured
	var authValidator *auth.Validator
	if cfg.HasSupabase() {
		var opts []auth.ValidatorOption
		if cfg.SupabaseJWTSecret != "" {
			opts = append(opts, auth.WithJWTSecret(cfg.SupabaseJWTSecret))
		}

		validator, err := auth.NewValidator(ctx, cfg.SupabaseURL, opts...)
		if err != nil {
			slog.Warn("Supabase auth initialization failed, authentication disabled", "error", err)
		} else {
			authValidator = validator
			slog.Info("Supabase authentication enabled", "url", cfg.SupabaseURL)
		}
	} else {
		slog.Info("no SUPABASE_URL configured, authentication disabled (all routes public)")
	}

	// Initialize storage
	var studyStorage storage.Storage
	if cfg.HasSupabaseStorage() {
		studyStorage = storage.NewSupabaseStorage(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey, cfg.StudyBucketName)
		slog.Info("Supabase storage enabled", "bucket", cfg.StudyBucketName)
	} else {
		studyStorage = storage.NewNoOpStorage()
		slog.Info("no SUPABASE_SERVICE_ROLE_KEY configured, study image storage disabled")
	}

	router := gin.Default()
	api.SetupRoutes(router, cfg, authValidator, userRepo, auditRepo, analyticsRepo, chatService, chatAuditRepo, chatAnalyticsRepo)
	api.SetupStudyRoutes(router, authValidator, userRepo, studyRepo, studyResponseRepo, studyAnalyticsRepo, studyStorage)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		slog.Info("server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed to start", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("shutting down server...")

	// Give outstanding requests 5 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}

	// Close audit repositories to flush pending writes
	if err := auditRepo.Close(); err != nil {
		slog.Error("failed to close audit repository", "error", err)
	}
	if err := chatAuditRepo.Close(); err != nil {
		slog.Error("failed to close chat audit repository", "error", err)
	}
	if err := studyResponseRepo.Close(); err != nil {
		slog.Error("failed to close study response repository", "error", err)
	}

	// Close auth validator
	if authValidator != nil {
		if err := authValidator.Close(); err != nil {
			slog.Error("failed to close auth validator", "error", err)
		}
	}

	slog.Info("server exited")
}
