package main

import (
	"log"

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

// @host api.anklyze.com
// @BasePath /
// @schemes https

func main() {
	cfg := config.Load()

	var auditRepo repository.AuditRepository
	var analyticsRepo repository.AnalyticsRepository

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
			auditRepo = postgres.NewAuditRepository(db, 100)
			analyticsRepo = postgres.NewAnalyticsRepository(db)
		}
	} else {
		log.Println("No DATABASE_URL configured, audit trail disabled")
		auditRepo = repository.NewNoOpAuditRepository()
		analyticsRepo = repository.NewNoOpAnalyticsRepository()
	}

	router := gin.Default()
	api.SetupRoutes(router, auditRepo, analyticsRepo)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
