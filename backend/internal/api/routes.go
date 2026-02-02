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

// SetupStudyRoutes configures study-related routes.
// This should be called after SetupRoutes.
func SetupStudyRoutes(
	router *gin.Engine,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	userRepoForProfile repository.UserRepository,
	studyRepo repository.StudyRepository,
	responseRepo repository.StudyResponseRepository,
	analyticsRepo repository.StudyAnalyticsRepository,
	cohortRepo repository.CohortRepository,
	cohortResponseRepo repository.CohortResponseRepository,
	storage storage.Storage,
	statsService *service.StatisticsService,
) {
	// Create study handler with statistics service
	var statsServicePtr *StatisticsService
	if statsService != nil {
		var s StatisticsService = statsService
		statsServicePtr = &s
	}
	studyHandler := NewStudyHandler(studyRepo, responseRepo, analyticsRepo, cohortRepo, cohortResponseRepo, userRepo, storage, statsServicePtr)

	// Add divergence service
	divergenceService := service.NewDivergenceService(responseRepo, studyRepo)
	studyHandler.WithDivergenceService(divergenceService)

	// Create user handler for profile endpoints
	userHandler := NewUserHandler(userRepoForProfile)

	api := router.Group("/api")

	if authValidator != nil {
		setupProtectedStudyRoutes(api, authValidator, userRepo, studyHandler, userHandler)
	} else {
		setupPublicStudyRoutes(api, studyHandler, userHandler)
	}
}

// setupProtectedStudyRoutes configures study routes with authentication.
func setupProtectedStudyRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	studyHandler *StudyHandler,
	userHandler *UserHandler,
) {
	// User study routes - require authentication
	studies := api.Group("/studies")
	studies.Use(auth.AuthMiddleware(authValidator))
	studies.Use(auth.UserSyncMiddleware(userRepo))
	{
		studies.GET("", studyHandler.ListPublishedStudies)
		studies.GET("/:id", studyHandler.GetPublishedStudy)
		studies.GET("/:id/images/:imageId/url", studyHandler.GetImageSignedURL)
		studies.POST("/:id/responses", studyHandler.SubmitResponse)
		studies.GET("/:id/my-responses", studyHandler.GetMyResponses)
	}

	// User profile routes - require authentication
	profile := api.Group("/me")
	profile.Use(auth.AuthMiddleware(authValidator))
	profile.Use(auth.UserSyncMiddleware(userRepo))
	{
		profile.GET("/profile", userHandler.GetUserProfile)
		profile.PUT("/profile", userHandler.UpdateUserProfile)
	}

	// Admin study routes - require admin role
	adminStudies := api.Group("/admin/studies")
	adminStudies.Use(auth.AuthMiddleware(authValidator))
	adminStudies.Use(auth.UserSyncMiddleware(userRepo))
	adminStudies.Use(auth.RequireRole(auth.RoleAdmin))
	{
		adminStudies.POST("", studyHandler.CreateStudy)
		adminStudies.GET("", studyHandler.ListStudies)
		adminStudies.GET("/:id", studyHandler.GetStudy)
		adminStudies.PUT("/:id", studyHandler.UpdateStudy)
		adminStudies.DELETE("/:id", studyHandler.DeleteStudy)
		adminStudies.POST("/:id/images", studyHandler.UploadImage)
		adminStudies.GET("/:id/images", studyHandler.GetAdminStudyImages)
		adminStudies.GET("/:id/images/:imageId/url", studyHandler.GetAdminImageSignedURL)
		adminStudies.PATCH("/:id/images/:imageId", studyHandler.UpdateImage)
		adminStudies.DELETE("/:id/images/:imageId", studyHandler.DeleteImage)
		adminStudies.PUT("/:id/images/reorder", studyHandler.ReorderImages)
		adminStudies.PUT("/:id/publish", studyHandler.PublishStudy)
		adminStudies.PUT("/:id/close", studyHandler.CloseStudy)
		adminStudies.GET("/:id/analytics", studyHandler.GetStudyAnalytics)
		adminStudies.GET("/:id/reliability", studyHandler.GetReliabilityMetrics)
		adminStudies.GET("/:id/divergence", studyHandler.GetDivergenceAnalysis)
		adminStudies.GET("/:id/responses", studyHandler.ListStudyResponses)
		adminStudies.GET("/:id/export", studyHandler.ExportResponses)
		adminStudies.GET("/:id/export/detailed", studyHandler.ExportDetailedResponses)

		// User access management
		adminStudies.GET("/:id/users", studyHandler.ListStudyUsers)
		adminStudies.POST("/:id/users", studyHandler.AddStudyUser)
		adminStudies.DELETE("/:id/users/:userId", studyHandler.RemoveStudyUser)
	}
}

