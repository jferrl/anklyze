package api

import (
	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/config"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/storage"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// Cleanup holds references to resources that need cleanup on shutdown.
type Cleanup struct {
	rateLimiter *IPRateLimiter
	dailyQuota  *DailyQuota
}

// Stop gracefully stops all background goroutines.
func (c *Cleanup) Stop() {
	if c.rateLimiter != nil {
		c.rateLimiter.Stop()
	}
	if c.dailyQuota != nil {
		c.dailyQuota.Stop()
	}
}

// SetupRoutes configures all API routes and returns a Cleanup struct for graceful shutdown.
func SetupRoutes(
	router *gin.Engine,
	cfg *config.Config,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	auditRepo AuditRepository,
	analyticsRepo AnalyticsRepository,
	chatService service.ChatService,
	chatAuditRepo ChatAuditRepository,
	chatAnalyticsRepo ChatAnalyticsRepository,
) *Cleanup {
	// Initialize dependencies
	ruleEngine := rules.NewEngine()
	classifier := service.NewClassifierService(ruleEngine)
	handler := NewHandler(classifier, chatService, auditRepo, analyticsRepo, chatAuditRepo, chatAnalyticsRepo).
		WithSessionMessageLimit(cfg.SessionMessageLimit)

	// CORS middleware
	router.Use(CORSMiddleware(cfg.CORSAllowOrigin))

	// Rate limiter for chat endpoints (protects against excessive API costs)
	rateLimiter, chatRateLimiter := RateLimitMiddlewareWithConfig(cfg.RateLimitRate, cfg.RateLimitBurst)

	// Daily quota limiter per IP
	dailyQuota, quotaMiddleware := DailyQuotaMiddleware(cfg.DailyQuotaPerIP)

	// Public endpoints - no auth required
	router.GET("/health", handler.HealthCheck)
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API routes
	api := router.Group("/api")

	if authValidator != nil {
		// Auth is enabled - protect routes
		setupProtectedRoutes(api, authValidator, userRepo, handler, quotaMiddleware, chatRateLimiter)
	} else {
		// Auth is disabled - all routes are public (development/backwards compatibility)
		setupPublicRoutes(api, handler, quotaMiddleware, chatRateLimiter)
	}

	return &Cleanup{
		rateLimiter: rateLimiter,
		dailyQuota:  dailyQuota,
	}
}

// setupProtectedRoutes configures routes with authentication middleware.
func setupProtectedRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	handler *Handler,
	dailyQuota gin.HandlerFunc,
	chatRateLimiter gin.HandlerFunc,
) {
	// Protected routes - require authentication (User or Admin)
	protected := api.Group("")
	protected.Use(auth.AuthMiddleware(authValidator))
	protected.Use(auth.UserSyncMiddleware(userRepo))
	{
		protected.GET("/me", GetCurrentUser)
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
	// In development mode, /me returns a mock admin user
	api.GET("/me", func(c *gin.Context) {
		c.JSON(200, UserProfileResponse{
			ID:    "dev-user",
			Email: "dev@localhost",
			Role:  "admin",
		})
	})
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

// SetupCaseRoutes configures case-related routes.
// This should be called after SetupRoutes.
func SetupCaseRoutes(
	router *gin.Engine,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	userRepoForProfile repository.UserRepository,
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	analyticsRepo repository.CaseAnalyticsRepository,
	studyRepo repository.StudyRepository,
	studyResponseRepo repository.StudyResponseRepository,
	storage storage.Storage,
	statsService *service.StatisticsService,
) {
	// Create case handler with statistics service
	var statsServicePtr *StatisticsService
	if statsService != nil {
		var s StatisticsService = statsService
		statsServicePtr = &s
	}
	caseHandler := NewCaseHandler(caseRepo, responseRepo, analyticsRepo, studyRepo, studyResponseRepo, userRepo, storage, statsServicePtr)

	// Add divergence service
	divergenceService := service.NewDivergenceService(responseRepo, caseRepo)
	caseHandler.WithDivergenceService(divergenceService)

	// Create user handler for profile endpoints
	userHandler := NewUserHandler(userRepoForProfile)

	api := router.Group("/api")

	if authValidator != nil {
		setupProtectedCaseRoutes(api, authValidator, userRepo, caseHandler, userHandler)
	} else {
		setupPublicCaseRoutes(api, caseHandler, userHandler)
	}
}

// setupProtectedCaseRoutes configures case routes with authentication.
func setupProtectedCaseRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	caseHandler *CaseHandler,
	userHandler *UserHandler,
) {
	// User case routes - require authentication
	cases := api.Group("/cases")
	cases.Use(auth.AuthMiddleware(authValidator))
	cases.Use(auth.UserSyncMiddleware(userRepo))
	{
		cases.GET("", caseHandler.ListPublishedCases)
		cases.GET("/:id", caseHandler.GetPublishedCase)
		cases.GET("/:id/images/:imageId/url", caseHandler.GetImageSignedURL)
		cases.POST("/:id/responses", caseHandler.SubmitResponse)
		cases.GET("/:id/my-responses", caseHandler.GetMyResponses)
	}

	// User profile routes - require authentication
	profile := api.Group("/me")
	profile.Use(auth.AuthMiddleware(authValidator))
	profile.Use(auth.UserSyncMiddleware(userRepo))
	{
		profile.GET("/profile", userHandler.GetUserProfile)
		profile.PUT("/profile", userHandler.UpdateUserProfile)
	}

	// Admin case routes - require admin role
	adminCases := api.Group("/admin/cases")
	adminCases.Use(auth.AuthMiddleware(authValidator))
	adminCases.Use(auth.UserSyncMiddleware(userRepo))
	adminCases.Use(auth.RequireRole(auth.RoleAdmin))
	{
		adminCases.POST("", caseHandler.CreateCase)
		adminCases.GET("", caseHandler.ListCases)
		adminCases.GET("/:id", caseHandler.GetCase)
		adminCases.PUT("/:id", caseHandler.UpdateCase)
		adminCases.DELETE("/:id", caseHandler.DeleteCase)
		adminCases.POST("/:id/images", caseHandler.UploadImage)
		adminCases.GET("/:id/images", caseHandler.GetAdminCaseImages)
		adminCases.GET("/:id/images/:imageId/url", caseHandler.GetAdminImageSignedURL)
		adminCases.PATCH("/:id/images/:imageId", caseHandler.UpdateImage)
		adminCases.DELETE("/:id/images/:imageId", caseHandler.DeleteImage)
		adminCases.PUT("/:id/images/reorder", caseHandler.ReorderImages)
		adminCases.PUT("/:id/publish", caseHandler.PublishCase)
		adminCases.PUT("/:id/close", caseHandler.CloseCase)
		adminCases.GET("/:id/analytics", caseHandler.GetCaseAnalytics)
		adminCases.GET("/:id/reliability", caseHandler.GetReliabilityMetrics)
		adminCases.GET("/:id/divergence", caseHandler.GetDivergenceAnalysis)
		adminCases.GET("/:id/responses", caseHandler.ListCaseResponses)
		adminCases.GET("/:id/export", caseHandler.ExportResponses)
		adminCases.GET("/:id/export/detailed", caseHandler.ExportDetailedResponses)

		// User access management
		adminCases.GET("/:id/users", caseHandler.ListCaseUsers)
		adminCases.POST("/:id/users", caseHandler.AddCaseUser)
		adminCases.DELETE("/:id/users/:userId", caseHandler.RemoveCaseUser)
	}
}

// setupPublicCaseRoutes configures case routes without authentication (development mode).
func setupPublicCaseRoutes(
	api *gin.RouterGroup,
	caseHandler *CaseHandler,
	userHandler *UserHandler,
) {
	// User case routes
	cases := api.Group("/cases")
	{
		cases.GET("", caseHandler.ListPublishedCases)
		cases.GET("/:id", caseHandler.GetPublishedCase)
		cases.GET("/:id/images/:imageId/url", caseHandler.GetImageSignedURL)
		cases.POST("/:id/responses", caseHandler.SubmitResponse)
		cases.GET("/:id/my-responses", caseHandler.GetMyResponses)
	}

	// User profile routes (development mode)
	profile := api.Group("/me")
	{
		profile.GET("/profile", userHandler.GetUserProfile)
		profile.PUT("/profile", userHandler.UpdateUserProfile)
	}

	// Admin case routes
	adminCases := api.Group("/admin/cases")
	{
		adminCases.POST("", caseHandler.CreateCase)
		adminCases.GET("", caseHandler.ListCases)
		adminCases.GET("/:id", caseHandler.GetCase)
		adminCases.PUT("/:id", caseHandler.UpdateCase)
		adminCases.DELETE("/:id", caseHandler.DeleteCase)
		adminCases.POST("/:id/images", caseHandler.UploadImage)
		adminCases.GET("/:id/images", caseHandler.GetAdminCaseImages)
		adminCases.GET("/:id/images/:imageId/url", caseHandler.GetAdminImageSignedURL)
		adminCases.PATCH("/:id/images/:imageId", caseHandler.UpdateImage)
		adminCases.DELETE("/:id/images/:imageId", caseHandler.DeleteImage)
		adminCases.PUT("/:id/images/reorder", caseHandler.ReorderImages)
		adminCases.PUT("/:id/publish", caseHandler.PublishCase)
		adminCases.PUT("/:id/close", caseHandler.CloseCase)
		adminCases.GET("/:id/analytics", caseHandler.GetCaseAnalytics)
		adminCases.GET("/:id/reliability", caseHandler.GetReliabilityMetrics)
		adminCases.GET("/:id/divergence", caseHandler.GetDivergenceAnalysis)
		adminCases.GET("/:id/responses", caseHandler.ListCaseResponses)
		adminCases.GET("/:id/export", caseHandler.ExportResponses)
		adminCases.GET("/:id/export/detailed", caseHandler.ExportDetailedResponses)

		// User access management
		adminCases.GET("/:id/users", caseHandler.ListCaseUsers)
		adminCases.POST("/:id/users", caseHandler.AddCaseUser)
		adminCases.DELETE("/:id/users/:userId", caseHandler.RemoveCaseUser)
	}
}

// SetupStudyRoutes configures study-related routes.
// This should be called after SetupRoutes.
func SetupStudyRoutes(
	router *gin.Engine,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	studyRepo repository.StudyRepository,
	studyResponseRepo repository.StudyResponseRepository,
	caseRepo repository.CaseRepository,
	statsService *service.StatisticsService,
) {
	studyHandler := NewStudyHandler(studyRepo, studyResponseRepo, caseRepo, userRepo, statsService)

	api := router.Group("/api")

	if authValidator != nil {
		setupProtectedStudyRoutes(api, authValidator, userRepo, studyHandler)
	} else {
		setupPublicStudyRoutes(api, studyHandler)
	}
}

// setupProtectedStudyRoutes configures study routes with authentication.
func setupProtectedStudyRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	studyHandler *StudyHandler,
) {
	// Admin study routes - require admin role
	adminStudies := api.Group("/admin/studies")
	adminStudies.Use(auth.AuthMiddleware(authValidator))
	adminStudies.Use(auth.UserSyncMiddleware(userRepo))
	adminStudies.Use(auth.RequireRole(auth.RoleAdmin))
	{
		// CRUD
		adminStudies.POST("", studyHandler.CreateStudy)
		adminStudies.GET("", studyHandler.ListStudies)
		adminStudies.GET("/:id", studyHandler.GetStudy)
		adminStudies.PUT("/:id", studyHandler.UpdateStudy)
		adminStudies.DELETE("/:id", studyHandler.DeleteStudy)

		// Case management
		adminStudies.POST("/:id/cases", studyHandler.AddCase)
		adminStudies.DELETE("/:id/cases/:caseId", studyHandler.RemoveCase)
		adminStudies.PUT("/:id/cases/reorder", studyHandler.ReorderCases)

		// Rater management
		adminStudies.GET("/:id/raters", studyHandler.ListStudyRaters)
		adminStudies.POST("/:id/raters", studyHandler.AddStudyRater)
		adminStudies.DELETE("/:id/raters/:userId", studyHandler.RemoveStudyRater)
		adminStudies.GET("/:id/progress", studyHandler.GetRaterProgress)

		// Status
		adminStudies.PUT("/:id/activate", studyHandler.ActivateStudy)
		adminStudies.PUT("/:id/close", studyHandler.CloseStudy)

		// Analytics
		adminStudies.GET("/:id/reliability", studyHandler.GetStudyReliabilityMetrics)
	}
}

