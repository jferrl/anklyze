package domain

// MedialMorphology represents the morphology of the medial malleolus fracture
// Used when medial + lateral malleoli are fractured
type MedialMorphology string

const (
	MedialMorphologyObliqueVertical MedialMorphology = "oblique_vertical" // Oblicua/vertical → SA
	MedialMorphologyTransverse      MedialMorphology = "transverse"       // Transversal
	MedialMorphologyDoubtful        MedialMorphology = "doubtful"         // Dudoso
)

// FibularLevel represents where the fibular fracture is located relative to syndesmosis
type FibularLevel string

const (
	FibularLevelInfrasindesmal     FibularLevel = "infrasindesmal"      // Below syndesmosis
	FibularLevelTransindesmal      FibularLevel = "transindesmal"       // At syndesmosis
	FibularLevelSuprasindesmalHigh FibularLevel = "suprasindesmal_high" // Above syndesmosis (>6cm)
	FibularLevelDoubtful           FibularLevel = "doubtful"            // Dudoso
)

// FibularMorphology represents the morphology of the fibular fracture
type FibularMorphology string

const (
	FibularMorphologyTransverse FibularMorphology = "transverse" // Transversal
	FibularMorphologyOblique    FibularMorphology = "oblique"    // Oblicua (baja medial / alta lateral)
	FibularMorphologySpiral     FibularMorphology = "spiral"     // Espiroidea (baja anterior / alta posterior)
)

// WeberCFractureType represents the fracture type for Weber C (suprasindesmal high)
type WeberCFractureType string

const (
	WeberCSimpleDiaphyseal WeberCFractureType = "simple_diaphyseal" // Diafisaria simple
	WeberCMultifragmentary WeberCFractureType = "multifragmentary"  // Multifragmentaria
	WeberCProximal         WeberCFractureType = "proximal"          // Proximal
)

// InvolvedMalleoli represents which malleoli are involved for AO classification
type InvolvedMalleoli string

const (
	// For transverse pattern (SA classification)
	InvolvedUnifocal InvolvedMalleoli = "unifocal" // Solo maléolo lateral
	InvolvedBifocal  InvolvedMalleoli = "bifocal"  // Maléolos lateral y medial
	InvolvedTrifocal InvolvedMalleoli = "trifocal" // Maléolos lateral, medial y posterior

	// For spiral pattern (SER classification)
	InvolvedLateralOnly            InvolvedMalleoli = "lateral_only"             // Maléolo lateral aislado
	InvolvedLateralMedial          InvolvedMalleoli = "lateral_medial"           // Maléolos lateral y medial
	InvolvedLateralMedialPosterior InvolvedMalleoli = "lateral_medial_posterior" // Maléolos lateral, medial y posterior
)

// BartonicekType represents the Bartonicek classification for posterior malleolus fractures
type BartonicekType string

const (
	BartonicekType1 BartonicekType = "type_1" // Fragmento extraincisural
	BartonicekType2 BartonicekType = "type_2" // Fragmento posterolateral
	BartonicekType3 BartonicekType = "type_3" // Fragmento posteromedial y posterolateral
	BartonicekType4 BartonicekType = "type_4" // Gran fragmento triangular posterolateral
)

// FractureInput represents the input data for classification
// The form flow follows a decision tree based on which malleoli are fractured
type FractureInput struct {
	// Step 1: Which malleoli are fractured?
	HasMedialFracture    bool `json:"has_medial_fracture"`
	HasLateralFracture   bool `json:"has_lateral_fracture"`
	HasPosteriorFracture bool `json:"has_posterior_fracture"`

	// For posterior-only path (no medial, no lateral)
	PosteriorFractureType BartonicekType `json:"posterior_fracture_type,omitempty"`

	// For lateral-only path (no medial, has lateral, only lateral)
	LateralFractureLevel FibularLevel `json:"lateral_fracture_level,omitempty"`

	// For lateral-only suprasindesmal: fracture type
	SuprasindesmalType WeberCFractureType `json:"suprasindesmal_type,omitempty"`

	// For complex path (medial + lateral ± posterior): Medial morphology
	MedialMorphology MedialMorphology `json:"medial_morphology,omitempty"`

	// For oblique/vertical medial: Is fibula fracture transverse?
	FibulaTransverse *bool `json:"fibula_transverse,omitempty"`

	// Fibular level (for complex paths - transindesmal, infrasindesmal, suprasindesmal high, doubtful)
	FibularLevel FibularLevel `json:"fibular_level,omitempty"`

	// For infrasindesmal fibular level: Is it transverse?
	FibularTransverse *bool `json:"fibular_transverse,omitempty"`

	// Fibular morphology (transverse, oblique, spiral)
	FibularMorphology FibularMorphology `json:"fibular_morphology,omitempty"`

	// For oblique fibular morphology: At what level?
	ObliqueFibularLevel FibularLevel `json:"oblique_fibular_level,omitempty"`

	// Involved malleoli (for final AO classification)
	InvolvedMalleoli InvolvedMalleoli `json:"involved_malleoli,omitempty"`

	// Posterior fracture type (Bartonicek) when posterior is involved in complex path
	PosteriorType BartonicekType `json:"posterior_type,omitempty"`
}
