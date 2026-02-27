package statistics

import "testing"

func TestRound(t *testing.T) {
	t.Parallel()

	tests := []struct {
		val       float64
		precision int
		expected  float64
	}{
		{1.23456, 4, 1.2346},
		{1.23444, 4, 1.2344},
		{0.0, 4, 0.0},
		{1.5, 0, 2.0},
		{-1.2345, 3, -1.235},
		{3.14159, 2, 3.14},
	}

	for _, tt := range tests {
		result := Round(tt.val, tt.precision)
		if result != tt.expected {
			t.Errorf("Round(%v, %d) = %v, expected %v", tt.val, tt.precision, result, tt.expected)
		}
	}
}
