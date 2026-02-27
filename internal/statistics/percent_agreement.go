package statistics

// PercentAgreement calculates simple percentage agreement among all raters.
// ratings is a slice of categories assigned by different raters to the same subject.
func PercentAgreement(ratings []string) float64 {
	if len(ratings) < 2 {
		return 1.0
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

	return float64(maxCount) / float64(len(ratings))
}