// setupPublicStudyRoutes configures study routes without authentication (development mode).
func setupPublicStudyRoutes(
	api *gin.RouterGroup,
	studyHandler *StudyHandler,
) {
	// Admin study routes (development mode - no auth)
	adminStudies := api.Group("/admin/studies")
	{
		// CRUD
		adminStudies.POST("", studyHandler.CreateStudy)
		adminStudies.GET("", studyHandler.ListStudies)
		adminStudies.GET("/:id", studyHandler.GetStudy)
		adminStudies.PUT("/:id", studyHandler.UpdateStudy)
		adminStudies.DELETE("/:id", studyHandler.DeleteStudy)

		// Case management
		adminStudies.POST("/:id/cases", studyHandler.AddCase)
		adminStudies.DELETE("/:id/cases/:caseId", studyHandler.RemoveCase)
		adminStudies.PUT("/:id/cases/reorder", studyHandler.ReorderCases)

		// Rater management
		adminStudies.GET("/:id/raters", studyHandler.ListStudyRaters)
		adminStudies.POST("/:id/raters", studyHandler.AddStudyRater)
		adminStudies.DELETE("/:id/raters/:userId", studyHandler.RemoveStudyRater)
		adminStudies.GET("/:id/progress", studyHandler.GetRaterProgress)

		// Status
		adminStudies.PUT("/:id/activate", studyHandler.ActivateStudy)
		adminStudies.PUT("/:id/close", studyHandler.CloseStudy)

		// Analytics
		adminStudies.GET("/:id/reliability", studyHandler.GetStudyReliabilityMetrics)
	}
}

// CORSMiddleware handles Cross-Origin Resource Sharing
func CORSMiddleware(allowOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "X-Quota-Remaining")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
