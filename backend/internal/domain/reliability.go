package domain

import "github.com/google/uuid"

// ReliabilityMetrics contains inter-rater reliability statistics for a study.
// These metrics help validate the classification algorithm by measuring
// agreement between multiple raters and comparing against a gold standard.
type ReliabilityMetrics struct {
	StudyID        uuid.UUID `json:"study_id"`
	TotalResponses int64     `json:"total_responses"`
	UniqueRaters   int64     `json:"unique_raters"`

	// Per-system agreement metrics
	DanisWeberAgreement  *SystemAgreement `json:"danis_weber_agreement,omitempty"`
	LaugeHansenAgreement *SystemAgreement `json:"lauge_hansen_agreement,omitempty"`
	AOOTAAgreement       *SystemAgreement `json:"ao_ota_agreement,omitempty"`
	BartonicekAgreement  *SystemAgreement `json:"bartonicek_agreement,omitempty"`

	// Gold standard comparison (only if reference classification is set)
	GoldStandardAccuracy *GoldStandardAccuracy `json:"gold_standard_accuracy,omitempty"`
}

// SystemAgreement contains agreement metrics for a single classification system.
type SystemAgreement struct {
	System string `json:"system"`

	// Basic agreement
	PercentAgreement float64 `json:"percent_agreement"`

	// Kappa statistics (adjusted for chance agreement)
	// CohensKappa is only meaningful for exactly 2 raters
	CohensKappa *float64 `json:"cohens_kappa,omitempty"`
	// FleissKappa is used for 3+ raters
	FleissKappa *float64 `json:"fleiss_kappa,omitempty"`

	// Confusion matrix: map[expected][observed] = count
	// For gold standard comparison: expected = gold standard, observed = user response
	// For inter-rater: shows disagreement patterns
	ConfusionMatrix map[string]map[string]int64 `json:"confusion_matrix,omitempty"`

	// Distribution of classifications across categories
	CategoryCounts map[string]int64 `json:"category_counts"`
}

// GoldStandardAccuracy compares user responses to the reference classification.
type GoldStandardAccuracy struct {
	// Per-system accuracy (percentage of responses matching gold standard)
	DanisWeberAccuracy  *float64 `json:"danis_weber_accuracy,omitempty"`
	LaugeHansenAccuracy *float64 `json:"lauge_hansen_accuracy,omitempty"`
	AOOTAAccuracy       *float64 `json:"ao_ota_accuracy,omitempty"`
	BartonicekAccuracy  *float64 `json:"bartonicek_accuracy,omitempty"`

	// Overall accuracy (average across all applicable systems)
	OverallAccuracy float64 `json:"overall_accuracy"`

	// Detailed per-response comparison
	TotalComparisons   int64 `json:"total_comparisons"`
	CorrectResponses   int64 `json:"correct_responses"`
	IncorrectResponses int64 `json:"incorrect_responses"`
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

// KappaInterpretationLabel returns a human-readable label for a Kappa value.
func KappaInterpretationLabel(kappa float64) string {
	switch {
	case kappa < 0:
		return "Poor (< 0)"
	case kappa <= 0.20:
		return "Slight (0.01-0.20)"
	case kappa <= 0.40:
		return "Fair (0.21-0.40)"
	case kappa <= 0.60:
		return "Moderate (0.41-0.60)"
	case kappa <= 0.80:
		return "Substantial (0.61-0.80)"
	default:
		return "Almost Perfect (0.81-1.00)"
	}
}

// ResponseWithExpertise combines a study response with the user's expertise data.
// Used for detailed exports and stratified analysis.
type ResponseWithExpertise struct {
	StudyResponse

	// User expertise data
	UserEmail       string  `json:"user_email"`
	UserDisplayName string  `json:"user_display_name,omitempty"`
	YearsExperience *int    `json:"years_experience,omitempty"`
	Specialty       *string `json:"specialty,omitempty"`
	TrainingLevel   *string `json:"training_level,omitempty"`
	Institution     *string `json:"institution,omitempty"`

	// Gold standard comparison (if reference is set)
	MatchesDanisWeber  *bool `json:"matches_danis_weber,omitempty"`
	MatchesLaugeHansen *bool `json:"matches_lauge_hansen,omitempty"`
	MatchesAOOTA       *bool `json:"matches_ao_ota,omitempty"`
	MatchesBartonicek  *bool `json:"matches_bartonicek,omitempty"`
}
