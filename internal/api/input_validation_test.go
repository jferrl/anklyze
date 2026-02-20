package api

import (
	"testing"
)

func TestInputValidator_Validate(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name      string
		input     string
		wantValid bool
		wantCode  string
	}{
		// Valid inputs
		{
			name:      "valid English fracture description",
			input:     "Patient has a lateral malleolus fracture with spiral pattern",
			wantValid: true,
			wantCode:  "",
		},
		{
			name:      "valid Spanish fracture description",
			input:     "Fractura de maléolo lateral con patrón espiral",
			wantValid: true,
			wantCode:  "",
		},
		{
			name:      "valid bimalleolar description",
			input:     "Bimalleolar fracture with medial and lateral involvement",
			wantValid: true,
			wantCode:  "",
		},
		{
			name:      "valid trimaleolar description",
			input:     "Trimaleolar ankle fracture with posterior malleolus",
			wantValid: true,
			wantCode:  "",
		},
		{
			name:      "valid with classification mention",
			input:     "Weber B fracture at the syndesmosis level",
			wantValid: true,
			wantCode:  "",
		},

		// Invalid inputs - too short
		{
			name:      "too short input",
			input:     "fracture",
			wantValid: false,
			wantCode:  "input_too_short",
		},
		{
			name:      "empty input",
			input:     "",
			wantValid: false,
			wantCode:  "input_too_short",
		},

		// Invalid inputs - repeated characters
		{
			name:      "repeated characters",
			input:     "aaaaaaa fracture of the ankle",
			wantValid: false,
			wantCode:  "repeated_characters",
		},
		{
			name:      "repeated numbers",
			input:     "11111 fracture description here",
			wantValid: false,
			wantCode:  "repeated_characters",
		},

		// Invalid inputs - too many special characters
		{
			name:      "too many special characters",
			input:     "!!!@@@###$$$%%%^^^&&&***",
			wantValid: false,
			wantCode:  "too_many_special_chars",
		},
		{
			name:      "mostly numbers",
			input:     "123456789 12345 67890 12345",
			wantValid: false,
			wantCode:  "too_many_special_chars",
		},

		// Invalid inputs - too few words
		{
			name:      "too few words",
			input:     "fracture here",
			wantValid: false,
			wantCode:  "too_few_words",
		},

		// Invalid inputs - keyboard smash
		{
			name:      "keyboard smash asdf",
			input:     "asdfasdfasdf some text here",
			wantValid: false,
			wantCode:  "keyboard_smash",
		},
		{
			name:      "keyboard smash qwerty",
			input:     "qwertyuiop random text fracture",
			wantValid: false,
			wantCode:  "keyboard_smash",
		},

		// Invalid inputs - no medical context
		{
			name:      "no medical context - weather",
			input:     "The weather today is very nice and sunny",
			wantValid: false,
			wantCode:  "no_medical_context",
		},
		{
			name:      "no medical context - food",
			input:     "I had pizza and pasta for dinner yesterday",
			wantValid: false,
			wantCode:  "no_medical_context",
		},
		{
			name:      "no medical context - tech",
			input:     "The computer software needs an update soon",
			wantValid: false,
			wantCode:  "no_medical_context",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validator.Validate(tt.input)

			if result.Valid != tt.wantValid {
				t.Errorf("Validate(%q) valid = %v, want %v (reason: %s)",
					tt.input, result.Valid, tt.wantValid, result.Reason)
			}

			if !result.Valid && result.Code != tt.wantCode {
				t.Errorf("Validate(%q) code = %q, want %q",
					tt.input, result.Code, tt.wantCode)
			}
		})
	}
}

func TestInputValidator_ValidateLanguage(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name      string
		input     string
		wantValid bool
		wantCode  string
	}{
		// Valid English
		{
			name:      "valid English",
			input:     "The patient has a fracture of the lateral malleolus",
			wantValid: true,
			wantCode:  "",
		},
		{
			name:      "valid English medical only",
			input:     "Fracture malleolus lateral spiral oblique",
			wantValid: true,
			wantCode:  "",
		},

		// Valid Spanish
		{
			name:      "valid Spanish",
			input:     "El paciente tiene una fractura del maléolo lateral",
			wantValid: true,
			wantCode:  "",
		},
		{
			name:      "valid Spanish medical only",
			input:     "Fractura maleolar lateral espiral oblicua",
			wantValid: true,
			wantCode:  "",
		},

		// Text with medical keywords passes (even if other language)
		{
			name:      "German text with fracture keyword",
			input:     "Der Patient hat einen Knochenbruch am Knöchel",
			wantValid: true, // Contains medical context
			wantCode:  "",
		},
		{
			name:      "French text with fracture keyword",
			input:     "Le patient a une fracture de la cheville gauche",
			wantValid: true, // "fracture" is a medical keyword
			wantCode:  "",
		},
		// Invalid - unsupported language without medical terms
		{
			name:      "German without medical terms",
			input:     "Das Wetter heute ist sehr schön und warm",
			wantValid: false,
			wantCode:  "unsupported_language",
		},
		{
			name:      "random characters",
			input:     "xyz abc def ghi jkl mno pqr",
			wantValid: false,
			wantCode:  "unsupported_language",
		},

		// Edge cases
		{
			name:      "empty input",
			input:     "",
			wantValid: false,
			wantCode:  "no_words",
		},
		{
			name:      "only spaces",
			input:     "     ",
			wantValid: false,
			wantCode:  "no_words",
		},

		// Mixed but with medical terms (should pass)
		{
			name:      "mixed with fracture keyword",
			input:     "blah blah fracture blah malleolus",
			wantValid: true,
			wantCode:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validator.ValidateLanguage(tt.input)

			if result.Valid != tt.wantValid {
				t.Errorf("ValidateLanguage(%q) valid = %v, want %v (reason: %s)",
					tt.input, result.Valid, tt.wantValid, result.Reason)
			}

			if !result.Valid && result.Code != tt.wantCode {
				t.Errorf("ValidateLanguage(%q) code = %q, want %q",
					tt.input, result.Code, tt.wantCode)
			}
		})
	}
}

