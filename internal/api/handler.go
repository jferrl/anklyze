package api

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
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
	jwksReady             *atomic.Bool // Whether JWKS endpoint is reachable; nil means not tracked (defaults to ready)
}

// NewHandler creates a new Handler
func NewHandler(
	classificationService service.ClassificationService,
	auditRepo AuditRepository,
	analyticsRepo AnalyticsRepository,
	jwksReady *atomic.Bool,
) *Handler {
	return &Handler{
		classificationService: classificationService,
		auditRepo:             auditRepo,
		analyticsRepo:         analyticsRepo,
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

	// The engine maps unknown or missing values to "none_selected", so reject them here.
	if err := validate.Struct(input); err != nil {
		var msgs []string
		for _, f := range validationFieldErrors(err) {
			msgs = append(msgs, f["field"]+" "+f["error"])
		}
		invalidInput(c, "invalid fracture input: "+strings.Join(msgs, "; "))
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
	jwksStatus := "ready"
	if h.jwksReady != nil && !h.jwksReady.Load() {
		jwksStatus = "pending"
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "jwks": jwksStatus})
}

// analyticsSystems are the classification systems GET /api/analytics/distribution accepts.
var analyticsSystems = map[string]bool{"danis-weber": true, "lauge-hansen": true, "ao-ota": true}

// invalidInput writes a 400 in the shared error shape.
func invalidInput(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, ErrorResponse{Code: CodeInvalidInput, Message: msg})
}

// parseDateRange parses and validates the from/to query parameters. On failure it
// writes a 400 and returns false.
func parseDateRange(c *gin.Context) (from, to time.Time, ok bool) {
	dr, err := timeutil.ParseDateRange(c.Query("from"), c.Query("to"))
	if err != nil {
		invalidInput(c, err.Error())
		return time.Time{}, time.Time{}, false
	}
	return dr.From, dr.To, true
}

// GetAnalyticsSummary handles GET /api/analytics/summary
func (h *Handler) GetAnalyticsSummary(c *gin.Context) {
	from, to, ok := parseDateRange(c)
	if !ok {
		return
	}

	summary, err := h.analyticsRepo.GetSummary(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetAnalyticsTrends handles GET /api/analytics/trends
func (h *Handler) GetAnalyticsTrends(c *gin.Context) {
	from, to, ok := parseDateRange(c)
	if !ok {
		return
	}

	// ParseGranularity falls back to day, so a changed round trip means an unknown value.
	raw := c.Query("granularity")
	granularity := domain.ParseGranularity(raw)
	if raw != "" && string(granularity) != raw {
		invalidInput(c, "granularity must be one of: day, week, month")
		return
	}

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
	if !analyticsSystems[system] {
		invalidInput(c, "system must be one of: danis-weber, lauge-hansen, ao-ota")
		return
	}
	from, to, ok := parseDateRange(c)
	if !ok {
		return
	}

	distribution, err := h.analyticsRepo.GetDistribution(system, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get distribution"})
		return
	}

	c.JSON(http.StatusOK, distribution)
}
