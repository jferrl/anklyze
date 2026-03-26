package statistics

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
