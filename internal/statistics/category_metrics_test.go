package statistics

import (
	"testing"
)

func TestConfusionMatrix_Basic(t *testing.T) {
	t.Parallel()

	observed := []string{"A", "A", "B", "B", "A"}
	expected := []string{"A", "B", "B", "A", "A"}

	matrix := ConfusionMatrix(observed, expected)

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

func TestConfusionMatrix_Empty(t *testing.T) {
	t.Parallel()

	matrix := ConfusionMatrix([]string{}, []string{})

	if len(matrix) != 0 {
		t.Errorf("expected empty matrix for empty input, got %v", matrix)
	}
}

func TestCategoryCounts(t *testing.T) {
	t.Parallel()

	ratings := []string{"A", "A", "B", "A", "C", "B", "", "A"}

	counts := CategoryCounts(ratings)

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

	observed := []string{"A", "A", "B", "B", "A"}
	expected := []string{"A", "B", "B", "A", "A"}

	accuracy := CalculateAccuracy(observed, expected)

	// 3 correct out of 5 = 60%
	if accuracy != 60.0 {
		t.Errorf("expected accuracy = 60%%, got %v", accuracy)
	}
}

func TestCalculateAccuracy_Empty(t *testing.T) {
	t.Parallel()

	accuracy := CalculateAccuracy([]string{}, []string{})

	if accuracy != 0 {
		t.Errorf("expected accuracy = 0 for empty input, got %v", accuracy)
	}
}
