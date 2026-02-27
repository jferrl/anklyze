package statistics

import (
	"github.com/jferrl/anklyze/internal/domain"
)

// ConfusionMatrix builds a confusion matrix comparing observed to expected classifications.
// Returns map[expected][observed] = count
func ConfusionMatrix(observed, expected []string) map[string]map[string]int64 {
	matrix := make(map[string]map[string]int64)

	for i := 0; i < len(observed) && i < len(expected); i++ {
		exp := expected[i]
		obs := observed[i]

		if matrix[exp] == nil {
			matrix[exp] = make(map[string]int64)
		}
		matrix[exp][obs]++
	}

	return matrix
}

// CategoryCounts counts occurrences of each category.
func CategoryCounts(ratings []string) map[string]int64 {
	counts := make(map[string]int64)
	for _, r := range ratings {
		if r != "" {
			counts[r]++
		}
	}
	return counts
}

// CalculateCategoryMetrics calculates diagnostic metrics (sensitivity, specificity, etc.)
// for each category by comparing observed classifications against expected (gold standard).
// Returns a map of category -> metrics.
func CalculateCategoryMetrics(observed, expected []string) map[string]*domain.CategoryMetrics {
	if len(observed) == 0 || len(expected) == 0 {
		return nil
	}

	// Find all unique categories
	categories := make(map[string]bool)
	for _, cat := range observed {
		if cat != "" {
			categories[cat] = true
		}
	}
	for _, cat := range expected {
		if cat != "" {
			categories[cat] = true
		}
	}

	if len(categories) == 0 {
		return nil
	}

	n := len(observed)
	if len(expected) < n {
		n = len(expected)
	}

	result := make(map[string]*domain.CategoryMetrics)

	for cat := range categories {
		// Calculate confusion matrix elements for this category (binary: cat vs not-cat)
		var tp, tn, fp, fn int64

		for i := range n {
			actualPositive := expected[i] == cat
			predictedPositive := observed[i] == cat

			switch {
			case actualPositive && predictedPositive:
				tp++ // True Positive
			case !actualPositive && !predictedPositive:
				tn++ // True Negative
			case !actualPositive && predictedPositive:
				fp++ // False Positive
			case actualPositive && !predictedPositive:
				fn++ // False Negative
			}
		}

		metrics := &domain.CategoryMetrics{
			Category: cat,
		}

		// Sensitivity (True Positive Rate): TP / (TP + FN)
		if tp+fn > 0 {
			metrics.Sensitivity = float64(tp) / float64(tp+fn)
		}

		// Specificity (True Negative Rate): TN / (TN + FP)
		if tn+fp > 0 {
			metrics.Specificity = float64(tn) / float64(tn+fp)
		}

		// Positive Predictive Value (Precision): TP / (TP + FP)
		if tp+fp > 0 {
			metrics.PPV = float64(tp) / float64(tp+fp)
		}

		// Negative Predictive Value: TN / (TN + FN)
		if tn+fn > 0 {
			metrics.NPV = float64(tn) / float64(tn+fn)
		}

		// F1 Score: 2 * (PPV * Sensitivity) / (PPV + Sensitivity)
		if metrics.PPV+metrics.Sensitivity > 0 {
			metrics.F1Score = 2 * (metrics.PPV * metrics.Sensitivity) / (metrics.PPV + metrics.Sensitivity)
		}

		// Round to 4 decimal places
		metrics.Sensitivity = Round(metrics.Sensitivity, 4)
		metrics.Specificity = Round(metrics.Specificity, 4)
		metrics.PPV = Round(metrics.PPV, 4)
		metrics.NPV = Round(metrics.NPV, 4)
		metrics.F1Score = Round(metrics.F1Score, 4)

		result[cat] = metrics
	}

	return result
}

// CalculateAccuracy calculates the accuracy (percentage correct) of predictions.
func CalculateAccuracy(observed, expected []string) float64 {
	if len(observed) == 0 || len(expected) == 0 {
		return 0
	}

	correct := 0
	total := 0
	for i := 0; i < len(observed) && i < len(expected); i++ {
		total++
		if observed[i] == expected[i] {
			correct++
		}
	}

	if total == 0 {
		return 0
	}
	return float64(correct) / float64(total) * 100
}
