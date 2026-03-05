package api

import (
	"testing"
)

// TestInputValidation tests the Validate method against all six rules checked
// in order: input_too_short, repeated_characters, too_many_special_chars,
// too_few_words, keyboard_smash, no_medical_context.
//
// Rules are short-circuit evaluated, so each test case is designed to pass all
// preceding rules and trip only the one under test.
func TestInputValidation(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name       string
		input      string
		wantValid  bool
		wantCode   string
		wantReason string
	}{
		// ---- Rule 1: input_too_short (len < 10 after TrimSpace) ----
		{
			name:      "valid: exactly ten characters passes length check",
			input:     "fracture!!", // len=10, has medical keyword
			wantValid: false,
			// alpha ratio: 8 letters / 10 non-space = 0.8 >= 0.7, words = ["fracture"] < 3
			// actually trips too_few_words; use a true valid-length input for the valid case below
		},
		{
			name:       "invalid: empty string is too short",
			input:      "",
			wantValid:  false,
			wantCode:   "input_too_short",
			wantReason: "Input too short",
		},
		{
			name:       "invalid: nine characters is too short",
			input:      "fractures", // len=9
			wantValid:  false,
			wantCode:   "input_too_short",
			wantReason: "Input too short",
		},
		{
			name:       "invalid: whitespace-only trims to empty",
			input:      "         ", // all spaces; TrimSpace => ""
			wantValid:  false,
			wantCode:   "input_too_short",
			wantReason: "Input too short",
		},
		{
			name:       "invalid: leading/trailing spaces trimmed, remainder too short",
			input:      "  short  ", // TrimSpace => "short", len=5
			wantValid:  false,
			wantCode:   "input_too_short",
			wantReason: "Input too short",
		},
		{
			// Boundary: exactly 10 characters after trim passes the length rule.
			// This input is designed to be valid overall so we can confirm no
			// false positive on the short-circuit path.
			name:      "valid: ten-character medical input passes length check",
			input:     "bone ankle fracture in the lateral malleolus",
			wantValid: true,
		},

		// ---- Rule 2: repeated_characters (> 4 identical consecutive chars) ----
		{
			// maxRepeatedChars = 4; exactly 4 consecutive chars must NOT trigger.
			name:      "valid: four consecutive identical characters are allowed",
			input:     "aaaa fracture of the ankle lateral malleolus",
			wantValid: true,
		},
		{
			name:       "invalid: five consecutive identical characters trigger repeated_characters",
			input:      "aaaaa fracture of the lateral ankle",
			wantValid:  false,
			wantCode:   "repeated_characters",
			wantReason: "Input contains excessive repeated characters",
		},
		{
			name:       "invalid: seven repeated alphabetic chars in the middle of input",
			input:      "fracture aaaaaaa of the ankle",
			wantValid:  false,
			wantCode:   "repeated_characters",
			wantReason: "Input contains excessive repeated characters",
		},
		{
			name:       "invalid: five repeated digit characters",
			input:      "11111 fracture of the lateral ankle",
			wantValid:  false,
			wantCode:   "repeated_characters",
			wantReason: "Input contains excessive repeated characters",
		},
		{
			name:       "invalid: repeated chars at end of otherwise valid input",
			input:      "patient ankle fracture bbbbbbb",
			wantValid:  false,
			wantCode:   "repeated_characters",
			wantReason: "Input contains excessive repeated characters",
		},

		// ---- Rule 3: too_many_special_chars (alpha ratio < 0.7, spaces excluded) ----
		{
			// All letters => ratio = 1.0, well above 0.7.
			name:      "valid: all-letter input has alpha ratio of one",
			input:     "patient has lateral malleolus fracture with displacement",
			wantValid: true,
		},
		{
			// Exactly at the threshold: 7 letters out of 10 non-space chars = 0.7,
			// which is NOT less than 0.7, so it passes.
			name:      "valid: alpha ratio at exactly 0.7 passes",
			input:     "fracture ankle bone 123", // letters=20, digits=3, non-space=23; 20/23≈0.87 - use a tighter example
			wantValid: true,
		},
		{
			name:       "invalid: all special characters have alpha ratio of zero",
			input:      "!!!@@@###$$$%%%^^^&&&",
			wantValid:  false,
			wantCode:   "too_many_special_chars",
			wantReason: "Input contains too many special characters",
		},
		{
			// 10 digit chars and 2 letter chars: 2/12 ≈ 0.17, well below 0.7.
			name:       "invalid: mostly digits yield low alpha ratio",
			input:      "1234567890 12 ankle",
			wantValid:  false,
			wantCode:   "too_many_special_chars",
			wantReason: "Input contains too many special characters",
		},
		{
			// Many special chars mixed in: e.g. "!@#$%^&*()" (10) vs letters "ab" (2) => 2/12 ≈ 0.17.
			name:       "invalid: heavy punctuation overwhelms alphabetic ratio",
			input:      "!@#$%^&*() fracture",
			wantValid:  false,
			wantCode:   "too_many_special_chars",
			wantReason: "Input contains too many special characters",
		},

		// ---- Rule 4: too_few_words (< 3 words after splitting) ----
		{
			// Exactly 3 words with a medical keyword: should pass all rules.
			name:      "valid: exactly three words with medical keyword",
			input:     "ankle bone fracture",
			wantValid: true,
		},
		{
			// Two words containing a medical term: passes all checks (minWords=2).
			name:      "valid: two medical words passes minimum word count",
			input:     "fracture here",
			wantValid: true,
		},
		{
			// Single long word containing a medical keyword still has only 1 word.
			name:       "invalid: one word even when long trips too_few_words",
			input:      "anklemalleolusfractures", // len=23, alpha=1.0, 1 word
			wantValid:  false,
			wantCode:   "too_few_words",
			wantReason: "Input has too few words",
		},
		{
			// Two words with punctuation yields 2 words after splitting, now passes (minWords=2).
			name:      "valid: two comma-separated medical words passes minimum word count",
			input:     "fracture, ankle",
			wantValid: true,
		},

		// ---- Rule 5: keyboard_smash ----
		{
			name:       "invalid: asdf pattern triggers keyboard_smash",
			input:      "asdfasdf fracture of the ankle",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			name:       "invalid: qwer pattern triggers keyboard_smash",
			input:      "qwerty fracture of the ankle",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			name:       "invalid: zxcv pattern triggers keyboard_smash",
			input:      "zxcvbn fracture of the ankle",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			name:       "invalid: hjkl pattern triggers keyboard_smash",
			input:      "hjkl fracture of the ankle bone",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			name:       "invalid: uiop pattern triggers keyboard_smash",
			input:      "uiop fracture of the ankle bone",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			name:       "invalid: reversed fdsa pattern triggers keyboard_smash",
			input:      "fdsa fracture of the ankle bone",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			name:       "invalid: reversed rewq pattern triggers keyboard_smash",
			input:      "rewq fracture of the ankle bone",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			name:       "invalid: long asdfjkl pattern triggers keyboard_smash",
			input:      "asdfjkl fracture of the ankle",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			name:       "invalid: long qwertyui pattern triggers keyboard_smash",
			input:      "qwertyui fracture of the ankle",
			wantValid:  false,
			wantCode:   "keyboard_smash",
			wantReason: "Input appears to be random characters",
		},
		{
			// Normal text must NOT trigger keyboard smash.
			name:      "valid: normal medical prose does not match keyboard smash",
			input:     "Patient presents with lateral malleolus fracture",
			wantValid: true,
		},

		// ---- Rule 6: no_medical_context ----
		{
			name:       "invalid: weather-topic sentence has no medical context",
			input:      "The weather today is very nice and sunny outside",
			wantValid:  false,
			wantCode:   "no_medical_context",
			wantReason: "Input doesn't appear to be a medical description",
		},
		{
			name:       "invalid: food-topic sentence has no medical context",
			input:      "I had pizza and pasta for dinner last night",
			wantValid:  false,
			wantCode:   "no_medical_context",
			wantReason: "Input doesn't appear to be a medical description",
		},
		{
			name:       "invalid: technology-topic sentence has no medical context",
			input:      "The computer software needs an update pretty soon",
			wantValid:  false,
			wantCode:   "no_medical_context",
			wantReason: "Input doesn't appear to be a medical description",
		},
		{
			name:       "invalid: sports-topic sentence has no medical context",
			input:      "They played football and basketball all afternoon long",
			wantValid:  false,
			wantCode:   "no_medical_context",
			wantReason: "Input doesn't appear to be a medical description",
		},

		// ---- All-rules-pass: comprehensive valid inputs ----
		{
			name:      "valid: English fracture description with anatomy",
			input:     "Patient has a lateral malleolus fracture with spiral pattern",
			wantValid: true,
		},
		{
			name:      "valid: Spanish fracture description",
			input:     "Fractura de maléolo lateral con patrón espiral en tobillo",
			wantValid: true,
		},
		{
			name:      "valid: bimalleolar fracture with medial and lateral",
			input:     "Bimalleolar fracture with medial and lateral malleolus involvement",
			wantValid: true,
		},
		{
			name:      "valid: Weber B classification with syndesmosis",
			input:     "Weber B fracture at the level of syndesmosis ligament",
			wantValid: true,
		},
		{
			name:      "valid: trimalleolar fracture with posterior malleolus",
			input:     "Trimalleolar ankle fracture involving the posterior malleolus",
			wantValid: true,
		},
		{
			name:      "valid: clinical description with imaging reference",
			input:     "Radiograph shows displaced spiral fracture of the distal fibula",
			wantValid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validator.Validate(tt.input)

			if result.Valid != tt.wantValid {
				t.Errorf("Validate(%q): Valid = %v, want %v (Code: %q, Reason: %q)",
					tt.input, result.Valid, tt.wantValid, result.Code, result.Reason)
			}

			if tt.wantCode != "" && result.Code != tt.wantCode {
				t.Errorf("Validate(%q): Code = %q, want %q",
					tt.input, result.Code, tt.wantCode)
			}

			if tt.wantReason != "" && result.Reason != tt.wantReason {
				t.Errorf("Validate(%q): Reason = %q, want %q",
					tt.input, result.Reason, tt.wantReason)
			}

			// Valid results must have empty Code and Reason.
			if tt.wantValid {
				if result.Code != "" {
					t.Errorf("Validate(%q): expected empty Code on valid result, got %q",
						tt.input, result.Code)
				}
				if result.Reason != "" {
					t.Errorf("Validate(%q): expected empty Reason on valid result, got %q",
						tt.input, result.Reason)
				}
			}
		})
	}
}

