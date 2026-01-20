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
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/repository/postgres"

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

	var auditRepo api.AuditRepository
	var analyticsRepo api.AnalyticsRepository

	if cfg.HasDatabase() {
		db, err := database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Printf("WARN: database connection failed, audit disabled: %v", err)
			auditRepo = repository.NewNoOpAuditRepository()
			analyticsRepo = repository.NewNoOpAnalyticsRepository()
		} else {
			if err := db.AutoMigrate(&domain.AuditEntry{}); err != nil {
				log.Printf("WARN: database migration failed: %v", err)
			}
			log.Println("Database connected, audit trail and analytics enabled")
			auditRepo = postgres.NewAuditRepository(db, cfg.AuditBufferSize)
			analyticsRepo = postgres.NewAnalyticsRepository(db)
		}
	} else {
		log.Println("No DATABASE_URL configured, audit trail disabled")
		auditRepo = repository.NewNoOpAuditRepository()
		analyticsRepo = repository.NewNoOpAnalyticsRepository()
	}

	router := gin.Default()
	api.SetupRoutes(router, cfg, auditRepo, analyticsRepo)

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

	// Close audit repository to flush pending writes
	if err := auditRepo.Close(); err != nil {
		log.Printf("Error closing audit repository: %v", err)
	}

	log.Println("Server exited")
}
