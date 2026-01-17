package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/fratures/internal/domain"
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

// ClassifyFracture handles POST /api/classify
func (h *Handler) ClassifyFracture(c *gin.Context) {
	var input domain.FractureInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Entrada inválida: " + err.Error(),
		})
		return
	}

	result, err := h.classifier.Classify(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Error en la clasificación: " + err.Error(),
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

// FormOptions represents all available form options
type FormOptions struct {
	// Question 1: Medial malleolus morphology
	MedialMorphology []SelectOption `json:"medial_morphology"`

	// Question 2: Fibular fracture level
	FibularLevels []SelectOption `json:"fibular_levels"`

	// Question 3: Fibular morphology
	FibularMorphology []SelectOption `json:"fibular_morphology"`

	// Question 4: SER fragments
	SERFragments []SelectOption `json:"ser_fragments"`

	// Question 5a: Fracture involvement (for Weber A/B)
	FractureInvolvement []SelectOption `json:"fracture_involvement"`

	// Question 5b: Weber C fracture type (for Weber C)
	WeberCFractureType []SelectOption `json:"weber_c_fracture_type"`
}

// GetOptions handles GET /api/options
func (h *Handler) GetOptions(c *gin.Context) {
	options := FormOptions{
		MedialMorphology: []SelectOption{
			{Value: "none", Label: "Sin fractura del maléolo medial"},
			{Value: "oblique", Label: "Oblicua/Vertical"},
			{Value: "transverse", Label: "Transversal"},
		},
		FibularLevels: []SelectOption{
			{Value: "suprasindesmal_high", Label: "Suprasindesmal Alta (+6cm)"},
			{Value: "transindesmal", Label: "Transindesmal"},
			{Value: "infrasindesmal", Label: "Infrasindesmal"},
			{Value: "doubtful", Label: "Dudoso"},
		},
		FibularMorphology: []SelectOption{
			{Value: "transverse", Label: "Transversa"},
			{Value: "transverse_oblique", Label: "Transversa/Oblicua (baja medial, alta lateral)"},
			{Value: "spiral", Label: "Espiroidea (baja anterior, alta posterior)"},
		},
		SERFragments: []SelectOption{
			{Value: "none", Label: "Sin fragmentos adicionales"},
			{Value: "wagstaffe", Label: "Fragmento de Wagstaffe"},
			{Value: "tillaux_chaput", Label: "Fragmento de Tillaux-Chaput"},
		},
		FractureInvolvement: []SelectOption{
			{Value: "lateral_only", Label: "Aislada lateral (solo peroné)"},
			{Value: "lateral_medial", Label: "Lateral y medial (peroné y tibia)"},
			{Value: "lateral_medial_posterior", Label: "Lateral, medial y posterior"},
		},
		WeberCFractureType: []SelectOption{
			{Value: "simple", Label: "Simple diafisaria"},
			{Value: "multifragmentary", Label: "Multifragmentaria"},
			{Value: "proximal", Label: "Proximal"},
		},
	}

	c.JSON(http.StatusOK, options)
}

// HealthCheck handles GET /health
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
