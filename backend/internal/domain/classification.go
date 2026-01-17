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
	Fragment    string          `json:"fragment,omitempty"` // Wagstaffe or Tillaux-Chaput for SER
}

// AOOTACode represents the AO/OTA classification code
type AOOTACode string

const (
	// Type A (Weber A - Infrasindesmal)
	AOOTAA1 AOOTACode = "44-A1" // Aislada lateral
	AOOTAA2 AOOTACode = "44-A2" // Lateral y medial
	AOOTAA3 AOOTACode = "44-A3" // Lateral, medial y posterior

	// Type B (Weber B - Transindesmal)
	AOOTAB1 AOOTACode = "44-B1" // Aislada lateral
	AOOTAB2 AOOTACode = "44-B2" // Lateral y medial
	AOOTAB3 AOOTACode = "44-B3" // Lateral, medial y posterior

	// Type C (Weber C - Suprasindesmal)
	AOOTAC1 AOOTACode = "44-C1" // Simple diafisaria
	AOOTAC2 AOOTACode = "44-C2" // Multifragmentaria
	AOOTAC3 AOOTACode = "44-C3" // Proximal
)

// AOOTAClassification holds the AO/OTA classification result
type AOOTAClassification struct {
	Code        AOOTACode `json:"code"`
	Description string    `json:"description"`
}

// ClassificationResult contains the classification result
type ClassificationResult struct {
	DanisWeber  DanisWeberClassification  `json:"danis_weber"`
	LaugeHansen LaugeHansenClassification `json:"lauge_hansen"`
	AOOTA       AOOTAClassification       `json:"ao_ota"`
	Notes       []string                  `json:"notes,omitempty"`
}
