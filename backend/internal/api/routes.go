package api

import (
	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/auth"
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
	authValidator *auth.Validator,
	userRepo auth.UserRepository,
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

	// Public endpoints - no auth required
	router.GET("/health", handler.HealthCheck)
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API routes
	api := router.Group("/api")

	if authValidator != nil {
		// Auth is enabled - protect routes
		setupProtectedRoutes(api, authValidator, userRepo, handler, dailyQuota, chatRateLimiter)
	} else {
		// Auth is disabled - all routes are public (development/backwards compatibility)
		setupPublicRoutes(api, handler, dailyQuota, chatRateLimiter)
	}
}

// setupProtectedRoutes configures routes with authentication middleware.
func setupProtectedRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserRepository,
	handler *Handler,
	dailyQuota gin.HandlerFunc,
	chatRateLimiter gin.HandlerFunc,
) {
	// Protected routes - require authentication (User or Admin)
	protected := api.Group("")
	protected.Use(auth.AuthMiddleware(authValidator))
	protected.Use(auth.UserSyncMiddleware(userRepo))
	{
		protected.POST("/classify", handler.ClassifyFracture)
		protected.GET("/options", handler.GetOptions)
		protected.POST("/chat", dailyQuota, chatRateLimiter, handler.ChatMessage)
	}

	// Chat session routes - require authentication
	chat := protected.Group("/chat")
	{
		chat.POST("/session", handler.CreateChatSession)
		chat.PUT("/session/:id/complete", handler.CompleteChatSession)
		chat.PUT("/session/:id/abandon", handler.AbandonChatSession)
		chat.POST("/session/:id/feedback", handler.SubmitFeedback)
		chat.GET("/session/:id/feedback", handler.GetFeedback)
	}

	// Admin-only routes - require admin role
	analytics := api.Group("/analytics")
	analytics.Use(auth.AuthMiddleware(authValidator))
	analytics.Use(auth.UserSyncMiddleware(userRepo))
	analytics.Use(auth.RequireRole(auth.RoleAdmin))
	{
		analytics.GET("/summary", handler.GetAnalyticsSummary)
		analytics.GET("/trends", handler.GetAnalyticsTrends)
		analytics.GET("/distribution/:system", handler.GetAnalyticsDistribution)
	}

	// Chat analytics - admin only
	chatAnalytics := analytics.Group("/chat")
	{
		chatAnalytics.GET("/summary", handler.GetChatAnalyticsSummary)
		chatAnalytics.GET("/feedback", handler.GetChatFeedbackSummary)
		chatAnalytics.GET("/confidence", handler.GetChatConfidenceDistribution)
		chatAnalytics.GET("/trends", handler.GetChatTrends)
	}
}

// setupPublicRoutes configures routes without authentication (development mode).
func setupPublicRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	dailyQuota gin.HandlerFunc,
	chatRateLimiter gin.HandlerFunc,
) {
	api.POST("/classify", handler.ClassifyFracture)
	api.GET("/options", handler.GetOptions)
	api.POST("/chat", dailyQuota, chatRateLimiter, handler.ChatMessage)

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
}

// CORSMiddleware handles Cross-Origin Resource Sharing
func CORSMiddleware(allowOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "X-Quota-Remaining")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
