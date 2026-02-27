package domain

// DanisWeberType represents the Danis-Weber classification type
type DanisWeberType string

const (
	DanisWeberA DanisWeberType = "Weber A"
	DanisWeberB DanisWeberType = "Weber B"
	DanisWeberC DanisWeberType = "Weber C"
)

// LaugeHansenType represents the Lauge-Hansen classification type
type LaugeHansenType string

const (
	LaugeHansenSA  LaugeHansenType = "SA"
	LaugeHansenSER LaugeHansenType = "SER"
	LaugeHansenPER LaugeHansenType = "PER"
	LaugeHansenPA  LaugeHansenType = "PA"
)

// DanisWeberClassification holds the Danis-Weber classification result
type DanisWeberClassification struct {
	Type DanisWeberType `json:"type" validate:"required"`
}

// LaugeHansenClassification holds the Lauge-Hansen classification result
type LaugeHansenClassification struct {
	Type               LaugeHansenType `json:"type" validate:"required"`                  // SA, SER, PER, PA
	Ambiguous          bool            `json:"ambiguous,omitempty"`                        // Whether classification is ambiguous
	AmbiguousReasonKey string          `json:"ambiguous_reason_key,omitempty"`             // i18n key explaining WHY classification is ambiguous
	PossibleTypes      []string        `json:"possible_types,omitempty"`                   // Alternative types when classification is ambiguous
}

// AOOTACode represents the AO/OTA classification code
type AOOTACode string

const (
	// Type A (Weber A - Infrasyndesmal)
	AOOTAA1 AOOTACode = "44-A1" // Unifocal / Isolated lateral
	AOOTAA2 AOOTACode = "44-A2" // Bifocal / Lateral and medial

	// Type B (Weber B - Transsyndesmal)
	AOOTAB1 AOOTACode = "44-B1" // Isolated lateral
	AOOTAB2 AOOTACode = "44-B2" // Lateral and medial
	AOOTAB3 AOOTACode = "44-B3" // Lateral, medial and posterior

	// Type B unclassifiable subtype (Weber B - Transsyndesmal lateral-only)
	AOOTAB AOOTACode = "44-B" // Subtype unclassifiable B1/B2

	// Type C (Weber C - Suprasyndesmal)
	AOOTAC1 AOOTACode = "44-C1" // Simple diaphyseal
	AOOTAC2 AOOTACode = "44-C2" // Multifragmentary
	AOOTAC3 AOOTACode = "44-C3" // Proximal (Maisonneuve)

	// Type A3 (Trifocal / special posterior types)
	AOOTAA3 AOOTACode = "44-A3" // Medial+posterior posteromedial extraincisural / lateral+posterior infra posteromedial

	// Distal tibia fractures (not ankle classification)
	AOOTA43B1 AOOTACode = "43-B1" // Distal tibia without articular depression
	AOOTA43B2 AOOTACode = "43-B2" // Distal tibia with articular depression
)

// AOOTAClassification holds the AO/OTA classification result
type AOOTAClassification struct {
	Code AOOTACode `json:"code" validate:"required"`
}

// BartonicekType represents the Bartonicek classification for posterior malleolus
type BartonicekType string

const (
	BartonicekType1 BartonicekType = "Bartonicek 1"
	BartonicekType2 BartonicekType = "Bartonicek 2"
	BartonicekType3 BartonicekType = "Bartonicek 3"
	BartonicekType4 BartonicekType = "Bartonicek 4"
)

// BartonicekClassification holds the Bartonicek classification for posterior malleolus
type BartonicekClassification struct {
	Type BartonicekType `json:"type" validate:"required"`
}

// ClassificationResult contains the classification result
type ClassificationResult struct {
	FractureType  string                     `json:"fracture_type" validate:"required"`      // Key for frontend translation
	DanisWeber    *DanisWeberClassification  `json:"danis_weber,omitempty" validate:"omitempty"`
	LaugeHansen   *LaugeHansenClassification `json:"lauge_hansen,omitempty" validate:"omitempty"`
	AOOTA         *AOOTAClassification       `json:"ao_ota,omitempty" validate:"omitempty"`
	Bartonicek    *BartonicekClassification  `json:"bartonicek,omitempty" validate:"omitempty"`
	Notes         []string                   `json:"notes,omitempty"`
	Impossible    bool                       `json:"impossible,omitempty"`
	ImpossibleKey string                     `json:"impossible_key,omitempty"` // Key for frontend translation
}