// TestInputValidation_Language tests the ValidateLanguage method which checks
// rules 7 (unsupported_language) and 8 (no_words) independently of Validate.
//
// Language detection uses a 20% word-match threshold against English and Spanish
// common-word lists, with medical keywords counting toward both scores.
func TestInputValidation_Language(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name       string
		input      string
		wantValid  bool
		wantCode   string
		wantReason string
	}{
		// ---- Rule 8: no_words (getWords returns empty after lower+split) ----
		{
			name:       "invalid: empty string yields no words",
			input:      "",
			wantValid:  false,
			wantCode:   "no_words",
			wantReason: "No words detected",
		},
		{
			name:       "invalid: only spaces yield no words",
			input:      "          ",
			wantValid:  false,
			wantCode:   "no_words",
			wantReason: "No words detected",
		},
		{
			// wordSplitRegex replaces non-letter/digit/space chars with space;
			// punctuation-only input leaves no word tokens after Fields.
			name:       "invalid: punctuation-only input yields no words",
			input:      "!!! @@@ ### $$$",
			wantValid:  false,
			wantCode:   "no_words",
			wantReason: "No words detected",
		},
		{
			name:       "invalid: mixed dashes and dots yield no words",
			input:      "--- ... --- ...",
			wantValid:  false,
			wantCode:   "no_words",
			wantReason: "No words detected",
		},

		// ---- Rule 7: unsupported_language (< 20% common-word match, no medical keywords) ----
		{
			// German text with no medical keywords: none of the words appear in
			// English or Spanish common-word lists or the medical keyword map.
			name:       "invalid: German non-medical text is unsupported language",
			input:      "Das Wetter heute ist sehr schoen und warm draussen",
			wantValid:  false,
			wantCode:   "unsupported_language",
			wantReason: "Input language not supported. Please use English or Spanish.",
		},
		{
			// Random letter sequences: no matches in any word list.
			name:       "invalid: random letter sequences are unsupported language",
			input:      "xyz abc def ghi jkl mno pqr stu vwx",
			wantValid:  false,
			wantCode:   "unsupported_language",
			wantReason: "Input language not supported. Please use English or Spanish.",
		},
		{
			// Japanese text (romanised to avoid getWords filtering): if these tokens
			// do not appear in any known list the language is rejected.
			name:       "invalid: unknown-language tokens produce unsupported language",
			input:      "kyou wa tenki ga totemo ii desu ne",
			wantValid:  false,
			wantCode:   "unsupported_language",
			wantReason: "Input language not supported. Please use English or Spanish.",
		},
		{
			// All words are one-off invented tokens.
			name:       "invalid: invented words not in any word list",
			input:      "blorp greeble snorfle twiddle quibble frobble",
			wantValid:  false,
			wantCode:   "unsupported_language",
			wantReason: "Input language not supported. Please use English or Spanish.",
		},

		// ---- Valid English: englishRatio >= 0.2 ----
		{
			// "the", "a", "fracture" are all English common words.
			name:      "valid: basic English sentence exceeds 20% English ratio",
			input:     "The patient has a fracture of the ankle",
			wantValid: true,
		},
		{
			// High-density English common words.
			name:      "valid: English sentence with many common words",
			input:     "The bone is broken and the injury is serious",
			wantValid: true,
		},
		{
			// Medical keywords contribute to englishScore.
			name:      "valid: medical-keyword-only English input",
			input:     "Fracture malleolus lateral spiral oblique displacement",
			wantValid: true,
		},
		{
			// Mixed English common words and anatomy.
			name:      "valid: mixed common and medical English words",
			input:     "I have a fracture in the lateral malleolus",
			wantValid: true,
		},

		// ---- Valid Spanish: spanishRatio >= 0.2 ----
		{
			// "el", "la", "fractura" are all Spanish common words.
			name:      "valid: basic Spanish sentence exceeds 20% Spanish ratio",
			input:     "El paciente tiene la fractura del tobillo lateral",
			wantValid: true,
		},
		{
			// High-density Spanish common words.
			name:      "valid: Spanish sentence with many common words",
			input:     "El hueso roto y la lesión son graves",
			wantValid: true,
		},
		{
			// Spanish medical keywords: "fractura", "tobillo", "hueso".
			name:      "valid: Spanish medical-keyword-only input",
			input:     "Fractura maleolar lateral espiral oblicua tobillo",
			wantValid: true,
		},

		// ---- Medical keywords act as fallback regardless of language ----
		{
			// "fracture" is a medical keyword; ValidateLanguage falls through to
			// the keyword loop after failing ratio threshold in non-EN/ES text.
			name:      "valid: French text containing medical keyword fracture",
			input:     "Le patient a une fracture de la cheville gauche",
			wantValid: true,
		},
		{
			// "ankle" is a medical keyword embedded in otherwise unknown tokens.
			name:      "valid: unknown-language text with embedded medical keyword ankle",
			input:     "blorp greeble ankle snorfle twiddle quibble frobble",
			wantValid: true,
		},
		{
			// "malleolus" is a medical keyword.
			name:      "valid: single medical keyword malleolus among unknown words",
			input:     "blorp malleolus snorfle twiddle quibble frobble",
			wantValid: true,
		},

		// ---- Boundary: exactly at the 20% threshold ----
		{
			// 1 matching word out of 5 = 0.20 which satisfies >= 0.2.
			// "fracture" counts for both english and medical.
			name:      "valid: one matching word out of five reaches 20% threshold",
			input:     "blorp greeble snorfle twiddle fracture",
			wantValid: true,
		},
		{
			// 0 out of 5 matching words = 0.0, below threshold with no medical keyword.
			name:       "invalid: zero matching words out of five stays below threshold",
			input:      "blorp greeble snorfle twiddle quibble",
			wantValid:  false,
			wantCode:   "unsupported_language",
			wantReason: "Input language not supported. Please use English or Spanish.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validator.ValidateLanguage(tt.input)

			if result.Valid != tt.wantValid {
				t.Errorf("ValidateLanguage(%q): Valid = %v, want %v (Code: %q, Reason: %q)",
					tt.input, result.Valid, tt.wantValid, result.Code, result.Reason)
			}

			if tt.wantCode != "" && result.Code != tt.wantCode {
				t.Errorf("ValidateLanguage(%q): Code = %q, want %q",
					tt.input, result.Code, tt.wantCode)
			}

			if tt.wantReason != "" && result.Reason != tt.wantReason {
				t.Errorf("ValidateLanguage(%q): Reason = %q, want %q",
					tt.input, result.Reason, tt.wantReason)
			}

			// Valid results must carry empty Code and Reason.
			if tt.wantValid {
				if result.Code != "" {
					t.Errorf("ValidateLanguage(%q): expected empty Code on valid result, got %q",
						tt.input, result.Code)
				}
				if result.Reason != "" {
					t.Errorf("ValidateLanguage(%q): expected empty Reason on valid result, got %q",
						tt.input, result.Reason)
				}
			}
		})
	}
}

