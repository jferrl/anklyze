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
	// Medial morphology options (for complex path with medial + lateral)
	MedialMorphology []SelectOption `json:"medial_morphology"`

	// Fibular level options
	FibularLevels []SelectOption `json:"fibular_levels"`

	// Fibular morphology options
	FibularMorphology []SelectOption `json:"fibular_morphology"`

	// Weber C fracture type options (for suprasindesmal)
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
	options := FormOptions{
		MedialMorphology: []SelectOption{
			{Value: "oblique_vertical", Label: "Oblicua/Vertical"},
			{Value: "transverse", Label: "Transversal"},
			{Value: "doubtful", Label: "Dudosa"},
		},
		FibularLevels: []SelectOption{
			{Value: "infrasindesmal", Label: "Infrasindesmal"},
			{Value: "transindesmal", Label: "Transindesmal (a nivel de sindesmosis)"},
			{Value: "suprasindesmal_high", Label: "Suprasindesmal Alto (>6cm sobre sindesmosis)"},
			{Value: "doubtful", Label: "Dudoso"},
		},
		FibularMorphology: []SelectOption{
			{Value: "transverse", Label: "Transversal"},
			{Value: "oblique", Label: "Oblicua (baja medial / alta lateral)"},
			{Value: "spiral", Label: "Espiroidea (baja anterior / alta posterior)"},
		},
		WeberCFractureType: []SelectOption{
			{Value: "simple_diaphyseal", Label: "Diafisaria Simple"},
			{Value: "multifragmentary", Label: "Multifragmentaria"},
			{Value: "proximal", Label: "Proximal"},
		},
		InvolvedMalleoliSA: []SelectOption{
			{Value: "unifocal", Label: "Unifocal (solo maléolo lateral)"},
			{Value: "bifocal", Label: "Bifocal (maléolos lateral y medial)"},
			{Value: "trifocal", Label: "Trifocal (maléolos lateral, medial y posterior)"},
		},
		InvolvedMalleoliSER: []SelectOption{
			{Value: "lateral_only", Label: "Aislado maléolo lateral"},
			{Value: "lateral_medial", Label: "Maléolos lateral y medial"},
			{Value: "lateral_medial_posterior", Label: "Maléolos lateral, medial y posterior"},
		},
		BartonicekTypes: []SelectOption{
			{Value: "type_1", Label: "Tipo 1: Fragmento extraincisural"},
			{Value: "type_2", Label: "Tipo 2: Fragmento posterolateral"},
			{Value: "type_3", Label: "Tipo 3: Fragmento posteromedial y posterolateral"},
			{Value: "type_4", Label: "Tipo 4: Gran fragmento triangular posterolateral"},
		},
	}

	c.JSON(http.StatusOK, options)
}

// HealthCheck handles GET /health
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
