package domain

// InvolvedMalleoli represents which malleoli are fractured (first question).
type InvolvedMalleoli string

// InvolvedPosteriorOnly and related constants define the possible malleoli involvement patterns.
const (
	InvolvedPosteriorOnly    InvolvedMalleoli = "posterior_only"    // Maléolo posterior
	InvolvedMedialOnly       InvolvedMalleoli = "medial_only"       // Maléolo medial
	InvolvedLateralOnly      InvolvedMalleoli = "lateral_only"      // Maléolo lateral
	InvolvedMedialPosterior  InvolvedMalleoli = "medial_posterior"  // Maléolos medial y posterior
	InvolvedLateralPosterior InvolvedMalleoli = "lateral_posterior" // Maléolos lateral y posterior
	InvolvedLateralMedial    InvolvedMalleoli = "lateral_medial"    // Maléolos lateral y medial
	InvolvedTrimaleolar      InvolvedMalleoli = "trimaleolar"       // Maléolos medial, lateral y posterior
)

// PosteriorFractureType represents the type of posterior malleolus fracture (Bartonicek).
type PosteriorFractureType string

// PosteriorExtraincisural and related constants define the Bartonicek posterior malleolus fracture types.
const (
	PosteriorExtraincisural              PosteriorFractureType = "extraincisural"               // Fragmento extraincisural (Bartonicek 1)
	PosteriorPosterolateral              PosteriorFractureType = "posterolateral"               // Fragmento posterolateral (Bartonicek 2)
	PosteriorPosteromedialPosterolateral PosteriorFractureType = "posteromedial_posterolateral" // Fragmento posteromedial y posterolateral (Bartonicek 3)
	PosteriorLargePosterolateral         PosteriorFractureType = "large_posterolateral"         // Gran fragmento triangular posterolateral (Bartonicek 4)
	PosteriorExtraincisuralPosteromedial PosteriorFractureType = "extraincisural_posteromedial" // Fragmento extraincisural postero-medial (medial+posterior path only)
)

// MedialMorphology represents the morphology of the medial malleolus fracture.
type MedialMorphology string

// MedialMorphologyVertical and related constants define the medial malleolus fracture morphology options.
const (
	MedialMorphologyVertical   MedialMorphology = "vertical"           // Vertical
	MedialMorphologyTransverse MedialMorphology = "transverse_oblique" // Transverso/oblicuo
)

// FibularLevel represents where the fibular fracture is located relative to syndesmosis.
type FibularLevel string

// FibularLevelInfrasindesmal and related constants define the fibular fracture level options.
const (
	FibularLevelInfrasindesmal FibularLevel = "infrasindesmal" // Infrasindesmal
	FibularLevelTransindesmal  FibularLevel = "transindesmal"  // Transindesmal
	FibularLevelSuprasindesmal FibularLevel = "suprasindesmal" // Suprasindesmal
)

// LateralMorphology represents the morphology of the lateral/fibular fracture.
type LateralMorphology string

// LateralMorphologyTransverse and related constants define the lateral/fibular fracture morphology options.
const (
	LateralMorphologyTransverse LateralMorphology = "transverse" // Transversa
	LateralMorphologyOblique    LateralMorphology = "oblique"    // Oblicua (Baja medial, alta lateral)
	LateralMorphologySpiral     LateralMorphology = "spiral"     // Espiroidea (Baja anterior, alta posterior)
	LateralMorphologyConminuta  LateralMorphology = "conminuta"  // Conminuta
)

// SuprasindesmalType represents the fracture type for suprasindesmal fractures.
type SuprasindesmalType string

// SuprasindesmalSimpleDiaphyseal and related constants define the suprasindesmal fracture type options.
const (
	SuprasindesmalSimpleDiaphyseal SuprasindesmalType = "simple_diaphyseal" // Diafisaria Simple
	SuprasindesmalMultifragmentary SuprasindesmalType = "multifragmentary"  // Multifragmentaria
	SuprasindesmalProximal         SuprasindesmalType = "proximal"          // Proximal
)

// FibulaTracePattern represents the fibula trace pattern for suprasyndesmotic fractures.
// Used to differentiate between PA and PER mechanisms.
type FibulaTracePattern string

// FibulaTraceParasindesmoticShort and related constants define the fibula trace pattern options.
const (
	// FibulaTraceParasindesmoticShort is a parasyndesmotic short oblique/transverse/comminuted trace indicating a PA mechanism.
	FibulaTraceParasindesmoticShort FibulaTracePattern = "parasindesmotic_short"
	// FibulaTraceParasindesmoticLong is a parasyndesmotic long oblique/spiral trace indicating a PER mechanism.
	FibulaTraceParasindesmoticLong FibulaTracePattern = "parasindesmotic_long"
	// FibulaTraceSuprasindesmoticFar is a suprasyndesmotic trace (>6cm from articular surface) indicating a PER mechanism.
	FibulaTraceSuprasindesmoticFar FibulaTracePattern = "suprasindesmotic_far"
)

