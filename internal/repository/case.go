package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// CaseRepository defines the interface for case persistence operations.
type CaseRepository interface {
	// Create creates a new case.
	Create(ctx context.Context, cs *domain.Case) error
	// GetByID retrieves a case by its ID.
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Case, error)
	// Update updates a case.
	Update(ctx context.Context, cs *domain.Case) error
	// Delete deletes a case by its ID.
	Delete(ctx context.Context, id uuid.UUID) error
	// List retrieves cases with optional status filter and pagination.
	List(ctx context.Context, status *domain.CaseStatus, limit, offset int) ([]domain.Case, int64, error)
	// ListPublished retrieves only published cases with pagination.
	ListPublished(ctx context.Context, limit, offset int) ([]domain.Case, int64, error)

	// AddImage adds an image to a case.
	AddImage(ctx context.Context, image *domain.CaseImage) error
	// GetImages retrieves all images for a case.
	GetImages(ctx context.Context, caseID uuid.UUID) ([]domain.CaseImage, error)
	// GetImagesForCases batch loads images for multiple cases.
	// Returns a map keyed by case ID for O(1) lookup.
	GetImagesForCases(ctx context.Context, caseIDs []uuid.UUID) (map[uuid.UUID][]domain.CaseImage, error)
	// GetImageByID retrieves an image by its ID.
	GetImageByID(ctx context.Context, imageID uuid.UUID) (*domain.CaseImage, error)
	// UpdateImage updates an image's mutable fields (display_order).
	UpdateImage(ctx context.Context, image *domain.CaseImage) error
	// ReorderImages updates display_order for multiple images in a single transaction.
	ReorderImages(ctx context.Context, caseID uuid.UUID, orders map[uuid.UUID]int) error
	// DeleteImage deletes an image by its ID.
	DeleteImage(ctx context.Context, imageID uuid.UUID) error
	// UpdateHasTACImages recalculates and updates the has_tac_images flag for a case.
	UpdateHasTACImages(ctx context.Context, caseID uuid.UUID) error

	// Publish changes a case status from draft to published.
	Publish(ctx context.Context, id uuid.UUID) error
	// Close changes a case status to closed.
	Close(ctx context.Context, id uuid.UUID) error

	// IncrementResponseCount increments the response count for a case.
	IncrementResponseCount(ctx context.Context, caseID uuid.UUID) error
	// UpdateUniqueUsers recalculates and updates the unique users count.
	UpdateUniqueUsers(ctx context.Context, caseID uuid.UUID, count int) error

	// GetByIDs batch loads cases by their IDs.
	GetByIDs(ctx context.Context, ids []uuid.UUID) ([]domain.Case, error)

	// GetDashboardStats retrieves aggregated dashboard statistics.
	GetDashboardStats(ctx context.Context) (*domain.DashboardStats, error)
	// GetRecentActiveCases retrieves the most recently updated cases that have responses.
	GetRecentActiveCases(ctx context.Context, limit int) ([]domain.DashboardRecentCase, error)
	// GetCasesNeedingAttention retrieves published cases with no responses or past deadline.
	GetCasesNeedingAttention(ctx context.Context, limit int) ([]domain.DashboardAttentionCase, error)
}

// CaseResponseRepository defines the interface for case response persistence.
type CaseResponseRepository interface {
	// Save persists a case response and updates case counters.
	Save(ctx context.Context, response *domain.CaseResponse) error
	// GetByCase retrieves all responses for a case with pagination.
	GetByCase(ctx context.Context, caseID uuid.UUID, limit, offset int) ([]domain.CaseResponse, int64, error)
	// GetByUserAndCase retrieves all responses by a user for a case.
	GetByUserAndCase(ctx context.Context, userID, caseID uuid.UUID) ([]domain.CaseResponse, error)
	// GetByUserAndCases batch loads responses for a user across multiple cases.
	// Returns a map keyed by case ID for O(1) lookup.
	GetByUserAndCases(ctx context.Context, userID uuid.UUID, caseIDs []uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error)
	// CountByCase counts the total responses for a case.
	CountByCase(ctx context.Context, caseID uuid.UUID) (int64, error)
	// CountUniqueUsersByCase counts unique users who responded to a case.
	CountUniqueUsersByCase(ctx context.Context, caseID uuid.UUID) (int64, error)

	// HasUserResponded checks if a user has already submitted a response to a case.
	HasUserResponded(ctx context.Context, userID, caseID uuid.UUID) (bool, error)
	// GetAllByCase retrieves all responses for a case without pagination (for Kappa calculation).
	GetAllByCase(ctx context.Context, caseID uuid.UUID) ([]domain.CaseResponse, error)
	// GetResponsesWithUserExpertise retrieves responses joined with user expertise data.
	GetResponsesWithUserExpertise(ctx context.Context, caseID uuid.UUID) ([]domain.ResponseWithExpertise, error)
	// CountRespondedPublishedCases counts how many published cases a user has responded to.
	CountRespondedPublishedCases(ctx context.Context, userID uuid.UUID) (int64, error)
}

// CaseAnalyticsRepository defines the interface for case analytics queries.
type CaseAnalyticsRepository interface {
	// GetSummary retrieves aggregated analytics for a case.
	GetSummary(ctx context.Context, caseID uuid.UUID) (*domain.CaseAnalyticsSummary, error)
	// GetClassificationDistribution retrieves distribution for a specific classification system.
	GetClassificationDistribution(ctx context.Context, caseID uuid.UUID, system string) (map[string]int64, error)
}
