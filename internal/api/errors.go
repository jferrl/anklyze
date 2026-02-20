package api

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/domain"
)

// ErrorResponse is the standard API error format.
// All API errors use this structure for consistent client parsing.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"` // Only included in debug mode
}

// Standard error codes for client parsing.
// These codes allow clients to programmatically handle errors.
const (
	CodeInvalidInput  = "INVALID_INPUT"
	CodeNotFound      = "NOT_FOUND"
	CodeUnauthorized  = "UNAUTHORIZED"
	CodeForbidden     = "FORBIDDEN"
	CodeRateLimited   = "RATE_LIMITED"
	CodeQuotaExceeded = "QUOTA_EXCEEDED"
	CodeConflict      = "CONFLICT"
	CodeInternalError = "INTERNAL_ERROR"
)

// HandleError maps domain errors to HTTP responses with consistent formatting.
// It logs the error internally and returns a safe response to the client.
// Internal details are only included in debug mode to prevent information leakage.
func HandleError(c *gin.Context, err error, fallbackMsg string) {
	var (
		status  int
		code    string
		message string
	)

	switch {
	case errors.Is(err, domain.ErrNotFound):
		status, code, message = http.StatusNotFound, CodeNotFound, "Resource not found"
	case errors.Is(err, domain.ErrUnauthorized):
		status, code, message = http.StatusUnauthorized, CodeUnauthorized, "Unauthorized"
	case errors.Is(err, domain.ErrForbidden):
		status, code, message = http.StatusForbidden, CodeForbidden, "Access denied"
	case errors.Is(err, domain.ErrInvalidInput):
		status, code, message = http.StatusBadRequest, CodeInvalidInput, err.Error()
	case errors.Is(err, domain.ErrInvalidStateTransition):
		status, code, message = http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, err.Error()
	case errors.Is(err, domain.ErrMissingImages):
		status, code, message = http.StatusBadRequest, domain.ErrCodeMissingImages, err.Error()
	case errors.Is(err, domain.ErrDeadlinePassed):
		status, code, message = http.StatusForbidden, domain.ErrCodeDeadlinePassed, err.Error()
	case errors.Is(err, domain.ErrCaseNotAcceptingResponses):
		status, code, message = http.StatusForbidden, domain.ErrCodeCaseNotAcceptingResponses, err.Error()
	case errors.Is(err, domain.ErrAlreadyResponded):
		status, code, message = http.StatusConflict, domain.ErrCodeAlreadyResponded, err.Error()
	case errors.Is(err, domain.ErrConflict):
		status, code, message = http.StatusConflict, CodeConflict, err.Error()
	case errors.Is(err, domain.ErrQuotaExceeded):
		status, code, message = http.StatusTooManyRequests, CodeQuotaExceeded, "Quota exceeded"
	default:
		status, code, message = http.StatusInternalServerError, CodeInternalError, fallbackMsg
	}

	// Log full error internally for debugging
	slog.Error("request failed",
		"error", err,
		"code", code,
		"status", status,
		"path", c.Request.URL.Path,
		"method", c.Request.Method,
	)

	// Build response
	resp := ErrorResponse{Code: code, Message: message}

	// Only include internal details in debug mode to prevent information leakage
	if gin.Mode() == gin.DebugMode && status == http.StatusInternalServerError {
		resp.Details = err.Error()
	}

	c.JSON(status, resp)
}

// HandleValidationError handles validation errors with field details.
// This provides structured field-level error information to clients.
func HandleValidationError(c *gin.Context, err *domain.ValidationError) {
	slog.Warn("validation failed",
		"errors", err.Errors,
		"path", c.Request.URL.Path,
	)

	c.JSON(http.StatusBadRequest, gin.H{
		"code":    CodeInvalidInput,
		"message": "Validation failed",
		"errors":  err.Errors,
	})
}
