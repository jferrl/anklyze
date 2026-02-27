package statistics

import (
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

	kappa, err := WeightedKappa(ratings, ordering, domain.KappaWeightLinear)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

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

	aoOTA := []string{"44-A1", "44-A2", "44-B1", "44-B2", "44-B3", "44-C1", "44-C2", "44-C3"}

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

	kappa, err := WeightedKappa([][2]string{}, ordering, domain.KappaWeightLinear)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

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

	kappa, err := WeightedKappa(ratings, ordering, domain.KappaWeightLinear)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

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
