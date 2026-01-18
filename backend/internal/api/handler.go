package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/fratures/internal/domain"
	"github.com/jferrl/fratures/internal/i18n"
	"github.com/jferrl/fratures/internal/service"
)

// Handler handles HTTP requests
type Handler struct {
	classifier service.ClassifierService
}

// NewHandler creates a new Handler
func NewHandler(classifier service.ClassifierService) *Handler {
	return &Handler{classifier: classifier}
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
func (h *Handler) ClassifyFracture(c *gin.Context) {
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
	Description string `json:"description"`
}

// FormOptions represents all available form options
type FormOptions struct {
	// Questions
	Questions map[string]Question `json:"questions"`

	// Labels for checkboxes
	Labels map[string]string `json:"labels"`

	// Medial morphology options (for complex path with medial + lateral)
	MedialMorphology []SelectOption `json:"medial_morphology"`

	// Fibular level options
	FibularLevels []SelectOption `json:"fibular_levels"`

	// Fibular morphology options
	FibularMorphology []SelectOption `json:"fibular_morphology"`

	// Weber C fracture type options (for suprasyndesmal)
	WeberCFractureType []SelectOption `json:"weber_c_fracture_type"`

	// Involved malleoli options (for SA/transverse pattern)
	InvolvedMalleoliSA []SelectOption `json:"involved_malleoli_sa"`

	// Involved malleoli options (for SER/spiral pattern)
	InvolvedMalleoliSER []SelectOption `json:"involved_malleoli_ser"`

	// Bartonicek type options (for posterior malleolus)
	BartonicekTypes []SelectOption `json:"bartonicek_types"`
}

// GetOptions handles GET /api/options
func (h *Handler) GetOptions(c *gin.Context) {
	lang := getLanguage(c)

	options := FormOptions{
		Questions: map[string]Question{
			"malleoli": {
				ID:          "malleoli",
				Title:       i18n.T(lang, i18n.KeyQuestionMalleoli),
				Description: i18n.T(lang, i18n.KeyQuestionMalleoliDesc),
			},
			"posterior_type": {
				ID:          "posterior_type",
				Title:       i18n.T(lang, i18n.KeyQuestionPosteriorType),
				Description: i18n.T(lang, i18n.KeyQuestionPosteriorTypeDesc),
			},
			"fibular_level": {
				ID:          "fibular_level",
				Title:       i18n.T(lang, i18n.KeyQuestionFibularLevel),
				Description: i18n.T(lang, i18n.KeyQuestionFibularLevelDesc),
			},
			"medial_morphology": {
				ID:          "medial_morphology",
				Title:       i18n.T(lang, i18n.KeyQuestionMedialMorphology),
				Description: i18n.T(lang, i18n.KeyQuestionMedialMorphDesc),
			},
			"fibula_transverse": {
				ID:          "fibula_transverse",
				Title:       i18n.T(lang, i18n.KeyQuestionFibulaTransverse),
				Description: "",
			},
			"fibular_morphology": {
				ID:          "fibular_morphology",
				Title:       i18n.T(lang, i18n.KeyQuestionFibularMorphology),
				Description: "",
			},
			"weber_c_type": {
				ID:          "weber_c_type",
				Title:       i18n.T(lang, i18n.KeyQuestionWeberCType),
				Description: "",
			},
			"involved_malleoli": {
				ID:          "involved_malleoli",
				Title:       i18n.T(lang, i18n.KeyQuestionInvolvedMalleoli),
				Description: "",
			},
		},
		Labels: map[string]string{
			"medial_malleolus":    i18n.T(lang, i18n.KeyLabelMedialMalleolus),
			"lateral_malleolus":   i18n.T(lang, i18n.KeyLabelLateralMalleolus),
			"posterior_malleolus": i18n.T(lang, i18n.KeyLabelPosteriorMalleolus),
			"yes":                 i18n.T(lang, i18n.KeyLabelYes),
			"no":                  i18n.T(lang, i18n.KeyLabelNo),
		},
		MedialMorphology: []SelectOption{
			{Value: "oblique_vertical", Label: i18n.T(lang, i18n.KeyOptionMedialObliqueVertical)},
			{Value: "transverse", Label: i18n.T(lang, i18n.KeyOptionMedialTransverse)},
			{Value: "doubtful", Label: i18n.T(lang, i18n.KeyOptionMedialDoubtful)},
		},
		FibularLevels: []SelectOption{
			{Value: "infrasindesmal", Label: i18n.T(lang, i18n.KeyOptionFibularInfrasindesmal)},
			{Value: "transindesmal", Label: i18n.T(lang, i18n.KeyOptionFibularTransindesmal)},
			{Value: "suprasindesmal_high", Label: i18n.T(lang, i18n.KeyOptionFibularSuprasindesmalHigh)},
			{Value: "doubtful", Label: i18n.T(lang, i18n.KeyOptionFibularDoubtful)},
		},
		FibularMorphology: []SelectOption{
			{Value: "transverse", Label: i18n.T(lang, i18n.KeyOptionFibularMorphTransverse)},
			{Value: "oblique", Label: i18n.T(lang, i18n.KeyOptionFibularMorphOblique)},
			{Value: "spiral", Label: i18n.T(lang, i18n.KeyOptionFibularMorphSpiral)},
		},
		WeberCFractureType: []SelectOption{
			{Value: "simple_diaphyseal", Label: i18n.T(lang, i18n.KeyOptionWeberCSimple)},
			{Value: "multifragmentary", Label: i18n.T(lang, i18n.KeyOptionWeberCMultifragment)},
			{Value: "proximal", Label: i18n.T(lang, i18n.KeyOptionWeberCProximal)},
		},
		InvolvedMalleoliSA: []SelectOption{
			{Value: "unifocal", Label: i18n.T(lang, i18n.KeyOptionInvolvedUnifocal)},
			{Value: "bifocal", Label: i18n.T(lang, i18n.KeyOptionInvolvedBifocal)},
			{Value: "trifocal", Label: i18n.T(lang, i18n.KeyOptionInvolvedTrifocal)},
		},
		InvolvedMalleoliSER: []SelectOption{
			{Value: "lateral_only", Label: i18n.T(lang, i18n.KeyOptionInvolvedLateralOnly)},
			{Value: "lateral_medial", Label: i18n.T(lang, i18n.KeyOptionInvolvedLateralMedial)},
			{Value: "lateral_medial_posterior", Label: i18n.T(lang, i18n.KeyOptionInvolvedLateralMedialPost)},
		},
		BartonicekTypes: []SelectOption{
			{Value: "type_1", Label: i18n.T(lang, i18n.KeyOptionBartonicek1)},
			{Value: "type_2", Label: i18n.T(lang, i18n.KeyOptionBartonicek2)},
			{Value: "type_3", Label: i18n.T(lang, i18n.KeyOptionBartonicek3)},
			{Value: "type_4", Label: i18n.T(lang, i18n.KeyOptionBartonicek4)},
		},
	}

	c.JSON(http.StatusOK, options)
}

// HealthCheck handles GET /health
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
