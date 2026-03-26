package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/repository"
)

// CaseAnalyticsHandler handles analytics and export operations.
type CaseAnalyticsHandler struct {
	caseRepo      repository.CaseRepository
	responseRepo  repository.CaseResponseRepository
	analyticsRepo repository.CaseAnalyticsRepository
	statsService  StatisticsService
}

// NewCaseAnalyticsHandler creates a new case analytics handler.
func NewCaseAnalyticsHandler(
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	analyticsRepo repository.CaseAnalyticsRepository,
	statsService StatisticsService,
) *CaseAnalyticsHandler {
	return &CaseAnalyticsHandler{
		caseRepo:      caseRepo,
		responseRepo:  responseRepo,
		analyticsRepo: analyticsRepo,
		statsService:  statsService,
	}
}

// GetCaseAnalytics handles GET /api/admin/cases/:id/analytics
func (h *CaseAnalyticsHandler) GetCaseAnalytics(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	summary, err := h.analyticsRepo.GetSummary(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case analytics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetReliabilityMetrics handles GET /api/admin/cases/:id/reliability
func (h *CaseAnalyticsHandler) GetReliabilityMetrics(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	// Get all responses for calculation
	responses, err := h.responseRepo.GetAllByCase(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get responses", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get responses"})
		return
	}

	if len(responses) < 2 {
		c.JSON(http.StatusOK, gin.H{
			"message":          "insufficient responses for reliability calculation",
			"response_count":   len(responses),
			"minimum_required": 2,
		})
		return
	}

	// Calculate metrics using statistics service
	if h.statsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "statistics service not available"})
		return
	}

	metrics, err := h.statsService.CalculateReliabilityMetrics(caseID, responses)
	if err != nil {
		slog.Error("failed to calculate reliability metrics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to calculate metrics"})
		return
	}

	c.JSON(http.StatusOK, ReliabilityMetricsResponse{
		ReliabilityMetrics: metrics,
		CalculatedAt:       time.Now(),
	})
}

// ExportResponses handles GET /api/admin/cases/:id/export
func (h *CaseAnalyticsHandler) ExportResponses(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Get all responses (no pagination for export)
	responses, _, err := h.responseRepo.GetByCase(c.Request.Context(), caseID, 10000, 0)
	if err != nil {
		slog.Error("failed to get responses for export", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export responses"})
		return
	}

	// Generate CSV
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"case_%s_responses.csv\"", caseID.String()[:8]))

	// Write CSV header
	if _, err := c.Writer.WriteString("response_id,user_id,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek\n"); err != nil {
		return
	}

	// Write rows
	for _, r := range responses {
		dw := ""
		if r.DanisWeberType != nil {
			dw = *r.DanisWeberType
		}
		lh := ""
		if r.LaugeHansenType != nil {
			lh = *r.LaugeHansenType
		}
		ao := ""
		if r.AOOTACode != nil {
			ao = *r.AOOTACode
		}
		bt := ""
		if r.BartonicekType != nil {
			bt = *r.BartonicekType
		}

		line := fmt.Sprintf("%s,%s,%s,%d,%s,%s,%s,%s\n",
			r.ID.String(),
			r.UserID.String(),
			r.CreatedAt.Format(time.RFC3339),
			r.TimeTakenMS,
			dw, lh, ao, bt,
		)
		if _, err := c.Writer.WriteString(line); err != nil {
			return
		}
	}
}

// ExportDetailedResponses handles GET /api/admin/cases/:id/export/detailed
// Exports responses with user expertise data.
func (h *CaseAnalyticsHandler) ExportDetailedResponses(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Get responses with user expertise
	responses, err := h.responseRepo.GetResponsesWithUserExpertise(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get responses for export", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export responses"})
		return
	}

	// Generate CSV
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"case_%s_detailed.csv\"", caseID.String()[:8]))

	// Write header
	if _, err := c.Writer.WriteString("response_id,user_email,years_experience,specialty,training_level,institution,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek\n"); err != nil {
		return
	}

	// Write rows
	for _, r := range responses {
		dw := ""
		if r.DanisWeberType != nil {
			dw = *r.DanisWeberType
		}
		lh := ""
		if r.LaugeHansenType != nil {
			lh = *r.LaugeHansenType
		}
		ao := ""
		if r.AOOTACode != nil {
			ao = *r.AOOTACode
		}
		bt := ""
		if r.BartonicekType != nil {
			bt = *r.BartonicekType
		}

		yearsExp := ""
		if r.YearsExperience != nil {
			yearsExp = strconv.Itoa(*r.YearsExperience)
		}
		specialty := ""
		if r.Specialty != nil {
			specialty = *r.Specialty
		}
		trainingLevel := ""
		if r.TrainingLevel != nil {
			trainingLevel = *r.TrainingLevel
		}
		institution := ""
		if r.Institution != nil {
			institution = *r.Institution
		}

		line := fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s,%d,%s,%s,%s,%s",
			r.ID.String(),
			r.UserEmail,
			yearsExp,
			specialty,
			trainingLevel,
			institution,
			r.CreatedAt.Format(time.RFC3339),
			r.TimeTakenMS,
			dw, lh, ao, bt,
		)

		if _, err := c.Writer.WriteString(line + "\n"); err != nil {
			return
		}
	}
}
