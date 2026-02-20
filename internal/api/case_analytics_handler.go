package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// CaseAnalyticsHandler handles analytics and export operations.
type CaseAnalyticsHandler struct {
	caseRepo          repository.CaseRepository
	responseRepo      repository.CaseResponseRepository
	analyticsRepo     repository.CaseAnalyticsRepository
	statsService      *StatisticsService
	divergenceService DivergenceService
}

// NewCaseAnalyticsHandler creates a new case analytics handler.
func NewCaseAnalyticsHandler(
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	analyticsRepo repository.CaseAnalyticsRepository,
	statsService *StatisticsService,
	divergenceService DivergenceService,
) *CaseAnalyticsHandler {
	return &CaseAnalyticsHandler{
		caseRepo:          caseRepo,
		responseRepo:      responseRepo,
		analyticsRepo:     analyticsRepo,
		statsService:      statsService,
		divergenceService: divergenceService,
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

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
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

	metrics, err := (*h.statsService).CalculateReliabilityMetrics(responses, cs)
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

// GetDivergenceAnalysis handles GET /api/admin/cases/:id/divergence
// Returns divergence analysis showing where users deviate from the gold standard path.
func (h *CaseAnalyticsHandler) GetDivergenceAnalysis(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	if h.divergenceService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "divergence analysis not available"})
		return
	}

	report, err := h.divergenceService.AnalyzeDivergence(c.Request.Context(), caseID)
	if err != nil {
		if err.Error() == "case has no gold standard input stored" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "divergence analysis requires gold standard input",
				"hint":  "set the reference input (FractureInput) when creating or updating the case",
			})
			return
		}
		if err.Error() == "case not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
			return
		}
		slog.Error("failed to analyze divergence", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to analyze divergence"})
		return
	}

	c.JSON(http.StatusOK, report)
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
	c.Writer.WriteString("response_id,user_id,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek\n")

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
		c.Writer.WriteString(line)
	}
}

// ExportDetailedResponses handles GET /api/admin/cases/:id/export/detailed
// Exports responses with user expertise and gold standard comparison.
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

	// Parse reference classification if exists
	var refClass *domain.ClassificationResult
	if cs.HasReferenceClassification() {
		refClass, _ = cs.GetReferenceClassification()
	}

	// Generate CSV
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"case_%s_detailed.csv\"", caseID.String()[:8]))

	// Write header
	header := "response_id,user_email,years_experience,specialty,training_level,institution,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek"
	if refClass != nil {
		header += ",dw_correct,lh_correct,ao_correct,bt_correct"
	}
	c.Writer.WriteString(header + "\n")

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

		// Add gold standard comparison if reference exists
		if refClass != nil {
			dwCorrect, lhCorrect, aoCorrect, btCorrect := "", "", "", ""

			if r.DanisWeberType != nil && refClass.DanisWeber != nil {
				if *r.DanisWeberType == string(refClass.DanisWeber.Type) {
					dwCorrect = "1"
				} else {
					dwCorrect = "0"
				}
			}
			if r.LaugeHansenType != nil && refClass.LaugeHansen != nil {
				if *r.LaugeHansenType == string(refClass.LaugeHansen.Type) {
					lhCorrect = "1"
				} else {
					lhCorrect = "0"
				}
			}
			if r.AOOTACode != nil && refClass.AOOTA != nil {
				if *r.AOOTACode == string(refClass.AOOTA.Code) {
					aoCorrect = "1"
				} else {
					aoCorrect = "0"
				}
			}
			if r.BartonicekType != nil && refClass.Bartonicek != nil {
				if *r.BartonicekType == string(refClass.Bartonicek.Type) {
					btCorrect = "1"
				} else {
					btCorrect = "0"
				}
			}

			line += fmt.Sprintf(",%s,%s,%s,%s", dwCorrect, lhCorrect, aoCorrect, btCorrect)
		}

		c.Writer.WriteString(line + "\n")
	}
}
