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
