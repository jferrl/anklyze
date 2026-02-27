package statistics

import (
	"testing"
)

func TestCohensKappa_PerfectAgreement(t *testing.T) {
	t.Parallel()

	// Both raters agree on all cases
	ratings := [][2]string{
		{"A", "A"},
		{"B", "B"},
		{"A", "A"},
		{"C", "C"},
		{"B", "B"},
	}

	kappa, err := CohensKappa(ratings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 1.0 {
		t.Errorf("expected kappa = 1.0 for perfect agreement, got %v", kappa)
	}
}

func TestCohensKappa_NoAgreement(t *testing.T) {
	t.Parallel()

	// Raters never agree (worst case scenario)
	ratings := [][2]string{
		{"A", "B"},
		{"B", "A"},
		{"A", "B"},
		{"B", "A"},
	}

	kappa, err := CohensKappa(ratings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Kappa should be negative (worse than chance)
	if kappa >= 0 {
		t.Errorf("expected negative kappa for systematic disagreement, got %v", kappa)
	}
}

func TestCohensKappa_PartialAgreement(t *testing.T) {
	t.Parallel()

	// Example from literature: partial agreement
	// Expected kappa around 0.4-0.6 for moderate agreement
	ratings := [][2]string{
		{"A", "A"},
		{"A", "A"},
		{"A", "B"},
		{"B", "B"},
		{"B", "B"},
		{"B", "A"},
		{"C", "C"},
		{"C", "C"},
		{"A", "A"},
		{"B", "B"},
	}

	kappa, err := CohensKappa(ratings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Kappa should be between 0 and 1 for partial agreement
	if kappa <= 0 || kappa >= 1 {
		t.Errorf("expected kappa between 0 and 1 for partial agreement, got %v", kappa)
	}
}

func TestCohensKappa_EmptyRatings(t *testing.T) {
	t.Parallel()

	ratings := [][2]string{}

	kappa, err := CohensKappa(ratings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 0 {
		t.Errorf("expected kappa = 0 for empty ratings, got %v", kappa)
	}
}

func TestCohensKappa_SingleRating(t *testing.T) {
	t.Parallel()

	ratings := [][2]string{
		{"A", "A"},
	}

	kappa, err := CohensKappa(ratings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Single perfect agreement should yield kappa = 1
	if kappa != 1.0 {
		t.Errorf("expected kappa = 1.0 for single agreeing rating, got %v", kappa)
	}
}

func TestCohensKappa_KnownValue(t *testing.T) {
	t.Parallel()

	// Known example: 20 cases
	// Rater 1: 10 A, 10 B
	// Rater 2: 10 A, 10 B
	// Agreement: 8 A-A, 8 B-B, 2 A-B, 2 B-A
	ratings := [][2]string{
		{"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"},
		{"A", "A"}, {"A", "A"}, {"A", "A"}, // 8 A-A
		{"A", "B"}, {"A", "B"}, // 2 A-B
		{"B", "B"}, {"B", "B"}, {"B", "B"}, {"B", "B"}, {"B", "B"},
		{"B", "B"}, {"B", "B"}, {"B", "B"}, // 8 B-B
		{"B", "A"}, {"B", "A"}, // 2 B-A
	}

	kappa, err := CohensKappa(ratings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Po = 16/20 = 0.8
	// Pe = 0.5*0.5 + 0.5*0.5 = 0.5
	// K = (0.8 - 0.5) / (1 - 0.5) = 0.6
	expectedKappa := 0.6
	tolerance := 0.01

	if kappa < expectedKappa-tolerance || kappa > expectedKappa+tolerance {
		t.Errorf("expected kappa ≈ %v, got %v", expectedKappa, kappa)
	}
}

func TestCohensKappaWithCI_Basic(t *testing.T) {
	t.Parallel()

	// Example with known moderate agreement
	ratings := [][2]string{
		{"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"},
		{"A", "A"}, {"A", "A"}, {"A", "A"}, // 8 A-A
		{"A", "B"}, {"A", "B"}, // 2 A-B
		{"B", "B"}, {"B", "B"}, {"B", "B"}, {"B", "B"}, {"B", "B"},
		{"B", "B"}, {"B", "B"}, {"B", "B"}, // 8 B-B
		{"B", "A"}, {"B", "A"}, // 2 B-A
	}

	kappa, ci, err := CohensKappaWithCI(ratings, 0.95)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Kappa should be around 0.6
	if kappa < 0.5 || kappa > 0.7 {
		t.Errorf("expected kappa around 0.6, got %v", kappa)
	}

	// CI should exist
	if ci == nil {
		t.Fatal("expected confidence interval, got nil")
	}

	// CI should be valid
	if ci.Lower >= ci.Upper {
		t.Errorf("CI lower (%v) should be less than upper (%v)", ci.Lower, ci.Upper)
	}

	// Kappa should be within CI
	if kappa < ci.Lower || kappa > ci.Upper {
		t.Errorf("kappa (%v) should be within CI [%v, %v]", kappa, ci.Lower, ci.Upper)
	}

	// Level should be set
	if ci.Level != 0.95 {
		t.Errorf("expected CI level 0.95, got %v", ci.Level)
	}
}

func TestCohensKappaWithCI_PerfectAgreement(t *testing.T) {
	t.Parallel()

	// Perfect agreement
	ratings := [][2]string{
		{"A", "A"},
		{"B", "B"},
		{"C", "C"},
	}

	kappa, ci, err := CohensKappaWithCI(ratings, 0.95)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 1.0 {
		t.Errorf("expected kappa = 1.0, got %v", kappa)
	}

	// CI should exist and upper bound should be clamped to 1.0
	if ci != nil && ci.Upper > 1.0 {
		t.Errorf("CI upper bound should not exceed 1.0, got %v", ci.Upper)
	}
}

func TestCohensKappaWithCI_SingleRating(t *testing.T) {
	t.Parallel()

	// Single rating - CI may not be meaningful but should not crash
	ratings := [][2]string{
		{"A", "A"},
	}

	kappa, ci, err := CohensKappaWithCI(ratings, 0.95)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 1.0 {
		t.Errorf("expected kappa = 1.0, got %v", kappa)
	}

	// CI should exist for n >= 2, but for n=1 it may be nil or have wide bounds
	// Just ensure no panic
	_ = ci
}

func TestCohensKappaWithCI_DifferentConfidenceLevels(t *testing.T) {
	t.Parallel()

	ratings := [][2]string{
		{"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"},
		{"A", "B"}, {"B", "B"}, {"B", "B"}, {"B", "B"}, {"B", "A"},
	}

	// 90% CI should be narrower than 95% CI
	_, ci90, _ := CohensKappaWithCI(ratings, 0.90)
	_, ci95, _ := CohensKappaWithCI(ratings, 0.95)
	_, ci99, _ := CohensKappaWithCI(ratings, 0.99)

	if ci90 == nil || ci95 == nil || ci99 == nil {
		t.Fatal("expected all CIs to exist")
	}

	width90 := ci90.Upper - ci90.Lower
	width95 := ci95.Upper - ci95.Lower
	width99 := ci99.Upper - ci99.Lower

	// 90% < 95% < 99%
	if width90 >= width95 {
		t.Errorf("90%% CI width (%v) should be less than 95%% CI width (%v)", width90, width95)
	}
	if width95 >= width99 {
		t.Errorf("95%% CI width (%v) should be less than 99%% CI width (%v)", width95, width99)
	}

	// Verify levels are set correctly
	if ci90.Level != 0.90 {
		t.Errorf("expected CI level 0.90, got %v", ci90.Level)
	}
	if ci95.Level != 0.95 {
		t.Errorf("expected CI level 0.95, got %v", ci95.Level)
	}
	if ci99.Level != 0.99 {
		t.Errorf("expected CI level 0.99, got %v", ci99.Level)
	}
}
