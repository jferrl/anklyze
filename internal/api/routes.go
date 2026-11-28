package api

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"log/slog"
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
	jwksReady *atomic.Bool,
) {
	handler := NewHandler(classificationService, auditRepo, analyticsRepo, jwksReady)

	// Prometheus metrics middleware — must be registered before CORS so that
	// every request, including preflight OPTIONS, is counted.
	m := metrics.New(prometheus.DefaultRegisterer)
	router.Use(m.RecoveryMiddleware())
	router.Use(m.Middleware())

	// CORS middleware
	router.Use(CORSMiddleware(cfg.CORSAllowOrigin))
	router.Use(BodyLimitMiddleware())

	// Public endpoints - no auth required
	router.GET("/health", handler.HealthCheck)
	// Production without METRICS_TOKEN serves no /metrics: the proxy would expose it publicly.
	if cfg.MetricsToken != "" || !cfg.IsProduction() {
		metrics.RegisterMetricsEndpoint(router, prometheus.DefaultGatherer, cfg.MetricsToken)
	} else {
		slog.Warn("METRICS_TOKEN is not set: /metrics is disabled")
	}

	// API routes
	api := router.Group("/api")

	if authValidator != nil {
		// Auth is enabled - protect routes
		setupProtectedRoutes(api, authValidator, userRepo, handler)
	} else {
		// Auth is disabled - all routes are public (development/backwards compatibility)
		setupPublicRoutes(api, handler, userRepo)
	}
}

// setupProtectedRoutes configures routes with authentication middleware.
func setupProtectedRoutes(
	api *gin.RouterGroup,
	authValidator *auth.Validator,
	userRepo auth.UserService,
	handler *Handler,
) {
	// Classification is public: the page is shared with journal reviewers.
	api.POST("/classify", handler.ClassifyFracture)

	// Protected routes - require authentication (User or Admin)
	protected := api.Group("")
	protected.Use(auth.Middleware(authValidator))
	protected.Use(auth.UserSyncMiddleware(userRepo))
	protected.GET("/me", GetCurrentUser)

	// Admin-only routes - require admin role
	analytics := api.Group("/analytics")
	analytics.Use(auth.Middleware(authValidator))
	analytics.Use(auth.UserSyncMiddleware(userRepo))
	analytics.Use(auth.RequireRole(auth.RoleAdmin))
	registerAnalyticsRoutes(analytics, handler)

	admin := api.Group("/admin")
	admin.Use(auth.Middleware(authValidator))
	admin.Use(auth.UserSyncMiddleware(userRepo))
	admin.Use(auth.RequireRole(auth.RoleAdmin))
	admin.GET("/flow-diagram", handler.FlowDiagram)
}

// setupPublicRoutes configures routes without authentication (development mode).
// Every route runs as the mock dev admin (auth.DevMiddleware).
func setupPublicRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	userRepo auth.UserService,
) {
	api.Use(auth.DevMiddleware(userRepo))
	api.GET("/me", GetCurrentUser)
	api.POST("/classify", handler.ClassifyFracture)
	api.GET("/admin/flow-diagram", handler.FlowDiagram)

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
	classifier service.ClassificationService,
	storage storage.Storage,
	statsService *service.StatisticsService,
) {
	// Create specialized handlers for different concerns
	adminHandler := NewCaseAdminHandler(caseRepo, storage, statsService, studyService)
	imageHandler := NewCaseImageHandler(caseRepo, storage, defaultSignedURLDuration)
	accessHandler := NewCaseAccessHandler(caseRepo, responseRepo)
	responseHandler := NewCaseResponseHandler(caseRepo, responseRepo, studyService, classifier, storage, defaultSignedURLDuration)

	// Create analytics handler with statistics service
	analyticsHandler := NewCaseAnalyticsHandler(caseRepo, responseRepo, analyticsRepo, statsService)

	// Create user handler for profile endpoints
	userHandler := NewUserHandler(userRepoForProfile)

	api := router.Group("/api")

	if authValidator != nil {
		setupProtectedCaseRoutes(api, authValidator, userRepo, adminHandler, imageHandler, accessHandler, responseHandler, analyticsHandler, userHandler)
	} else {
		setupPublicCaseRoutes(api, userRepo, adminHandler, imageHandler, accessHandler, responseHandler, analyticsHandler, userHandler)
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
	userRepo auth.UserService,
	adminHandler *CaseAdminHandler,
	imageHandler *CaseImageHandler,
	accessHandler *CaseAccessHandler,
	responseHandler *CaseResponseHandler,
	analyticsHandler *CaseAnalyticsHandler,
	userHandler *UserHandler,
) {
	api.Use(auth.DevMiddleware(userRepo))
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
	userRepoForLookup repository.UserRepository,
	studyRepo repository.StudyRepository,
	studyResponseRepo repository.StudyResponseRepository,
	caseRepo repository.CaseRepository,
	studyService service.StudyService,
) {
	studyHandler := NewStudyHandler(studyRepo, studyResponseRepo, caseRepo, userRepoForLookup, studyService)

	api := router.Group("/api")

	if authValidator != nil {
		setupProtectedStudyRoutes(api, authValidator, userRepo, studyHandler)
	} else {
		setupPublicStudyRoutes(api, userRepo, studyHandler)
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
	userRepo auth.UserService,
	studyHandler *StudyHandler,
) {
	api.Use(auth.DevMiddleware(userRepo))
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
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// MaxJSONBodySize caps request bodies on non-upload routes.
const MaxJSONBodySize = 1 << 20 // 1 MiB

// imageUploadRoute is the only route allowed a body larger than MaxJSONBodySize.
const imageUploadRoute = "/api/admin/cases/:id/images"

// BodyLimitMiddleware rejects oversized request bodies with 413. The image
// upload route gets MaxImageSize, everything else MaxJSONBodySize. The limit
// follows the matched route, not the client's Content-Type.
func BodyLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		limit := int64(MaxJSONBodySize)
		if c.FullPath() == imageUploadRoute {
			limit = MaxImageSize
		}

		tooLarge := func() {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, ErrorResponse{
				Code:    CodeInvalidInput,
				Message: fmt.Sprintf("Request body exceeds %d bytes", limit),
			})
		}

		if c.Request.ContentLength > limit {
			tooLarge()
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)

		// Unknown length (chunked): handlers would turn the read error into a
		// 400, so read it here to report 413. Bounded by limit.
		if c.Request.ContentLength < 0 {
			b, err := io.ReadAll(c.Request.Body)
			var maxErr *http.MaxBytesError
			if errors.As(err, &maxErr) {
				tooLarge()
				return
			}
			if err != nil {
				_ = c.AbortWithError(http.StatusBadRequest, err)
				return
			}
			c.Request.Body = io.NopCloser(bytes.NewReader(b))
		}

		c.Next()
	}
}
