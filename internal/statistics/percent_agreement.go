package statistics

// PercentAgreement returns the share (0-1) of ratings that gave the most common category.
// ratings holds the categories different raters assigned to the same subject. ok is false
// with fewer than 2 ratings: a single rating has nothing to agree with.
func PercentAgreement(ratings []string) (agreement float64, ok bool) {
	if len(ratings) < 2 {
		return 0, false
	}

	// Find most common rating
	counts := make(map[string]int)
	for _, r := range ratings {
		counts[r]++
	}

	maxCount := 0
	for _, c := range counts {
		if c > maxCount {
			maxCount = c
		}
	}

	return float64(maxCount) / float64(len(ratings)), true
}
