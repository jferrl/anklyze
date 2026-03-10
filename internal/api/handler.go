package api

import (
	"context"
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/timeutil"
)

// AuditRepository defines the audit persistence interface needed by the handler.
type AuditRepository interface {
	Save(ctx context.Context, entry *domain.AuditEntry) error
	Close() error
}

// AnalyticsRepository defines the analytics query interface needed by the handler.
type AnalyticsRepository interface {
	GetSummary(from, to time.Time) (*domain.AnalyticsSummary, error)
	GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.TrendData, error)
	GetDistribution(system string, from, to time.Time) (*domain.ClassificationDistribution, error)
}

// Handler handles HTTP requests
type Handler struct {
	classificationService service.ClassificationService
	auditRepo             AuditRepository
	analyticsRepo         AnalyticsRepository
	dbHealthy             bool         // Whether database connection succeeded at startup
	jwksReady             *atomic.Bool // Whether JWKS endpoint is reachable; nil means not tracked (defaults to ready)
}

// NewHandler creates a new Handler
func NewHandler(
	classificationService service.ClassificationService,
	auditRepo AuditRepository,
	analyticsRepo AnalyticsRepository,
	dbHealthy bool,
	jwksReady *atomic.Bool,
) *Handler {
	return &Handler{
		classificationService: classificationService,
		auditRepo:             auditRepo,
		analyticsRepo:         analyticsRepo,
		dbHealthy:             dbHealthy,
		jwksReady:             jwksReady,
	}
}

// getLanguage extracts the language from the Accept-Language header
func getLanguage(c *gin.Context) i18n.Language {
	return i18n.ParseAcceptLanguage(c.GetHeader("Accept-Language"))
}

// ClassifyFracture handles POST /api/classify
// @Summary Classify an ankle fracture
// @Description Classifies an ankle fracture according to Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek systems. Language is determined from the Accept-Language header.
// @Tags Classification
// @Accept json
// @Produce json
// @Param input body domain.FractureInput true "Fracture input parameters"
// @Success 200 {object} domain.ClassificationResult "Classification result"
// @Failure 400 {object} map[string]string "Invalid input"
// @Failure 500 {object} map[string]string "Classification error"
// @Router /api/classify [post]
func (h *Handler) ClassifyFracture(c *gin.Context) {
	startTime := time.Now()
	lang := getLanguage(c)

	var input domain.FractureInput
	if err := c.ShouldBindJSON(&input); err != nil {
		HandleError(c, domain.ErrInvalidInput, "Invalid request body")
		return
	}

	result, err := h.classificationService.Classify(c.Request.Context(), input)
	if err != nil {
		HandleError(c, err, "Classification failed")
		return
	}

	// Non-blocking audit logging
	durationMS := time.Since(startTime).Milliseconds()
	auditEntry, err := domain.NewAuditEntry(
		c.ClientIP(),
		c.GetHeader("User-Agent"),
		string(lang),
		input,
		*result,
		durationMS,
	)
	if err != nil {
		slog.Warn("failed to create audit entry", "error", err)
	} else {
		// Use request context for audit save - non-blocking due to buffered channel
		if err := h.auditRepo.Save(c.Request.Context(), auditEntry); err != nil {
			slog.Warn("failed to save audit entry", "error", err)
		}
	}

	c.JSON(http.StatusOK, result)
}

// HealthCheck handles GET /health
// @Summary Health check
// @Description Returns the health status of the API
// @Tags System
// @Produce json
// @Success 200 {object} map[string]string "Health status"
// @Router /health [get]
func (h *Handler) HealthCheck(c *gin.Context) {
	dbStatus := "healthy"
	if !h.dbHealthy {
		dbStatus = "degraded"
	}
	jwksStatus := "ready"
	if h.jwksReady != nil && !h.jwksReady.Load() {
		jwksStatus = "pending"
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "db": dbStatus, "jwks": jwksStatus})
}

// parseDateRange parses from/to query parameters with defaults.
func parseDateRange(c *gin.Context) (time.Time, time.Time) {
	dr := timeutil.ParseDateRange(c.Query("from"), c.Query("to"))
	return dr.From, dr.To
}

// GetAnalyticsSummary handles GET /api/analytics/summary
// @Summary Get analytics summary
// @Description Returns aggregated classification statistics for a time period
// @Tags Analytics
// @Produce json
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Success 200 {object} domain.AnalyticsSummary "Analytics summary"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/summary [get]
func (h *Handler) GetAnalyticsSummary(c *gin.Context) {
	from, to := parseDateRange(c)

	summary, err := h.analyticsRepo.GetSummary(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetAnalyticsTrends handles GET /api/analytics/trends
// @Summary Get classification trends
// @Description Returns time-series classification data with configurable granularity
// @Tags Analytics
// @Produce json
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Param granularity query string false "Time granularity (day, week, month)" default(day)
// @Success 200 {object} domain.TrendData "Trend data"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/trends [get]
func (h *Handler) GetAnalyticsTrends(c *gin.Context) {
	from, to := parseDateRange(c)
	granularity := domain.ParseGranularity(c.Query("granularity"))

	trends, err := h.analyticsRepo.GetTrends(from, to, granularity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics trends"})
		return
	}

	c.JSON(http.StatusOK, trends)
}

// GetAnalyticsDistribution handles GET /api/analytics/distribution/:system
// @Summary Get classification distribution
// @Description Returns detailed distribution for a specific classification system
// @Tags Analytics
// @Produce json
// @Param system path string true "Classification system (danis-weber, lauge-hansen, ao-ota)"
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Success 200 {object} domain.ClassificationDistribution "Distribution data"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/distribution/{system} [get]
func (h *Handler) GetAnalyticsDistribution(c *gin.Context) {
	system := c.Param("system")
	from, to := parseDateRange(c)

	distribution, err := h.analyticsRepo.GetDistribution(system, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get distribution"})
		return
	}

	c.JSON(http.StatusOK, distribution)
}
