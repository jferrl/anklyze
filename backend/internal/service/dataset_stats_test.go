package service

import (
	"testing"
)

// approxEqual compares two floats within a tolerance.
func approxEqual(a, b, tolerance float64) bool {
	if a == b {
		return true
	}
	diff := a - b
	if diff < 0 {
		diff = -diff
	}
	return diff <= tolerance
}

func TestComputeContinuousStats(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		values     []float64
		wantN      int
		wantMean   float64
		wantSD     float64
		wantMedian float64
		wantQ1     float64
		wantQ3     float64
		wantMin    float64
		wantMax    float64
		wantIQR    float64
	}{
		{
			name:       "known dataset",
			values:     []float64{2, 4, 6, 8, 10},
			wantN:      5,
			wantMean:   6.0,
			wantSD:     3.162, // sqrt(10), sample SD
			wantMedian: 6.0,
			wantQ1:     4.0,
			wantQ3:     8.0,
			wantMin:    2.0,
			wantMax:    10.0,
			wantIQR:    4.0,
		},
		{
			name:       "single value",
			values:     []float64{42},
			wantN:      1,
			wantMean:   42.0,
			wantSD:     0.0,
			wantMedian: 42.0,
			wantQ1:     42.0,
			wantQ3:     42.0,
			wantMin:    42.0,
			wantMax:    42.0,
			wantIQR:    0.0,
		},
		{
			name:       "two values",
			values:     []float64{10, 20},
			wantN:      2,
			wantMean:   15.0,
			wantSD:     7.071, // sqrt(50)
			wantMedian: 15.0,
			wantQ1:     12.5,  // pos = 1 + 1*0.25 = 1.25 → 10 + 0.25*(20-10) = 12.5
			wantQ3:     17.5,  // pos = 1 + 1*0.75 = 1.75 → 10 + 0.75*(20-10) = 17.5
			wantMin:    10.0,
			wantMax:    20.0,
			wantIQR:    5.0,
		},
		{
			name:   "empty",
			values: []float64{},
			wantN:  0,
		},
		{
			name:       "all same values",
			values:     []float64{5, 5, 5, 5},
			wantN:      4,
			wantMean:   5.0,
			wantSD:     0.0,
			wantMedian: 5.0,
			wantQ1:     5.0,
			wantQ3:     5.0,
			wantMin:    5.0,
			wantMax:    5.0,
			wantIQR:    0.0,
		},
		{
			name:       "even count for median",
			values:     []float64{1, 2, 3, 4},
			wantN:      4,
			wantMean:   2.5,
			wantSD:     1.291, // sqrt(5/3) ≈ 1.291
			wantMedian: 2.5,
			wantQ1:     1.75,
			wantQ3:     3.25,
			wantMin:    1.0,
			wantMax:    4.0,
			wantIQR:    1.5,
		},
		{
			name:       "real clinical data - ages",
			values:     []float64{21, 45, 58, 62, 64, 65, 68, 70, 72, 78, 85, 91},
			wantN:      12,
			wantMean:   64.917,
			wantSD:     18.399,
			wantMedian: 66.5,
			wantQ1:     61.0,
			wantQ3:     73.5,
			wantMin:    21.0,
			wantMax:    91.0,
			wantIQR:    12.5,
		},
		{
			name:       "unsorted input",
			values:     []float64{10, 2, 8, 4, 6},
			wantN:      5,
			wantMean:   6.0,
			wantSD:     3.162,
			wantMedian: 6.0,
			wantQ1:     4.0,
			wantQ3:     8.0,
			wantMin:    2.0,
			wantMax:    10.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := computeContinuousStats("test", tt.values)
			if got.N != tt.wantN {
				t.Errorf("N = %d, want %d", got.N, tt.wantN)
			}
			if got.Name != "test" {
				t.Errorf("Name = %q, want %q", got.Name, "test")
			}
			if tt.wantN == 0 {
				return
			}
			if !approxEqual(got.Mean, tt.wantMean, 0.01) {
				t.Errorf("Mean = %f, want %f", got.Mean, tt.wantMean)
			}
			if tt.wantN > 1 && !approxEqual(got.SD, tt.wantSD, 0.01) {
				t.Errorf("SD = %f, want %f", got.SD, tt.wantSD)
			}
			if !approxEqual(got.Median, tt.wantMedian, 0.01) {
				t.Errorf("Median = %f, want %f", got.Median, tt.wantMedian)
			}
			if !approxEqual(got.Q1, tt.wantQ1, 0.01) {
				t.Errorf("Q1 = %f, want %f", got.Q1, tt.wantQ1)
			}
			if !approxEqual(got.Q3, tt.wantQ3, 0.01) {
				t.Errorf("Q3 = %f, want %f", got.Q3, tt.wantQ3)
			}
			if !approxEqual(got.Min, tt.wantMin, 0.01) {
				t.Errorf("Min = %f, want %f", got.Min, tt.wantMin)
			}
			if !approxEqual(got.Max, tt.wantMax, 0.01) {
				t.Errorf("Max = %f, want %f", got.Max, tt.wantMax)
			}
			if tt.wantIQR > 0 && !approxEqual(got.IQR, tt.wantIQR, 0.01) {
				t.Errorf("IQR = %f, want %f", got.IQR, tt.wantIQR)
			}
		})
	}
}

