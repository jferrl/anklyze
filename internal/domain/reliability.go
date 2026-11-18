package domain

import "github.com/google/uuid"

// ReliabilityMetrics contains inter-rater reliability statistics for a case.
// These metrics help validate the classification algorithm by measuring
// agreement between multiple raters.
type ReliabilityMetrics struct {
	CaseID         uuid.UUID `json:"case_id"`
	TotalResponses int64     `json:"total_responses"`
	UniqueRaters   int64     `json:"unique_raters"`

	// Per-system agreement metrics
	DanisWeberAgreement  *SystemAgreement `json:"danis_weber_agreement,omitempty"`
	LaugeHansenAgreement *SystemAgreement `json:"lauge_hansen_agreement,omitempty"`
	AOOTAAgreement       *SystemAgreement `json:"ao_ota_agreement,omitempty"`
	BartonicekAgreement  *SystemAgreement `json:"bartonicek_agreement,omitempty"`
}

// ConfidenceInterval represents a confidence interval for a statistical measure.
type ConfidenceInterval struct {
	Lower float64 `json:"lower"` // Lower bound
	Upper float64 `json:"upper"` // Upper bound
	Level float64 `json:"level"` // Confidence level (e.g., 0.95 for 95% CI)
}

// KappaWeightType defines the weighting scheme for weighted Kappa.
type KappaWeightType string

const (
	// KappaWeightLinear uses linear weights: w_ij = 1 - |i-j|/(k-1)
	// where k is the number of categories
	KappaWeightLinear KappaWeightType = "linear"
	// KappaWeightQuadratic uses quadratic weights: w_ij = 1 - (i-j)²/(k-1)²
	KappaWeightQuadratic KappaWeightType = "quadratic"
)

// SystemAgreement contains agreement metrics for a single classification system in one case.
// Kappa is not computed here: one case gives one rating per rater, too few to estimate it.
// Kappa statistics are reported per study (StudyReliabilityMetrics).
type SystemAgreement struct {
	System string `json:"system"`

	// PercentAgreement is the share of responses (0-100) that gave the most common answer,
	// null when fewer than 2 responses have a classification in the system.
	PercentAgreement *float64 `json:"percent_agreement"`

	// Distribution of classifications across categories
	CategoryCounts map[string]int64 `json:"category_counts"`
}

// KappaInterpretation returns the interpretation of a Kappa value.
// Based on Landis & Koch (1977) interpretation scale.
func KappaInterpretation(kappa float64) string {
	switch {
	case kappa < 0:
		return "poor"
	case kappa <= 0.20:
		return "slight"
	case kappa <= 0.40:
		return "fair"
	case kappa <= 0.60:
		return "moderate"
	case kappa <= 0.80:
		return "substantial"
	default:
		return "almost_perfect"
	}
}

// ResponseWithExpertise combines a case response with the user's expertise data.
// Used for detailed exports and stratified analysis.
type ResponseWithExpertise struct {
	CaseResponse

	// User expertise data
	UserEmail       string  `json:"user_email"`
	UserDisplayName string  `json:"user_display_name,omitempty"`
	YearsExperience *int    `json:"years_experience,omitempty"`
	Specialty       *string `json:"specialty,omitempty"`
	TrainingLevel   *string `json:"training_level,omitempty"`
	Institution     *string `json:"institution,omitempty"`
}

// ============================================================================
// Study-Level Reliability Metrics
// ============================================================================

