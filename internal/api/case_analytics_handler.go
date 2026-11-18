package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
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
	id, _, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	summary, err := h.analyticsRepo.GetSummary(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "failed to get analytics")
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetReliabilityMetrics handles GET /api/admin/cases/:id/reliability
func (h *CaseAnalyticsHandler) GetReliabilityMetrics(c *gin.Context) {
	caseID, _, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	// Get all responses for calculation
	responses, err := h.responseRepo.GetAllByCase(c.Request.Context(), caseID)
	if err != nil {
		HandleError(c, err, "failed to get responses")
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
		respond(c, http.StatusInternalServerError, CodeInternalError, "statistics service not available")
		return
	}

	metrics, err := h.statsService.CalculateReliabilityMetrics(caseID, responses)
	if err != nil {
		HandleError(c, err, "failed to calculate metrics")
		return
	}

	c.JSON(http.StatusOK, ReliabilityMetricsResponse{
		ReliabilityMetrics: metrics,
		CalculatedAt:       time.Now(),
	})
}

// GetGoldStandardAccuracy handles GET /api/admin/cases/:id/accuracy
func (h *CaseAnalyticsHandler) GetGoldStandardAccuracy(c *gin.Context) {
	caseID, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	responses, err := h.responseRepo.GetAllByCase(c.Request.Context(), caseID)
	if err != nil {
		HandleError(c, err, "failed to get responses")
		return
	}

	if h.statsService == nil {
		respond(c, http.StatusInternalServerError, CodeInternalError, "statistics service not available")
		return
	}

	accuracy, err := h.statsService.CalculateGoldStandardAccuracy(cs, responses)
	if err != nil {
		HandleError(c, err, "failed to calculate accuracy")
		return
	}

	c.JSON(http.StatusOK, accuracy)
}

// ExportResponses handles GET /api/admin/cases/:id/export
func (h *CaseAnalyticsHandler) ExportResponses(c *gin.Context) {
	caseID, _, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	// Get all responses without artificial limit
	responses, err := h.responseRepo.GetAllByCase(c.Request.Context(), caseID)
	if err != nil {
		HandleError(c, err, "failed to export responses")
		return
	}

	w := newCSVWriter(c, fmt.Sprintf("case_%s_responses.csv", caseID.String()[:8]))
	defer w.Flush()

	if err := w.Write([]string{"response_id", "user_id", "created_at", "time_taken_ms", "danis_weber", "lauge_hansen", "ao_ota", "bartonicek"}); err != nil {
		return
	}

	for _, r := range responses {
		if err := w.Write([]string{
			r.ID.String(),
			r.UserID.String(),
			r.CreatedAt.Format(time.RFC3339),
			strconv.FormatInt(r.TimeTakenMS, 10),
			csvTextPtr(r.DanisWeberType),
			csvTextPtr(r.LaugeHansenType),
			csvTextPtr(r.AOOTACode),
			csvTextPtr(r.BartonicekType),
		}); err != nil {
			return
		}
	}
}

// ExportDetailedResponses handles GET /api/admin/cases/:id/export/detailed
// Exports responses with user expertise data.
func (h *CaseAnalyticsHandler) ExportDetailedResponses(c *gin.Context) {
	caseID, _, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	// Get responses with user expertise
	responses, err := h.responseRepo.GetResponsesWithUserExpertise(c.Request.Context(), caseID)
	if err != nil {
		HandleError(c, err, "failed to export responses")
		return
	}

	w := newCSVWriter(c, fmt.Sprintf("case_%s_detailed.csv", caseID.String()[:8]))
	defer w.Flush()

	if err := w.Write([]string{"response_id", "user_email", "years_experience", "specialty", "training_level", "institution", "created_at", "time_taken_ms", "danis_weber", "lauge_hansen", "ao_ota", "bartonicek"}); err != nil {
		return
	}

	for _, r := range responses {
		yearsExp := ""
		if r.YearsExperience != nil {
			yearsExp = strconv.Itoa(*r.YearsExperience)
		}

		if err := w.Write([]string{
			r.ID.String(),
			csvText(r.UserEmail),
			yearsExp,
			csvTextPtr(r.Specialty),
			csvTextPtr(r.TrainingLevel),
			csvTextPtr(r.Institution),
			r.CreatedAt.Format(time.RFC3339),
			strconv.FormatInt(r.TimeTakenMS, 10),
			csvTextPtr(r.DanisWeberType),
			csvTextPtr(r.LaugeHansenType),
			csvTextPtr(r.AOOTACode),
			csvTextPtr(r.BartonicekType),
		}); err != nil {
			return
		}
	}
}
