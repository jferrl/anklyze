package statistics

import (
	"testing"
)

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
