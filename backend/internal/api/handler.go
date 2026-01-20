package api

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/service"
)

// Handler handles HTTP requests
type Handler struct {
	classifier    service.ClassifierService
	auditRepo     repository.AuditRepository
	analyticsRepo repository.AnalyticsRepository
}

// NewHandler creates a new Handler
func NewHandler(classifier service.ClassifierService, auditRepo repository.AuditRepository, analyticsRepo repository.AnalyticsRepository) *Handler {
	return &Handler{
		classifier:    classifier,
		auditRepo:     auditRepo,
		analyticsRepo: analyticsRepo,
	}
}

// getLanguage extracts the language from the request
func getLanguage(c *gin.Context) i18n.Language {
	// Query parameter takes precedence
	if lang := c.Query("lang"); lang != "" {
		return i18n.ParseLanguage(lang)
	}
	// Fall back to Accept-Language header
	return i18n.ParseAcceptLanguage(c.GetHeader("Accept-Language"))
}

// ClassifyFracture handles POST /api/classify
// @Summary Classify an ankle fracture
// @Description Classifies an ankle fracture according to Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek systems
// @Tags Classification
// @Accept json
// @Produce json
// @Param lang query string false "Language (en, es)" default(en)
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
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, i18n.KeyErrorInvalidInput) + err.Error(),
		})
		return
	}

	result, err := h.classifier.Classify(input, lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, i18n.KeyErrorClassification) + err.Error(),
		})
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
		log.Printf("WARN: failed to create audit entry: %v", err)
	} else {
		go func() {
			if err := h.auditRepo.Save(auditEntry); err != nil {
				log.Printf("WARN: failed to save audit entry: %v", err)
			}
		}()
	}

	c.JSON(http.StatusOK, result)
}

// SelectOption represents an option for form selects
type SelectOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// Question represents a form question
type Question struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
}

// FormOptions represents all available form options
type FormOptions struct {
	// Questions
	Questions map[string]Question `json:"questions"`

	// Labels
	Labels map[string]string `json:"labels"`

	// Involved malleoli options (first question)
	InvolvedMalleoli []SelectOption `json:"involved_malleoli"`

	// Posterior fracture type options (Bartonicek)
	PosteriorFractureTypes []SelectOption `json:"posterior_fracture_types"`

	// Medial morphology options
	MedialMorphology []SelectOption `json:"medial_morphology"`

	// Fibular level options
	FibularLevels []SelectOption `json:"fibular_levels"`

	// Lateral morphology options
	LateralMorphology []SelectOption `json:"lateral_morphology"`

	// Suprasindesmal type options
	SuprasindesmalTypes []SelectOption `json:"suprasindesmal_types"`
}

