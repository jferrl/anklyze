package statistics

import (
	"math"

	"github.com/jferrl/anklyze/internal/domain"
)

// FleissKappa calculates Fleiss' Kappa for multiple raters.
// matrix[i][j] = number of raters who assigned subject i to category j
// numRaters is the number of raters per subject (must be consistent).
// Returns the Kappa value.
func FleissKappa(matrix [][]int, numRaters int) (float64, error) {
	if len(matrix) == 0 || numRaters < 2 {
		return 0, nil
	}

	numSubjects := len(matrix)
	numCategories := len(matrix[0])
	n := float64(numRaters)
	nSubj := float64(numSubjects)

	// Calculate P_j (proportion of all assignments to category j)
	pj := make([]float64, numCategories)
	totalAssignments := nSubj * n
	for j := range numCategories {
		sum := 0
		for i := range numSubjects {
			if j < len(matrix[i]) {
				sum += matrix[i][j]
			}
		}
		pj[j] = float64(sum) / totalAssignments
	}

	// Calculate P_i (agreement for each subject)
	pi := make([]float64, numSubjects)
	for i := 0; i < numSubjects; i++ {
		sum := 0.0
		for j := 0; j < numCategories; j++ {
			if j < len(matrix[i]) {
				nij := float64(matrix[i][j])
				sum += nij * (nij - 1)
			}
		}
		if n*(n-1) > 0 {
			pi[i] = sum / (n * (n - 1))
		}
	}

	// Calculate P_bar (mean of P_i values)
	pBar := 0.0
	for i := range numSubjects {
		pBar += pi[i]
	}
	pBar /= nSubj

	// Calculate P_e_bar (expected agreement by chance)
	peBar := 0.0
	for j := 0; j < numCategories; j++ {
		peBar += pj[j] * pj[j]
	}

	// Fleiss' Kappa formula: K = (P_bar - P_e_bar) / (1 - P_e_bar)
	if peBar == 1 {
		return 1.0, nil
	}

	kappa := (pBar - peBar) / (1 - peBar)
	return kappa, nil
}

// FleissKappaCI calculates confidence interval for Fleiss' Kappa.
// Uses the approximate variance formula.
func FleissKappaCI(matrix [][]int, numRaters int, kappa float64, confidenceLevel float64) *domain.ConfidenceInterval {
	// Simplified approximation for Fleiss' Kappa variance
	// Based on Fleiss (1971) and later refinements
	n := float64(len(matrix)) // Number of subjects
	k := float64(numRaters)   // Number of raters

	if n < 2 || k < 2 {
		return nil
	}

	// Calculate P_e (expected agreement)
	numCategories := len(matrix[0])
	pj := make([]float64, numCategories)
	totalAssignments := n * k

	for j := 0; j < numCategories; j++ {
		sum := 0
		for i := 0; i < int(n); i++ {
			if j < len(matrix[i]) {
				sum += matrix[i][j]
			}
		}
		pj[j] = float64(sum) / totalAssignments
	}

	pe := 0.0
	for j := 0; j < numCategories; j++ {
		pe += pj[j] * pj[j]
	}

	// Approximate standard error (simplified formula)
	// SE ≈ sqrt(2 / (n * k * (k-1) * (1-Pe)^2))
	denominator := n * k * (k - 1) * (1 - pe) * (1 - pe)
	if denominator <= 0 {
		return nil
	}

	se := math.Sqrt(2 / denominator)

	// Z-score for confidence level
	z := 1.96 // 95% CI
	switch confidenceLevel {
	case 0.99:
		z = 2.576
	case 0.90:
		z = 1.645
	}

	lower := kappa - z*se
	upper := kappa + z*se

	// Clamp to valid range
	if lower < -1 {
		lower = -1
	}
	if upper > 1 {
		upper = 1
	}

	return &domain.ConfidenceInterval{
		Lower: Round(lower, 4),
		Upper: Round(upper, 4),
		Level: confidenceLevel,
	}
}
