package api

import (
	"regexp"
	"strings"
	"unicode"
)

// wordSplitRegex is precompiled for performance - used in hot path for every validation.
var wordSplitRegex = regexp.MustCompile(`[^\p{L}\p{N}\s]+`)

// InputValidationResult contains the result of input validation
type InputValidationResult struct {
	Valid   bool
	Reason  string
	Code    string
}

// InputValidator validates chat input before sending to LLM
type InputValidator struct {
	minWords           int
	maxRepeatedChars   int
	minAlphaRatio      float64
	medicalKeywords    map[string]bool
	englishCommonWords map[string]bool
	spanishCommonWords map[string]bool
}

// NewInputValidator creates a new input validator with default settings
func NewInputValidator() *InputValidator {
	return &InputValidator{
		minWords:         3,
		maxRepeatedChars: 4,
		minAlphaRatio:    0.7,
		medicalKeywords:  buildMedicalKeywords(),
		englishCommonWords: map[string]bool{
			"the": true, "a": true, "an": true, "is": true, "are": true,
			"was": true, "were": true, "be": true, "been": true, "being": true,
			"have": true, "has": true, "had": true, "do": true, "does": true,
			"did": true, "will": true, "would": true, "could": true, "should": true,
			"may": true, "might": true, "must": true, "shall": true,
			"i": true, "you": true, "he": true, "she": true, "it": true,
			"we": true, "they": true, "this": true, "that": true, "these": true,
			"with": true, "from": true, "for": true, "and": true, "or": true,
			"but": true, "not": true, "no": true, "yes": true,
			"fracture": true, "broken": true, "injury": true, "bone": true,
		},
		spanishCommonWords: map[string]bool{
			"el": true, "la": true, "los": true, "las": true, "un": true,
			"una": true, "unos": true, "unas": true, "es": true, "son": true,
			"está": true, "están": true, "fue": true, "fueron": true,
			"ser": true, "estar": true, "tener": true, "haber": true,
			"yo": true, "tú": true, "él": true, "ella": true, "nosotros": true,
			"ellos": true, "este": true, "esta": true, "esto": true,
			"con": true, "de": true, "para": true, "y": true, "o": true,
			"pero": true, "no": true, "sí": true,
			"fractura": true, "roto": true, "lesión": true, "hueso": true,
		},
	}
}

// buildMedicalKeywords returns a set of medical/anatomical keywords
func buildMedicalKeywords() map[string]bool {
	keywords := []string{
		// Anatomy
		"ankle", "malleolus", "malleolar", "fibula", "fibular", "tibia", "tibial",
		"medial", "lateral", "posterior", "anterior", "distal", "proximal",
		"syndesmosis", "syndesmotic", "ligament", "tendon", "bone", "joint",
		// Fracture terms
		"fracture", "fractured", "broken", "break", "crack", "displaced",
		"undisplaced", "comminuted", "spiral", "oblique", "transverse",
		"avulsion", "stress", "hairline", "complete", "incomplete",
		// Classifications
		"weber", "danis", "lauge", "hansen", "ao", "ota", "bartonicek",
		"suprasyndesmal", "transsyndesmal", "infrasyndesmal",
		"suprasyndesmotic", "transsyndesmotic", "infrasyndesmotic",
		"bimalleolar", "trimalleolar", "unimalleolar",
		// Medical terms
		"injury", "trauma", "diagnosis", "x-ray", "xray", "radiograph",
		"ct", "scan", "mri", "imaging", "clinical", "patient",
		// Spanish equivalents
		"tobillo", "maléolo", "maleolar", "peroné", "peroneal", "tibia",
		"sindesmosis", "ligamento", "tendón", "hueso", "articulación",
		"fractura", "fracturado", "roto", "desplazada", "espiral",
		"oblicua", "transversa", "avulsión", "lesión", "trauma",
		"diagnóstico", "radiografía", "paciente",
		"bimaleolar", "trimaleolar", "unimaleolar",
		"suprasindesmal", "infrasindesmal", "transsindesmal",
	}

	keywordMap := make(map[string]bool)
	for _, kw := range keywords {
		keywordMap[strings.ToLower(kw)] = true
	}
	return keywordMap
}

