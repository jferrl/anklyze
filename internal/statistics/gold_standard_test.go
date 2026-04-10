package statistics

import "testing"

func TestMajorityVote(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		ratings   []string
		wantValue string
		wantCount int
	}{
		{
			name:      "empty ratings",
			ratings:   []string{},
			wantValue: "",
			wantCount: 0,
		},
		{
			name:      "single rating",
			ratings:   []string{"Weber A"},
			wantValue: "Weber A",
			wantCount: 1,
		},
		{
			name:      "unanimous agreement",
			ratings:   []string{"Weber B", "Weber B", "Weber B"},
			wantValue: "Weber B",
			wantCount: 3,
		},
		{
			name:      "clear majority",
			ratings:   []string{"Weber A", "Weber B", "Weber A", "Weber A"},
			wantValue: "Weber A",
			wantCount: 3,
		},
		{
			name:      "tie returns first encountered",
			ratings:   []string{"Weber A", "Weber B", "Weber A", "Weber B"},
			wantValue: "Weber A",
			wantCount: 2,
		},
		{
			name:      "three-way split returns first with max",
			ratings:   []string{"SA", "SER", "PER", "SA"},
			wantValue: "SA",
			wantCount: 2,
		},
		{
			name:      "all different",
			ratings:   []string{"Weber A", "Weber B", "Weber C"},
			wantValue: "Weber A",
			wantCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gotValue, gotCount := MajorityVote(tt.ratings)
			if gotValue != tt.wantValue {
				t.Errorf("MajorityVote() value = %q, want %q", gotValue, tt.wantValue)
			}
			if gotCount != tt.wantCount {
				t.Errorf("MajorityVote() count = %d, want %d", gotCount, tt.wantCount)
			}
		})
	}
}

func TestGoldStandardAccuracy(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		ratings      []string
		goldValue    string
		wantAccuracy float64
		wantCorrect  int
	}{
		{
			name:         "empty ratings",
			ratings:      []string{},
			goldValue:    "Weber A",
			wantAccuracy: 0,
			wantCorrect:  0,
		},
		{
			name:         "all correct",
			ratings:      []string{"Weber A", "Weber A", "Weber A"},
			goldValue:    "Weber A",
			wantAccuracy: 100,
			wantCorrect:  3,
		},
		{
			name:         "all incorrect",
			ratings:      []string{"Weber B", "Weber C", "Weber B"},
			goldValue:    "Weber A",
			wantAccuracy: 0,
			wantCorrect:  0,
		},
		{
			name:         "mixed results 2 of 4 correct",
			ratings:      []string{"Weber A", "Weber B", "Weber A", "Weber C"},
			goldValue:    "Weber A",
			wantAccuracy: 50,
			wantCorrect:  2,
		},
		{
			name:         "single correct rating",
			ratings:      []string{"44-B1"},
			goldValue:    "44-B1",
			wantAccuracy: 100,
			wantCorrect:  1,
		},
		{
			name:         "single incorrect rating",
			ratings:      []string{"44-B2"},
			goldValue:    "44-B1",
			wantAccuracy: 0,
			wantCorrect:  0,
		},
		{
			name:         "one of three correct",
			ratings:      []string{"SER", "SA", "PER"},
			goldValue:    "SA",
			wantAccuracy: 100.0 / 3.0,
			wantCorrect:  1,
		},
		{
			name:         "not_classifiable as gold standard",
			ratings:      []string{"not_classifiable", "Weber A", "not_classifiable"},
			goldValue:    "not_classifiable",
			wantAccuracy: 200.0 / 3.0,
			wantCorrect:  2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gotAccuracy, gotCorrect := GoldStandardAccuracy(tt.ratings, tt.goldValue)
			if gotCorrect != tt.wantCorrect {
				t.Errorf("GoldStandardAccuracy() correct = %d, want %d", gotCorrect, tt.wantCorrect)
			}
			// Compare floats with tolerance
			diff := gotAccuracy - tt.wantAccuracy
			if diff < 0 {
				diff = -diff
			}
			if diff > 0.01 {
				t.Errorf("GoldStandardAccuracy() accuracy = %.4f, want %.4f", gotAccuracy, tt.wantAccuracy)
			}
		})
	}
}