// GetOptions handles GET /api/options
// @Summary Get form options
// @Description Returns localized form options for the classification form
// @Tags Classification
// @Produce json
// @Param lang query string false "Language (en, es)" default(en)
// @Success 200 {object} FormOptions "Form options"
// @Router /api/options [get]
func (h *Handler) GetOptions(c *gin.Context) {
	lang := getLanguage(c)

	options := FormOptions{
		Questions: map[string]Question{
			"involved_malleoli": {
				ID:    "involved_malleoli",
				Title: i18n.T(lang, i18n.KeyQuestionMalleoli),
			},
			"posterior_fracture_type": {
				ID:    "posterior_fracture_type",
				Title: i18n.T(lang, i18n.KeyQuestionPosteriorType),
			},
			"medial_morphology": {
				ID:    "medial_morphology",
				Title: i18n.T(lang, i18n.KeyQuestionMedialMorphology),
			},
			"medial_morphology_lm": {
				ID:    "medial_morphology_lm",
				Title: i18n.T(lang, i18n.KeyQuestionMedialMorphologyLM),
			},
			"fibular_level": {
				ID:    "fibular_level",
				Title: i18n.T(lang, i18n.KeyQuestionFibularLevel),
			},
			"fibular_level_lm": {
				ID:    "fibular_level_lm",
				Title: i18n.T(lang, i18n.KeyQuestionFibularLevelLM),
			},
			"fibular_level_tri": {
				ID:    "fibular_level_tri",
				Title: i18n.T(lang, i18n.KeyQuestionFibularLevelTri),
			},
			"lateral_morphology": {
				ID:    "lateral_morphology",
				Title: i18n.T(lang, i18n.KeyQuestionLateralMorphology),
			},
			"suprasindesmal_type": {
				ID:    "suprasindesmal_type",
				Title: i18n.T(lang, i18n.KeyQuestionSuprasindesmalType),
			},
			"fibula_infrasindesmal_transverse": {
				ID:    "fibula_infrasindesmal_transverse",
				Title: i18n.T(lang, i18n.KeyQuestionFibulaInfraTransverse),
			},
		},
		Labels: map[string]string{
			"yes":  i18n.T(lang, i18n.KeyLabelYes),
			"no":   i18n.T(lang, i18n.KeyLabelNo),
			"high": i18n.T(lang, i18n.KeyLabelHigh),
			"low":  i18n.T(lang, i18n.KeyLabelLow),
		},
		InvolvedMalleoli: []SelectOption{
			{Value: "posterior_only", Label: i18n.T(lang, i18n.KeyOptionPosteriorOnly)},
			{Value: "medial_only", Label: i18n.T(lang, i18n.KeyOptionMedialOnly)},
			{Value: "lateral_only", Label: i18n.T(lang, i18n.KeyOptionLateralOnly)},
			{Value: "medial_posterior", Label: i18n.T(lang, i18n.KeyOptionMedialPosterior)},
			{Value: "lateral_posterior", Label: i18n.T(lang, i18n.KeyOptionLateralPosterior)},
			{Value: "lateral_medial", Label: i18n.T(lang, i18n.KeyOptionLateralMedial)},
			{Value: "trimaleolar", Label: i18n.T(lang, i18n.KeyOptionTrimaleolar)},
		},
		PosteriorFractureTypes: []SelectOption{
			{Value: "extraincisural", Label: i18n.T(lang, i18n.KeyOptionPosteriorExtraincisural)},
			{Value: "posterolateral", Label: i18n.T(lang, i18n.KeyOptionPosteriorPosterolateral)},
			{Value: "posteromedial_posterolateral", Label: i18n.T(lang, i18n.KeyOptionPosteriorPosteromedialPosterolateral)},
			{Value: "large_posterolateral", Label: i18n.T(lang, i18n.KeyOptionPosteriorLargePosterolateral)},
		},
		MedialMorphology: []SelectOption{
			{Value: "oblique", Label: i18n.T(lang, i18n.KeyOptionMedialOblique)},
			{Value: "transverse", Label: i18n.T(lang, i18n.KeyOptionMedialTransverse)},
		},
		FibularLevels: []SelectOption{
			{Value: "infrasindesmal", Label: i18n.T(lang, i18n.KeyOptionFibularInfrasindesmal)},
			{Value: "transindesmal", Label: i18n.T(lang, i18n.KeyOptionFibularTransindesmal)},
			{Value: "suprasindesmal", Label: i18n.T(lang, i18n.KeyOptionFibularSuprasindesmal)},
		},
		LateralMorphology: []SelectOption{
			{Value: "transverse", Label: i18n.T(lang, i18n.KeyOptionLateralTransverse)},
			{Value: "oblique", Label: i18n.T(lang, i18n.KeyOptionLateralOblique)},
			{Value: "spiral", Label: i18n.T(lang, i18n.KeyOptionLateralSpiral)},
		},
		SuprasindesmalTypes: []SelectOption{
			{Value: "simple_diaphyseal", Label: i18n.T(lang, i18n.KeyOptionSupraSimple)},
			{Value: "multifragmentary", Label: i18n.T(lang, i18n.KeyOptionSupraMultifragmentary)},
			{Value: "proximal", Label: i18n.T(lang, i18n.KeyOptionSupraProximal)},
		},
	}

	c.JSON(http.StatusOK, options)
}

// HealthCheck handles GET /health
// @Summary Health check
// @Description Returns the health status of the API
// @Tags System
// @Produce json
// @Success 200 {object} map[string]string "Health status"
// @Router /health [get]
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// parseDateRange parses from/to query parameters with defaults.
func parseDateRange(c *gin.Context) (time.Time, time.Time) {
	now := time.Now()
	defaultFrom := now.AddDate(0, 0, -30) // 30 days ago
	defaultTo := now

	from := defaultFrom
	to := defaultTo

	if fromStr := c.Query("from"); fromStr != "" {
		if parsed, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = parsed
		}
	}

	if toStr := c.Query("to"); toStr != "" {
		if parsed, err := time.Parse("2006-01-02", toStr); err == nil {
			// Set to end of day
			to = parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}

	return from, to
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
