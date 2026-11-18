package api

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// ErrorResponse is the standard API error format.
// All API errors use this structure for consistent client parsing.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"` // Bind error text on 400s; the internal error on 500s in debug mode only
	// Fields lists per-field validation failures on a 422.
	Fields []map[string]string `json:"fields,omitempty"`
	// ValidValues lists the accepted values when a field has a closed set.
	ValidValues []string `json:"valid_values,omitempty"`
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
	case errors.Is(err, domain.ErrStudyClosed):
		status, code, message = http.StatusForbidden, domain.ErrCodeStudyClosed, err.Error()
	case errors.Is(err, domain.ErrAlreadyResponded):
		status, code, message = http.StatusConflict, domain.ErrCodeAlreadyResponded, err.Error()
	case errors.Is(err, domain.ErrNotStudyMember):
		status, code, message = http.StatusForbidden, domain.ErrCodeNotStudyMember, err.Error()
	case errors.Is(err, domain.ErrStorageNotConfigured):
		status, code, message = http.StatusServiceUnavailable, domain.ErrCodeStorageNotConfigured, err.Error()
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

// respond writes an ErrorResponse with a fixed message, for errors the handler
// detected itself. Failures from services and repositories go through HandleError.
func respond(c *gin.Context, status int, code, message string) {
	c.JSON(status, ErrorResponse{Code: code, Message: message})
}

func badRequest(c *gin.Context, message string) {
	respond(c, http.StatusBadRequest, CodeInvalidInput, message)
}

func notFound(c *gin.Context, message string) {
	respond(c, http.StatusNotFound, CodeNotFound, message)
}

func unauthorized(c *gin.Context) {
	respond(c, http.StatusUnauthorized, CodeUnauthorized, "Unauthorized")
}

// unprocessable answers a well-formed body that fails semantic validation.
func unprocessable(c *gin.Context, message string, fields []map[string]string) {
	c.JSON(http.StatusUnprocessableEntity, ErrorResponse{Code: CodeInvalidInput, Message: message, Fields: fields})
}

// badBody answers a request body that failed to bind.
func badBody(c *gin.Context, message string, err error) {
	c.JSON(http.StatusBadRequest, ErrorResponse{Code: CodeInvalidInput, Message: message, Details: err.Error()})
}

// parseID reads a UUID path parameter, answering 400 with message when it is malformed.
func parseID(c *gin.Context, param, message string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(param))
	if err != nil {
		badRequest(c, message)
		return uuid.Nil, false
	}
	return id, true
}

// loadCase fetches a case, answering 404 when it is missing and 500 when the
// lookup fails. Repositories return (nil, nil) for a missing row.
func loadCase(c *gin.Context, repo repository.CaseRepository, id uuid.UUID) (*domain.Case, bool) {
	cs, err := repo.GetByID(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "failed to get case")
		return nil, false
	}
	if cs == nil {
		notFound(c, "case not found")
		return nil, false
	}
	return cs, true
}

// loadStudy is loadCase for studies.
func loadStudy(c *gin.Context, repo repository.StudyRepository, id uuid.UUID) (*domain.Study, bool) {
	study, err := repo.GetByID(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "Failed to get study")
		return nil, false
	}
	if study == nil {
		notFound(c, "Study not found")
		return nil, false
	}
	return study, true
}
