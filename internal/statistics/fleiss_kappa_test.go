package statistics

import (
	"testing"
)

func TestFleissKappa_PerfectAgreement(t *testing.T) {
	t.Parallel()

	// 3 subjects, 4 raters, 3 categories
	// All raters agree on each subject
	matrix := [][]int{
		{4, 0, 0}, // Subject 1: all 4 raters chose A
		{0, 4, 0}, // Subject 2: all 4 raters chose B
		{0, 0, 4}, // Subject 3: all 4 raters chose C
	}

	kappa, err := FleissKappa(matrix, 4)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 1.0 {
		t.Errorf("expected kappa = 1.0 for perfect agreement, got %v", kappa)
	}
}

func TestFleissKappa_NoAgreement(t *testing.T) {
	t.Parallel()

	// 3 subjects, 3 raters, 3 categories
	// Raters perfectly split on each subject (no agreement)
	matrix := [][]int{
		{1, 1, 1}, // Subject 1: each rater chose different
		{1, 1, 1}, // Subject 2: each rater chose different
		{1, 1, 1}, // Subject 3: each rater chose different
	}

	kappa, err := FleissKappa(matrix, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Kappa should be 0 or negative
	if kappa > 0.01 {
		t.Errorf("expected kappa <= 0 for no agreement, got %v", kappa)
	}
}

func TestFleissKappa_PartialAgreement(t *testing.T) {
	t.Parallel()

	// 5 subjects, 5 raters, 3 categories
	// Mixed agreement
	matrix := [][]int{
		{5, 0, 0}, // Subject 1: all agree
		{4, 1, 0}, // Subject 2: mostly agree
		{3, 2, 0}, // Subject 3: partial
		{2, 2, 1}, // Subject 4: split
		{0, 5, 0}, // Subject 5: all agree
	}

	kappa, err := FleissKappa(matrix, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should be moderate agreement
	if kappa <= 0 || kappa >= 1 {
		t.Errorf("expected kappa between 0 and 1 for partial agreement, got %v", kappa)
	}
}

func TestFleissKappa_EmptyMatrix(t *testing.T) {
	t.Parallel()

	matrix := [][]int{}

	kappa, err := FleissKappa(matrix, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 0 {
		t.Errorf("expected kappa = 0 for empty matrix, got %v", kappa)
	}
}

func TestFleissKappa_SingleRater(t *testing.T) {
	t.Parallel()

	// Single rater (invalid for Fleiss)
	matrix := [][]int{
		{1, 0, 0},
		{0, 1, 0},
	}

	kappa, err := FleissKappa(matrix, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should return 0 for invalid input
	if kappa != 0 {
		t.Errorf("expected kappa = 0 for single rater, got %v", kappa)
	}
}

func TestFleissKappaCI_Basic(t *testing.T) {
	t.Parallel()

	// 5 subjects, 5 raters, 3 categories with partial agreement
	matrix := [][]int{
		{5, 0, 0},
		{4, 1, 0},
		{3, 2, 0},
		{2, 2, 1},
		{0, 5, 0},
	}

	kappa, _ := FleissKappa(matrix, 5)
	ci := FleissKappaCI(matrix, 5, kappa, 0.95)

	if ci == nil {
		t.Fatal("expected confidence interval, got nil")
		return
	}

	if ci.Lower >= ci.Upper {
		t.Errorf("CI lower (%v) should be less than upper (%v)", ci.Lower, ci.Upper)
	}

	if ci.Level != 0.95 {
		t.Errorf("expected CI level 0.95, got %v", ci.Level)
	}
}

func TestFleissKappaCI_SingleSubject(t *testing.T) {
	t.Parallel()

	// Only 1 subject - CI should not be calculable
	matrix := [][]int{
		{3, 2, 0},
	}

	ci := FleissKappaCI(matrix, 5, 0.5, 0.95)

	if ci != nil {
		t.Error("expected nil CI for single subject")
	}
}

func TestFleissKappaCI_DifferentConfidenceLevels(t *testing.T) {
	t.Parallel()

	matrix := [][]int{
		{5, 0, 0},
		{4, 1, 0},
		{3, 2, 0},
		{2, 2, 1},
		{0, 5, 0},
	}
	kappa, _ := FleissKappa(matrix, 5)

	ci90 := FleissKappaCI(matrix, 5, kappa, 0.90)
	ci95 := FleissKappaCI(matrix, 5, kappa, 0.95)
	ci99 := FleissKappaCI(matrix, 5, kappa, 0.99)

	if ci90 == nil || ci95 == nil || ci99 == nil {
		t.Fatal("expected all CIs to exist")
		return
	}

	width90 := ci90.Upper - ci90.Lower
	width95 := ci95.Upper - ci95.Lower
	width99 := ci99.Upper - ci99.Lower

	// 90% < 95% < 99%
	if width90 >= width95 {
		t.Errorf("90%% CI width (%v) should be < 95%% CI width (%v)", width90, width95)
	}
	if width95 >= width99 {
		t.Errorf("95%% CI width (%v) should be < 99%% CI width (%v)", width95, width99)
	}
}
