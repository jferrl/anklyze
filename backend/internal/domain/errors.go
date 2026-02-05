package domain

import "errors"

// Sentinel errors for programmatic error handling.
// Use errors.Is() to check for these errors.
// These follow Google Go Best Practices: "Use sentinel error values or structured error types"
var (
	ErrNotFound      = errors.New("resource not found")
	ErrUnauthorized  = errors.New("unauthorized")
	ErrForbidden     = errors.New("access forbidden")
	ErrInvalidInput  = errors.New("invalid input")
	ErrConflict      = errors.New("resource conflict")
	ErrQuotaExceeded = errors.New("quota exceeded")
)

// FieldError represents a validation error for a specific field.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationError aggregates multiple field errors.
// It wraps ErrInvalidInput so errors.Is(validationErr, ErrInvalidInput) returns true.
type ValidationError struct {
	Errors []FieldError `json:"errors"`
}

// Error implements the error interface.
func (e *ValidationError) Error() string {
	if len(e.Errors) == 0 {
		return "validation failed"
	}
	return e.Errors[0].Message
}

// Unwrap allows errors.Is(validationErr, ErrInvalidInput) to return true.
func (e *ValidationError) Unwrap() error {
	return ErrInvalidInput
}

// Error codes for API responses.
// These codes are translated on the frontend using the i18n system.
const (
	// Classification errors
	ErrCodeInvalidInput       = "invalid_input"
	ErrCodeClassification     = "classification_error"
	ErrCodeNoFractures        = "no_fractures_found"
	ErrCodeIsolatedPosterior  = "isolated_posterior"
	ErrCodeChatUnavailable    = "chat_unavailable"

	// Chat validation errors
	ErrCodeInputTooShort        = "input_too_short"
	ErrCodeRepeatedChars        = "repeated_characters"
	ErrCodeTooManySpecialChars  = "too_many_special_chars"
	ErrCodeTooFewWords          = "too_few_words"
	ErrCodeKeyboardSmash        = "keyboard_smash"
	ErrCodeNoMedicalContext     = "no_medical_context"
	ErrCodeUnsupportedLanguage  = "unsupported_language"
	ErrCodeNoWords              = "no_words"
	ErrCodeSessionLimitExceeded = "session_limit_exceeded"
)