func TestComputeContinuousStats_DoesNotMutateInput(t *testing.T) {
	t.Parallel()

	input := []float64{10, 2, 8, 4, 6}
	original := make([]float64, len(input))
	copy(original, input)

	computeContinuousStats("test", input)

	for i := range input {
		if input[i] != original[i] {
			t.Errorf("input[%d] was mutated: got %f, want %f", i, input[i], original[i])
		}
	}
}

func TestComputeCategoricalStats(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		values         []string
		wantTotal      int
		wantCategories map[string]int
		wantPcts       map[string]float64
	}{
		{
			name:      "sex distribution",
			values:    []string{"female", "female", "female", "male"},
			wantTotal: 4,
			wantCategories: map[string]int{
				"female": 3,
				"male":   1,
			},
			wantPcts: map[string]float64{
				"female": 75.0,
				"male":   25.0,
			},
		},
		{
			name:      "with empty strings (missing)",
			values:    []string{"left", "right", "", "left"},
			wantTotal: 3,
			wantCategories: map[string]int{
				"left":  2,
				"right": 1,
			},
			wantPcts: map[string]float64{
				"left":  66.67,
				"right": 33.33,
			},
		},
		{
			name:      "all same value",
			values:    []string{"high", "high", "high"},
			wantTotal: 3,
			wantCategories: map[string]int{
				"high": 3,
			},
			wantPcts: map[string]float64{
				"high": 100.0,
			},
		},
		{
			name:      "empty input",
			values:    []string{},
			wantTotal: 0,
		},
		{
			name:      "all empty strings",
			values:    []string{"", "", ""},
			wantTotal: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := computeCategoricalStats("test", tt.values)
			if got.Total != tt.wantTotal {
				t.Errorf("Total = %d, want %d", got.Total, tt.wantTotal)
			}
			if got.Name != "test" {
				t.Errorf("Name = %q, want %q", got.Name, "test")
			}
			if tt.wantTotal == 0 {
				if len(got.Categories) != 0 {
					t.Errorf("expected 0 categories, got %d", len(got.Categories))
				}
				return
			}

			// Verify counts.
			catMap := make(map[string]CategoryCount)
			for _, c := range got.Categories {
				catMap[c.Value] = c
			}
			for val, wantCount := range tt.wantCategories {
				gotCat, ok := catMap[val]
				if !ok {
					t.Errorf("missing category %q", val)
					continue
				}
				if gotCat.Count != wantCount {
					t.Errorf("category %q: Count = %d, want %d", val, gotCat.Count, wantCount)
				}
			}

			// Verify percentages.
			for val, wantPct := range tt.wantPcts {
				gotCat, ok := catMap[val]
				if !ok {
					continue
				}
				if !approxEqual(gotCat.Percentage, wantPct, 0.01) {
					t.Errorf("category %q: Percentage = %f, want %f", val, gotCat.Percentage, wantPct)
				}
			}
		})
	}
}

