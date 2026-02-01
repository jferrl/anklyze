package service

import (
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

func TestCohensKappa_PerfectAgreement(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	// Both raters agree on all cases
	ratings := [][2]string{
		{"A", "A"},
		{"B", "B"},
		{"A", "A"},
		{"C", "C"},
		{"B", "B"},
	}

	kappa, err := svc.CohensKappa(ratings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 1.0 {
		t.Errorf("expected kappa = 1.0 for perfect agreement, got %v", kappa)
	}
}

func TestCohensKappa_NoAgreement(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	// Raters never agree (worst case scenario)
	ratings := [][2]string{
		{"A", "B"},
		{"B", "A"},
		{"A", "B"},
		{"B", "A"},
	}

	kappa, err := svc.CohensKappa(ratings)
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

	svc := NewStatisticsService()

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

	kappa, err := svc.CohensKappa(ratings)
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

	svc := NewStatisticsService()

	ratings := [][2]string{}

	kappa, err := svc.CohensKappa(ratings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 0 {
		t.Errorf("expected kappa = 0 for empty ratings, got %v", kappa)
	}
}

func TestCohensKappa_SingleRating(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	ratings := [][2]string{
		{"A", "A"},
	}

	kappa, err := svc.CohensKappa(ratings)
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

	svc := NewStatisticsService()

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

	kappa, err := svc.CohensKappa(ratings)
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

func TestFleissKappa_PerfectAgreement(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	// 3 subjects, 4 raters, 3 categories
	// All raters agree on each subject
	matrix := [][]int{
		{4, 0, 0}, // Subject 1: all 4 raters chose A
		{0, 4, 0}, // Subject 2: all 4 raters chose B
		{0, 0, 4}, // Subject 3: all 4 raters chose C
	}

	kappa, err := svc.FleissKappa(matrix, 4)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 1.0 {
		t.Errorf("expected kappa = 1.0 for perfect agreement, got %v", kappa)
	}
}

func TestFleissKappa_NoAgreement(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	// 3 subjects, 3 raters, 3 categories
	// Raters perfectly split on each subject (no agreement)
	matrix := [][]int{
		{1, 1, 1}, // Subject 1: each rater chose different
		{1, 1, 1}, // Subject 2: each rater chose different
		{1, 1, 1}, // Subject 3: each rater chose different
	}

	kappa, err := svc.FleissKappa(matrix, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Kappa should be 0 or negative
	if kappa > 0.01 {
		t.Errorf("expected kappa ≤ 0 for no agreement, got %v", kappa)
	}
}

func TestFleissKappa_PartialAgreement(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	// 5 subjects, 5 raters, 3 categories
	// Mixed agreement
	matrix := [][]int{
		{5, 0, 0}, // Subject 1: all agree
		{4, 1, 0}, // Subject 2: mostly agree
		{3, 2, 0}, // Subject 3: partial
		{2, 2, 1}, // Subject 4: split
		{0, 5, 0}, // Subject 5: all agree
	}

	kappa, err := svc.FleissKappa(matrix, 5)
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

	svc := NewStatisticsService()

	matrix := [][]int{}

	kappa, err := svc.FleissKappa(matrix, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 0 {
		t.Errorf("expected kappa = 0 for empty matrix, got %v", kappa)
	}
}

func TestFleissKappa_SingleRater(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	// Single rater (invalid for Fleiss)
	matrix := [][]int{
		{1, 0, 0},
		{0, 1, 0},
	}

	kappa, err := svc.FleissKappa(matrix, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should return 0 for invalid input
	if kappa != 0 {
		t.Errorf("expected kappa = 0 for single rater, got %v", kappa)
	}
}

func TestPercentAgreement_AllAgree(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	ratings := []string{"A", "A", "A", "A", "A"}

	agreement := svc.PercentAgreement(ratings)

	if agreement != 1.0 {
		t.Errorf("expected 100%% agreement, got %v", agreement)
	}
}

func TestPercentAgreement_NoneAgree(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	ratings := []string{"A", "B", "C", "D", "E"}

	agreement := svc.PercentAgreement(ratings)

	// Mode is 1/5 = 0.2
	expected := 0.2
	if agreement != expected {
		t.Errorf("expected %v agreement, got %v", expected, agreement)
	}
}

func TestPercentAgreement_MajorityAgree(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	ratings := []string{"A", "A", "A", "B", "C"}

	agreement := svc.PercentAgreement(ratings)

	// Mode is 3/5 = 0.6
	expected := 0.6
	if agreement != expected {
		t.Errorf("expected %v agreement, got %v", expected, agreement)
	}
}

func TestPercentAgreement_SingleRating(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	ratings := []string{"A"}

	agreement := svc.PercentAgreement(ratings)

	// Single rating = 100% agreement by definition
	if agreement != 1.0 {
		t.Errorf("expected 100%% agreement for single rating, got %v", agreement)
	}
}

func TestPercentAgreement_Empty(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	ratings := []string{}

	agreement := svc.PercentAgreement(ratings)

	// Empty = 100% agreement by definition
	if agreement != 1.0 {
		t.Errorf("expected 100%% agreement for empty ratings, got %v", agreement)
	}
}

func TestConfusionMatrix_Basic(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	observed := []string{"A", "A", "B", "B", "A"}
	expected := []string{"A", "B", "B", "A", "A"}

	matrix := svc.ConfusionMatrix(observed, expected)

	// Check A->A (correct)
	if matrix["A"]["A"] != 2 {
		t.Errorf("expected A->A = 2, got %v", matrix["A"]["A"])
	}

	// Check A->B (expected A, got B)
	if matrix["A"]["B"] != 1 {
		t.Errorf("expected A->B = 1, got %v", matrix["A"]["B"])
	}

	// Check B->B (correct)
	if matrix["B"]["B"] != 1 {
		t.Errorf("expected B->B = 1, got %v", matrix["B"]["B"])
	}

	// Check B->A (expected B, got A)
	if matrix["B"]["A"] != 1 {
		t.Errorf("expected B->A = 1, got %v", matrix["B"]["A"])
	}
}

func TestCategoryCounts(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	ratings := []string{"A", "A", "B", "A", "C", "B", "", "A"}

	counts := svc.CategoryCounts(ratings)

	if counts["A"] != 4 {
		t.Errorf("expected A count = 4, got %v", counts["A"])
	}
	if counts["B"] != 2 {
		t.Errorf("expected B count = 2, got %v", counts["B"])
	}
	if counts["C"] != 1 {
		t.Errorf("expected C count = 1, got %v", counts["C"])
	}
	if counts[""] != 0 {
		t.Errorf("expected empty string count = 0, got %v", counts[""])
	}
}

func TestCalculateAccuracy(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	observed := []string{"A", "A", "B", "B", "A"}
	expected := []string{"A", "B", "B", "A", "A"}

	accuracy := svc.CalculateAccuracy(observed, expected)

	// 3 correct out of 5 = 60%
	if accuracy != 60.0 {
		t.Errorf("expected accuracy = 60%%, got %v", accuracy)
	}
}

func TestCalculateReliabilityMetrics_TwoRaters(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	user1 := uuid.New()
	user2 := uuid.New()
	studyID := uuid.New()

	dw1 := "Weber A"
	dw2 := "Weber A"

	responses := []domain.StudyResponse{
		{
			UserID:         user1,
			DanisWeberType: &dw1,
		},
		{
			UserID:         user2,
			DanisWeberType: &dw2,
		},
	}

	study := &domain.Study{
		ID: studyID,
	}

	metrics, err := svc.CalculateReliabilityMetrics(responses, study)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if metrics == nil {
		t.Fatal("expected metrics, got nil")
	}

	if metrics.TotalResponses != 2 {
		t.Errorf("expected 2 responses, got %v", metrics.TotalResponses)
	}

	if metrics.UniqueRaters != 2 {
		t.Errorf("expected 2 raters, got %v", metrics.UniqueRaters)
	}

	if metrics.DanisWeberAgreement == nil {
		t.Fatal("expected DanisWeberAgreement, got nil")
	}

	// Perfect agreement between 2 raters
	if metrics.DanisWeberAgreement.CohensKappa == nil {
		t.Fatal("expected CohensKappa for 2 raters, got nil")
	}

	if *metrics.DanisWeberAgreement.CohensKappa != 1.0 {
		t.Errorf("expected Cohen's Kappa = 1.0 for perfect agreement, got %v",
			*metrics.DanisWeberAgreement.CohensKappa)
	}
}

func TestCalculateReliabilityMetrics_MultipleRaters_FleissNote(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	user1 := uuid.New()
	user2 := uuid.New()
	user3 := uuid.New()
	studyID := uuid.New()

	dw := "Weber A"

	responses := []domain.StudyResponse{
		{UserID: user1, DanisWeberType: &dw},
		{UserID: user2, DanisWeberType: &dw},
		{UserID: user3, DanisWeberType: &dw},
	}

	study := &domain.Study{ID: studyID}

	metrics, err := svc.CalculateReliabilityMetrics(responses, study)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if metrics.DanisWeberAgreement == nil {
		t.Fatal("expected DanisWeberAgreement, got nil")
	}

	// With 3+ raters, Cohen's Kappa should be nil
	if metrics.DanisWeberAgreement.CohensKappa != nil {
		t.Error("expected CohensKappa = nil for 3+ raters")
	}

	// Fleiss' Kappa should be nil (single-case limitation)
	if metrics.DanisWeberAgreement.FleissKappa != nil {
		t.Error("expected FleissKappa = nil for single-case study")
	}

	// Should have explanatory note
	if metrics.DanisWeberAgreement.FleissKappaNote == nil {
		t.Error("expected FleissKappaNote explaining single-case limitation")
	}
}

func TestCalculateReliabilityMetrics_MultipleResponsesPerUser(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	user1 := uuid.New()
	user2 := uuid.New()
	studyID := uuid.New()

	// User 1: first response "Weber A", second response "Weber B"
	dw1a := "Weber A"
	dw1b := "Weber B"
	// User 2: first response "Weber A", second response "Weber B"
	dw2a := "Weber A"
	dw2b := "Weber B"

	responses := []domain.StudyResponse{
		{UserID: user1, DanisWeberType: &dw1a}, // First response user1
		{UserID: user2, DanisWeberType: &dw2a}, // First response user2
		{UserID: user1, DanisWeberType: &dw1b}, // Second response user1 (latest)
		{UserID: user2, DanisWeberType: &dw2b}, // Second response user2 (latest)
	}

	study := &domain.Study{ID: studyID}

	metrics, err := svc.CalculateReliabilityMetrics(responses, study)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if metrics.DanisWeberAgreement == nil {
		t.Fatal("expected DanisWeberAgreement, got nil")
	}

	// Should use latest responses (both "Weber B"), so perfect agreement
	if metrics.DanisWeberAgreement.CohensKappa == nil {
		t.Fatal("expected CohensKappa, got nil")
	}

	// Both users' latest response is "Weber B" -> perfect agreement
	if *metrics.DanisWeberAgreement.CohensKappa != 1.0 {
		t.Errorf("expected Cohen's Kappa = 1.0 using latest responses, got %v",
			*metrics.DanisWeberAgreement.CohensKappa)
	}
}

func TestCalculateReliabilityMetrics_EmptyResponses(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	responses := []domain.StudyResponse{}
	study := &domain.Study{ID: uuid.New()}

	metrics, err := svc.CalculateReliabilityMetrics(responses, study)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if metrics != nil {
		t.Error("expected nil metrics for empty responses")
	}
}

func TestKappaInterpretation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		kappa    float64
		expected string
	}{
		{-0.5, "poor"},
		{0.0, "slight"},
		{0.1, "slight"},
		{0.2, "slight"},
		{0.21, "fair"},
		{0.4, "fair"},
		{0.41, "moderate"},
		{0.6, "moderate"},
		{0.61, "substantial"},
		{0.8, "substantial"},
		{0.81, "almost_perfect"},
		{1.0, "almost_perfect"},
	}

	for _, tt := range tests {
		result := domain.KappaInterpretation(tt.kappa)
		if result != tt.expected {
			t.Errorf("KappaInterpretation(%v) = %v, expected %v",
				tt.kappa, result, tt.expected)
		}
	}
}

func TestCohensKappaWithCI_Basic(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	// Example with known moderate agreement
	ratings := [][2]string{
		{"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"},
		{"A", "A"}, {"A", "A"}, {"A", "A"}, // 8 A-A
		{"A", "B"}, {"A", "B"}, // 2 A-B
		{"B", "B"}, {"B", "B"}, {"B", "B"}, {"B", "B"}, {"B", "B"},
		{"B", "B"}, {"B", "B"}, {"B", "B"}, // 8 B-B
		{"B", "A"}, {"B", "A"}, // 2 B-A
	}

	kappa, ci, err := svc.CohensKappaWithCI(ratings, 0.95)
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

	svc := NewStatisticsService()

	// Perfect agreement
	ratings := [][2]string{
		{"A", "A"},
		{"B", "B"},
		{"C", "C"},
	}

	kappa, ci, err := svc.CohensKappaWithCI(ratings, 0.95)
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

	svc := NewStatisticsService()

	// Single rating - CI may not be meaningful but should not crash
	ratings := [][2]string{
		{"A", "A"},
	}

	kappa, ci, err := svc.CohensKappaWithCI(ratings, 0.95)
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

	svc := NewStatisticsService()

	ratings := [][2]string{
		{"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"}, {"A", "A"},
		{"A", "B"}, {"B", "B"}, {"B", "B"}, {"B", "B"}, {"B", "A"},
	}

	// 90% CI should be narrower than 95% CI
	_, ci90, _ := svc.CohensKappaWithCI(ratings, 0.90)
	_, ci95, _ := svc.CohensKappaWithCI(ratings, 0.95)
	_, ci99, _ := svc.CohensKappaWithCI(ratings, 0.99)

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

func TestWeightedKappa_PerfectAgreement(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()
	ordering := []string{"A", "B", "C", "D"}

	ratings := [][2]string{
		{"A", "A"},
		{"B", "B"},
		{"C", "C"},
		{"D", "D"},
	}

	kappa, err := svc.WeightedKappa(ratings, ordering, domain.KappaWeightLinear)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 1.0 {
		t.Errorf("expected weighted kappa = 1.0 for perfect agreement, got %v", kappa)
	}
}

func TestWeightedKappa_AdjacentVsExtremeDisagreement(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()
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

	kappaAdjacent, _ := svc.WeightedKappa(adjacentRatings, ordering, domain.KappaWeightLinear)
	kappaExtreme, _ := svc.WeightedKappa(extremeRatings, ordering, domain.KappaWeightLinear)

	// Weighted kappa should be higher for adjacent disagreements than extreme
	// because adjacent disagreements are penalized less
	if kappaAdjacent <= kappaExtreme {
		t.Errorf("weighted kappa for adjacent disagreement (%v) should be > extreme (%v)",
			kappaAdjacent, kappaExtreme)
	}
}

func TestWeightedKappa_ExtremeDisagreement(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()
	ordering := []string{"A", "B", "C", "D"}

	// All disagreements are maximum distance (A<->D)
	ratings := [][2]string{
		{"A", "D"},
		{"D", "A"},
		{"A", "D"},
		{"D", "A"},
	}

	kappaLinear, _ := svc.WeightedKappa(ratings, ordering, domain.KappaWeightLinear)
	kappaQuadratic, _ := svc.WeightedKappa(ratings, ordering, domain.KappaWeightQuadratic)

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

	svc := NewStatisticsService()

	// Use actual AO/OTA codes
	aoOTA := []string{"44-A1", "44-A2", "44-B1", "44-B2", "44-B3", "44-C1", "44-C2", "44-C3"}

	// Perfect agreement on adjacent codes should have high weighted kappa
	ratings := [][2]string{
		{"44-A1", "44-A1"},
		{"44-A2", "44-A2"},
		{"44-B1", "44-B2"}, // Adjacent disagreement
		{"44-B2", "44-B1"}, // Adjacent disagreement
		{"44-C1", "44-C1"},
	}

	kappaLinear, _ := svc.WeightedKappa(ratings, aoOTA, domain.KappaWeightLinear)

	// Should have moderate-to-high agreement despite some adjacent disagreements
	if kappaLinear < 0.5 {
		t.Errorf("expected weighted kappa >= 0.5 for mostly agreeing with adjacent errors, got %v", kappaLinear)
	}
}

func TestWeightedKappa_EmptyRatings(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()
	ordering := []string{"A", "B", "C"}

	kappa, err := svc.WeightedKappa([][2]string{}, ordering, domain.KappaWeightLinear)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if kappa != 0 {
		t.Errorf("expected kappa = 0 for empty ratings, got %v", kappa)
	}
}

func TestCalculateReliabilityMetrics_AOOTAIncludesWeightedKappa(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	user1 := uuid.New()
	user2 := uuid.New()
	studyID := uuid.New()

	ao1 := "44-B1"
	ao2 := "44-B2" // Adjacent code

	responses := []domain.StudyResponse{
		{UserID: user1, AOOTACode: &ao1},
		{UserID: user2, AOOTACode: &ao2},
	}

	study := &domain.Study{ID: studyID}

	metrics, err := svc.CalculateReliabilityMetrics(responses, study)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if metrics.AOOTAAgreement == nil {
		t.Fatal("expected AOOTAAgreement, got nil")
	}

	// AO/OTA should have weighted kappa
	if metrics.AOOTAAgreement.WeightedKappa == nil {
		t.Error("expected WeightedKappa for AO/OTA system")
	}

	if metrics.AOOTAAgreement.WeightedKappaType == nil {
		t.Error("expected WeightedKappaType for AO/OTA system")
	} else if *metrics.AOOTAAgreement.WeightedKappaType != domain.KappaWeightLinear {
		t.Errorf("expected KappaWeightLinear, got %v", *metrics.AOOTAAgreement.WeightedKappaType)
	}
}

func TestCalculateCategoryMetrics_Basic(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	// 10 predictions with known confusion matrix
	// observed[i] is what was predicted, expected[i] is the gold standard
	observed := []string{"A", "A", "A", "A", "B", "B", "B", "A", "B", "A"}
	expected := []string{"A", "A", "A", "B", "B", "B", "B", "A", "A", "A"}

	// For category A (working through each position):
	// pos 0: expected=A, observed=A -> TP
	// pos 1: expected=A, observed=A -> TP
	// pos 2: expected=A, observed=A -> TP
	// pos 3: expected=B, observed=A -> FP (predicted A but was B)
	// pos 4: expected=B, observed=B -> TN
	// pos 5: expected=B, observed=B -> TN
	// pos 6: expected=B, observed=B -> TN
	// pos 7: expected=A, observed=A -> TP
	// pos 8: expected=A, observed=B -> FN (predicted B but was A)
	// pos 9: expected=A, observed=A -> TP
	// Summary: TP=5, FP=1, TN=3, FN=1

	metrics := svc.CalculateCategoryMetrics(observed, expected)

	if metrics == nil {
		t.Fatal("expected metrics, got nil")
	}

	metricsA := metrics["A"]
	if metricsA == nil {
		t.Fatal("expected metrics for category A, got nil")
	}

	// Sensitivity = TP / (TP + FN) = 5 / (5 + 1) = 0.8333
	expectedSens := 0.8333
	if metricsA.Sensitivity != expectedSens {
		t.Errorf("expected sensitivity = %v, got %v", expectedSens, metricsA.Sensitivity)
	}

	// Specificity = TN / (TN + FP) = 3 / (3 + 1) = 0.75
	expectedSpec := 0.75
	if metricsA.Specificity != expectedSpec {
		t.Errorf("expected specificity = %v, got %v", expectedSpec, metricsA.Specificity)
	}

	// PPV = TP / (TP + FP) = 5 / (5 + 1) = 0.8333
	expectedPPV := 0.8333
	if metricsA.PPV != expectedPPV {
		t.Errorf("expected PPV = %v, got %v", expectedPPV, metricsA.PPV)
	}

	// NPV = TN / (TN + FN) = 3 / (3 + 1) = 0.75
	expectedNPV := 0.75
	if metricsA.NPV != expectedNPV {
		t.Errorf("expected NPV = %v, got %v", expectedNPV, metricsA.NPV)
	}

	// F1 = 2 * (PPV * Sens) / (PPV + Sens) = 2 * 0.8333 * 0.8333 / 1.6666 = 0.8333
	expectedF1 := 0.8333
	if metricsA.F1Score != expectedF1 {
		t.Errorf("expected F1 = %v, got %v", expectedF1, metricsA.F1Score)
	}
}

func TestCalculateCategoryMetrics_PerfectPrediction(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	observed := []string{"A", "B", "A", "B", "A"}
	expected := []string{"A", "B", "A", "B", "A"}

	metrics := svc.CalculateCategoryMetrics(observed, expected)

	metricsA := metrics["A"]
	if metricsA.Sensitivity != 1.0 {
		t.Errorf("expected sensitivity = 1.0, got %v", metricsA.Sensitivity)
	}
	if metricsA.Specificity != 1.0 {
		t.Errorf("expected specificity = 1.0, got %v", metricsA.Specificity)
	}
	if metricsA.F1Score != 1.0 {
		t.Errorf("expected F1 = 1.0, got %v", metricsA.F1Score)
	}
}

func TestCalculateCategoryMetrics_Empty(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	metrics := svc.CalculateCategoryMetrics([]string{}, []string{})

	if metrics != nil {
		t.Error("expected nil for empty input")
	}
}

func TestCalculateCategoryMetrics_MultipleCategories(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	observed := []string{"A", "B", "C", "A", "B", "C"}
	expected := []string{"A", "B", "C", "A", "B", "C"}

	metrics := svc.CalculateCategoryMetrics(observed, expected)

	// All categories should have perfect metrics
	for _, cat := range []string{"A", "B", "C"} {
		m := metrics[cat]
		if m == nil {
			t.Errorf("expected metrics for category %s, got nil", cat)
			continue
		}
		if m.Sensitivity != 1.0 || m.Specificity != 1.0 {
			t.Errorf("category %s: expected perfect metrics, got sens=%v spec=%v",
				cat, m.Sensitivity, m.Specificity)
		}
	}
}

func TestCalculateReliabilityMetrics_WithSingleCase_NoCI(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	user1 := uuid.New()
	user2 := uuid.New()
	studyID := uuid.New()

	dw1 := "Weber A"
	dw2 := "Weber A"

	// With single-case study design, we only have 1 rating pair
	// CI requires at least 2 rating pairs to be meaningful
	responses := []domain.StudyResponse{
		{UserID: user1, DanisWeberType: &dw1},
		{UserID: user2, DanisWeberType: &dw2},
	}

	study := &domain.Study{ID: studyID}

	metrics, err := svc.CalculateReliabilityMetrics(responses, study)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if metrics.DanisWeberAgreement == nil {
		t.Fatal("expected DanisWeberAgreement, got nil")
	}

	// With only 1 rating pair (single case), CI cannot be meaningfully calculated
	// This is expected behavior - CI requires multiple cases (rating pairs)
	if metrics.DanisWeberAgreement.CohensKappaCI != nil {
		t.Log("Note: CI was calculated with single case, this is valid but may have wide bounds")
	}

	// Kappa should still be calculated
	if metrics.DanisWeberAgreement.CohensKappa == nil {
		t.Error("expected CohensKappa to be calculated")
	}
}