// Validate checks if the input is valid for processing
func (v *InputValidator) Validate(input string) InputValidationResult {
	input = strings.TrimSpace(input)

	// Check minimum length
	if len(input) < 10 {
		return InputValidationResult{
			Valid:  false,
			Reason: "Input too short",
			Code:   "input_too_short",
		}
	}

	// Check for repeated characters (gibberish like "aaaaaaa")
	if v.hasExcessiveRepeatedChars(input) {
		return InputValidationResult{
			Valid:  false,
			Reason: "Input contains excessive repeated characters",
			Code:   "repeated_characters",
		}
	}

	// Check alphabetic ratio (reject if too many special chars/numbers)
	if v.getAlphaRatio(input) < v.minAlphaRatio {
		return InputValidationResult{
			Valid:  false,
			Reason: "Input contains too many special characters",
			Code:   "too_many_special_chars",
		}
	}

	// Check word count
	words := v.getWords(input)
	if len(words) < v.minWords {
		return InputValidationResult{
			Valid:  false,
			Reason: "Input has too few words",
			Code:   "too_few_words",
		}
	}

	// Check for keyboard smashing patterns
	if v.isKeyboardSmash(input) {
		return InputValidationResult{
			Valid:  false,
			Reason: "Input appears to be random characters",
			Code:   "keyboard_smash",
		}
	}

	// Check if input contains any medical keywords
	if !v.hasMedicalContext(words) {
		return InputValidationResult{
			Valid:  false,
			Reason: "Input doesn't appear to be a medical description",
			Code:   "no_medical_context",
		}
	}

	return InputValidationResult{Valid: true}
}

// ValidateLanguage checks if the input is in a supported language (en/es)
func (v *InputValidator) ValidateLanguage(input string) InputValidationResult {
	words := v.getWords(strings.ToLower(input))
	if len(words) == 0 {
		return InputValidationResult{
			Valid:  false,
			Reason: "No words detected",
			Code:   "no_words",
		}
	}

	englishScore := 0
	spanishScore := 0

	for _, word := range words {
		if v.englishCommonWords[word] || v.medicalKeywords[word] {
			englishScore++
		}
		if v.spanishCommonWords[word] || v.medicalKeywords[word] {
			spanishScore++
		}
	}

	// Calculate match percentage
	totalWords := len(words)
	englishRatio := float64(englishScore) / float64(totalWords)
	spanishRatio := float64(spanishScore) / float64(totalWords)

	// At least 20% of words should match known words
	minMatchRatio := 0.2
	if englishRatio >= minMatchRatio || spanishRatio >= minMatchRatio {
		return InputValidationResult{Valid: true}
	}

	// If we have medical keywords, that's good enough
	for _, word := range words {
		if v.medicalKeywords[word] {
			return InputValidationResult{Valid: true}
		}
	}

	return InputValidationResult{
		Valid:  false,
		Reason: "Input language not supported. Please use English or Spanish.",
		Code:   "unsupported_language",
	}
}

// hasExcessiveRepeatedChars checks for patterns like "aaaa" or "1111"
func (v *InputValidator) hasExcessiveRepeatedChars(input string) bool {
	count := 1
	var prev rune
	for i, r := range input {
		if i > 0 && r == prev {
			count++
			if count > v.maxRepeatedChars {
				return true
			}
		} else {
			count = 1
		}
		prev = r
	}
	return false
}

// getAlphaRatio returns the ratio of alphabetic characters to total characters
func (v *InputValidator) getAlphaRatio(input string) float64 {
	if len(input) == 0 {
		return 0
	}

	alphaCount := 0
	totalCount := 0
	for _, r := range input {
		if !unicode.IsSpace(r) {
			totalCount++
			if unicode.IsLetter(r) {
				alphaCount++
			}
		}
	}

	if totalCount == 0 {
		return 0
	}
	return float64(alphaCount) / float64(totalCount)
}

// getWords splits input into lowercase words.
func (v *InputValidator) getWords(input string) []string {
	// Remove punctuation and split by whitespace
	cleaned := wordSplitRegex.ReplaceAllString(input, " ")
	parts := strings.Fields(strings.ToLower(cleaned))

	// Filter out very short words
	var words []string
	for _, w := range parts {
		if len(w) >= 1 {
			words = append(words, w)
		}
	}
	return words
}

// isKeyboardSmash detects patterns like "asdfgh" or "qwerty"
func (v *InputValidator) isKeyboardSmash(input string) bool {
	lower := strings.ToLower(input)

	// Common keyboard smash patterns
	patterns := []string{
		"asdf", "qwer", "zxcv", "hjkl", "uiop",
		"fdsa", "rewq", "vcxz", "lkjh", "poiu",
		"asdfjkl", "qwertyui", "zxcvbnm",
	}

	for _, pattern := range patterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}

	// Check for alternating patterns like "ababab"
	if len(input) >= 6 {
		cleaned := strings.ReplaceAll(lower, " ", "")
		if len(cleaned) >= 6 {
			isAlternating := true
			for i := 2; i < len(cleaned) && i < 10; i++ {
				if cleaned[i] != cleaned[i%2] {
					isAlternating = false
					break
				}
			}
			if isAlternating && cleaned[0] != cleaned[1] {
				return true
			}
		}
	}

	return false
}

// hasMedicalContext checks if the input contains medical/anatomical terms
func (v *InputValidator) hasMedicalContext(words []string) bool {
	medicalCount := 0
	for _, word := range words {
		if v.medicalKeywords[word] {
			medicalCount++
		}
	}
	// Require at least 1 medical keyword
	return medicalCount >= 1
}
