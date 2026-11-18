package service

import (
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

func TestCalculateReliabilityMetrics_PercentAgreement(t *testing.T) {
	t.Parallel()

	a, b := "Weber A", "Weber B"
	tests := []struct {
		name    string
		answers []*string
		want    float64 // -1: no agreement reported
		counts  map[string]int64
	}{
		{"one response has no agreement", []*string{&a}, -1, map[string]int64{a: 1}},
		{"one classified response among unanswered has no agreement", []*string{&a, nil, nil}, -1, map[string]int64{a: 1}},
		{"two raters agree", []*string{&a, &a}, 100, map[string]int64{a: 2}},
		{"two raters disagree", []*string{&a, &b}, 50, map[string]int64{a: 1, b: 1}},
		// 2 of 3 gave the most common answer: 2/3 * 100.
		{"three raters, one dissenter", []*string{&a, &a, &b}, 200.0 / 3.0, map[string]int64{a: 2, b: 1}},
		{"unanswered responses are not counted", []*string{&a, nil, &a}, 100, map[string]int64{a: 2}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			var responses []domain.CaseResponse
			for _, ans := range tt.answers {
				responses = append(responses, domain.CaseResponse{UserID: uuid.New(), DanisWeberType: ans})
			}

			metrics, err := NewStatisticsService().CalculateReliabilityMetrics(uuid.New(), responses)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			got := metrics.DanisWeberAgreement
			if got == nil {
				t.Fatal("expected DanisWeberAgreement, got nil")
			}
			switch p := got.PercentAgreement; {
			case tt.want < 0 && p != nil:
				t.Errorf("PercentAgreement = %v, want nil", *p)
			case tt.want >= 0 && (p == nil || !approx(*p, tt.want, 1e-9)):
				t.Errorf("PercentAgreement = %v, want %v", p, tt.want)
			}
			if len(got.CategoryCounts) != len(tt.counts) {
				t.Fatalf("CategoryCounts = %v, want %v", got.CategoryCounts, tt.counts)
			}
			for cat, n := range tt.counts {
				if got.CategoryCounts[cat] != n {
					t.Errorf("CategoryCounts[%q] = %d, want %d", cat, got.CategoryCounts[cat], n)
				}
			}
		})
	}
}

func TestCalculateReliabilityMetrics_Totals(t *testing.T) {
	t.Parallel()

	user1, user2 := uuid.New(), uuid.New()
	dw := "Weber A"

	metrics, err := NewStatisticsService().CalculateReliabilityMetrics(uuid.New(), []domain.CaseResponse{
		{UserID: user1, DanisWeberType: &dw},
		{UserID: user2, DanisWeberType: &dw},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if metrics.TotalResponses != 2 {
		t.Errorf("expected 2 responses, got %v", metrics.TotalResponses)
	}
	if metrics.UniqueRaters != 2 {
		t.Errorf("expected 2 raters, got %v", metrics.UniqueRaters)
	}
	if metrics.LaugeHansenAgreement != nil {
		t.Error("expected no agreement for a system nobody answered")
	}
}

func TestCalculateReliabilityMetrics_EmptyResponses(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	responses := []domain.CaseResponse{}

	metrics, err := svc.CalculateReliabilityMetrics(uuid.New(), responses)
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
