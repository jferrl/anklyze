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
	// GetImageByID retrieves an image by its ID.
	GetImageByID(ctx context.Context, imageID uuid.UUID) (*domain.CaseImage, error)
	// UpdateImage updates an image's mutable fields (display_order).
	UpdateImage(ctx context.Context, image *domain.CaseImage) error
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

	// User access management
	// AddUser adds a user to a case (grants access).
	AddUser(ctx context.Context, caseID, userID uuid.UUID, email string) error
	// RemoveUser removes a user from a case (revokes access).
	RemoveUser(ctx context.Context, caseID, userID uuid.UUID) error
	// GetUsers retrieves all users who have access to a case.
	GetUsers(ctx context.Context, caseID uuid.UUID) ([]domain.CaseUser, error)
	// HasAccess checks if a user has access to a case.
	HasAccess(ctx context.Context, caseID, userID uuid.UUID) (bool, error)
	// ListForUser retrieves published cases accessible to a specific user with pagination.
	ListForUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.Case, int64, error)
}

// CaseResponseRepository defines the interface for case response persistence.
type CaseResponseRepository interface {
	// Save saves a case response asynchronously.
	Save(ctx context.Context, response *domain.CaseResponse) error
	// GetByCase retrieves all responses for a case with pagination.
	GetByCase(ctx context.Context, caseID uuid.UUID, limit, offset int) ([]domain.CaseResponse, int64, error)
	// GetByUserAndCase retrieves all responses by a user for a case.
	GetByUserAndCase(ctx context.Context, userID, caseID uuid.UUID) ([]domain.CaseResponse, error)
	// CountByCase counts the total responses for a case.
	CountByCase(ctx context.Context, caseID uuid.UUID) (int64, error)
	// CountUniqueUsersByCase counts unique users who responded to a case.
	CountUniqueUsersByCase(ctx context.Context, caseID uuid.UUID) (int64, error)
	// Close gracefully shuts down the repository.
	Close() error

	// HasUserResponded checks if a user has already submitted a response to a case.
	HasUserResponded(ctx context.Context, userID, caseID uuid.UUID) (bool, error)
	// GetAllByCase retrieves all responses for a case without pagination (for Kappa calculation).
	GetAllByCase(ctx context.Context, caseID uuid.UUID) ([]domain.CaseResponse, error)
	// GetResponsesWithUserExpertise retrieves responses joined with user expertise data.
	GetResponsesWithUserExpertise(ctx context.Context, caseID uuid.UUID) ([]domain.ResponseWithExpertise, error)
}

// CaseAnalyticsRepository defines the interface for case analytics queries.
type CaseAnalyticsRepository interface {
	// GetSummary retrieves aggregated analytics for a case.
	GetSummary(ctx context.Context, caseID uuid.UUID) (*domain.CaseAnalyticsSummary, error)
	// GetClassificationDistribution retrieves distribution for a specific classification system.
	GetClassificationDistribution(ctx context.Context, caseID uuid.UUID, system string) (map[string]int64, error)
}

// NoOpCaseRepository is a no-op implementation for when DB is not configured.
type NoOpCaseRepository struct{}

func NewNoOpCaseRepository() *NoOpCaseRepository {
	return &NoOpCaseRepository{}
}

func (r *NoOpCaseRepository) Create(_ context.Context, _ *domain.Case) error {
	return nil
}

func (r *NoOpCaseRepository) GetByID(_ context.Context, _ uuid.UUID) (*domain.Case, error) {
	return nil, nil
}

func (r *NoOpCaseRepository) Update(_ context.Context, _ *domain.Case) error {
	return nil
}

func (r *NoOpCaseRepository) Delete(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCaseRepository) List(_ context.Context, _ *domain.CaseStatus, _, _ int) ([]domain.Case, int64, error) {
	return []domain.Case{}, 0, nil
}

func (r *NoOpCaseRepository) ListPublished(_ context.Context, _, _ int) ([]domain.Case, int64, error) {
	return []domain.Case{}, 0, nil
}