// StudyReliabilityMetrics contains reliability statistics across a study.
type StudyReliabilityMetrics struct {
	StudyID    uuid.UUID `json:"study_id"`
	StudyTitle string    `json:"study_title"`

	// Summary counts
	TotalCases     int   `json:"total_cases"`
	TotalResponses int64 `json:"total_responses"`
	UniqueRaters   int64 `json:"unique_raters"`
	CompleteRaters int64 `json:"complete_raters"` // Raters who completed all cases

	// Fleiss' Kappa per classification system, over the complete raters (at least 2).
	DanisWeberFleiss  *FleissKappaResult `json:"danis_weber_fleiss,omitempty"`
	LaugeHansenFleiss *FleissKappaResult `json:"lauge_hansen_fleiss,omitempty"`
	AOOTAFleiss       *FleissKappaResult `json:"ao_ota_fleiss,omitempty"`
	BartonicekFleiss  *FleissKappaResult `json:"bartonicek_fleiss,omitempty"`

	// Cohen's Kappa per classification system, only when there are exactly 2 complete raters.
	DanisWeberCohen  *CohensKappaResult `json:"danis_weber_cohen,omitempty"`
	LaugeHansenCohen *CohensKappaResult `json:"lauge_hansen_cohen,omitempty"`
	AOOTACohen       *CohensKappaResult `json:"ao_ota_cohen,omitempty"`
	BartonicekCohen  *CohensKappaResult `json:"bartonicek_cohen,omitempty"`

	// Per-case analysis (helps identify "hard cases")
	PerCaseMetrics []PerCaseMetrics `json:"per_case_metrics"`
}

// KappaNoVariation is the KappaUnavailableReason when every rating falls in one category:
// chance agreement is 1, so kappa is 0/0. A system with too few cases or raters has no result at all.
const KappaNoVariation = "no_variation"

// FleissKappaResult contains Fleiss' Kappa with metadata.
// Kappa is nil when it is undefined, and KappaUnavailableReason says why.
type FleissKappaResult struct {
	Kappa                  *float64 `json:"kappa"`
	Interpretation         string   `json:"interpretation,omitempty"` // Uses KappaInterpretation()
	KappaUnavailableReason string   `json:"kappa_unavailable_reason,omitempty"`

	// Matrix dimensions
	NumSubjects   int `json:"num_subjects"`   // Cases used: every complete rater answered them
	NumRaters     int `json:"num_raters"`     // Number of complete raters
	NumCategories int `json:"num_categories"` // Number of classification categories

	// NumCasesExcluded counts cases left out because a complete rater gave no answer in this system.
	NumCasesExcluded int `json:"num_cases_excluded"`

	// Percentile bootstrap interval over cases (optional)
	ConfidenceInterval *ConfidenceInterval `json:"confidence_interval,omitempty"`
}

// CohensKappaResult is Cohen's Kappa between two raters across the cases of a study.
// Kappa is nil when it is undefined, and KappaUnavailableReason says why.
type CohensKappaResult struct {
	Kappa                  *float64 `json:"kappa"`
	Interpretation         string   `json:"interpretation,omitempty"` // Uses KappaInterpretation()
	KappaUnavailableReason string   `json:"kappa_unavailable_reason,omitempty"`

	NumSubjects      int `json:"num_subjects"`       // Cases both raters answered
	NumCasesExcluded int `json:"num_cases_excluded"` // Cases where either rater gave no answer

	ConfidenceInterval *ConfidenceInterval `json:"confidence_interval,omitempty"`

	// WeightedKappa is set for AO/OTA only.
	WeightedKappa *WeightedKappaResult `json:"weighted_kappa,omitempty"`
}

// WeightedKappaResult is the weighted Cohen's Kappa of AO/OTA codes, compared by group.
type WeightedKappaResult struct {
	Kappa float64         `json:"kappa"`
	Type  KappaWeightType `json:"type"`

	NumPairs         int `json:"num_pairs"`          // Case pairs used
	NumPairsExcluded int `json:"num_pairs_excluded"` // Pairs with a code outside the AO/OTA ordering
}

// PerCaseMetrics contains metrics for a single case within a study.
type PerCaseMetrics struct {
	CaseOrder     int       `json:"case_order"`
	CaseID        uuid.UUID `json:"case_id"`
	CaseTitle     string    `json:"case_title"`
	ResponseCount int       `json:"response_count"`

	// Per-system percent agreement (0-100), null when fewer than 2 responses have a
	// classification in the system.
	DanisWeberAgreement  *float64 `json:"danis_weber_agreement"`
	LaugeHansenAgreement *float64 `json:"lauge_hansen_agreement"`
	AOOTAAgreement       *float64 `json:"ao_ota_agreement"`
	BartonicekAgreement  *float64 `json:"bartonicek_agreement"`

	// IsLowAgreement is true if Lauge-Hansen, Danis-Weber or AO/OTA agreement is below 60%.
	IsLowAgreement bool `json:"is_low_agreement"`
}
