package statistics

import (
	"github.com/jferrl/anklyze/internal/domain"
)

// fleissAgreement returns the mean observed agreement and the agreement expected by chance.
// Every row of matrix must sum to numRaters.
func fleissAgreement(matrix [][]int, numRaters int) (pBar, peBar float64) {
	n := float64(numRaters)
	nSubj := float64(len(matrix))
	totals := make([]float64, len(matrix[0]))

	for _, row := range matrix {
		sum := 0.0
		for j := 0; j < len(totals) && j < len(row); j++ {
			nij := float64(row[j])
			totals[j] += nij
			sum += nij * (nij - 1)
		}
		pBar += sum / (n * (n - 1))
	}
	pBar /= nSubj

	for _, total := range totals {
		pj := total / (nSubj * n)
		peBar += pj * pj
	}
	return pBar, peBar
}

// FleissKappa calculates Fleiss' Kappa for multiple raters.
// matrix[i][j] = number of raters who assigned subject i to category j
// numRaters is the number of raters per subject (must be consistent).
// Returns the Kappa value.
func FleissKappa(matrix [][]int, numRaters int) (float64, error) {
	if len(matrix) == 0 || numRaters < 2 {
		return 0, nil
	}

	pBar, peBar := fleissAgreement(matrix, numRaters)

	// Every rating is in one category: kappa is 0/0, reported as perfect agreement.
	if peBar == 1 {
		return 1.0, nil
	}

	return (pBar - peBar) / (1 - peBar), nil
}

// FleissKappaCI returns a percentile bootstrap interval for Fleiss' Kappa.
// Returns nil with fewer than 2 subjects or when no resample has a defined kappa.
// See bootstrapKappaCI for the resampling scheme.
func FleissKappaCI(matrix [][]int, numRaters int, confidenceLevel float64) *domain.ConfidenceInterval {
	if numRaters < 2 {
		return nil
	}

	resample := make([][]int, len(matrix))
	return bootstrapKappaCI(len(matrix), confidenceLevel, func(idx []uint64) (float64, bool) {
		for i, j := range idx {
			resample[i] = matrix[j]
		}
		pBar, peBar := fleissAgreement(resample, numRaters)
		return (pBar - peBar) / (1 - peBar), peBar != 1
	})
}
