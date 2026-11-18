package statistics

import (
	"math"
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
)

func TestWeightedKappa_PerfectAgreement(t *testing.T) {
	t.Parallel()

	ordering := []string{"A", "B", "C", "D"}

	ratings := [][2]string{
		{"A", "A"},
		{"B", "B"},
		{"C", "C"},
		{"D", "D"},
	}

	kappa, _ := WeightedKappa(ratings, ordering, domain.KappaWeightLinear)

	if kappa != 1.0 {
		t.Errorf("expected weighted kappa = 1.0 for perfect agreement, got %v", kappa)
	}
}

func TestWeightedKappa_AdjacentVsExtremeDisagreement(t *testing.T) {
	t.Parallel()

	ordering := []string{"A", "B", "C", "D"}

	// Mix of agreements and adjacent disagreements
	adjacentRatings := [][2]string{
		{"A", "A"}, // Agreement
		{"B", "B"}, // Agreement
		{"C", "D"}, // Adjacent disagreement
		{"D", "C"}, // Adjacent disagreement
	}

	// Mix of agreements and extreme disagreements
	extremeRatings := [][2]string{
		{"A", "A"}, // Agreement
		{"B", "B"}, // Agreement
		{"A", "D"}, // Extreme disagreement
		{"D", "A"}, // Extreme disagreement
	}

	kappaAdjacent, _ := WeightedKappa(adjacentRatings, ordering, domain.KappaWeightLinear)
	kappaExtreme, _ := WeightedKappa(extremeRatings, ordering, domain.KappaWeightLinear)

	// Weighted kappa should be higher for adjacent disagreements than extreme
	// because adjacent disagreements are penalized less
	if kappaAdjacent <= kappaExtreme {
		t.Errorf("weighted kappa for adjacent disagreement (%v) should be > extreme (%v)",
			kappaAdjacent, kappaExtreme)
	}
}

func TestWeightedKappa_ExtremeDisagreement(t *testing.T) {
	t.Parallel()

	ordering := []string{"A", "B", "C", "D"}

	// All disagreements are maximum distance (A<->D)
	ratings := [][2]string{
		{"A", "D"},
		{"D", "A"},
		{"A", "D"},
		{"D", "A"},
	}

	kappaLinear, _ := WeightedKappa(ratings, ordering, domain.KappaWeightLinear)
	kappaQuadratic, _ := WeightedKappa(ratings, ordering, domain.KappaWeightQuadratic)

	// For extreme disagreements, weighted kappa should be very negative
	if kappaLinear > 0 {
		t.Errorf("linear weighted kappa should be <= 0 for extreme disagreement, got %v", kappaLinear)
	}
	if kappaQuadratic > 0 {
		t.Errorf("quadratic weighted kappa should be <= 0 for extreme disagreement, got %v", kappaQuadratic)
	}
}

func TestWeightedKappa_AOOTAOrdering(t *testing.T) {
	t.Parallel()

	aoOTA := []string{"44-A1", "44-A2", "44-A3", "44-B1", "44-B2", "44-B3", "44-C1", "44-C2", "44-C3"}

	// Perfect agreement on adjacent codes should have high weighted kappa
	ratings := [][2]string{
		{"44-A1", "44-A1"},
		{"44-A2", "44-A2"},
		{"44-B1", "44-B2"}, // Adjacent disagreement
		{"44-B2", "44-B1"}, // Adjacent disagreement
		{"44-C1", "44-C1"},
	}

	kappaLinear, _ := WeightedKappa(ratings, aoOTA, domain.KappaWeightLinear)

	// Should have moderate-to-high agreement despite some adjacent disagreements
	if kappaLinear < 0.5 {
		t.Errorf("expected weighted kappa >= 0.5 for mostly agreeing with adjacent errors, got %v", kappaLinear)
	}
}

func TestWeightedKappa_EmptyRatings(t *testing.T) {
	t.Parallel()

	ordering := []string{"A", "B", "C"}

	kappa, _ := WeightedKappa([][2]string{}, ordering, domain.KappaWeightLinear)

	if kappa != 0 {
		t.Errorf("expected kappa = 0 for empty ratings, got %v", kappa)
	}
}

func TestWeightedKappa_ShortOrdering(t *testing.T) {
	t.Parallel()

	ordering := []string{"A"} // Less than 2 categories

	ratings := [][2]string{
		{"A", "A"},
	}

	kappa, _ := WeightedKappa(ratings, ordering, domain.KappaWeightLinear)

	if kappa != 0 {
		t.Errorf("expected kappa = 0 for single-category ordering, got %v", kappa)
	}
}

