package domain

// DanisWeberType represents the Danis-Weber classification type.
type DanisWeberType string

// DanisWeberA and related constants define the Danis-Weber classification types.
const (
	DanisWeberA DanisWeberType = "Weber A"
	DanisWeberB DanisWeberType = "Weber B"
	DanisWeberC DanisWeberType = "Weber C"
)

// LaugeHansenType represents the Lauge-Hansen classification type.
type LaugeHansenType string

// LaugeHansenSA and related constants define the Lauge-Hansen classification types.
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
	Type               LaugeHansenType `json:"type" validate:"required"`       // SA, SER, PER, PA
	Ambiguous          bool            `json:"ambiguous,omitempty"`            // Whether classification is ambiguous
	AmbiguousReasonKey string          `json:"ambiguous_reason_key,omitempty"` // i18n key explaining WHY classification is ambiguous
	PossibleTypes      []string        `json:"possible_types,omitempty"`       // Alternative types when classification is ambiguous
}

// AOOTACode represents the AO/OTA classification code.
type AOOTACode string

// AOOTAA1 and related constants define the AO/OTA classification codes.
const (
	// AOOTAA1 is the 44-A1 unifocal/isolated lateral infrasyndesmotic code.
	AOOTAA1 AOOTACode = "44-A1"
	// AOOTAA2 is the 44-A2 bifocal/lateral and medial infrasyndesmotic code.
	AOOTAA2 AOOTACode = "44-A2"

	// AOOTAB1 is the 44-B1 isolated lateral transyndesmotic code.
	AOOTAB1 AOOTACode = "44-B1"
	// AOOTAB2 is the 44-B2 lateral and medial transyndesmotic code.
	AOOTAB2 AOOTACode = "44-B2"
	// AOOTAB3 is the 44-B3 lateral, medial and posterior transyndesmotic code.
	AOOTAB3 AOOTACode = "44-B3"

	// AOOTAB is the 44-B subtype-unclassifiable (B1/B2) transyndesmotic code.
	AOOTAB AOOTACode = "44-B"

	// AOOTAC1 is the 44-C1 simple diaphyseal suprasyndesmotic code.
	AOOTAC1 AOOTACode = "44-C1"
	// AOOTAC2 is the 44-C2 multifragmentary suprasyndesmotic code.
	AOOTAC2 AOOTACode = "44-C2"
	// AOOTAC3 is the 44-C3 proximal (Maisonneuve) suprasyndesmotic code.
	AOOTAC3 AOOTACode = "44-C3"

	// AOOTAA3 is the 44-A3 trifocal/special posterior infrasyndesmotic code.
	AOOTAA3 AOOTACode = "44-A3"

	// AOOTA43B1 is the 43-B1 distal tibia without articular depression code.
	AOOTA43B1 AOOTACode = "43-B1"
	// AOOTA43B2 is the 43-B2 distal tibia with articular depression code.
	AOOTA43B2 AOOTACode = "43-B2"
)

// AOOTAClassification holds the AO/OTA classification result
type AOOTAClassification struct {
	Code AOOTACode `json:"code" validate:"required"`
}

// BartonicekType represents the Bartonicek classification for posterior malleolus.
type BartonicekType string

// BartonicekType1 and related constants define the Bartonicek posterior malleolus classification types.
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
	FractureType  string                     `json:"fracture_type" validate:"required"` // Key for frontend translation
	DanisWeber    *DanisWeberClassification  `json:"danis_weber,omitempty" validate:"omitempty"`
	LaugeHansen   *LaugeHansenClassification `json:"lauge_hansen,omitempty" validate:"omitempty"`
	AOOTA         *AOOTAClassification       `json:"ao_ota,omitempty" validate:"omitempty"`
	Bartonicek    *BartonicekClassification  `json:"bartonicek,omitempty" validate:"omitempty"`
	Notes         []string                   `json:"notes,omitempty"`
	Impossible    bool                       `json:"impossible,omitempty"`
	ImpossibleKey string                     `json:"impossible_key,omitempty"` // Key for frontend translation
}
