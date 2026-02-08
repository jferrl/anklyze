package service

import (
	"math"
	"sort"
)

// ContinuousVarStats holds descriptive statistics for a continuous numeric variable.
type ContinuousVarStats struct {
	Name   string  `json:"name"`
	N      int     `json:"n"`
	Mean   float64 `json:"mean"`
	SD     float64 `json:"sd"`
	Median float64 `json:"median"`
	Q1     float64 `json:"q1"`
	Q3     float64 `json:"q3"`
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	IQR    float64 `json:"iqr"`
}

// CategoryCount represents a single category with its count and percentage.
type CategoryCount struct {
	Value      string  `json:"value"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

// CategoricalVarStats holds descriptive statistics for a categorical variable.
type CategoricalVarStats struct {
	Name       string          `json:"name"`
	Total      int             `json:"total"`
	Categories []CategoryCount `json:"categories"`
}

// BoxPlotStats holds box plot statistics including outlier detection.
type BoxPlotStats struct {
	Min        float64   `json:"min"`
	Q1         float64   `json:"q1"`
	Median     float64   `json:"median"`
	Q3         float64   `json:"q3"`
	Max        float64   `json:"max"`
	IQR        float64   `json:"iqr"`
	LowerFence float64   `json:"lower_fence"`
	UpperFence float64   `json:"upper_fence"`
	Outliers   []float64 `json:"outliers"`
}

// HistogramBin represents a single bin in a histogram.
type HistogramBin struct {
	Label string  `json:"label"`
	Min   float64 `json:"min"`
	Max   float64 `json:"max"`
	Count int     `json:"count"`
}

// computeContinuousStats calculates descriptive statistics for a continuous variable.
// Uses sample standard deviation (Bessel's correction: N-1 denominator).
// Quartiles use the exclusive method (interpolated between adjacent values).
func computeContinuousStats(name string, values []float64) ContinuousVarStats {
	n := len(values)
	if n == 0 {
		return ContinuousVarStats{Name: name}
	}

	// Sort a copy to avoid mutating the input.
	sorted := make([]float64, n)
	copy(sorted, values)
	sort.Float64s(sorted)

	sum := 0.0
	for _, v := range sorted {
		sum += v
	}
	mean := sum / float64(n)

	// Sample standard deviation (Bessel's correction).
	variance := 0.0
	for _, v := range sorted {
		diff := v - mean
		variance += diff * diff
	}
	sd := 0.0
	if n > 1 {
		sd = math.Sqrt(variance / float64(n-1))
	}

	median := computeMedian(sorted)
	q1 := computeQuartile(sorted, 0.25)
	q3 := computeQuartile(sorted, 0.75)

	return ContinuousVarStats{
		Name:   name,
		N:      n,
		Mean:   Round(mean, 3),
		SD:     Round(sd, 3),
		Median: Round(median, 3),
		Q1:     Round(q1, 3),
		Q3:     Round(q3, 3),
		Min:    sorted[0],
		Max:    sorted[n-1],
		IQR:    Round(q3-q1, 3),
	}
}

// computeMedian returns the median of a sorted slice.
func computeMedian(sorted []float64) float64 {
	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n%2 == 0 {
		return (sorted[n/2-1] + sorted[n/2]) / 2
	}
	return sorted[n/2]
}

// computeQuartile returns the quartile value using linear interpolation.
// p should be 0.25 for Q1 or 0.75 for Q3.
// Uses the "exclusive" (interpolation) method matching R type 7 / Excel QUARTILE.
func computeQuartile(sorted []float64, p float64) float64 {
	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n == 1 {
		return sorted[0]
	}

	// Position using 1-based indexing: pos = 1 + (n-1)*p
	pos := 1 + float64(n-1)*p
	lo := int(math.Floor(pos)) - 1 // convert to 0-based
	hi := lo + 1

	if hi >= n {
		return sorted[n-1]
	}

	frac := pos - math.Floor(pos)
	return sorted[lo] + frac*(sorted[hi]-sorted[lo])
}

// computeCategoricalStats calculates frequency statistics for a categorical variable.
// Empty strings are excluded from the count (treated as missing values).
func computeCategoricalStats(name string, values []string) CategoricalVarStats {
	counts := make(map[string]int)
	total := 0
	for _, v := range values {
		if v == "" {
			continue
		}
		counts[v]++
		total++
	}

	categories := make([]CategoryCount, 0, len(counts))
	for val, count := range counts {
		pct := 0.0
		if total > 0 {
			pct = Round(float64(count)/float64(total)*100, 2)
		}
		categories = append(categories, CategoryCount{
			Value:      val,
			Count:      count,
			Percentage: pct,
		})
	}

	// Sort by count descending for stable output.
	sort.Slice(categories, func(i, j int) bool {
		if categories[i].Count != categories[j].Count {
			return categories[i].Count > categories[j].Count
		}
		return categories[i].Value < categories[j].Value
	})

	return CategoricalVarStats{
		Name:       name,
		Total:      total,
		Categories: categories,
	}
}

// computeBoxPlot calculates box plot statistics with IQR-based outlier detection.
// Outliers are values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR].
func computeBoxPlot(values []float64) BoxPlotStats {
	n := len(values)
	if n == 0 {
		return BoxPlotStats{Outliers: []float64{}}
	}

	sorted := make([]float64, n)
	copy(sorted, values)
	sort.Float64s(sorted)

	median := computeMedian(sorted)
	q1 := computeQuartile(sorted, 0.25)
	q3 := computeQuartile(sorted, 0.75)
	iqr := q3 - q1
	lowerFence := q1 - 1.5*iqr
	upperFence := q3 + 1.5*iqr

	var outliers []float64
	for _, v := range sorted {
		if v < lowerFence || v > upperFence {
			outliers = append(outliers, v)
		}
	}
	if outliers == nil {
		outliers = []float64{}
	}

	return BoxPlotStats{
		Min:        sorted[0],
		Q1:         Round(q1, 3),
		Median:     Round(median, 3),
		Q3:         Round(q3, 3),
		Max:        sorted[n-1],
		IQR:        Round(iqr, 3),
		LowerFence: Round(lowerFence, 3),
		UpperFence: Round(upperFence, 3),
		Outliers:   outliers,
	}
}

// computeHistogramBins assigns values to predefined bins.
// binEdges defines the boundaries: [binEdges[0], binEdges[1]), [binEdges[1], binEdges[2]), ...
// The last bin is inclusive on both ends: [binEdges[n-2], binEdges[n-1]].
// labels should have len(binEdges)-1 entries.
func computeHistogramBins(values []float64, binEdges []float64, labels []string) []HistogramBin {
	if len(binEdges) < 2 || len(labels) != len(binEdges)-1 {
		return nil
	}

	bins := make([]HistogramBin, len(labels))
	for i := range bins {
		bins[i] = HistogramBin{
			Label: labels[i],
			Min:   binEdges[i],
			Max:   binEdges[i+1],
		}
	}

	lastBin := len(bins) - 1
	for _, v := range values {
		for i := range bins {
			if i == lastBin {
				// Last bin is inclusive on both ends.
				if v >= bins[i].Min && v <= bins[i].Max {
					bins[i].Count++
					break
				}
			} else {
				// Half-open: [min, max)
				if v >= bins[i].Min && v < bins[i].Max {
					bins[i].Count++
					break
				}
			}
		}
	}

	return bins
}
