package domain

// MedialMorphology represents the morphology of the medial malleolus fracture
// Used when medial + lateral malleoli are fractured
type MedialMorphology string

const (
	MedialMorphologyObliqueVertical MedialMorphology = "oblique_vertical" // Oblique/vertical → SA
	MedialMorphologyTransverse      MedialMorphology = "transverse"       // Transverse
	MedialMorphologyDoubtful        MedialMorphology = "doubtful"         // Doubtful
)

// FibularLevel represents where the fibular fracture is located relative to syndesmosis
type FibularLevel string

const (
	FibularLevelInfrasindesmal     FibularLevel = "infrasindesmal"      // Below syndesmosis
	FibularLevelTransindesmal      FibularLevel = "transindesmal"       // At syndesmosis level
	FibularLevelSuprasindesmalHigh FibularLevel = "suprasindesmal_high" // Above syndesmosis (>6cm)
	FibularLevelDoubtful           FibularLevel = "doubtful"            // Doubtful
)

// FibularMorphology represents the morphology of the fibular fracture
type FibularMorphology string

const (
	FibularMorphologyTransverse FibularMorphology = "transverse" // Transverse
	FibularMorphologyOblique    FibularMorphology = "oblique"    // Oblique (low medial / high lateral)
	FibularMorphologySpiral     FibularMorphology = "spiral"     // Spiral (low anterior / high posterior)
)

// WeberCFractureType represents the fracture type for Weber C (suprasindesmal high)
type WeberCFractureType string

const (
	WeberCSimpleDiaphyseal WeberCFractureType = "simple_diaphyseal" // Simple diaphyseal
	WeberCMultifragmentary WeberCFractureType = "multifragmentary"  // Multifragmentary
	WeberCProximal         WeberCFractureType = "proximal"          // Proximal (Maisonneuve)
)

// InvolvedMalleoli represents which malleoli are involved for AO classification
type InvolvedMalleoli string

const (
	// For transverse pattern (SA classification)
	InvolvedUnifocal InvolvedMalleoli = "unifocal" // Lateral malleolus only
	InvolvedBifocal  InvolvedMalleoli = "bifocal"  // Lateral and medial malleoli
	InvolvedTrifocal InvolvedMalleoli = "trifocal" // Lateral, medial and posterior malleoli

	// For spiral pattern (SER classification)
	InvolvedLateralOnly            InvolvedMalleoli = "lateral_only"             // Isolated lateral malleolus
	InvolvedLateralMedial          InvolvedMalleoli = "lateral_medial"           // Lateral and medial malleoli
	InvolvedLateralMedialPosterior InvolvedMalleoli = "lateral_medial_posterior" // Lateral, medial and posterior malleoli
)

// BartonicekType represents the Bartonicek classification for posterior malleolus fractures
type BartonicekType string

const (
	BartonicekType1 BartonicekType = "type_1" // Extraincisural fragment
	BartonicekType2 BartonicekType = "type_2" // Posterolateral fragment
	BartonicekType3 BartonicekType = "type_3" // Posteromedial and posterolateral fragment
	BartonicekType4 BartonicekType = "type_4" // Large posterolateral triangular fragment
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
