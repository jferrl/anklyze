package statistics

import (
	"math"
	"math/rand/v2"
	"slices"

	"github.com/jferrl/anklyze/internal/domain"
)

const (
	bootstrapResamples = 2000
	// Fixed so the same data always gives the same interval.
	bootstrapSeed = 20260101
)

// bootstrapKappaCI returns a percentile bootstrap interval over n subjects (cases).
// It draws n indices with replacement 2000 times with a fixed seed, calls kappa on each draw,
// and takes the middle confidenceLevel of the defined results, clamped to [-1, 1].
// kappa reports false for a degenerate resample (kappa is 0/0); those are skipped, since
// counting them as 1 would pull the interval up. Returns nil with fewer than 2 subjects
// or when no resample is defined. kappa must not retain idx.
func bootstrapKappaCI(n int, confidenceLevel float64, kappa func(idx []uint64) (float64, bool)) *domain.ConfidenceInterval {
	if n < 2 {
		return nil
	}

	// PCG's stream is fixed by its spec; reducing with % keeps the draws independent of the
	// Rand helper methods, whose algorithms may change between Go versions.
	src := rand.NewPCG(bootstrapSeed, bootstrapSeed)
	idx := make([]uint64, n)
	kappas := make([]float64, 0, bootstrapResamples)

	for range bootstrapResamples {
		for i := range idx {
			idx[i] = src.Uint64() % uint64(n)
		}
		if k, ok := kappa(idx); ok {
			kappas = append(kappas, k)
		}
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
