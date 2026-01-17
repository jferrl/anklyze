package domain

// MedialMalleolusMorphology represents the morphology of the medial malleolus fracture
type MedialMalleolusMorphology string

const (
	MedialMorphologyNone       MedialMalleolusMorphology = "none"       // Sin fractura del maléolo medial - fractura aislada lateral
	MedialMorphologyOblique    MedialMalleolusMorphology = "oblique"    // Oblicua/vertical - indicates SA
	MedialMorphologyTransverse MedialMalleolusMorphology = "transverse" // Transversal - indicates SER/PER/PA
)

// FibularFractureLevel represents where the fibular fracture is located relative to syndesmosis
type FibularFractureLevel string

const (
	FibularLevelSuprasindesmalHigh FibularFractureLevel = "suprasindesmal_high" // Above syndesmosis (>6cm) - PER/Weber C
	FibularLevelTransindesmal      FibularFractureLevel = "transindesmal"       // At syndesmosis
	FibularLevelInfrasindesmal     FibularFractureLevel = "infrasindesmal"      // Below syndesmosis
	FibularLevelDoubtful           FibularFractureLevel = "doubtful"            // Dudoso
)

// FibularMorphology represents the morphology of the fibular fracture
type FibularMorphology string

const (
	FibularMorphologyTransverse       FibularMorphology = "transverse"        // Transversa - SA/Weber A
	FibularMorphologyTransverseOblique FibularMorphology = "transverse_oblique" // Transversa/oblicua (baja medial, alta lateral) - PA
	FibularMorphologySpiral           FibularMorphology = "spiral"            // Espiroidea (baja anterior, alta posterior) - SER/Weber B
)

// SERFragment represents additional fragments in SER fractures
type SERFragment string

const (
	SERFragmentNone          SERFragment = "none"
	SERFragmentWagstaffe     SERFragment = "wagstaffe"      // Fragmento de Wagstaffe
	SERFragmentTillauxChaput SERFragment = "tillaux_chaput" // Fragmento de Tillaux-Chaput
)

// FractureInvolvement represents the structures involved in the fracture (for Weber A/B)
type FractureInvolvement string

const (
	FractureInvolvementLateralOnly         FractureInvolvement = "lateral_only"           // Aislada lateral (solo peroné)
	FractureInvolvementLateralMedial       FractureInvolvement = "lateral_medial"         // Lateral y medial (peroné y tibia)
	FractureInvolvementLateralMedialPosterior FractureInvolvement = "lateral_medial_posterior" // Lateral, medial y posterior
)

// WeberCFractureType represents the fracture type for Weber C (suprasindesmal high)
type WeberCFractureType string

const (
	WeberCFractureSimple         WeberCFractureType = "simple"         // Simple diafisaria
	WeberCFractureMultifragmentary WeberCFractureType = "multifragmentary" // Multifragmentaria
	WeberCFractureProximal       WeberCFractureType = "proximal"       // Proximal
)

// FractureInput represents the input data for classification
type FractureInput struct {
	// Question 1: Medial malleolus morphology
	MedialMorphology MedialMalleolusMorphology `json:"medial_morphology"`

	// Question 2: Fibular fracture level (only if medial morphology is transverse)
	FibularLevel FibularFractureLevel `json:"fibular_level,omitempty"`

	// Question 3: Fibular morphology (only if fibular level is not suprasindesmal_high)
	FibularMorphology FibularMorphology `json:"fibular_morphology,omitempty"`

	// Question 4: SER fragments (only if classification is SER)
	SERFragment SERFragment `json:"ser_fragment,omitempty"`

	// Question 5a: Fracture involvement (for Weber A/B - Type A or B)
	FractureInvolvement FractureInvolvement `json:"fracture_involvement,omitempty"`

	// Question 5b: Weber C fracture type (for Weber C - Type C)
	WeberCFractureType WeberCFractureType `json:"weber_c_fracture_type,omitempty"`
}
