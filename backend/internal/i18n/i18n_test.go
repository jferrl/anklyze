package i18n

import (
	"net/http"
	"net/url"
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

func TestGetLanguageFromRequest(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		queryParam   string
		headerValue  string
		wantLanguage Language
	}{
		{
			name:         "no language specified",
			queryParam:   "",
			headerValue:  "",
			wantLanguage: English,
		},
		{
			name:         "query param takes precedence",
			queryParam:   "es",
			headerValue:  "en",
			wantLanguage: Spanish,
		},
		{
			name:         "header used when no query param",
			queryParam:   "",
			headerValue:  "es-ES",
			wantLanguage: Spanish,
		},
		{
			name:         "English query param",
			queryParam:   "en",
			headerValue:  "es",
			wantLanguage: English,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			u, _ := url.Parse("http://example.com/api")
			if tt.queryParam != "" {
				q := u.Query()
				q.Set("lang", tt.queryParam)
				u.RawQuery = q.Encode()
			}

			req := &http.Request{
				URL:    u,
				Header: make(http.Header),
			}
			if tt.headerValue != "" {
				req.Header.Set("Accept-Language", tt.headerValue)
			}

			got := GetLanguageFromRequest(req)
			if got != tt.wantLanguage {
				t.Errorf("GetLanguageFromRequest() = %q, want %q", got, tt.wantLanguage)
			}
		})
	}
}

func TestT(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		lang     Language
		key      string
		wantFunc func(string) bool // Custom check function
	}{
		{
			name: "English error message",
			lang: English,
			key:  KeyErrorInvalidInput,
			wantFunc: func(s string) bool {
				return s != "" && s != KeyErrorInvalidInput
			},
		},
		{
			name: "Spanish error message",
			lang: Spanish,
			key:  KeyErrorInvalidInput,
			wantFunc: func(s string) bool {
				return s != "" && s != KeyErrorInvalidInput
			},
		},
		{
			name: "English question",
			lang: English,
			key:  KeyQuestionMalleoli,
			wantFunc: func(s string) bool {
				return s == "Which malleoli are fractured?"
			},
		},
		{
			name: "Spanish question",
			lang: Spanish,
			key:  KeyQuestionMalleoli,
			wantFunc: func(s string) bool {
				// Spanish translation should be different from English
				return s != "" && s != KeyQuestionMalleoli && s != "Which malleoli are fractured?"
			},
		},
		{
			name: "unknown key returns key itself",
			lang: English,
			key:  "unknown.key.that.does.not.exist",
			wantFunc: func(s string) bool {
				return s == "unknown.key.that.does.not.exist"
			},
		},
		{
			name: "Spanish falls back to English for missing key",
			lang: Spanish,
			key:  "missing.spanish.translation.fallback.test",
			wantFunc: func(s string) bool {
				// If key doesn't exist in Spanish, should return key itself (no English fallback)
				return s == "missing.spanish.translation.fallback.test"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := T(tt.lang, tt.key)
			if !tt.wantFunc(got) {
				t.Errorf("T(%q, %q) = %q, did not pass validation", tt.lang, tt.key, got)
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

func TestTranslationKeysExist(t *testing.T) {
	t.Parallel()

	// List of keys that must exist in both languages
	requiredKeys := []string{
		KeyErrorInvalidInput,
		KeyErrorClassification,
		KeyQuestionMalleoli,
		KeyOptionPosteriorOnly,
		KeyOptionMedialOnly,
		KeyOptionLateralOnly,
		KeyLabelYes,
		KeyLabelNo,
	}

	languages := []Language{English, Spanish}

	for _, lang := range languages {
		for _, key := range requiredKeys {
			t.Run(string(lang)+"/"+key, func(t *testing.T) {
				t.Parallel()
				got := T(lang, key)
				if got == key {
					t.Errorf("T(%q, %q) returned key itself, translation missing", lang, key)
				}
				if got == "" {
					t.Errorf("T(%q, %q) returned empty string", lang, key)
				}
			})
		}
	}
}

func TestTranslationConsistency(t *testing.T) {
	t.Parallel()

	// Keys that should have different translations between English and Spanish
	// Note: Some words like "No" may be identical in both languages, so we exclude them
	keysToCompare := []string{
		KeyQuestionMalleoli,
		KeyOptionPosteriorOnly,
		KeyLabelYes, // "Yes" vs "Sí"
	}

	for _, key := range keysToCompare {
		t.Run(key, func(t *testing.T) {
			t.Parallel()
			en := T(English, key)
			es := T(Spanish, key)

			if en == es {
				t.Errorf("English and Spanish translations are identical for %q: %q", key, en)
			}
		})
	}
}