func TestInputValidator_hasExcessiveRepeatedChars(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"no repeats", "fracture", false},
		{"normal double letter", "foot", false},
		{"triple letter allowed", "aaab", false},
		{"four repeats allowed", "aaaab", false},
		{"five repeats not allowed", "aaaaab", true},
		{"repeated numbers", "111111", true},
		{"repeated in middle", "test aaaaaa test", true},
		{"mixed normal", "hello world", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validator.hasExcessiveRepeatedChars(tt.input)
			if got != tt.want {
				t.Errorf("hasExcessiveRepeatedChars(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestInputValidator_getAlphaRatio(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name     string
		input    string
		wantMin  float64
		wantMax  float64
	}{
		{"all letters", "fracture", 1.0, 1.0},
		{"with spaces", "hello world", 1.0, 1.0},
		{"with numbers", "test123", 0.5, 0.7},
		{"half and half", "ab12", 0.5, 0.5},
		{"all numbers", "12345", 0.0, 0.0},
		{"empty", "", 0.0, 0.0},
		{"special chars", "!@#$%", 0.0, 0.0},
		{"mixed", "hello! world123", 0.6, 0.8},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validator.getAlphaRatio(tt.input)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("getAlphaRatio(%q) = %v, want between %v and %v",
					tt.input, got, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestInputValidator_getWords(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name      string
		input     string
		wantCount int
	}{
		{"simple sentence", "hello world", 2},
		{"with punctuation", "hello, world!", 2},
		{"multiple spaces", "hello   world", 2},
		{"with numbers", "test 123 abc", 3},
		{"empty", "", 0},
		{"only punctuation", "!@#$%", 0},
		{"medical terms", "fracture of the lateral malleolus", 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			words := validator.getWords(tt.input)
			if len(words) != tt.wantCount {
				t.Errorf("getWords(%q) returned %d words, want %d (words: %v)",
					tt.input, len(words), tt.wantCount, words)
			}
		})
	}
}

func TestInputValidator_isKeyboardSmash(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"normal text", "fracture of ankle", false},
		{"asdf pattern", "asdfgh test", true},
		{"qwerty pattern", "qwertyui test", true},
		{"zxcv pattern", "zxcvbn test", true},
		{"reversed asdf", "fdsafdsa test", true},
		{"no pattern", "random medical text here", false},
		{"short input", "hi", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validator.isKeyboardSmash(tt.input)
			if got != tt.want {
				t.Errorf("isKeyboardSmash(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestInputValidator_hasMedicalContext(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name  string
		words []string
		want  bool
	}{
		{"has fracture", []string{"patient", "has", "fracture"}, true},
		{"has malleolus", []string{"lateral", "malleolus", "injury"}, true},
		{"has ankle", []string{"the", "ankle", "is", "broken"}, true},
		{"Spanish fractura", []string{"fractura", "de", "tobillo"}, true},
		{"no medical terms", []string{"the", "weather", "is", "nice"}, false},
		{"empty", []string{}, false},
		{"only common words", []string{"the", "a", "is", "and"}, false},
		{"Weber classification", []string{"weber", "type", "b"}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validator.hasMedicalContext(tt.words)
			if got != tt.want {
				t.Errorf("hasMedicalContext(%v) = %v, want %v", tt.words, got, tt.want)
			}
		})
	}
}

func TestNewInputValidator(t *testing.T) {
	validator := NewInputValidator()

	if validator == nil {
		t.Fatal("NewInputValidator returned nil")
	}

	if validator.minWords != 3 {
		t.Errorf("minWords = %d, want 3", validator.minWords)
	}

	if validator.maxRepeatedChars != 4 {
		t.Errorf("maxRepeatedChars = %d, want 4", validator.maxRepeatedChars)
	}

	if validator.minAlphaRatio != 0.7 {
		t.Errorf("minAlphaRatio = %f, want 0.7", validator.minAlphaRatio)
	}

	if len(validator.medicalKeywords) == 0 {
		t.Error("medicalKeywords should not be empty")
	}

	if len(validator.englishCommonWords) == 0 {
		t.Error("englishCommonWords should not be empty")
	}

	if len(validator.spanishCommonWords) == 0 {
		t.Error("spanishCommonWords should not be empty")
	}
}
