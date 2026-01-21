package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/api"
	"github.com/jferrl/anklyze/internal/config"
	"github.com/jferrl/anklyze/internal/database"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/llm"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/repository/postgres"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"

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
	cfg := config.Load()

	ctx := context.Background()

	var auditRepo api.AuditRepository
	var analyticsRepo api.AnalyticsRepository
	var chatAuditRepo api.ChatAuditRepository
	var chatAnalyticsRepo api.ChatAnalyticsRepository

	if cfg.HasDatabase() {
		db, err := database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Printf("WARN: database connection failed, audit disabled: %v", err)
			auditRepo = repository.NewNoOpAuditRepository()
			analyticsRepo = repository.NewNoOpAnalyticsRepository()
			chatAuditRepo = repository.NewNoOpChatAuditRepository()
			chatAnalyticsRepo = repository.NewNoOpChatAnalyticsRepository()
		} else {
			if err := db.AutoMigrate(
				&domain.AuditEntry{},
				&domain.ChatSession{},
				&domain.ChatMessage{},
				&domain.ChatFeedback{},
			); err != nil {
				log.Printf("WARN: database migration failed: %v", err)
			}
			log.Println("Database connected, audit trail and analytics enabled")
			auditRepo = postgres.NewAuditRepository(db, cfg.AuditBufferSize)
			analyticsRepo = postgres.NewAnalyticsRepository(db)
			chatAuditRepo = postgres.NewChatAuditRepository(db, cfg.AuditBufferSize)
			chatAnalyticsRepo = postgres.NewChatAnalyticsRepository(db)
		}
	} else {
		log.Println("No DATABASE_URL configured, audit trail disabled")
		auditRepo = repository.NewNoOpAuditRepository()
		analyticsRepo = repository.NewNoOpAnalyticsRepository()
		chatAuditRepo = repository.NewNoOpChatAuditRepository()
		chatAnalyticsRepo = repository.NewNoOpChatAnalyticsRepository()
	}

	// Initialize chat service if Gemini is configured
	var chatService service.ChatService
	if cfg.HasGemini() {
		llmClient, err := llm.NewClient(ctx, cfg.GeminiAPIKey, cfg.GeminiModel)
		if err != nil {
			log.Printf("WARN: Gemini client creation failed, chat disabled: %v", err)
		} else {
			ruleEngine := rules.NewEngine()
			classifier := service.NewClassifierService(ruleEngine)
			chatService = service.NewChatService(llmClient, classifier)
			log.Println("Gemini configured, chat classification enabled")
		}
	} else {
		log.Println("No GEMINI_API_KEY configured, chat classification disabled")
	}

	router := gin.Default()
	api.SetupRoutes(router, cfg, auditRepo, analyticsRepo, chatService, chatAuditRepo, chatAnalyticsRepo)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Error starting server: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Give outstanding requests 5 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	// Close audit repositories to flush pending writes
	if err := auditRepo.Close(); err != nil {
		log.Printf("Error closing audit repository: %v", err)
	}
	if err := chatAuditRepo.Close(); err != nil {
		log.Printf("Error closing chat audit repository: %v", err)
	}

	log.Println("Server exited")
}
