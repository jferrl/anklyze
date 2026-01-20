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
)

func main() {
	cfg := config.Load()

	var auditRepo repository.AuditRepository

	if cfg.HasDatabase() {
		db, err := database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Printf("WARN: database connection failed, audit disabled: %v", err)
			auditRepo = repository.NewNoOpAuditRepository()
		} else {
			if err := db.AutoMigrate(&domain.AuditEntry{}); err != nil {
				log.Printf("WARN: database migration failed: %v", err)
			}
			log.Println("Database connected, audit trail enabled")
			auditRepo = postgres.NewAuditRepository(db, 100)
		}
	} else {
		log.Println("No DATABASE_URL configured, audit trail disabled")
		auditRepo = repository.NewNoOpAuditRepository()
	}

	router := gin.Default()
	api.SetupRoutes(router, auditRepo)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
