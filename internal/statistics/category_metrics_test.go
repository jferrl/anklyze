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

func TestCalculateCategoryMetrics_Basic(t *testing.T) {
	t.Parallel()

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

	metrics := CalculateCategoryMetrics(observed, expected)

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

	observed := []string{"A", "B", "A", "B", "A"}
	expected := []string{"A", "B", "A", "B", "A"}

	metrics := CalculateCategoryMetrics(observed, expected)

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

	metrics := CalculateCategoryMetrics([]string{}, []string{})

	if metrics != nil {
		t.Error("expected nil for empty input")
	}
}

func TestCalculateCategoryMetrics_MultipleCategories(t *testing.T) {
	t.Parallel()

	observed := []string{"A", "B", "C", "A", "B", "C"}
	expected := []string{"A", "B", "C", "A", "B", "C"}

	metrics := CalculateCategoryMetrics(observed, expected)

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
