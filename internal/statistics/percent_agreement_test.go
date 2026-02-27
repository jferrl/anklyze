package statistics

import (
	"testing"
)

func TestPercentAgreement_AllAgree(t *testing.T) {
	t.Parallel()

	ratings := []string{"A", "A", "A", "A", "A"}

	agreement := PercentAgreement(ratings)

	if agreement != 1.0 {
		t.Errorf("expected 100%% agreement, got %v", agreement)
	}
}

func TestPercentAgreement_NoneAgree(t *testing.T) {
	t.Parallel()

	ratings := []string{"A", "B", "C", "D", "E"}

	agreement := PercentAgreement(ratings)

	// Mode is 1/5 = 0.2
	expected := 0.2
	if agreement != expected {
		t.Errorf("expected %v agreement, got %v", expected, agreement)
	}
}

func TestPercentAgreement_MajorityAgree(t *testing.T) {
	t.Parallel()

	ratings := []string{"A", "A", "A", "B", "C"}

	agreement := PercentAgreement(ratings)

	// Mode is 3/5 = 0.6
	expected := 0.6
	if agreement != expected {
		t.Errorf("expected %v agreement, got %v", expected, agreement)
	}
}

func TestPercentAgreement_SingleRating(t *testing.T) {
	t.Parallel()

	ratings := []string{"A"}

	agreement := PercentAgreement(ratings)

	// Single rating = 100% agreement by definition
	if agreement != 1.0 {
		t.Errorf("expected 100%% agreement for single rating, got %v", agreement)
	}
}

func TestPercentAgreement_Empty(t *testing.T) {
	t.Parallel()

	ratings := []string{}

	agreement := PercentAgreement(ratings)

	// Empty = 100% agreement by definition
	if agreement != 1.0 {
		t.Errorf("expected 100%% agreement for empty ratings, got %v", agreement)
	}
}
