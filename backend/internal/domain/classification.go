package domain

// DanisWeberType represents the Danis-Weber classification type
type DanisWeberType string

const (
	DanisWeberA DanisWeberType = "Tipo A"
	DanisWeberB DanisWeberType = "Tipo B"
	DanisWeberC DanisWeberType = "Tipo C"
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
	Type        DanisWeberType `json:"type"`
	Description string         `json:"description"`
}

// LaugeHansenClassification holds the Lauge-Hansen classification result
type LaugeHansenClassification struct {
	Type        LaugeHansenType `json:"type"`      // SA, SER, PER, PA
	FullName    string          `json:"full_name"` // Full mechanism name
	Description string          `json:"description"`
}

// AOOTACode represents the AO/OTA classification code
type AOOTACode string

const (
	// Type A (Weber A - Infrasindesmal)
	AOOTAA1 AOOTACode = "44-A1" // Unifocal / Aislada lateral
	AOOTAA2 AOOTACode = "44-A2" // Bifocal / Lateral y medial
	AOOTAA3 AOOTACode = "44-A3" // Trifocal / Lateral, medial y posterior

	// Type B (Weber B - Transindesmal)
	AOOTAB1 AOOTACode = "44-B1" // Aislada lateral
	AOOTAB2 AOOTACode = "44-B2" // Lateral y medial
	AOOTAB3 AOOTACode = "44-B3" // Lateral, medial y posterior

	// Type C (Weber C - Suprasindesmal)
	AOOTAC1 AOOTACode = "44-C1" // Simple diafisaria
	AOOTAC2 AOOTACode = "44-C2" // Multifragmentaria
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
