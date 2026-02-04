package domain

// Error codes for API responses.
// These codes are translated on the frontend using the i18n system.
const (
	// Classification errors
	ErrCodeInvalidInput      = "invalid_input"
	ErrCodeClassification    = "classification_error"
	ErrCodeNoFractures       = "no_fractures_found"
	ErrCodeIsolatedPosterior = "isolated_posterior"
	ErrCodeChatUnavailable   = "chat_unavailable"

	// Chat validation errors
	ErrCodeInputTooShort       = "input_too_short"
	ErrCodeRepeatedChars       = "repeated_characters"
	ErrCodeTooManySpecialChars = "too_many_special_chars"
	ErrCodeTooFewWords         = "too_few_words"
	ErrCodeKeyboardSmash       = "keyboard_smash"
	ErrCodeNoMedicalContext    = "no_medical_context"
	ErrCodeUnsupportedLanguage = "unsupported_language"
	ErrCodeNoWords             = "no_words"
	ErrCodeSessionLimitExceeded = "session_limit_exceeded"
)