func TestComputeBoxPlot(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		values       []float64
		wantMedian   float64
		wantQ1       float64
		wantQ3       float64
		wantIQR      float64
		wantLower    float64
		wantUpper    float64
		wantOutliers []float64
	}{
		{
			name:         "with outliers",
			values:       []float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 100},
			wantMedian:   5.5,
			wantQ1:       3.25,
			wantQ3:       7.75,
			wantIQR:      4.5,
			wantLower:    -3.5,
			wantUpper:    14.5,
			wantOutliers: []float64{100},
		},
		{
			name:         "no outliers",
			values:       []float64{10, 11, 12, 13, 14},
			wantMedian:   12.0,
			wantQ1:       11.0,
			wantQ3:       13.0,
			wantIQR:      2.0,
			wantLower:    8.0,
			wantUpper:    16.0,
			wantOutliers: []float64{},
		},
		{
			name:         "days to surgery realistic",
			values:       []float64{0, 1, 2, 3, 3, 4, 5, 5, 6, 7, 8, 10, 14, 21, 45},
			wantMedian:   5.0,
			wantQ1:       3.0,
			wantQ3:       9.0,
			wantIQR:      6.0,
			wantLower:    -6.0,
			wantUpper:    18.0,
			wantOutliers: []float64{21, 45},
		},
		{
			name:         "single value",
			values:       []float64{5},
			wantMedian:   5.0,
			wantQ1:       5.0,
			wantQ3:       5.0,
			wantIQR:      0.0,
			wantOutliers: []float64{},
		},
		{
			name:         "empty",
			values:       []float64{},
			wantOutliers: []float64{},
		},
		{
			name:         "lower outliers",
			values:       []float64{-100, 10, 11, 12, 13, 14, 15},
			wantMedian:   12.0,
			wantQ1:       10.5,
			wantQ3:       13.5,
			wantIQR:      3.0,
			wantLower:    6.0,
			wantUpper:    18.0,
			wantOutliers: []float64{-100},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := computeBoxPlot(tt.values)

			if len(tt.values) == 0 {
				if len(got.Outliers) != 0 {
					t.Errorf("expected 0 outliers for empty input, got %d", len(got.Outliers))
				}
				return
			}

			if !approxEqual(got.Median, tt.wantMedian, 0.01) {
				t.Errorf("Median = %f, want %f", got.Median, tt.wantMedian)
			}
			if !approxEqual(got.Q1, tt.wantQ1, 0.01) {
				t.Errorf("Q1 = %f, want %f", got.Q1, tt.wantQ1)
			}
			if !approxEqual(got.Q3, tt.wantQ3, 0.01) {
				t.Errorf("Q3 = %f, want %f", got.Q3, tt.wantQ3)
			}
			if !approxEqual(got.IQR, tt.wantIQR, 0.01) {
				t.Errorf("IQR = %f, want %f", got.IQR, tt.wantIQR)
			}
			if tt.wantLower != 0 || tt.wantUpper != 0 {
				if !approxEqual(got.LowerFence, tt.wantLower, 0.01) {
					t.Errorf("LowerFence = %f, want %f", got.LowerFence, tt.wantLower)
				}
				if !approxEqual(got.UpperFence, tt.wantUpper, 0.01) {
					t.Errorf("UpperFence = %f, want %f", got.UpperFence, tt.wantUpper)
				}
			}

			if len(got.Outliers) != len(tt.wantOutliers) {
				t.Errorf("Outliers count = %d, want %d (got %v)", len(got.Outliers), len(tt.wantOutliers), got.Outliers)
			} else {
				for i := range tt.wantOutliers {
					if !approxEqual(got.Outliers[i], tt.wantOutliers[i], 0.01) {
						t.Errorf("Outliers[%d] = %f, want %f", i, got.Outliers[i], tt.wantOutliers[i])
					}
				}
			}
		})
	}
}

func TestComputeHistogramBins(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		values     []float64
		binEdges   []float64
		labels     []string
		wantCounts []int
		wantNil    bool
	}{
		{
			name:       "age decades",
			values:     []float64{21, 35, 42, 55, 58, 62, 68, 72, 78, 91},
			binEdges:   []float64{0, 30, 60, 90, 100},
			labels:     []string{"0-29", "30-59", "60-89", "90-100"},
			wantCounts: []int{1, 4, 4, 1}, // [0,30): 21; [30,60): 35,42,55,58; [60,90): 62,68,72,78; [90,100]: 91
		},
		{
			name:       "all in one bin",
			values:     []float64{5, 5, 5, 5},
			binEdges:   []float64{0, 10, 20},
			labels:     []string{"0-9", "10-19"},
			wantCounts: []int{4, 0},
		},
		{
			name:       "value on bin edge goes to lower bin",
			values:     []float64{10, 20, 30},
			binEdges:   []float64{0, 10, 20, 30},
			labels:     []string{"0-9", "10-19", "20-30"},
			wantCounts: []int{0, 1, 2}, // 10 → [10,20), 20 → [20,30], 30 → [20,30]
		},
		{
			name:       "empty values",
			values:     []float64{},
			binEdges:   []float64{0, 10, 20},
			labels:     []string{"0-9", "10-19"},
			wantCounts: []int{0, 0},
		},
		{
			name:    "invalid: mismatched labels",
			values:  []float64{1, 2, 3},
			binEdges: []float64{0, 10, 20},
			labels:  []string{"only-one"},
			wantNil: true,
		},
		{
			name:    "invalid: too few bin edges",
			values:  []float64{1, 2, 3},
			binEdges: []float64{0},
			labels:  []string{},
			wantNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := computeHistogramBins(tt.values, tt.binEdges, tt.labels)
			if tt.wantNil {
				if got != nil {
					t.Errorf("expected nil, got %v", got)
				}
				return
			}
			if got == nil {
				t.Fatal("expected non-nil bins")
			}
			if len(got) != len(tt.wantCounts) {
				t.Fatalf("bin count = %d, want %d", len(got), len(tt.wantCounts))
			}
			for i, want := range tt.wantCounts {
				if got[i].Count != want {
					t.Errorf("bin %q: Count = %d, want %d", got[i].Label, got[i].Count, want)
				}
				if got[i].Label != tt.labels[i] {
					t.Errorf("bin[%d].Label = %q, want %q", i, got[i].Label, tt.labels[i])
				}
			}
		})
	}
}

