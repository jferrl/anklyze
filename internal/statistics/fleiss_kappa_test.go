package statistics

import (
	"math"
	"reflect"
	"testing"
)

// fleiss1971 is Table 1 of Fleiss (1971), as reproduced in the "Fleiss' kappa" worked example:
// 10 subjects, 14 raters, 5 categories. The published kappa is 0.210.
var fleiss1971 = [][]int{
	{0, 0, 0, 0, 14},
	{0, 2, 6, 4, 2},
	{0, 0, 3, 5, 6},
	{0, 3, 9, 2, 0},
	{2, 2, 8, 1, 1},
	{7, 7, 0, 0, 0},
	{3, 2, 6, 3, 0},
	{2, 5, 3, 2, 2},
	{6, 5, 2, 1, 0},
	{0, 2, 2, 3, 7},
}

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

func TestFleissKappa_Fleiss1971(t *testing.T) {
	t.Parallel()

	// Pbar = 688/1820, Pe = 4170/19600, so kappa = (0.37802 - 0.21276) / (1 - 0.21276) = 0.2099.
	want := (688.0/1820.0 - 4170.0/19600.0) / (1 - 4170.0/19600.0)

	kappa, _ := FleissKappa(fleiss1971, 14)

	if math.Abs(kappa-want) > 1e-12 {
		t.Errorf("kappa = %v, want %v", kappa, want)
	}
	if math.Abs(kappa-0.210) > 5e-4 {
		t.Errorf("kappa = %v, does not match the published 0.210", kappa)
	}
}

// Three subjects, three raters, categories A and B: rows (3,0) (2,1) (0,3).
// P_i = 1, 1/3, 1, so Pbar = 7/9; p_A = 5/9, p_B = 4/9, so Pe = 41/81.
// kappa = (7/9 - 41/81) / (1 - 41/81) = 22/40 = 0.55.
func TestFleissKappa_HandComputed(t *testing.T) {
	t.Parallel()

	kappa, _ := FleissKappa([][]int{{3, 0}, {2, 1}, {0, 3}}, 3)

	if math.Abs(kappa-0.55) > 1e-12 {
		t.Errorf("kappa = %v, want 0.55", kappa)
	}
}

// Every resample of identical subjects is the same matrix, so the interval collapses to the point estimate.
// Rows (2,1) with 3 raters: Pbar = 1/3, p = (2/3, 1/3), Pe = 5/9, kappa = (1/3 - 5/9) / (4/9) = -0.5.
func TestFleissKappaCI_IdenticalSubjects(t *testing.T) {
	t.Parallel()

	ci := FleissKappaCI([][]int{{2, 1}, {2, 1}, {2, 1}}, 3, 0.95)

	if ci == nil {
		t.Fatal("expected confidence interval, got nil")
	}
	if ci.Lower != -0.5 || ci.Upper != -0.5 || ci.Level != 0.95 {
		t.Errorf("CI = %+v, want [-0.5, -0.5] at level 0.95", ci)
	}
}

// Two subjects (3,0) and (0,3). A resample of the same subject twice puts every rating in one
// category (kappa undefined) and is skipped; the other two resamples have kappa 1.
func TestFleissKappaCI_SkipsDegenerateResamples(t *testing.T) {
	t.Parallel()

	ci := FleissKappaCI([][]int{{3, 0}, {0, 3}}, 3, 0.95)

	if ci == nil {
		t.Fatal("expected confidence interval, got nil")
	}
	if ci.Lower != 1 || ci.Upper != 1 {
		t.Errorf("CI = %+v, want [1, 1]", ci)
	}
}

func TestFleissKappaCI_NilWhenNothingToResample(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		matrix    [][]int
		numRaters int
	}{
		"single subject":      {[][]int{{3, 2, 0}}, 5},
		"no subjects":         {nil, 3},
		"single rater":        {[][]int{{1, 0}, {0, 1}}, 1},
		"all in one category": {[][]int{{3, 0}, {3, 0}}, 3},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if ci := FleissKappaCI(tt.matrix, tt.numRaters, 0.95); ci != nil {
				t.Errorf("expected nil, got %+v", ci)
			}
		})
	}
}

func TestFleissKappaCI_Reproducible(t *testing.T) {
	t.Parallel()

	first := FleissKappaCI(fleiss1971, 14, 0.95)
	second := FleissKappaCI(fleiss1971, 14, 0.95)

	if first == nil || !reflect.DeepEqual(first, second) {
		t.Errorf("same data gave different intervals: %+v vs %+v", first, second)
	}
}

func TestFleissKappaCI_Fleiss1971(t *testing.T) {
	t.Parallel()

	kappa, _ := FleissKappa(fleiss1971, 14)
	ci := FleissKappaCI(fleiss1971, 14, 0.95)

	if ci == nil {
		t.Fatal("expected confidence interval, got nil")
	}
	if ci.Lower >= kappa || ci.Upper <= kappa {
		t.Errorf("kappa %v outside its CI [%v, %v]", kappa, ci.Lower, ci.Upper)
	}
	if ci.Lower < -1 || ci.Upper > 1 {
		t.Errorf("CI [%v, %v] outside [-1, 1]", ci.Lower, ci.Upper)
	}

	// Regression value of the seeded bootstrap, not hand computed: it changes only if the
	// seed, the number of resamples or the percentile rule changes.
	if ci.Lower != 0.0437 || ci.Upper != 0.3613 {
		t.Errorf("CI = [%v, %v], want [0.0437, 0.3613]", ci.Lower, ci.Upper)
	}
}

func TestFleissKappaCI_WiderAtHigherLevel(t *testing.T) {
	t.Parallel()

	ci90 := FleissKappaCI(fleiss1971, 14, 0.90)
	ci95 := FleissKappaCI(fleiss1971, 14, 0.95)
	ci99 := FleissKappaCI(fleiss1971, 14, 0.99)

	if ci90 == nil || ci95 == nil || ci99 == nil {
		t.Fatal("expected all CIs to exist")
	}
	if w90, w95, w99 := ci90.Upper-ci90.Lower, ci95.Upper-ci95.Lower, ci99.Upper-ci99.Lower; w90 >= w95 || w95 >= w99 {
		t.Errorf("widths should grow with level: 90%% %v, 95%% %v, 99%% %v", w90, w95, w99)
	}
	if ci90.Level != 0.90 || ci95.Level != 0.95 || ci99.Level != 0.99 {
		t.Errorf("levels not carried through: %v %v %v", ci90.Level, ci95.Level, ci99.Level)
	}
}
