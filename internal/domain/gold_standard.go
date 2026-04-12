package domain

import "github.com/google/uuid"

// GoldStandardAccuracy contains accuracy metrics for a single case
// comparing rater responses against the gold standard classification.
type GoldStandardAccuracy struct {
	CaseID       uuid.UUID             `json:"case_id"`
	HasGold      bool                  `json:"has_gold_standard"`
	TotalRaters  int                   `json:"total_raters"`
	GoldStandard *ClassificationResult `json:"gold_standard,omitempty"`

	// Per-system accuracy (% of raters matching gold standard)
	DanisWeberAccuracy  *SystemAccuracy `json:"danis_weber_accuracy,omitempty"`
	LaugeHansenAccuracy *SystemAccuracy `json:"lauge_hansen_accuracy,omitempty"`
	AOOTAAccuracy       *SystemAccuracy `json:"ao_ota_accuracy,omitempty"`
	BartonicekAccuracy  *SystemAccuracy `json:"bartonicek_accuracy,omitempty"`
}

// SystemAccuracy contains accuracy metrics for a single classification system
// compared against the gold standard.
type SystemAccuracy struct {
	System string `json:"system"`

	// Gold standard value for this system
	GoldValue string `json:"gold_value"`

	// Overall accuracy: fraction of raters matching gold standard
	Accuracy float64 `json:"accuracy"` // 0.0–100.0 percentage

	// Counts
	TotalRaters   int `json:"total_raters"`
	CorrectRaters int `json:"correct_raters"`

	// Majority vote (consensus)
	MajorityValue       string  `json:"majority_value"`
	MajorityMatchesGold bool    `json:"majority_matches_gold"`
	MajorityPercentage  float64 `json:"majority_percentage"` // % of raters choosing majority

	// Confusion matrix: gold standard is always the "expected" row
	// map[rater_value] = count
	ResponseDistribution map[string]int64 `json:"response_distribution"`
}

// StudyGoldStandardMetrics contains gold standard accuracy metrics across a study.
type StudyGoldStandardMetrics struct {
	StudyID    uuid.UUID `json:"study_id"`
	StudyTitle string    `json:"study_title"`

	// How many cases in the study have gold standard set
	TotalCases    int `json:"total_cases"`
	CasesWithGold int `json:"cases_with_gold"`

	// Per-system aggregate accuracy (averaged across cases with gold standard)
	DanisWeberAccuracy  *AggregateAccuracy `json:"danis_weber_accuracy,omitempty"`
	LaugeHansenAccuracy *AggregateAccuracy `json:"lauge_hansen_accuracy,omitempty"`
	AOOTAAccuracy       *AggregateAccuracy `json:"ao_ota_accuracy,omitempty"`
	BartonicekAccuracy  *AggregateAccuracy `json:"bartonicek_accuracy,omitempty"`

	// Per-case accuracy (sorted by difficulty: lowest accuracy first)
	PerCaseAccuracy []PerCaseAccuracy `json:"per_case_accuracy"`

	// Per-rater accuracy across all cases (for stratified analysis)
	PerRaterAccuracy []PerRaterAccuracy `json:"per_rater_accuracy,omitempty"`
}

// AggregateAccuracy contains accuracy aggregated across multiple cases.
type AggregateAccuracy struct {
	System string `json:"system"`

	// Mean accuracy across cases (0.0–100.0)
	MeanAccuracy float64 `json:"mean_accuracy"`

	// How many cases had data for this system
	CasesEvaluated int `json:"cases_evaluated"`

	// How often the consensus matched the gold standard
	ConsensusCorrect int     `json:"consensus_correct"`
	ConsensusTotal   int     `json:"consensus_total"`
	ConsensusRate    float64 `json:"consensus_rate"` // 0.0–100.0
}

// PerCaseAccuracy contains gold standard accuracy for a single case within a study.
type PerCaseAccuracy struct {
	CaseOrder int       `json:"case_order"`
	CaseID    uuid.UUID `json:"case_id"`
	CaseTitle string    `json:"case_title"`
	HasGold   bool      `json:"has_gold_standard"`

	// Per-system accuracy (% matching gold standard)
	DanisWeberAccuracy  *float64 `json:"danis_weber_accuracy,omitempty"`
	LaugeHansenAccuracy *float64 `json:"lauge_hansen_accuracy,omitempty"`
	AOOTAAccuracy       *float64 `json:"ao_ota_accuracy,omitempty"`
	BartonicekAccuracy  *float64 `json:"bartonicek_accuracy,omitempty"`

	// Flag hard cases (any system < 50% accuracy against gold standard)
	IsHardCase bool `json:"is_hard_case"`
}

// PerRaterAccuracy contains a single rater's accuracy across all cases in a study.
type PerRaterAccuracy struct {
	UserID          uuid.UUID `json:"user_id"`
	UserEmail       string    `json:"user_email,omitempty"`
	UserDisplayName string    `json:"user_display_name,omitempty"`

	// Number of cases this rater completed (that have gold standard)
	CasesCompleted int `json:"cases_completed"`

	// Per-system accuracy across completed cases
	DanisWeberAccuracy  *float64 `json:"danis_weber_accuracy,omitempty"`
	LaugeHansenAccuracy *float64 `json:"lauge_hansen_accuracy,omitempty"`
	AOOTAAccuracy       *float64 `json:"ao_ota_accuracy,omitempty"`
	BartonicekAccuracy  *float64 `json:"bartonicek_accuracy,omitempty"`
}
