package api

import (
	"context"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// --- Service Interfaces ---

// StudyService defines the study operations interface needed by handlers.
type StudyService interface {
	AddCase(ctx context.Context, studyID, caseID uuid.UUID, caseOrder int) error
	RemoveCase(ctx context.Context, studyID, caseID uuid.UUID) error
	IsCaseInStudy(ctx context.Context, caseID uuid.UUID) (bool, *uuid.UUID, error)
	GetReliabilityMetrics(ctx context.Context, studyID uuid.UUID) (*domain.StudyReliabilityMetrics, error)
	UpdateAfterResponse(ctx context.Context, studyID uuid.UUID)
}

// StatisticsService calculates reliability metrics.
type StatisticsService interface {
	CalculateReliabilityMetrics(caseID uuid.UUID, responses []domain.CaseResponse) (*domain.ReliabilityMetrics, error)
}

// --- Request Types ---

// CreateCaseRequest is the request body for creating a case.
type CreateCaseRequest struct {
	Title       string     `json:"title" binding:"required,max=255"`
	Description string     `json:"description" binding:"max=10000"`
	Deadline    *time.Time `json:"deadline,omitempty"`
}

// UpdateCaseRequest is the request body for updating a case.
type UpdateCaseRequest struct {
	Title       *string    `json:"title,omitempty" binding:"omitempty,max=255"`
	Description *string    `json:"description,omitempty" binding:"omitempty,max=10000"`
	Deadline    *time.Time `json:"deadline,omitempty"`
}

// SubmitResponseRequest is the request body for submitting a classification response.
type SubmitResponseRequest struct {
	Classification domain.ClassificationResult `json:"classification" binding:"required"`
	TimeTakenMS    int64                       `json:"time_taken_ms"`

	// Answer tracking fields for divergence analysis
	AnswerPath      []domain.QuestionAnswer `json:"answer_path,omitempty"`
	DecisionPath    string                  `json:"decision_path,omitempty"`
	TimePerQuestion map[string]int64        `json:"time_per_question,omitempty"`
	BackClicks      int                     `json:"back_clicks,omitempty"`
}

// UpdateImageRequest is the request body for updating an image.
type UpdateImageRequest struct {
	DisplayOrder *int `json:"display_order,omitempty"`
}

// --- Response Types ---

// CaseListResponse is the response for listing cases.
type CaseListResponse struct {
	Cases []domain.Case `json:"cases"`
	Total int64         `json:"total"`
	Page  int           `json:"page"`
	Limit int           `json:"limit"`
}

// ImageUploadResponse is the response for uploading an image.
type ImageUploadResponse struct {
	Image domain.CaseImage `json:"image"`
}

// SignedURLResponse is the response for getting a signed URL.
type SignedURLResponse struct {
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

// UserCaseListResponse is the response for listing cases for users.
type UserCaseListResponse struct {
	Cases          []UserCaseItem `json:"cases"`
	Total          int64          `json:"total"`
	TotalCompleted int64          `json:"total_completed"`
	Page           int            `json:"page"`
	Limit          int            `json:"limit"`
}

// UserCaseItem is a case item in the user's list view.
type UserCaseItem struct {
	ID              uuid.UUID         `json:"id"`
	Title           string            `json:"title"`
	Description     string            `json:"description,omitempty"`
	Status          domain.CaseStatus `json:"status"`
	Deadline        *time.Time        `json:"deadline,omitempty"`
	PublishedAt     *time.Time        `json:"published_at,omitempty"`
	HasTACImages    bool              `json:"has_tac_images"`
	ResponseCount   int               `json:"response_count"`
	ImageCount      int               `json:"image_count"`
	HasResponded    bool              `json:"has_responded"`
	MyResponseCount int               `json:"my_response_count"`
}

// UserCaseDetailResponse is the response for getting a case detail for users.
type UserCaseDetailResponse struct {
	ID              uuid.UUID           `json:"id"`
	Title           string              `json:"title"`
	Description     string              `json:"description,omitempty"`
	Status          domain.CaseStatus   `json:"status"`
	Deadline        *time.Time          `json:"deadline,omitempty"`
	PublishedAt     *time.Time          `json:"published_at,omitempty"`
	HasTACImages    bool                `json:"has_tac_images"`
	Images          []CaseImageResponse `json:"images"`
	HasResponded    bool                `json:"has_responded"`
	MyResponseCount int                 `json:"my_response_count"`
	IsExpired       bool                `json:"is_expired"`
}

// SubmitResponseResult is the response for submitting a classification.
type SubmitResponseResult struct {
	Response *domain.CaseResponse `json:"response"`
}

// ReliabilityMetricsResponse is the response for reliability metrics endpoint.
type ReliabilityMetricsResponse struct {
	*domain.ReliabilityMetrics
	CalculatedAt time.Time `json:"calculated_at"`
}

// CaseImageResponse is the image info in responses (no storage path).
type CaseImageResponse struct {
	ID           uuid.UUID            `json:"id"`
	Category     domain.ImageCategory `json:"category"`
	DisplayOrder int                  `json:"display_order"`
	Filename     string               `json:"filename"`
}

// AdminImageResponse includes storage path for admin views.
type AdminImageResponse struct {
	domain.CaseImage
	SignedURL string `json:"signed_url,omitempty"`
}

// --- Helper Functions ---

// getPagination extracts pagination parameters from query string.
func getPagination(c *gin.Context) (int, int, int) {
	page := 1
	limit := 20

	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= MaxPageSize {
			limit = parsed
		}
	}

	offset := (page - 1) * limit
	return page, limit, offset
}

// isValidImageType checks if the content type is a valid image type.
func isValidImageType(contentType string) bool {
	switch contentType {
	case "image/jpeg", "image/png", "image/gif", "image/webp",
		"application/dicom", "application/octet-stream":
		return true
	default:
		return false
	}
}
