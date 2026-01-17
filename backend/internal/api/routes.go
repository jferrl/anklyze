package api

import (
	"github.com/gin-gonic/gin"
	"github.com/jferrl/fratures/internal/rules"
	"github.com/jferrl/fratures/internal/service"
)

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.Engine) {
	// Initialize dependencies
	ruleEngine := rules.NewEngine()
	classifier := service.NewClassifierService(ruleEngine)
	handler := NewHandler(classifier)

	// CORS middleware
	router.Use(CORSMiddleware())

	// Health check
	router.GET("/health", handler.HealthCheck)

	// API routes
	api := router.Group("/api")
	{
		api.POST("/classify", handler.ClassifyFracture)
		api.GET("/options", handler.GetOptions)
	}
}

// CORSMiddleware handles Cross-Origin Resource Sharing
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
