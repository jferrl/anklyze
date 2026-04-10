package statistics

// MajorityVote returns the most common value and its count.
// If there is a tie, the first value encountered with the max count wins.
func MajorityVote(ratings []string) (value string, count int) {
	if len(ratings) == 0 {
		return "", 0
	}

	counts := make(map[string]int)
	// Track insertion order for deterministic tie-breaking
	var order []string
	for _, r := range ratings {
		if counts[r] == 0 {
			order = append(order, r)
		}
		counts[r]++
	}

	for _, v := range order {
		c := counts[v]
		if c > count {
			value = v
			count = c
		}
	}
	return value, count
}

// GoldStandardAccuracy calculates what percentage of ratings match the gold standard value.
// Returns accuracy as 0.0–100.0 and the count of correct ratings.
func GoldStandardAccuracy(ratings []string, goldValue string) (accuracy float64, correct int) {
	if len(ratings) == 0 {
		return 0, 0
	}

	for _, r := range ratings {
		if r == goldValue {
			correct++
		}
	}

	accuracy = float64(correct) / float64(len(ratings)) * 100
	return accuracy, correct
}
