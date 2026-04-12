package api

import (
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/config"
	"github.com/jferrl/anklyze/internal/metrics"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/storage"
	"github.com/prometheus/client_golang/prometheus"
)

// defaultSignedURLDuration is the default duration for signed URLs (15 minutes).
const defaultSignedURLDuration = 15 * time.Minute

// SetupRoutes configures all API routes.
func SetupRoutes(
	router *gin.Engine,
	cfg *config.Config,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	auditRepo AuditRepository,
	analyticsRepo AnalyticsRepository,
	classificationService service.ClassificationService,
	dbHealthy bool,
	jwksReady *atomic.Bool,
) {
	handler := NewHandler(classificationService, auditRepo, analyticsRepo, dbHealthy, jwksReady)

	// Prometheus metrics middleware — must be registered before CORS so that
	// every request, including preflight OPTIONS, is counted.
	m := metrics.New(prometheus.DefaultRegisterer)
	router.Use(m.RecoveryMiddleware())
	router.Use(m.Middleware())

	// CORS middleware
	router.Use(CORSMiddleware(cfg.CORSAllowOrigin))

	// Public endpoints - no auth required
	router.GET("/health", handler.HealthCheck)
	metrics.RegisterMetricsEndpoint(router, prometheus.DefaultGatherer)

	// API routes
	api := router.Group("/api")

	if authValidator != nil {
		// Auth is enabled - protect routes
		setupProtectedRoutes(api, authValidator, userRepo, handler)
	} else {
		// Auth is disabled - all routes are public (development/backwards compatibility)
		setupPublicRoutes(api, handler)
	}
}

// setupProtectedRoutes configures routes with authentication middleware.
func setupProtectedRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	handler *Handler,
) {
	// Protected routes - require authentication (User or Admin)
	protected := api.Group("")
	protected.Use(auth.Middleware(authValidator))
	protected.Use(auth.UserSyncMiddleware(userRepo))
	protected.GET("/me", GetCurrentUser)
	protected.POST("/classify", handler.ClassifyFracture)

	// Admin-only routes - require admin role
	analytics := api.Group("/analytics")
	analytics.Use(auth.Middleware(authValidator))
	analytics.Use(auth.UserSyncMiddleware(userRepo))
	analytics.Use(auth.RequireRole(auth.RoleAdmin))
	registerAnalyticsRoutes(analytics, handler)
}

// setupPublicRoutes configures routes without authentication (development mode).
func setupPublicRoutes(
	api *gin.RouterGroup,
	handler *Handler,
) {
	// In development mode, /me returns a mock admin user
	api.GET("/me", func(c *gin.Context) {
		c.JSON(http.StatusOK, UserProfileResponse{
			ID:    "dev-user",
			Email: "dev@localhost",
			Role:  "admin",
		})
	})
	api.POST("/classify", handler.ClassifyFracture)

	registerAnalyticsRoutes(api.Group("/analytics"), handler)
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
	studyService service.StudyService,
	storage storage.Storage,
	statsService *service.StatisticsService,
) {
	// Create specialized handlers for different concerns
	adminHandler := NewCaseAdminHandler(caseRepo, storage, statsService)
	imageHandler := NewCaseImageHandler(caseRepo, storage, defaultSignedURLDuration)
	accessHandler := NewCaseAccessHandler(caseRepo, responseRepo)
	responseHandler := NewCaseResponseHandler(caseRepo, responseRepo, studyService, storage, defaultSignedURLDuration)

	// Create analytics handler with statistics service
	analyticsHandler := NewCaseAnalyticsHandler(caseRepo, responseRepo, analyticsRepo, statsService)

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
	cases.Use(auth.Middleware(authValidator))
	cases.Use(auth.UserSyncMiddleware(userRepo))
	registerUserCaseRoutes(cases, accessHandler, responseHandler)

	// User profile routes - require authentication
	profile := api.Group("/me")
	profile.Use(auth.Middleware(authValidator))
	profile.Use(auth.UserSyncMiddleware(userRepo))
	registerProfileRoutes(profile, userHandler)

	// Admin case routes - require admin role
	adminCases := api.Group("/admin/cases")
	adminCases.Use(auth.Middleware(authValidator))
	adminCases.Use(auth.UserSyncMiddleware(userRepo))
	adminCases.Use(auth.RequireRole(auth.RoleAdmin))
	registerAdminCaseRoutes(adminCases, adminHandler, imageHandler, responseHandler, analyticsHandler)
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
	registerUserCaseRoutes(api.Group("/cases"), accessHandler, responseHandler)
	registerProfileRoutes(api.Group("/me"), userHandler)
	registerAdminCaseRoutes(api.Group("/admin/cases"), adminHandler, imageHandler, responseHandler, analyticsHandler)
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
	studyService service.StudyService,
) {
	studyHandler := NewStudyHandler(studyRepo, studyResponseRepo, caseRepo, studyService)

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
	adminStudies := api.Group("/admin/studies")
	adminStudies.Use(auth.Middleware(authValidator))
	adminStudies.Use(auth.UserSyncMiddleware(userRepo))
	adminStudies.Use(auth.RequireRole(auth.RoleAdmin))
	registerAdminStudyRoutes(adminStudies, studyHandler)
}

