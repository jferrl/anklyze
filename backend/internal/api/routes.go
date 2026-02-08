package api

import (
	"time"

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

// defaultSignedURLDuration is the default duration for signed URLs (15 minutes).
const defaultSignedURLDuration = 15 * time.Minute

// Cleanup holds references to resources that need cleanup on shutdown.
type Cleanup struct {
	rateLimiter *IPRateLimiter
}

// Stop gracefully stops all background goroutines.
func (c *Cleanup) Stop() {
	if c.rateLimiter != nil {
		c.rateLimiter.Stop()
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

	// Public endpoints - no auth required
	router.GET("/health", handler.HealthCheck)
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API routes
	api := router.Group("/api")

	if authValidator != nil {
		// Auth is enabled - protect routes
		setupProtectedRoutes(api, authValidator, userRepo, handler, chatRateLimiter)
	} else {
		// Auth is disabled - all routes are public (development/backwards compatibility)
		setupPublicRoutes(api, handler, chatRateLimiter)
	}

	return &Cleanup{
		rateLimiter: rateLimiter,
	}
}

// setupProtectedRoutes configures routes with authentication middleware.
func setupProtectedRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	handler *Handler,
	chatRateLimiter gin.HandlerFunc,
) {
	// Protected routes - require authentication (User or Admin)
	protected := api.Group("")
	protected.Use(auth.AuthMiddleware(authValidator))
	protected.Use(auth.UserSyncMiddleware(userRepo))
	{
		protected.GET("/me", GetCurrentUser)
		protected.POST("/classify", handler.ClassifyFracture)
		protected.POST("/chat", chatRateLimiter, handler.ChatMessage)
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
	api.POST("/chat", chatRateLimiter, handler.ChatMessage)

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
	// Create specialized handlers for different concerns
	adminHandler := NewCaseAdminHandler(caseRepo, storage)
	imageHandler := NewCaseImageHandler(caseRepo, storage, defaultSignedURLDuration)
	accessHandler := NewCaseAccessHandler(caseRepo, responseRepo, userRepo)
	responseHandler := NewCaseResponseHandler(caseRepo, responseRepo, studyRepo, studyResponseRepo, storage, defaultSignedURLDuration)

	// Create analytics handler with statistics service
	var statsServicePtr *StatisticsService
	if statsService != nil {
		var s StatisticsService = statsService
		statsServicePtr = &s
	}
	divergenceService := service.NewDivergenceService(responseRepo, caseRepo)
	analyticsHandler := NewCaseAnalyticsHandler(caseRepo, responseRepo, analyticsRepo, statsServicePtr, divergenceService)

	// Create user handler for profile endpoints
	userHandler := NewUserHandler(userRepoForProfile)

	api := router.Group("/api")

	if authValidator != nil {
		setupProtectedCaseRoutes(api, authValidator, userRepo, adminHandler, imageHandler, accessHandler, responseHandler, analyticsHandler, userHandler)
	} else {
		setupPublicCaseRoutes(api, adminHandler, imageHandler, accessHandler, responseHandler, analyticsHandler, userHandler)
	}
}

// setupProtectedCaseRoutes configures case routes with authentication.
func setupProtectedCaseRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	adminHandler *CaseAdminHandler,
	imageHandler *CaseImageHandler,
	accessHandler *CaseAccessHandler,
	responseHandler *CaseResponseHandler,
	analyticsHandler *CaseAnalyticsHandler,
	userHandler *UserHandler,
) {
	// User case routes - require authentication
	cases := api.Group("/cases")
	cases.Use(auth.AuthMiddleware(authValidator))
	cases.Use(auth.UserSyncMiddleware(userRepo))
	{
		cases.GET("", accessHandler.ListPublishedCases)
		cases.GET("/:id", accessHandler.GetPublishedCase)
		cases.GET("/:id/images/:imageId/url", responseHandler.GetImageSignedURL)
		cases.POST("/:id/responses", responseHandler.SubmitResponse)
		cases.GET("/:id/my-responses", responseHandler.GetMyResponses)
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
		// CRUD operations (CaseAdminHandler)
		adminCases.POST("", adminHandler.CreateCase)
		adminCases.GET("", adminHandler.ListCases)
		adminCases.GET("/:id", adminHandler.GetCase)
		adminCases.PUT("/:id", adminHandler.UpdateCase)
		adminCases.DELETE("/:id", adminHandler.DeleteCase)
		adminCases.PUT("/:id/publish", adminHandler.PublishCase)
		adminCases.PUT("/:id/close", adminHandler.CloseCase)

		// Image management (CaseImageHandler)
		adminCases.POST("/:id/images", imageHandler.UploadImage)
		adminCases.GET("/:id/images", imageHandler.GetAdminCaseImages)
		adminCases.GET("/:id/images/:imageId/url", imageHandler.GetAdminImageSignedURL)
		adminCases.PATCH("/:id/images/:imageId", imageHandler.UpdateImage)
		adminCases.DELETE("/:id/images/:imageId", imageHandler.DeleteImage)
		adminCases.PUT("/:id/images/reorder", imageHandler.ReorderImages)

		// Analytics and export (CaseAnalyticsHandler)
		adminCases.GET("/:id/analytics", analyticsHandler.GetCaseAnalytics)
		adminCases.GET("/:id/reliability", analyticsHandler.GetReliabilityMetrics)
		adminCases.GET("/:id/divergence", analyticsHandler.GetDivergenceAnalysis)
		adminCases.GET("/:id/responses", responseHandler.ListCaseResponses)
		adminCases.GET("/:id/export", analyticsHandler.ExportResponses)
		adminCases.GET("/:id/export/detailed", analyticsHandler.ExportDetailedResponses)

		// User access management (CaseAccessHandler)
		adminCases.GET("/:id/users", accessHandler.ListCaseUsers)
		adminCases.POST("/:id/users", accessHandler.AddCaseUser)
		adminCases.DELETE("/:id/users/:userId", accessHandler.RemoveCaseUser)
	}
}

// setupPublicCaseRoutes configures case routes without authentication (development mode).
func setupPublicCaseRoutes(
	api *gin.RouterGroup,
	adminHandler *CaseAdminHandler,
	imageHandler *CaseImageHandler,
	accessHandler *CaseAccessHandler,
	responseHandler *CaseResponseHandler,
	analyticsHandler *CaseAnalyticsHandler,
	userHandler *UserHandler,
) {
	// User case routes
	cases := api.Group("/cases")
	{
		cases.GET("", accessHandler.ListPublishedCases)
		cases.GET("/:id", accessHandler.GetPublishedCase)
		cases.GET("/:id/images/:imageId/url", responseHandler.GetImageSignedURL)
		cases.POST("/:id/responses", responseHandler.SubmitResponse)
		cases.GET("/:id/my-responses", responseHandler.GetMyResponses)
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
		// CRUD operations (CaseAdminHandler)
		adminCases.POST("", adminHandler.CreateCase)
		adminCases.GET("", adminHandler.ListCases)
		adminCases.GET("/:id", adminHandler.GetCase)
		adminCases.PUT("/:id", adminHandler.UpdateCase)
		adminCases.DELETE("/:id", adminHandler.DeleteCase)
		adminCases.PUT("/:id/publish", adminHandler.PublishCase)
		adminCases.PUT("/:id/close", adminHandler.CloseCase)

		// Image management (CaseImageHandler)
		adminCases.POST("/:id/images", imageHandler.UploadImage)
		adminCases.GET("/:id/images", imageHandler.GetAdminCaseImages)
		adminCases.GET("/:id/images/:imageId/url", imageHandler.GetAdminImageSignedURL)
		adminCases.PATCH("/:id/images/:imageId", imageHandler.UpdateImage)
		adminCases.DELETE("/:id/images/:imageId", imageHandler.DeleteImage)
		adminCases.PUT("/:id/images/reorder", imageHandler.ReorderImages)

		// Analytics and export (CaseAnalyticsHandler)
		adminCases.GET("/:id/analytics", analyticsHandler.GetCaseAnalytics)
		adminCases.GET("/:id/reliability", analyticsHandler.GetReliabilityMetrics)
		adminCases.GET("/:id/divergence", analyticsHandler.GetDivergenceAnalysis)
		adminCases.GET("/:id/responses", responseHandler.ListCaseResponses)
		adminCases.GET("/:id/export", analyticsHandler.ExportResponses)
		adminCases.GET("/:id/export/detailed", analyticsHandler.ExportDetailedResponses)

		// User access management (CaseAccessHandler)
		adminCases.GET("/:id/users", accessHandler.ListCaseUsers)
		adminCases.POST("/:id/users", accessHandler.AddCaseUser)
		adminCases.DELETE("/:id/users/:userId", accessHandler.RemoveCaseUser)
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

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
