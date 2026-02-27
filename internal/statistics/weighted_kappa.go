package statistics

import (
	"math"

	"github.com/jferrl/anklyze/internal/domain"
)

// AOOTAOrdering defines the natural order of AO/OTA classifications.
var AOOTAOrdering = []string{
	"44-A1", "44-A2",
	"44-B1", "44-B2", "44-B3",
	"44-C1", "44-C2", "44-C3",
}

// WeightedKappa calculates weighted Cohen's Kappa for ordinal categories.
// The ordering parameter defines the order of categories (e.g., ["44-A1", "44-A2", "44-B1"...]).
// weightType can be "linear" or "quadratic".
// Linear: w_ij = 1 - |i-j|/(k-1)
// Quadratic: w_ij = 1 - (i-j)²/(k-1)²
func WeightedKappa(ratings [][2]string, ordering []string, weightType domain.KappaWeightType) (float64, error) {
	n := len(ratings)
	if n < 1 || len(ordering) < 2 {
		return 0, nil
	}

	// Create index map for ordering
	orderIndex := make(map[string]int)
	for i, cat := range ordering {
		orderIndex[cat] = i
	}

	k := len(ordering)
	kMinus1 := float64(k - 1)

	// Build weight matrix
	weights := make([][]float64, k)
	for i := range k {
		weights[i] = make([]float64, k)
		for j := range k {
			diff := math.Abs(float64(i - j))
			switch weightType {
			case domain.KappaWeightQuadratic:
				weights[i][j] = 1 - (diff*diff)/(kMinus1*kMinus1)
			default: // Linear
				weights[i][j] = 1 - diff/kMinus1
			}
		}
	}

	// Build observed frequency matrix (contingency table)
	observed := make([][]float64, k)
	for i := range k {
		observed[i] = make([]float64, k)
	}

	rater1Counts := make([]float64, k)
	rater2Counts := make([]float64, k)

	validPairs := 0
	for _, pair := range ratings {
		i, ok1 := orderIndex[pair[0]]
		j, ok2 := orderIndex[pair[1]]
		if ok1 && ok2 {
			observed[i][j]++
			rater1Counts[i]++
			rater2Counts[j]++
			validPairs++
		}
	}

	if validPairs == 0 {
		return 0, nil
	}

	nFloat := float64(validPairs)

	// Calculate observed weighted agreement (P_o)
	po := 0.0
	for i := 0; i < k; i++ {
		for j := 0; j < k; j++ {
			po += weights[i][j] * observed[i][j] / nFloat
		}
	}

	// Calculate expected weighted agreement (P_e)
	pe := 0.0
	for i := 0; i < k; i++ {
		for j := 0; j < k; j++ {
			pe += weights[i][j] * (rater1Counts[i] / nFloat) * (rater2Counts[j] / nFloat)
		}
	}

	// Weighted Kappa formula: K_w = (P_o - P_e) / (1 - P_e)
	if pe >= 1 {
		return 1.0, nil
	}

	kappa := (po - pe) / (1 - pe)
	return kappa, nil
}