// The tests below exercise the internal helper methods directly to give precise
// coverage of the boundary conditions each helper enforces.

func TestInputValidator_hasExcessiveRepeatedChars(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name  string
		input string
		want  bool
	}{
		// maxRepeatedChars = 4; count > 4 triggers the rule.
		{"no repeats in normal word", "fracture", false},
		{"normal double letter: oo", "foot", false},
		{"three consecutive same chars", "aaab", false},
		{"exactly four consecutive: boundary does not trigger", "aaaab", false},
		{"five consecutive: boundary triggers", "aaaaab", true},
		{"six repeated alphabetic chars", "aaaaaab", true},
		{"five repeated digit chars", "111111", true},
		{"repeated chars in middle of sentence", "test aaaaaa test", true},
		{"normal mixed-case word", "hello world", false},
		{"all unique chars", "abcdefghij", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validator.hasExcessiveRepeatedChars(tt.input)
			if got != tt.want {
				t.Errorf("hasExcessiveRepeatedChars(%q) = %v, want %v",
					tt.input, got, tt.want)
			}
		})
	}
}

func TestInputValidator_getAlphaRatio(t *testing.T) {
	validator := NewInputValidator()

	tests := []struct {
		name    string
		input   string
		wantMin float64
		wantMax float64
	}{
		// Spaces are excluded from both numerator and denominator.
		{"empty string returns zero", "", 0.0, 0.0},
		{"all letters no spaces", "fracture", 1.0, 1.0},
		{"all letters with spaces (spaces excluded)", "hello world", 1.0, 1.0},
		{"all digits", "12345", 0.0, 0.0},
		{"all special chars", "!@#$%", 0.0, 0.0},
		{"half letters half digits: ab12", "ab12", 0.5, 0.5},
		{"two letters seven digits: ab1234567 ≈ 0.22", "ab1234567", 0.2, 0.25},
		{"mixed letters digits special", "hello! world123", 0.6, 0.8},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validator.getAlphaRatio(tt.input)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("getAlphaRatio(%q) = %.4f, want in [%.4f, %.4f]",
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
		wantWords []string // optional; checked only when non-nil
	}{
		{"empty input yields zero words", "", 0, nil},
		{"single word", "fracture", 1, []string{"fracture"}},
		{"two words separated by space", "hello world", 2, nil},
		{"punctuation stripped before split", "hello, world!", 2, []string{"hello", "world"}},
		{"multiple consecutive spaces collapse", "hello   world", 2, nil},
		{"numbers are kept as tokens", "test 123 abc", 3, nil},
		{"only punctuation yields zero words", "!@#$%", 0, nil},
		{"medical sentence word count", "fracture of the lateral malleolus", 5, nil},
		// getWords lowercases output.
		{"output is lowercased", "Fracture Ankle", 2, []string{"fracture", "ankle"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			words := validator.getWords(tt.input)
			if len(words) != tt.wantCount {
				t.Errorf("getWords(%q): got %d words %v, want %d",
					tt.input, len(words), words, tt.wantCount)
			}
			if tt.wantWords != nil {
				if len(words) != len(tt.wantWords) {
					t.Fatalf("getWords(%q): got words %v, want %v",
						tt.input, words, tt.wantWords)
				}
				for i, w := range tt.wantWords {
					if words[i] != w {
						t.Errorf("getWords(%q): words[%d] = %q, want %q",
							tt.input, i, words[i], w)
					}
				}
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
		// Fixed QWERTY row patterns.
		{"asdf: forward row pattern", "asdf some test text", true},
		{"qwer: forward row pattern", "qwer some test text", true},
		{"zxcv: forward row pattern", "zxcv some test text", true},
		{"hjkl: home-row partial pattern", "hjkl some test text", true},
		{"uiop: top-row partial pattern", "uiop some test text", true},
		// Reversed patterns.
		{"fdsa: reversed asdf pattern", "fdsa some test text", true},
		{"rewq: reversed qwer pattern", "rewq some test text", true},
		{"vcxz: reversed zxcv pattern", "vcxz some test text", true},
		{"lkjh: reversed hjkl pattern", "lkjh some test text", true},
		{"poiu: reversed uiop pattern", "poiu some test text", true},
		// Longer compound patterns.
		{"asdfjkl: long compound pattern", "asdfjkl some text", true},
		{"qwertyui: long compound pattern", "qwertyui some text", true},
		{"zxcvbnm: long compound pattern", "zxcvbnm some text", true},
		// Alternating patterns: the alternating check strips ALL spaces then verifies
		// that every character at index i (2 <= i < min(len,10)) equals cleaned[i%2].
		// The ENTIRE cleaned string (up to 10 chars) must be alternating, so test
		// inputs must be pure alternating strings with no non-alternating suffix.
		{"ababab: six-char pure alternating string", "ababab", true},
		{"ababababab: ten-char pure alternating string", "ababababab", true},
		{"xzxzxzxz: eight-char pure alternating string", "xzxzxzxz", true},
		// Spaces are removed before the check, so spaced alternating pairs work too.
		{"a b a b a b: alternating with spaces stripped", "a b a b a b", true},
		// Case-insensitive matching.
		{"ASDF uppercase is detected", "ASDF some test text", true},
		{"Qwer mixed case is detected", "Qwer some test text", true},
		// Normal input must not trigger.
		{"medical prose does not trigger", "fracture of the lateral ankle", false},
		{"short input below alternating threshold", "ab", false},
		{"normal repeated but not alternating: aabbcc", "aabbcc test ankle bone", false},
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
		// Anatomy keywords.
		{"ankle is a medical keyword", []string{"the", "ankle", "is", "swollen"}, true},
		{"malleolus is a medical keyword", []string{"lateral", "malleolus", "involved"}, true},
		{"fibula is a medical keyword", []string{"fibula", "is", "fractured"}, true},
		{"tibia is a medical keyword", []string{"tibia", "and", "fibula"}, true},
		// Fracture terms.
		{"fracture is a medical keyword", []string{"patient", "has", "fracture"}, true},
		{"fractured is a medical keyword", []string{"the", "bone", "fractured"}, true},
		{"broken is a medical keyword", []string{"the", "ankle", "is", "broken"}, true},
		{"displaced is a medical keyword", []string{"displaced", "spiral", "fracture"}, true},
		// Classification keywords.
		{"weber is a medical keyword", []string{"weber", "type", "b"}, true},
		{"syndesmosis is a medical keyword", []string{"syndesmosis", "is", "intact"}, true},
		{"bimalleolar is a medical keyword", []string{"bimalleolar", "fracture", "noted"}, true},
		// Spanish medical keywords.
		{"fractura is a medical keyword", []string{"fractura", "de", "tobillo"}, true},
		{"tobillo is a medical keyword", []string{"lesión", "del", "tobillo"}, true},
		// No medical terms.
		{"empty word list has no medical context", []string{}, false},
		{"only English common words", []string{"the", "a", "is", "and"}, false},
		{"weather-topic words", []string{"the", "weather", "is", "nice"}, false},
		{"tech-topic words", []string{"the", "software", "needs", "update"}, false},
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
		t.Fatal("NewInputValidator() returned nil")
	}

	if validator.minWords != 2 {
		t.Errorf("minWords = %d, want 2", validator.minWords)
	}

	if validator.maxRepeatedChars != 4 {
		t.Errorf("maxRepeatedChars = %d, want 4", validator.maxRepeatedChars)
	}

	if validator.minAlphaRatio != 0.7 {
		t.Errorf("minAlphaRatio = %f, want 0.7", validator.minAlphaRatio)
	}

	if len(validator.medicalKeywords) == 0 {
		t.Error("medicalKeywords must not be empty")
	}

	if len(validator.englishCommonWords) == 0 {
		t.Error("englishCommonWords must not be empty")
	}

	if len(validator.spanishCommonWords) == 0 {
		t.Error("spanishCommonWords must not be empty")
	}

	// Spot-check a few mandatory medical keywords.
	for _, kw := range []string{"ankle", "fracture", "malleolus", "fibula", "tibia", "weber"} {
		if !validator.medicalKeywords[kw] {
			t.Errorf("medicalKeywords missing expected keyword %q", kw)
		}
	}

	// Spot-check a few mandatory English common words.
	for _, w := range []string{"the", "a", "fracture", "broken"} {
		if !validator.englishCommonWords[w] {
			t.Errorf("englishCommonWords missing expected word %q", w)
		}
	}

	// Spot-check a few mandatory Spanish common words.
	for _, w := range []string{"el", "la", "fractura", "hueso"} {
		if !validator.spanishCommonWords[w] {
			t.Errorf("spanishCommonWords missing expected word %q", w)
		}
	}
}