func (r *NoOpCaseRepository) AddImage(_ context.Context, _ *domain.CaseImage) error {
	return nil
}

func (r *NoOpCaseRepository) GetImages(_ context.Context, _ uuid.UUID) ([]domain.CaseImage, error) {
	return []domain.CaseImage{}, nil
}

func (r *NoOpCaseRepository) GetImageByID(_ context.Context, _ uuid.UUID) (*domain.CaseImage, error) {
	return nil, nil
}

func (r *NoOpCaseRepository) UpdateImage(_ context.Context, _ *domain.CaseImage) error {
	return nil
}

func (r *NoOpCaseRepository) DeleteImage(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCaseRepository) UpdateHasTACImages(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCaseRepository) Publish(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCaseRepository) Close(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCaseRepository) IncrementResponseCount(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCaseRepository) UpdateUniqueUsers(_ context.Context, _ uuid.UUID, _ int) error {
	return nil
}

func (r *NoOpCaseRepository) AddUser(_ context.Context, _, _ uuid.UUID, _ string) error {
	return nil
}

func (r *NoOpCaseRepository) RemoveUser(_ context.Context, _, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCaseRepository) GetUsers(_ context.Context, _ uuid.UUID) ([]domain.CaseUser, error) {
	return []domain.CaseUser{}, nil
}

func (r *NoOpCaseRepository) HasAccess(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}

func (r *NoOpCaseRepository) ListForUser(_ context.Context, _ uuid.UUID, _, _ int) ([]domain.Case, int64, error) {
	return []domain.Case{}, 0, nil
}

// NoOpCaseResponseRepository is a no-op implementation.
type NoOpCaseResponseRepository struct{}

func NewNoOpCaseResponseRepository() *NoOpCaseResponseRepository {
	return &NoOpCaseResponseRepository{}
}

func (r *NoOpCaseResponseRepository) Save(_ context.Context, _ *domain.CaseResponse) error {
	return nil
}

func (r *NoOpCaseResponseRepository) GetByCase(_ context.Context, _ uuid.UUID, _, _ int) ([]domain.CaseResponse, int64, error) {
	return []domain.CaseResponse{}, 0, nil
}

func (r *NoOpCaseResponseRepository) GetByUserAndCase(_ context.Context, _, _ uuid.UUID) ([]domain.CaseResponse, error) {
	return []domain.CaseResponse{}, nil
}

func (r *NoOpCaseResponseRepository) CountByCase(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

func (r *NoOpCaseResponseRepository) CountUniqueUsersByCase(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

func (r *NoOpCaseResponseRepository) Close() error {
	return nil
}

func (r *NoOpCaseResponseRepository) HasUserResponded(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}

func (r *NoOpCaseResponseRepository) GetAllByCase(_ context.Context, _ uuid.UUID) ([]domain.CaseResponse, error) {
	return []domain.CaseResponse{}, nil
}

func (r *NoOpCaseResponseRepository) GetResponsesWithUserExpertise(_ context.Context, _ uuid.UUID) ([]domain.ResponseWithExpertise, error) {
	return []domain.ResponseWithExpertise{}, nil
}

// NoOpCaseAnalyticsRepository is a no-op implementation.
type NoOpCaseAnalyticsRepository struct{}

func NewNoOpCaseAnalyticsRepository() *NoOpCaseAnalyticsRepository {
	return &NoOpCaseAnalyticsRepository{}
}

func (r *NoOpCaseAnalyticsRepository) GetSummary(_ context.Context, caseID uuid.UUID) (*domain.CaseAnalyticsSummary, error) {
	return &domain.CaseAnalyticsSummary{
		CaseID:          caseID,
		DanisWeberDist:  make(map[string]int64),
		LaugeHansenDist: make(map[string]int64),
		AOOTADist:       make(map[string]int64),
		BartonicekDist:  make(map[string]int64),
	}, nil
}

func (r *NoOpCaseAnalyticsRepository) GetClassificationDistribution(_ context.Context, _ uuid.UUID, _ string) (map[string]int64, error) {
	return make(map[string]int64), nil
}