// LateralSubtype represents the subtype of lateral fracture for transindesmal paths.
type LateralSubtype string

// LateralSubtype constants define the possible subtypes for lateral fractures.
const (
	LateralSubtypeSimple             LateralSubtype = "simple"              // Simple
	LateralSubtypeSyndesmosisRupture LateralSubtype = "syndesmosis_rupture" // Rotura sindesmosis
	LateralSubtypeButterfly          LateralSubtype = "butterfly"           // Ala de mariposa / cuña
	LateralSubtypeAvulsion           LateralSubtype = "avulsion"            // Avulsión punta peroné
	LateralSubtypeMalleolusFracture  LateralSubtype = "malleolus_fracture"  // Fractura maléolo
)

// MedialSubtype represents the subtype of medial involvement for bimalleolar paths.
type MedialSubtype string

// MedialSubtype constants define the possible subtypes for medial involvement.
const (
	MedialSubtypeOpenMortise       MedialSubtype = "open_mortise"       // Abierta mortaja
	MedialSubtypeMalleolusFracture MedialSubtype = "malleolus_fracture" // Fractura maléolo
)

// ArticularInvolvement represents the level of articular surface involvement.
// Used for posterior-only and medial-only paths to determine distal tibia vs ankle fracture.
type ArticularInvolvement string

// ArticularLargeWithExtension and related constants define the articular surface involvement levels.
const (
	ArticularLargeWithExtension    ArticularInvolvement = "large_with_extension"    // >1/3 with metaphyseal extension
	ArticularSmallWithoutExtension ArticularInvolvement = "small_without_extension" // <1/3 without metaphyseal extension
)

// FractureInput represents the input data for classification
type FractureInput struct {
	// Question 1: Which malleoli are fractured?
	InvolvedMalleoli InvolvedMalleoli `json:"involved_malleoli" validate:"required"`

	// For posterior malleolus: fracture type (Bartonicek)
	PosteriorFractureType PosteriorFractureType `json:"posterior_fracture_type,omitempty"`

	// For medial malleolus: morphology
	MedialMorphology MedialMorphology `json:"medial_morphology,omitempty"`

	// For lateral malleolus: fracture level
	FibularLevel FibularLevel `json:"fibular_level,omitempty"`

	// For lateral malleolus: morphology
	LateralMorphology LateralMorphology `json:"lateral_morphology,omitempty"`

	// For suprasindesmal: fracture type
	SuprasindesmalType SuprasindesmalType `json:"suprasindesmal_type,omitempty"`

	// For bimaleolar lateral+medial: is fibula fracture infrasindesmal and transverse?
	FibulaInfrasindesmalTransverse *bool `json:"fibula_infrasindesmal_transverse,omitempty"`

	// For bimaleolar lateral+medial with transverse morphology: fibular level
	FibularLevelForTransverse FibularLevel `json:"fibular_level_for_transverse,omitempty"`

	// CT scan availability - determines if Bartonicek can be classified
	HasCTScan *bool `json:"has_ct_scan,omitempty"`

	// Fibula trace pattern for suprasyndesmotic fractures (PA vs PER differentiation)
	FibulaTracePattern FibulaTracePattern `json:"fibula_trace_pattern,omitempty"`

	// Articular surface involvement for posterior-only and medial-only paths
	ArticularInvolvement ArticularInvolvement `json:"articular_involvement,omitempty"`

	// Whether articular depression is present (when articular_involvement = large_with_extension)
	HasArticularDepression *bool `json:"has_articular_depression,omitempty"`

	// Whether posterior fragment is posteromedial (lateral+posterior infrasindesmal + CT path)
	IsPosteriorPosteromedial *bool `json:"is_posterior_posteromedial,omitempty"`

	// Lateral subtype for transindesmal lateral-only paths (simple, syndesmosis_rupture, butterfly)
	LateralSubtype LateralSubtype `json:"lateral_subtype,omitempty"`

	// Infrasindesmal morphology subtype (avulsion, malleolus_fracture)
	InfrasindesmalMorphology LateralSubtype `json:"infrasindesmal_morphology,omitempty"`

	// Medial subtype for bimalleolar paths (open_mortise, malleolus_fracture)
	MedialSubtype MedialSubtype `json:"medial_subtype,omitempty"`

	// Whether fibula head shortening is present (proximal/Maisonneuve path)
	HasFibulaHeadShortening *bool `json:"has_fibula_head_shortening,omitempty"`
}
