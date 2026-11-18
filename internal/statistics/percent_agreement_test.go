package statistics

import (
	"testing"
)

func TestPercentAgreement(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		ratings []string
		want    float64
		wantOK  bool
	}{
		{"all agree", []string{"A", "A", "A", "A", "A"}, 1, true},
		{"none agree", []string{"A", "B", "C", "D", "E"}, 0.2, true},
		{"majority agree", []string{"A", "A", "A", "B", "C"}, 0.6, true},
		{"two ratings disagree", []string{"A", "B"}, 0.5, true},
		// One rating agrees with itself trivially; reporting 100% would fabricate agreement.
		{"single rating has no agreement", []string{"A"}, 0, false},
		{"no ratings have no agreement", nil, 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, ok := PercentAgreement(tt.ratings)
			if got != tt.want || ok != tt.wantOK {
				t.Errorf("PercentAgreement(%v) = %v, %v; want %v, %v", tt.ratings, got, ok, tt.want, tt.wantOK)
			}
		})
	}
}
