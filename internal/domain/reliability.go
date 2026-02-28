package domain

import "github.com/google/uuid"

// ReliabilityMetrics contains inter-rater reliability statistics for a case.
// These metrics help validate the classification algorithm by measuring
// agreement between multiple raters and comparing against a gold standard.
type ReliabilityMetrics struct {
	CaseID         uuid.UUID `json:"case_id"`
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

// SystemAgreement contains agreement metrics for a single classification system.
type SystemAgreement struct {
	System string `json:"system"`

	// Basic agreement
	PercentAgreement float64 `json:"percent_agreement"`

	// Kappa statistics (adjusted for chance agreement)
	// CohensKappa is only meaningful for exactly 2 raters
	CohensKappa *float64 `json:"cohens_kappa,omitempty"`
	// CohensKappaCI is the confidence interval for Cohen's Kappa
	CohensKappaCI *ConfidenceInterval `json:"cohens_kappa_ci,omitempty"`
	// WeightedKappa is Kappa with weights accounting for ordinal categories
	// Only calculated for systems with natural ordering (e.g., AO/OTA)
	WeightedKappa *float64 `json:"weighted_kappa,omitempty"`
	// WeightedKappaType indicates the weighting scheme used
	WeightedKappaType *KappaWeightType `json:"weighted_kappa_type,omitempty"`
	// FleissKappa is used for 3+ raters (requires multiple subjects/cases)
	FleissKappa *float64 `json:"fleiss_kappa,omitempty"`
	// FleissKappaNote explains why Fleiss' Kappa may not be available
	FleissKappaNote *string `json:"fleiss_kappa_note,omitempty"`

	// Confusion matrix: map[expected][observed] = count
	// For gold standard comparison: expected = gold standard, observed = user response
	// For inter-rater: shows disagreement patterns
	ConfusionMatrix map[string]map[string]int64 `json:"confusion_matrix,omitempty"`

	// Distribution of classifications across categories
	CategoryCounts map[string]int64 `json:"category_counts"`
}

// CategoryMetrics contains diagnostic metrics for a single classification category.
// These metrics help evaluate how well the classification performs for each category
// when compared against a gold standard.
type CategoryMetrics struct {
	Category    string  `json:"category"`
	Sensitivity float64 `json:"sensitivity"` // True positive rate: TP / (TP + FN)
	Specificity float64 `json:"specificity"` // True negative rate: TN / (TN + FP)
	PPV         float64 `json:"ppv"`         // Positive predictive value: TP / (TP + FP)
	NPV         float64 `json:"npv"`         // Negative predictive value: TN / (TN + FN)
	F1Score     float64 `json:"f1_score"`    // Harmonic mean of PPV and sensitivity
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

	// Per-category diagnostic metrics (only populated when enough data exists)
	PerCategoryMetrics map[string]*CategoryMetrics `json:"per_category_metrics,omitempty"`
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

	// Gold standard comparison (if reference is set)
	MatchesDanisWeber  *bool `json:"matches_danis_weber,omitempty"`
	MatchesLaugeHansen *bool `json:"matches_lauge_hansen,omitempty"`
	MatchesAOOTA       *bool `json:"matches_ao_ota,omitempty"`
	MatchesBartonicek  *bool `json:"matches_bartonicek,omitempty"`
}

// ============================================================================
// Study-Level Reliability Metrics
// ============================================================================

// StudyReliabilityMetrics contains reliability statistics across a study.
// This enables proper Fleiss' Kappa calculation with multiple subjects (cases).
type StudyReliabilityMetrics struct {
	StudyID    uuid.UUID `json:"study_id"`
	StudyTitle string    `json:"study_title"`

	// Summary counts
	TotalCases     int   `json:"total_cases"`
	TotalResponses int64 `json:"total_responses"`
	UniqueRaters   int64 `json:"unique_raters"`
	CompleteRaters int64 `json:"complete_raters"` // Raters who completed all cases

	// Fleiss' Kappa per classification system (now calculable with multiple subjects!)
	DanisWeberFleiss  *FleissKappaResult `json:"danis_weber_fleiss,omitempty"`
	LaugeHansenFleiss *FleissKappaResult `json:"lauge_hansen_fleiss,omitempty"`
	AOOTAFleiss       *FleissKappaResult `json:"ao_ota_fleiss,omitempty"`
	BartonicekFleiss  *FleissKappaResult `json:"bartonicek_fleiss,omitempty"`

	// Per-case analysis (helps identify "hard cases")
	PerCaseMetrics []PerCaseMetrics `json:"per_case_metrics"`

	// Gold standard accuracy (aggregated across all cases)
	GoldStandardAccuracy *StudyGoldStandardAccuracy `json:"gold_standard_accuracy,omitempty"`
}

// FleissKappaResult contains Fleiss' Kappa with metadata.
type FleissKappaResult struct {
	Kappa          float64 `json:"kappa"`
	Interpretation string  `json:"interpretation"` // Uses KappaInterpretation()

	// Matrix dimensions
	NumSubjects   int `json:"num_subjects"`   // Number of cases
	NumRaters     int `json:"num_raters"`     // Number of complete raters
	NumCategories int `json:"num_categories"` // Number of classification categories

	// Confidence interval (optional)
	ConfidenceInterval *ConfidenceInterval `json:"confidence_interval,omitempty"`

	// Note explaining any limitations or issues
	Note *string `json:"note,omitempty"`
}

// NewFleissKappaResult creates a FleissKappaResult with interpretation.
func NewFleissKappaResult(kappa float64, numSubjects, numRaters, numCategories int) *FleissKappaResult {
	return &FleissKappaResult{
		Kappa:          kappa,
		Interpretation: KappaInterpretation(kappa),
		NumSubjects:    numSubjects,
		NumRaters:      numRaters,
		NumCategories:  numCategories,
	}
}

// PerCaseMetrics contains metrics for a single case within a study.
type PerCaseMetrics struct {
	CaseOrder     int       `json:"case_order"`
	CaseID        uuid.UUID `json:"case_id"`
	CaseTitle     string    `json:"case_title"`
	ResponseCount int       `json:"response_count"`

	// Per-system agreement (percentage)
	DanisWeberAgreement  float64  `json:"danis_weber_agreement"`
	LaugeHansenAgreement float64  `json:"lauge_hansen_agreement"`
	AOOTAAgreement       float64  `json:"ao_ota_agreement"`
	BartonicekAgreement  *float64 `json:"bartonicek_agreement,omitempty"` // Optional, requires CT

	// Gold standard match rate (if reference set for this case)
	GoldStandardMatchRate *float64 `json:"gold_standard_match_rate,omitempty"`

	// Identifies cases with low agreement (potential "hard cases")
	IsLowAgreement bool `json:"is_low_agreement"` // True if any system < 60%
}

// StudyGoldStandardAccuracy aggregates accuracy across all cases in a study.
type StudyGoldStandardAccuracy struct {
	OverallAccuracy    float64 `json:"overall_accuracy"`
	CasesWithReference int     `json:"cases_with_reference"`
	TotalComparisons   int64   `json:"total_comparisons"`

	// Per-system accuracy (averaged across cases)
	DanisWeberAccuracy  *float64 `json:"danis_weber_accuracy,omitempty"`
	LaugeHansenAccuracy *float64 `json:"lauge_hansen_accuracy,omitempty"`
	AOOTAAccuracy       *float64 `json:"ao_ota_accuracy,omitempty"`
	BartonicekAccuracy  *float64 `json:"bartonicek_accuracy,omitempty"`
}
