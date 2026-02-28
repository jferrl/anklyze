package statistics

import (
	"math"

	"github.com/jferrl/anklyze/internal/domain"
)

// CohensKappa calculates Cohen's Kappa for two raters.
// ratings is a slice of [rater1_category, rater2_category] pairs.
// Returns the Kappa value between -1 and 1, where:
//   - 1 = perfect agreement
//   - 0 = agreement expected by chance
//   - < 0 = less than chance agreement
func CohensKappa(ratings [][2]string) (float64, error) {
	kappa, _, err := CohensKappaWithCI(ratings, 0.95)
	return kappa, err
}

// CohensKappaWithCI calculates Cohen's Kappa with confidence interval.
// ratings is a slice of [rater1_category, rater2_category] pairs.
// confidenceLevel is typically 0.95 for 95% CI.
// Returns the Kappa value, confidence interval, and any error.
func CohensKappaWithCI(ratings [][2]string, confidenceLevel float64) (float64, *domain.ConfidenceInterval, error) {
	n := len(ratings)
	if n < 1 {
		return 0, nil, nil
	}

	// Build contingency table
	categories := ExtractCategories(ratings)
	if len(categories) == 0 {
		return 0, nil, nil
	}

	// Count agreements and category frequencies
	observed := 0
	rater1Counts := make(map[string]int)
	rater2Counts := make(map[string]int)

	for _, pair := range ratings {
		if pair[0] == pair[1] {
			observed++
		}
		rater1Counts[pair[0]]++
		rater2Counts[pair[1]]++
	}

	// Calculate observed agreement (P_o)
	po := float64(observed) / float64(n)

	// Calculate expected agreement by chance (P_e)
	pe := 0.0
	for _, cat := range categories {
		p1 := float64(rater1Counts[cat]) / float64(n)
		p2 := float64(rater2Counts[cat]) / float64(n)
		pe += p1 * p2
	}

	// Cohen's Kappa formula: K = (P_o - P_e) / (1 - P_e)
	if pe == 1 {
		return 1.0, nil, nil // Perfect agreement by definition
	}

	kappa := (po - pe) / (1 - pe)

	// Calculate confidence interval
	// Standard error formula (approximate): SE = sqrt((Po * (1 - Po)) / (n * (1 - Pe)^2))
	// This is a simplified approximation; more complex formulas exist for small samples
	var ci *domain.ConfidenceInterval
	if n >= 2 {
		denominator := float64(n) * (1 - pe) * (1 - pe)
		if denominator > 0 {
			se := math.Sqrt((po * (1 - po)) / denominator)

			// Z-score for confidence level (default 95% -> z = 1.96)
			z := 1.96 // 95% CI
			switch confidenceLevel {
			case 0.99:
				z = 2.576
			case 0.90:
				z = 1.645
			}

			lower := kappa - z*se
			upper := kappa + z*se

			// Clamp to valid Kappa range [-1, 1]
			if lower < -1 {
				lower = -1
			}
			if upper > 1 {
				upper = 1
			}

			ci = &domain.ConfidenceInterval{
				Lower: Round(lower, 4),
				Upper: Round(upper, 4),
				Level: confidenceLevel,
			}
		}
	}

	return kappa, ci, nil
}