func TestComputeHistogramBins_BinBoundaries(t *testing.T) {
	t.Parallel()

	// Verify that bin boundaries are set correctly.
	bins := computeHistogramBins(
		[]float64{1},
		[]float64{0, 10, 20},
		[]string{"first", "second"},
	)
	if bins == nil {
		t.Fatal("expected non-nil bins")
	}
	if bins[0].Min != 0 || bins[0].Max != 10 {
		t.Errorf("bin 0 bounds: [%f, %f], want [0, 10]", bins[0].Min, bins[0].Max)
	}
	if bins[1].Min != 10 || bins[1].Max != 20 {
		t.Errorf("bin 1 bounds: [%f, %f], want [10, 20]", bins[1].Min, bins[1].Max)
	}
}

func TestComputeMedian(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		sorted []float64
		want   float64
	}{
		{"empty", []float64{}, 0},
		{"single", []float64{7}, 7},
		{"two", []float64{3, 9}, 6},
		{"odd count", []float64{1, 2, 3, 4, 5}, 3},
		{"even count", []float64{1, 2, 3, 4}, 2.5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := computeMedian(tt.sorted)
			if !approxEqual(got, tt.want, 0.001) {
				t.Errorf("computeMedian = %f, want %f", got, tt.want)
			}
		})
	}
}

func TestComputeQuartile(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		sorted []float64
		p      float64
		want   float64
	}{
		{"empty", []float64{}, 0.25, 0},
		{"single", []float64{10}, 0.25, 10},
		{"Q1 of 5 elements", []float64{2, 4, 6, 8, 10}, 0.25, 4.0},
		{"Q3 of 5 elements", []float64{2, 4, 6, 8, 10}, 0.75, 8.0},
		{"Q1 of 4 elements", []float64{1, 2, 3, 4}, 0.25, 1.75},
		{"Q3 of 4 elements", []float64{1, 2, 3, 4}, 0.75, 3.25},
		{"Q1 of 10 elements", []float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 0.25, 3.25},
		{"Q3 of 10 elements", []float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 0.75, 7.75},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := computeQuartile(tt.sorted, tt.p)
			if !approxEqual(got, tt.want, 0.001) {
				t.Errorf("computeQuartile(p=%f) = %f, want %f", tt.p, got, tt.want)
			}
		})
	}
}

// Benchmarks

func BenchmarkComputeContinuousStats(b *testing.B) {
	values := make([]float64, 1000)
	for i := range values {
		values[i] = float64(i)
	}
	b.ResetTimer()
	for b.Loop() {
		computeContinuousStats("bench", values)
	}
}

func BenchmarkComputeCategoricalStats(b *testing.B) {
	values := make([]string, 1000)
	cats := []string{"male", "female"}
	for i := range values {
		values[i] = cats[i%2]
	}
	b.ResetTimer()
	for b.Loop() {
		computeCategoricalStats("bench", values)
	}
}

func BenchmarkComputeBoxPlot(b *testing.B) {
	values := make([]float64, 1000)
	for i := range values {
		values[i] = float64(i)
	}
	b.ResetTimer()
	for b.Loop() {
		computeBoxPlot(values)
	}
}

func BenchmarkComputeHistogramBins(b *testing.B) {
	values := make([]float64, 1000)
	for i := range values {
		values[i] = float64(i)
	}
	edges := []float64{0, 200, 400, 600, 800, 1000}
	labels := []string{"0-199", "200-399", "400-599", "600-799", "800-999"}
	b.ResetTimer()
	for b.Loop() {
		computeHistogramBins(values, edges, labels)
	}
}
