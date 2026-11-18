package statistics

import (
	"github.com/jferrl/anklyze/internal/domain"
)

// cohenAgreement returns the observed agreement and the agreement expected by chance
// for rating pairs. categories fixes the summation order so the result is deterministic.
func cohenAgreement(ratings [][2]string, categories []string) (po, pe float64) {
	n := float64(len(ratings))
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

	for _, cat := range categories {
		pe += float64(rater1Counts[cat]) / n * float64(rater2Counts[cat]) / n
	}
	return float64(observed) / n, pe
}

// CohensKappaWithCI calculates Cohen's Kappa with a percentile bootstrap confidence interval.
// ratings is a slice of [rater1_category, rater2_category] pairs.
// confidenceLevel is typically 0.95 for 95% CI.
// The interval is nil with fewer than 2 pairs or when every pair is in one category.
// See bootstrapKappaCI for the resampling scheme.
func CohensKappaWithCI(ratings [][2]string, confidenceLevel float64) (float64, *domain.ConfidenceInterval, error) {
	categories := ExtractCategories(ratings)
	if len(ratings) < 1 || len(categories) == 0 {
		return 0, nil, nil
	}

	po, pe := cohenAgreement(ratings, categories)

	// Every rating is in one category: kappa is 0/0, reported as perfect agreement.
	if pe == 1 {
		return 1.0, nil, nil
	}

	resample := make([][2]string, len(ratings))
	ci := bootstrapKappaCI(len(ratings), confidenceLevel, func(idx []uint64) (float64, bool) {
		for i, j := range idx {
			resample[i] = ratings[j]
		}
		po, pe := cohenAgreement(resample, categories)
		return (po - pe) / (1 - pe), pe != 1
	})

	return (po - pe) / (1 - pe), ci, nil
}
