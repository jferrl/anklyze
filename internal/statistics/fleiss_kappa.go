package statistics

import (
	"math"
	"math/rand/v2"
	"slices"

	"github.com/jferrl/anklyze/internal/domain"
)

const (
	fleissBootstrapResamples = 2000
	// Fixed so the same data always gives the same interval.
	fleissBootstrapSeed = 20260101
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
// It resamples the subjects (cases) with replacement 2000 times with a fixed seed
// and takes the middle confidenceLevel of the resampled kappas.
// Returns nil with fewer than 2 subjects or when no resample has a defined kappa.
func FleissKappaCI(matrix [][]int, numRaters int, confidenceLevel float64) *domain.ConfidenceInterval {
	n := len(matrix)
	if n < 2 || numRaters < 2 {
		return nil
	}

	// PCG's stream is fixed by its spec; reducing with % keeps the draws independent of the
	// Rand helper methods, whose algorithms may change between Go versions.
	src := rand.NewPCG(fleissBootstrapSeed, fleissBootstrapSeed)
	resample := make([][]int, n)
	kappas := make([]float64, 0, fleissBootstrapResamples)

	for range fleissBootstrapResamples {
		for i := range resample {
			resample[i] = matrix[src.Uint64()%uint64(n)]
		}
		pBar, peBar := fleissAgreement(resample, numRaters)
		// Skip degenerate resamples: with every rating in one category kappa is 0/0, and
		// counting it as 1 would pull the interval up.
		if peBar == 1 {
			continue
		}
		kappas = append(kappas, (pBar-peBar)/(1-peBar))
	}
	if len(kappas) == 0 {
		return nil
	}

	slices.Sort(kappas)
	m := len(kappas)
	tail := min(int(math.Round((1-confidenceLevel)/2*float64(m))), (m-1)/2)

	return &domain.ConfidenceInterval{
		Lower: Round(max(-1, kappas[tail]), 4),
		Upper: Round(min(1, kappas[m-1-tail]), 4),
		Level: confidenceLevel,
	}
}