// setupPublicStudyRoutes configures study routes without authentication (development mode).
func setupPublicStudyRoutes(
	api *gin.RouterGroup,
	studyHandler *StudyHandler,
	userHandler *UserHandler,
) {
	// User study routes
	studies := api.Group("/studies")
	{
		studies.GET("", studyHandler.ListPublishedStudies)
		studies.GET("/:id", studyHandler.GetPublishedStudy)
		studies.GET("/:id/images/:imageId/url", studyHandler.GetImageSignedURL)
		studies.POST("/:id/responses", studyHandler.SubmitResponse)
		studies.GET("/:id/my-responses", studyHandler.GetMyResponses)
	}

	// User profile routes (development mode)
	profile := api.Group("/me")
	{
		profile.GET("/profile", userHandler.GetUserProfile)
		profile.PUT("/profile", userHandler.UpdateUserProfile)
	}

	// Admin study routes
	adminStudies := api.Group("/admin/studies")
	{
		adminStudies.POST("", studyHandler.CreateStudy)
		adminStudies.GET("", studyHandler.ListStudies)
		adminStudies.GET("/:id", studyHandler.GetStudy)
		adminStudies.PUT("/:id", studyHandler.UpdateStudy)
		adminStudies.DELETE("/:id", studyHandler.DeleteStudy)
		adminStudies.POST("/:id/images", studyHandler.UploadImage)
		adminStudies.GET("/:id/images", studyHandler.GetAdminStudyImages)
		adminStudies.GET("/:id/images/:imageId/url", studyHandler.GetAdminImageSignedURL)
		adminStudies.PATCH("/:id/images/:imageId", studyHandler.UpdateImage)
		adminStudies.DELETE("/:id/images/:imageId", studyHandler.DeleteImage)
		adminStudies.PUT("/:id/images/reorder", studyHandler.ReorderImages)
		adminStudies.PUT("/:id/publish", studyHandler.PublishStudy)
		adminStudies.PUT("/:id/close", studyHandler.CloseStudy)
		adminStudies.GET("/:id/analytics", studyHandler.GetStudyAnalytics)
		adminStudies.GET("/:id/reliability", studyHandler.GetReliabilityMetrics)
		adminStudies.GET("/:id/divergence", studyHandler.GetDivergenceAnalysis)
		adminStudies.GET("/:id/responses", studyHandler.ListStudyResponses)
		adminStudies.GET("/:id/export", studyHandler.ExportResponses)
		adminStudies.GET("/:id/export/detailed", studyHandler.ExportDetailedResponses)

		// User access management
		adminStudies.GET("/:id/users", studyHandler.ListStudyUsers)
		adminStudies.POST("/:id/users", studyHandler.AddStudyUser)
		adminStudies.DELETE("/:id/users/:userId", studyHandler.RemoveStudyUser)
	}
}

