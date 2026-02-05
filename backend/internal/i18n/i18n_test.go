package i18n

import (
	"testing"
)

func TestParseLanguage(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  Language
	}{
		// English cases
		{"empty string", "", English},
		{"en lowercase", "en", English},
		{"EN uppercase", "EN", English},
		{"en-US", "en-US", English},
		{"en-GB", "en-GB", English},
		{"unknown language defaults to English", "fr", English},
		{"German defaults to English", "de", English},

		// Spanish cases
		{"es lowercase", "es", Spanish},
		{"ES uppercase", "ES", Spanish},
		{"es-ES", "es-ES", Spanish},
		{"es-MX", "es-MX", Spanish},
		{"es-AR", "es-AR", Spanish},
		{"es-es lowercase", "es-es", Spanish},
		{"es-mx lowercase", "es-mx", Spanish},
		{"es-ar lowercase", "es-ar", Spanish},

		// Whitespace handling
		{"spaces trimmed", "  en  ", English},
		{"tabs trimmed", "\tes\t", Spanish},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := ParseLanguage(tt.input)
			if got != tt.want {
				t.Errorf("ParseLanguage(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestParseAcceptLanguage(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		header string
		want   Language
	}{
		{"empty header", "", English},
		{"simple en", "en", English},
		{"simple es", "es", Spanish},
		{"en-US with quality", "en-US,en;q=0.9", English},
		{"es-ES with quality", "es-ES,es;q=0.9,en;q=0.8", Spanish},
		{"multiple languages", "fr,es;q=0.9,en;q=0.8", English}, // fr defaults to en
		{"complex header", "en-GB,en-US;q=0.9,en;q=0.8,es;q=0.7", English},
		{"Spanish first", "es-MX,es;q=0.9,en;q=0.8", Spanish},
		{"quality values", "en;q=0.8,es;q=0.9", English}, // takes first language regardless of q
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := ParseAcceptLanguage(tt.header)
			if got != tt.want {
				t.Errorf("ParseAcceptLanguage(%q) = %q, want %q", tt.header, got, tt.want)
			}
		})
	}
}

func TestLanguageConstants(t *testing.T) {
	t.Parallel()

	if English != "en" {
		t.Errorf("English = %q, want %q", English, "en")
	}
	if Spanish != "es" {
		t.Errorf("Spanish = %q, want %q", Spanish, "es")
	}
	if DefaultLanguage != English {
		t.Errorf("DefaultLanguage = %q, want %q", DefaultLanguage, English)
	}
}
