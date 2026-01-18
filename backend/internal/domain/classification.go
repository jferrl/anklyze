package domain

// DanisWeberType represents the Danis-Weber classification type
type DanisWeberType string

const (
	DanisWeberA DanisWeberType = "Type A"
	DanisWeberB DanisWeberType = "Type B"
	DanisWeberC DanisWeberType = "Type C"
)

// LaugeHansenType represents the Lauge-Hansen classification type
type LaugeHansenType string

const (
	LaugeHansenSA    LaugeHansenType = "SA"
	LaugeHansenSER   LaugeHansenType = "SER"
	LaugeHansenPER   LaugeHansenType = "PER"
	LaugeHansenPA    LaugeHansenType = "PA"
	LaugeHansenPERPA LaugeHansenType = "PER or PA" // Ambiguous - could be either PER or PA
)

// DanisWeberClassification holds the Danis-Weber classification result
type DanisWeberClassification struct {
	Type        DanisWeberType `json:"type"`
	Description string         `json:"description"`
}

// LaugeHansenClassification holds the Lauge-Hansen classification result
type LaugeHansenClassification struct {
	Type          LaugeHansenType   `json:"type"`                     // SA, SER, PER, PA (primary or first possible type)
	FullName      string            `json:"full_name"`                // Full mechanism name
	Description   string            `json:"description"`              // Description of the mechanism
	PossibleTypes []LaugeHansenType `json:"possible_types,omitempty"` // Alternative types when classification is ambiguous
}

// AOOTACode represents the AO/OTA classification code
type AOOTACode string

const (
	// Type A (Weber A - Infrasyndesmal)
	AOOTAA1 AOOTACode = "44-A1" // Unifocal / Isolated lateral
	AOOTAA2 AOOTACode = "44-A2" // Bifocal / Lateral and medial
	AOOTAA3 AOOTACode = "44-A3" // Trifocal / Lateral, medial and posterior

	// Type B (Weber B - Transsyndesmal)
	AOOTAB1 AOOTACode = "44-B1" // Isolated lateral
	AOOTAB2 AOOTACode = "44-B2" // Lateral and medial
	AOOTAB3 AOOTACode = "44-B3" // Lateral, medial and posterior

	// Type C (Weber C - Suprasyndesmal)
	AOOTAC1 AOOTACode = "44-C1" // Simple diaphyseal
	AOOTAC2 AOOTACode = "44-C2" // Multifragmentary
	AOOTAC3 AOOTACode = "44-C3" // Proximal (Maisonneuve)
)

// AOOTAClassification holds the AO/OTA classification result
type AOOTAClassification struct {
	Code        AOOTACode `json:"code"`
	Description string    `json:"description"`
}

// BartonicekClassification holds the Bartonicek classification for posterior malleolus
type BartonicekClassification struct {
	Type        BartonicekType `json:"type"`
	Description string         `json:"description"`
}

// ClassificationResult contains the classification result
// Note: Some classifications may be nil depending on the fracture type
// For example, posterior-only fractures only have Bartonicek classification
type ClassificationResult struct {
	DanisWeber  *DanisWeberClassification  `json:"danis_weber,omitempty"`
	LaugeHansen *LaugeHansenClassification `json:"lauge_hansen,omitempty"`
	AOOTA       *AOOTAClassification       `json:"ao_ota,omitempty"`
	Bartonicek  *BartonicekClassification  `json:"bartonicek,omitempty"`
	Notes       []string                   `json:"notes,omitempty"`
}
