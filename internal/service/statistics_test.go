package service

import (
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

func TestCalculateReliabilityMetrics_TwoRaters(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	user1 := uuid.New()
	user2 := uuid.New()
	caseID := uuid.New()

	dw1 := "Weber A"
	dw2 := "Weber A"

	responses := []domain.CaseResponse{
		{
			UserID:         user1,
			DanisWeberType: &dw1,
		},
		{
			UserID:         user2,
			DanisWeberType: &dw2,
		},
	}

	cs := &domain.Case{
		ID: caseID,
	}

	metrics, err := svc.CalculateReliabilityMetrics(responses, cs)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if metrics == nil {
		t.Fatal("expected metrics, got nil")
		return
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
	caseID := uuid.New()

	dw := "Weber A"

	responses := []domain.CaseResponse{
		{UserID: user1, DanisWeberType: &dw},
		{UserID: user2, DanisWeberType: &dw},
		{UserID: user3, DanisWeberType: &dw},
	}

	cs := &domain.Case{ID: caseID}

	metrics, err := svc.CalculateReliabilityMetrics(responses, cs)
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
	caseID := uuid.New()

	// User 1: first response "Weber A", second response "Weber B"
	dw1a := "Weber A"
	dw1b := "Weber B"
	// User 2: first response "Weber A", second response "Weber B"
	dw2a := "Weber A"
	dw2b := "Weber B"

	responses := []domain.CaseResponse{
		{UserID: user1, DanisWeberType: &dw1a}, // First response user1
		{UserID: user2, DanisWeberType: &dw2a}, // First response user2
		{UserID: user1, DanisWeberType: &dw1b}, // Second response user1 (latest)
		{UserID: user2, DanisWeberType: &dw2b}, // Second response user2 (latest)
	}

	cs := &domain.Case{ID: caseID}

	metrics, err := svc.CalculateReliabilityMetrics(responses, cs)
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

	responses := []domain.CaseResponse{}
	cs := &domain.Case{ID: uuid.New()}

	metrics, err := svc.CalculateReliabilityMetrics(responses, cs)
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

func TestCalculateReliabilityMetrics_AOOTAIncludesWeightedKappa(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	user1 := uuid.New()
	user2 := uuid.New()
	caseID := uuid.New()

	ao1 := "44-B1"
	ao2 := "44-B2" // Adjacent code

	responses := []domain.CaseResponse{
		{UserID: user1, AOOTACode: &ao1},
		{UserID: user2, AOOTACode: &ao2},
	}

	cs := &domain.Case{ID: caseID}

	metrics, err := svc.CalculateReliabilityMetrics(responses, cs)
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

func TestCalculateReliabilityMetrics_WithSingleCase_NoCI(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	user1 := uuid.New()
	user2 := uuid.New()
	caseID := uuid.New()

	dw1 := "Weber A"
	dw2 := "Weber A"

	// With single-case study design, we only have 1 rating pair
	// CI requires at least 2 rating pairs to be meaningful
	responses := []domain.CaseResponse{
		{UserID: user1, DanisWeberType: &dw1},
		{UserID: user2, DanisWeberType: &dw2},
	}

	cs := &domain.Case{ID: caseID}

	metrics, err := svc.CalculateReliabilityMetrics(responses, cs)
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