// SetupCohortRoutes configures cohort-related routes.
// This should be called after SetupRoutes.
func SetupCohortRoutes(
	router *gin.Engine,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	cohortRepo repository.CohortRepository,
	cohortResponseRepo repository.CohortResponseRepository,
	studyRepo repository.StudyRepository,
	statsService *service.StatisticsService,
) {
	cohortHandler := NewCohortHandler(cohortRepo, cohortResponseRepo, studyRepo, userRepo, statsService)

	api := router.Group("/api")

	if authValidator != nil {
		setupProtectedCohortRoutes(api, authValidator, userRepo, cohortHandler)
	} else {
		setupPublicCohortRoutes(api, cohortHandler)
	}
}

// setupProtectedCohortRoutes configures cohort routes with authentication.
func setupProtectedCohortRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	cohortHandler *CohortHandler,
) {
	// Admin cohort routes - require admin role
	adminCohorts := api.Group("/admin/cohorts")
	adminCohorts.Use(auth.AuthMiddleware(authValidator))
	adminCohorts.Use(auth.UserSyncMiddleware(userRepo))
	adminCohorts.Use(auth.RequireRole(auth.RoleAdmin))
	{
		// CRUD
		adminCohorts.POST("", cohortHandler.CreateCohort)
		adminCohorts.GET("", cohortHandler.ListCohorts)
		adminCohorts.GET("/:id", cohortHandler.GetCohort)
		adminCohorts.PUT("/:id", cohortHandler.UpdateCohort)
		adminCohorts.DELETE("/:id", cohortHandler.DeleteCohort)

		// Case management
		adminCohorts.POST("/:id/cases", cohortHandler.AddCase)
		adminCohorts.DELETE("/:id/cases/:studyId", cohortHandler.RemoveCase)
		adminCohorts.PUT("/:id/cases/reorder", cohortHandler.ReorderCases)

		// User management
		adminCohorts.GET("/:id/users", cohortHandler.ListCohortUsers)
		adminCohorts.POST("/:id/users", cohortHandler.AddCohortUser)
		adminCohorts.DELETE("/:id/users/:userId", cohortHandler.RemoveCohortUser)
		adminCohorts.GET("/:id/progress", cohortHandler.GetRaterProgress)

		// Status
		adminCohorts.PUT("/:id/activate", cohortHandler.ActivateCohort)
		adminCohorts.PUT("/:id/close", cohortHandler.CloseCohort)

		// Analytics
		adminCohorts.GET("/:id/reliability", cohortHandler.GetCohortReliabilityMetrics)
	}
}

// setupPublicCohortRoutes configures cohort routes without authentication (development mode).
func setupPublicCohortRoutes(
	api *gin.RouterGroup,
	cohortHandler *CohortHandler,
) {
	// Admin cohort routes (development mode - no auth)
	adminCohorts := api.Group("/admin/cohorts")
	{
		// CRUD
		adminCohorts.POST("", cohortHandler.CreateCohort)
		adminCohorts.GET("", cohortHandler.ListCohorts)
		adminCohorts.GET("/:id", cohortHandler.GetCohort)
		adminCohorts.PUT("/:id", cohortHandler.UpdateCohort)
		adminCohorts.DELETE("/:id", cohortHandler.DeleteCohort)

		// Case management
		adminCohorts.POST("/:id/cases", cohortHandler.AddCase)
		adminCohorts.DELETE("/:id/cases/:studyId", cohortHandler.RemoveCase)
		adminCohorts.PUT("/:id/cases/reorder", cohortHandler.ReorderCases)

		// User management
		adminCohorts.GET("/:id/users", cohortHandler.ListCohortUsers)
		adminCohorts.POST("/:id/users", cohortHandler.AddCohortUser)
		adminCohorts.DELETE("/:id/users/:userId", cohortHandler.RemoveCohortUser)
		adminCohorts.GET("/:id/progress", cohortHandler.GetRaterProgress)

		// Status
		adminCohorts.PUT("/:id/activate", cohortHandler.ActivateCohort)
		adminCohorts.PUT("/:id/close", cohortHandler.CloseCohort)

		// Analytics
		adminCohorts.GET("/:id/reliability", cohortHandler.GetCohortReliabilityMetrics)
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