// setupPublicStudyRoutes configures study routes without authentication (development mode).
func setupPublicStudyRoutes(
	api *gin.RouterGroup,
	studyHandler *StudyHandler,
) {
	registerAdminStudyRoutes(api.Group("/admin/studies"), studyHandler)
}

// ============================================================================
// Shared route registration helpers
// ============================================================================

// registerAnalyticsRoutes registers analytics routes on the given group.
func registerAnalyticsRoutes(analytics *gin.RouterGroup, h *Handler) {
	analytics.GET("/summary", h.GetAnalyticsSummary)
	analytics.GET("/trends", h.GetAnalyticsTrends)
	analytics.GET("/distribution/:system", h.GetAnalyticsDistribution)
}

// registerUserCaseRoutes registers user-facing case routes on the given group.
func registerUserCaseRoutes(
	cases *gin.RouterGroup,
	accessHandler *CaseAccessHandler,
	responseHandler *CaseResponseHandler,
) {
	cases.GET("", accessHandler.ListPublishedCases)
	cases.GET("/:id", accessHandler.GetPublishedCase)
	cases.GET("/:id/images/urls", responseHandler.GetBatchImageSignedURLs)
	cases.GET("/:id/images/:imageId/url", responseHandler.GetImageSignedURL)
	cases.POST("/:id/responses", responseHandler.SubmitResponse)
	cases.GET("/:id/my-responses", responseHandler.GetMyResponses)
}

// registerProfileRoutes registers user profile routes on the given group.
func registerProfileRoutes(profile *gin.RouterGroup, userHandler *UserHandler) {
	profile.GET("/profile", userHandler.GetUserProfile)
	profile.PUT("/profile", userHandler.UpdateUserProfile)
}

// registerAdminCaseRoutes registers all admin case routes on the given group.
func registerAdminCaseRoutes(
	adminCases *gin.RouterGroup,
	adminHandler *CaseAdminHandler,
	imageHandler *CaseImageHandler,
	responseHandler *CaseResponseHandler,
	analyticsHandler *CaseAnalyticsHandler,
) {
	// CRUD operations (CaseAdminHandler)
	adminCases.POST("", adminHandler.CreateCase)
	adminCases.GET("", adminHandler.ListCases)
	adminCases.GET("/dashboard", adminHandler.GetDashboard)
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

	// Gold standard management (CaseAdminHandler)
	adminCases.PUT("/:id/gold-standard", adminHandler.SetGoldStandard)
	adminCases.DELETE("/:id/gold-standard", adminHandler.DeleteGoldStandard)

	// Analytics and export (CaseAnalyticsHandler)
	adminCases.GET("/:id/analytics", analyticsHandler.GetCaseAnalytics)
	adminCases.GET("/:id/reliability", analyticsHandler.GetReliabilityMetrics)
	adminCases.GET("/:id/accuracy", analyticsHandler.GetGoldStandardAccuracy)
	adminCases.GET("/:id/responses", responseHandler.ListCaseResponses)
	adminCases.GET("/:id/export", analyticsHandler.ExportResponses)
	adminCases.GET("/:id/export/detailed", analyticsHandler.ExportDetailedResponses)

}

// registerAdminStudyRoutes registers all admin study routes on the given group.
func registerAdminStudyRoutes(adminStudies *gin.RouterGroup, studyHandler *StudyHandler) {
	// CRUD
	adminStudies.POST("", studyHandler.CreateStudy)
	adminStudies.GET("", studyHandler.ListStudies)
	adminStudies.GET("/:id", studyHandler.GetStudy)
	adminStudies.PUT("/:id", studyHandler.UpdateStudy)
	adminStudies.DELETE("/:id", studyHandler.DeleteStudy)

	// Case management
	adminStudies.POST("/:id/cases", studyHandler.AddCase)
	adminStudies.POST("/:id/cases/add-all", studyHandler.AddAllPublishedCases)
	adminStudies.DELETE("/:id/cases/:caseId", studyHandler.RemoveCase)
	adminStudies.PUT("/:id/cases/reorder", studyHandler.ReorderCases)

	// Status
	adminStudies.PUT("/:id/activate", studyHandler.ActivateStudy)
	adminStudies.PUT("/:id/close", studyHandler.CloseStudy)

	// Analytics and export
	adminStudies.GET("/:id/reliability", studyHandler.GetStudyReliabilityMetrics)
	adminStudies.GET("/:id/accuracy", studyHandler.GetStudyGoldStandardAccuracy)
	adminStudies.GET("/:id/export", studyHandler.ExportStudyResponses)
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
