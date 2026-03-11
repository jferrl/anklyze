package domain

// DanisWeberType represents the Danis-Weber classification type.
type DanisWeberType string

// DanisWeberA and related constants define the Danis-Weber classification types.
const (
	DanisWeberA               DanisWeberType = "Weber A"
	DanisWeberB               DanisWeberType = "Weber B"
	DanisWeberC               DanisWeberType = "Weber C"
	DanisWeberNotClassifiable DanisWeberType = "not_classifiable"
)

// LaugeHansenType represents the Lauge-Hansen classification type.
type LaugeHansenType string

// LaugeHansenSA and related constants define the Lauge-Hansen classification types.
const (
	LaugeHansenSA              LaugeHansenType = "SA"
	LaugeHansenSER             LaugeHansenType = "SER"
	LaugeHansenPER             LaugeHansenType = "PER"
	LaugeHansenPA              LaugeHansenType = "PA"
	LaugeHansenNotClassifiable LaugeHansenType = "not_classifiable"
)

// DanisWeberClassification holds the Danis-Weber classification result
type DanisWeberClassification struct {
	Type DanisWeberType `json:"type" validate:"required"`
}

// LaugeHansenClassification holds the Lauge-Hansen classification result
type LaugeHansenClassification struct {
	Type LaugeHansenType `json:"type" validate:"required"` // SA, SER, PER, PA
}

// AOOTACode represents the AO/OTA classification code.
type AOOTACode string

// AOOTANotClassifiable is the sentinel value for fractures that cannot be classified under AO 44-x.
// It is distinct from nil (where the AO system simply does not apply).
const AOOTANotClassifiable AOOTACode = "not_classifiable"

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

	// A-group subtypes
	AOOTAA1_2 AOOTACode = "44-A1.2" // Infrasindesmal avulsion
	AOOTAA1_3 AOOTACode = "44-A1.3" // Infrasindesmal malleolus fracture
	AOOTAA2_2 AOOTACode = "44-A2.2" // Bifocal infrasindesmal avulsion
	AOOTAA2_3 AOOTACode = "44-A2.3" // Bifocal infrasindesmal malleolus fracture
	AOOTAA3_2 AOOTACode = "44-A3.2" // Trifocal infrasindesmal avulsion
	AOOTAA3_3 AOOTACode = "44-A3.3" // Trifocal infrasindesmal malleolus fracture

	// B-group subtypes
	AOOTAB1_1 AOOTACode = "44-B1.1" // Lateral-only transindesmal simple
	AOOTAB1_2 AOOTACode = "44-B1.2" // Lateral-only transindesmal with syndesmosis rupture
	AOOTAB1_3 AOOTACode = "44-B1.3" // Lateral-only transindesmal butterfly/wedge
	AOOTAB2_1 AOOTACode = "44-B2.1" // Lateral+medial transindesmal open mortise
	AOOTAB2_2 AOOTACode = "44-B2.2" // Lateral+medial transindesmal malleolus fracture
	AOOTAB2_3 AOOTACode = "44-B2.3" // Lateral+medial transindesmal comminuted

	// C-group subtypes
	AOOTAC1_1 AOOTACode = "44-C1.1" // Simple diaphyseal open mortise
	AOOTAC1_2 AOOTACode = "44-C1.2" // Simple diaphyseal malleolus fracture
	AOOTAC1_3 AOOTACode = "44-C1.3" // Trimaleolar simple diaphyseal suprasyndesmotic
	AOOTAC2_1 AOOTACode = "44-C2.1" // Multifragmentary open mortise
	AOOTAC2_2 AOOTACode = "44-C2.2" // Multifragmentary malleolus fracture
	AOOTAC2_3 AOOTACode = "44-C2.3" // Trimaleolar multifragmentary suprasyndesmotic
	AOOTAC3_1 AOOTACode = "44-C3.1" // Proximal without fibula head shortening
	AOOTAC3_2 AOOTACode = "44-C3.2" // Proximal with fibula head shortening
	AOOTAC3_3 AOOTACode = "44-C3.3" // Trimaleolar proximal suprasyndesmotic

	// B3 subtypes (trimaleolar transyndesmotic)
	AOOTAB3_1 AOOTACode = "44-B3.1" // Trimaleolar transyndesmotic open mortise
	AOOTAB3_2 AOOTACode = "44-B3.2" // Trimaleolar transyndesmotic malleolus fracture
	AOOTAB3_3 AOOTACode = "44-B3.3" // Trimaleolar transyndesmotic comminuted/oblique

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
	BartonicekType1           BartonicekType = "Bartonicek 1"
	BartonicekType2           BartonicekType = "Bartonicek 2"
	BartonicekType3           BartonicekType = "Bartonicek 3"
	BartonicekType4           BartonicekType = "Bartonicek 4"
	BartonicekNotClassifiable BartonicekType = "not_classifiable"
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
