package domain

import "errors"

// Sentinel errors for programmatic error handling.
// Use errors.Is() to check for these errors.
// These follow Google Go Best Practices: "Use sentinel error values or structured error types"
var (
	ErrNotFound                  = errors.New("resource not found")
	ErrUnauthorized              = errors.New("unauthorized")
	ErrForbidden                 = errors.New("access forbidden")
	ErrInvalidInput              = errors.New("invalid input")
	ErrConflict                  = errors.New("resource conflict")
	ErrQuotaExceeded             = errors.New("quota exceeded")
	ErrInvalidStateTransition    = errors.New("invalid state transition")
	ErrMissingImages             = errors.New("case must have at least one image before publishing")
	ErrDeadlinePassed            = errors.New("case deadline has passed")
	ErrCaseNotAcceptingResponses = errors.New("case is not accepting responses")
	ErrAlreadyResponded          = errors.New("already submitted a response to this case")
	ErrNotStudyMember            = errors.New("you are not assigned to this study")
)

// FieldError represents a validation error for a specific field.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Error codes for API responses.
// Two conventions coexist intentionally:
//   - snake_case codes (e.g. "classification_error") are used as i18n translation keys
//     in the frontend (frontend/src/i18n/{en,es}.json).
//   - SCREAMING_SNAKE_CASE codes (e.g. "INVALID_STATE_TRANSITION") are programmatic
//     error codes for case state and auth errors.
const (
	// Classification errors
	ErrCodeInvalidInput      = "invalid_input"
	ErrCodeClassification    = "classification_error"
	ErrCodeNoFractures       = "no_fractures_found"
	ErrCodeIsolatedPosterior = "isolated_posterior"
	ErrCodeChatUnavailable   = "chat_unavailable"

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

	// Case state errors
	ErrCodeInvalidStateTransition    = "INVALID_STATE_TRANSITION"
	ErrCodeMissingImages             = "MISSING_IMAGES"
	ErrCodeDeadlinePassed            = "DEADLINE_PASSED"
	ErrCodeCaseNotAcceptingResponses = "CASE_NOT_ACCEPTING_RESPONSES"
	ErrCodeAlreadyResponded          = "ALREADY_RESPONDED"
	ErrCodeNotStudyMember            = "NOT_STUDY_MEMBER"

	// Auth errors
	ErrCodeTokenExpired = "TOKEN_EXPIRED"
)
