package api

import (
	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/config"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// SetupRoutes configures all API routes
func SetupRoutes(
	router *gin.Engine,
	cfg *config.Config,
	auditRepo AuditRepository,
	analyticsRepo AnalyticsRepository,
	chatService service.ChatService,
	chatAuditRepo ChatAuditRepository,
	chatAnalyticsRepo ChatAnalyticsRepository,
) {
	// Initialize dependencies
	ruleEngine := rules.NewEngine()
	classifier := service.NewClassifierService(ruleEngine)
	handler := NewHandler(classifier, chatService, auditRepo, analyticsRepo, chatAuditRepo, chatAnalyticsRepo).
		WithSessionMessageLimit(cfg.SessionMessageLimit)

	// CORS middleware
	router.Use(CORSMiddleware(cfg.CORSAllowOrigin))

	// Rate limiter for chat endpoints (protects against excessive API costs)
	_, chatRateLimiter := RateLimitMiddlewareWithConfig(cfg.RateLimitRate, cfg.RateLimitBurst)

	// Daily quota limiter per IP
	_, dailyQuota := DailyQuotaMiddleware(cfg.DailyQuotaPerIP)

	// Health check
	router.GET("/health", handler.HealthCheck)

	// API routes
	api := router.Group("/api")
	{
		api.POST("/classify", handler.ClassifyFracture)
		api.GET("/options", handler.GetOptions)
		api.POST("/chat", dailyQuota, chatRateLimiter, handler.ChatMessage)
	}

	// Chat session routes
	chat := api.Group("/chat")
	{
		chat.POST("/session", handler.CreateChatSession)
		chat.PUT("/session/:id/complete", handler.CompleteChatSession)
		chat.PUT("/session/:id/abandon", handler.AbandonChatSession)
		chat.POST("/session/:id/feedback", handler.SubmitFeedback)
		chat.GET("/session/:id/feedback", handler.GetFeedback)
	}

	// Analytics routes
	analytics := api.Group("/analytics")
	{
		analytics.GET("/summary", handler.GetAnalyticsSummary)
		analytics.GET("/trends", handler.GetAnalyticsTrends)
		analytics.GET("/distribution/:system", handler.GetAnalyticsDistribution)
	}

	// Chat analytics routes
	chatAnalytics := analytics.Group("/chat")
	{
		chatAnalytics.GET("/summary", handler.GetChatAnalyticsSummary)
		chatAnalytics.GET("/feedback", handler.GetChatFeedbackSummary)
		chatAnalytics.GET("/confidence", handler.GetChatConfidenceDistribution)
		chatAnalytics.GET("/trends", handler.GetChatTrends)
	}

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}

// CORSMiddleware handles Cross-Origin Resource Sharing
func CORSMiddleware(allowOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
