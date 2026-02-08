package normalization

import (
	"testing"
)

func TestNormalizeBrand(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		// Exact matches
		{name: "exact Paragon", input: "Paragon", want: "Paragon"},
		{name: "lowercase paragon", input: "paragon", want: "Paragon"},
		{name: "uppercase PARAGON", input: "PARAGON", want: "Paragon"},
		{name: "exact Arthrex", input: "Arthrex", want: "Arthrex"},

		// Levenshtein distance 1
		{name: "Pargagon typo", input: "Pargagon", want: "Paragon"},
		{name: "Pragon typo", input: "Pragon", want: "Paragon"},
		{name: "Paragaon typo", input: "Paragaon", want: "Paragon"},
		{name: "arthex typo", input: "arthex", want: "Arthrex"},

		// Contains matches
		{name: "minimonster lowercase", input: "minimonster", want: "Paragon MiniMonster"},
		{name: "mini monster with space", input: "mini monster", want: "Paragon MiniMonster"},
		{name: "tight rope with space", input: "tight rope", want: "Arthrex TightRope"},
		{name: "tightrope no space", input: "tightrope", want: "Arthrex TightRope"},
		{name: "juggerknot", input: "juggerknot", want: "Zimmer JuggerKnot"},
		{name: "JugerKnot mixed case", input: "JugerKnot", want: "Zimmer JuggerKnot"},

		// Levenshtein on compound names
		{name: "minimoster typo", input: "minimoster", want: "Paragon MiniMonster"},

		// Unknown brand
		{name: "totally unknown brand", input: "totally unknown brand", want: "totally unknown brand"},
		{name: "empty string", input: "", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeBrand(tt.input)
			if got != tt.want {
				t.Errorf("normalizeBrand(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestLevenshteinDistance(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		a    string
		b    string
		want int
	}{
		{name: "kitten to sitting", a: "kitten", b: "sitting", want: 3},
		{name: "empty to abc", a: "", b: "abc", want: 3},
		{name: "abc to empty", a: "abc", b: "", want: 3},
		{name: "identical", a: "abc", b: "abc", want: 0},
		{name: "Paragon to Pargagon", a: "Paragon", b: "Pargagon", want: 1},
		{name: "arthrex to arthex", a: "arthrex", b: "arthex", want: 1},
		{name: "single char insertion", a: "cat", b: "cart", want: 1},
		{name: "single char deletion", a: "cart", b: "cat", want: 1},
		{name: "single char substitution", a: "cat", b: "bat", want: 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := levenshteinDistance(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("levenshteinDistance(%q, %q) = %d, want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestMin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		a, b, c int
		want int
	}{
		{name: "a is min", a: 1, b: 2, c: 3, want: 1},
		{name: "b is min", a: 3, b: 1, c: 2, want: 1},
		{name: "c is min", a: 2, b: 3, c: 1, want: 1},
		{name: "all equal", a: 2, b: 2, c: 2, want: 2},
		{name: "negative values", a: -1, b: 0, c: 1, want: -1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := min(tt.a, tt.b, tt.c)
			if got != tt.want {
				t.Errorf("min(%d, %d, %d) = %d, want %d", tt.a, tt.b, tt.c, got, tt.want)
			}
		})
	}
}