func TestWeightedKappa_QuadraticVsLinear(t *testing.T) {
	t.Parallel()

	ordering := []string{"A", "B", "C", "D", "E"}

	// Mix of adjacent and extreme disagreements
	ratings := [][2]string{
		{"A", "A"}, // Agreement
		{"B", "D"}, // Moderate disagreement
		{"A", "E"}, // Extreme disagreement
		{"C", "C"}, // Agreement
	}

	kappaLinear, _ := WeightedKappa(ratings, ordering, domain.KappaWeightLinear)
	kappaQuadratic, _ := WeightedKappa(ratings, ordering, domain.KappaWeightQuadratic)

	// Quadratic should penalize extreme disagreements more than linear
	// so quadratic kappa should be lower when there are extreme disagreements
	if kappaQuadratic >= kappaLinear {
		t.Errorf("quadratic kappa (%v) should be <= linear kappa (%v) when extreme disagreements are present",
			kappaQuadratic, kappaLinear)
	}
}

func TestAOOTAGroup(t *testing.T) {
	t.Parallel()

	tests := []struct{ code, want string }{
		{"44-B1.2", "44-B1"},
		{"44-A1.3", "44-A1"},
		{"44-C3.1", "44-C3"},
		{"44-B1", "44-B1"},
		{"44-A3.2", "44-A3"},
		{"43-B1", "43-B1"},
		{"not_classifiable", "not_classifiable"},
		{"", ""},
	}
	for _, tt := range tests {
		if got := AOOTAGroup(tt.code); got != tt.want {
			t.Errorf("AOOTAGroup(%q) = %q, want %q", tt.code, got, tt.want)
		}
	}
}

// Hand computed on the AO/OTA ordering (k = 9, linear weight 1 - |i-j|/8):
// pairs (B1,B1) (B2,B3) (C1,C3) (B1,A1) have weights 1, 7/8, 6/8, 5/8, so Po = 13/16.
// Marginals: rater 1 B1 .5, B2 .25, C1 .25; rater 2 A1, B1, B3, C3 .25 each, so Pe = 43/64.
// kappa_w = (13/16 - 43/64) / (1 - 43/64) = 3/7. The pairs (43-B2,A1) and (43-B1,B1) are outside the ordering.
func TestWeightedKappa_AOOTAHandComputedWithExclusions(t *testing.T) {
	t.Parallel()

	ratings := [][2]string{
		{"44-B1", "44-B1"},
		{"44-B2", "44-B3"},
		{"43-B2", "44-A1"},
		{"44-C1", "44-C3"},
		{"43-B1", "44-B1"},
		{"44-B1", "44-A1"},
	}

	kappa, excluded := WeightedKappa(ratings, AOOTAOrdering, domain.KappaWeightLinear)

	if excluded != 2 {
		t.Errorf("excluded = %d, want 2", excluded)
	}
	if want := 3.0 / 7.0; math.Abs(kappa-want) > 1e-12 {
		t.Errorf("kappa = %v, want %v", kappa, want)
	}
}

func TestWeightedKappa_AllPairsExcluded(t *testing.T) {
	t.Parallel()

	ratings := [][2]string{{"43-B2", "43-B2"}, {"not_classifiable", "44-B1"}}

	kappa, excluded := WeightedKappa(ratings, AOOTAOrdering, domain.KappaWeightLinear)

	if kappa != 0 || excluded != 2 {
		t.Errorf("got kappa %v, excluded %d; want 0, 2", kappa, excluded)
	}
}

// Quadratic weights 1 - (i-j)^2/9 on A..D: pairs (A,A) (B,C) (D,D) (A,C) have weights 1, 8/9, 1, 5/9, so Po = 31/36.
// Marginals: rater 1 A .5, B .25, D .25; rater 2 A .25, C .5, D .25, so Pe = 19/72 + 29/144 + 25/144 = 23/36.
// kappa_w = (31/36 - 23/36) / (1 - 23/36) = 8/13.
func TestWeightedKappa_QuadraticHandComputed(t *testing.T) {
	t.Parallel()

	ratings := [][2]string{{"A", "A"}, {"B", "C"}, {"D", "D"}, {"A", "C"}}

	kappa, excluded := WeightedKappa(ratings, []string{"A", "B", "C", "D"}, domain.KappaWeightQuadratic)

	if excluded != 0 {
		t.Errorf("excluded = %d, want 0", excluded)
	}
	if want := 8.0 / 13.0; math.Abs(kappa-want) > 1e-12 {
		t.Errorf("kappa = %v, want %v", kappa, want)
	}
}

func TestWeightedKappa_AOOTAIncludesA3(t *testing.T) {
	t.Parallel()

	ratings := [][2]string{{AOOTAGroup("44-A3.2"), "44-A3"}, {AOOTAGroup("44-A3.3"), "44-B1"}, {"44-B1", "44-B1"}}

	if _, excluded := WeightedKappa(ratings, AOOTAOrdering, domain.KappaWeightLinear); excluded != 0 {
		t.Errorf("excluded = %d, want 0: 44-A3 subgroups belong to the ordering", excluded)
	}
}
