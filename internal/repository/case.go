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

// Compile-time interface checks for NoOp implementations.
var (
	_ CaseRepository          = (*NoOpCaseRepository)(nil)
	_ CaseResponseRepository  = (*NoOpCaseResponseRepository)(nil)
	_ CaseAnalyticsRepository = (*NoOpCaseAnalyticsRepository)(nil)
)

// NoOpCaseRepository is a no-op implementation for when DB is not configured.
type NoOpCaseRepository struct{}

// NewNoOpCaseRepository returns a new NoOpCaseRepository.
func NewNoOpCaseRepository() *NoOpCaseRepository {
	return &NoOpCaseRepository{}
}

// Create implements CaseRepository.
func (r *NoOpCaseRepository) Create(_ context.Context, _ *domain.Case) error {
	return nil
}

// GetByID implements CaseRepository.
func (r *NoOpCaseRepository) GetByID(_ context.Context, _ uuid.UUID) (*domain.Case, error) {
	return nil, nil
}

// Update implements CaseRepository.
func (r *NoOpCaseRepository) Update(_ context.Context, _ *domain.Case) error {
	return nil
}

// Delete implements CaseRepository.
func (r *NoOpCaseRepository) Delete(_ context.Context, _ uuid.UUID) error {
	return nil
}

// List implements CaseRepository.
func (r *NoOpCaseRepository) List(_ context.Context, _ *domain.CaseStatus, _, _ int) ([]domain.Case, int64, error) {
	return []domain.Case{}, 0, nil
}

// ListPublished implements CaseRepository.
func (r *NoOpCaseRepository) ListPublished(_ context.Context, _, _ int) ([]domain.Case, int64, error) {
	return []domain.Case{}, 0, nil
}

// AddImage implements CaseRepository.
func (r *NoOpCaseRepository) AddImage(_ context.Context, _ *domain.CaseImage) error {
	return nil
}

// GetImages implements CaseRepository.
func (r *NoOpCaseRepository) GetImages(_ context.Context, _ uuid.UUID) ([]domain.CaseImage, error) {
	return []domain.CaseImage{}, nil
}

// GetImagesForCases implements CaseRepository.
func (r *NoOpCaseRepository) GetImagesForCases(_ context.Context, _ []uuid.UUID) (map[uuid.UUID][]domain.CaseImage, error) {
	return make(map[uuid.UUID][]domain.CaseImage), nil
}

// GetImageByID implements CaseRepository.
func (r *NoOpCaseRepository) GetImageByID(_ context.Context, _ uuid.UUID) (*domain.CaseImage, error) {
	return nil, nil
}

// UpdateImage implements CaseRepository.
func (r *NoOpCaseRepository) UpdateImage(_ context.Context, _ *domain.CaseImage) error {
	return nil
}

// DeleteImage implements CaseRepository.
func (r *NoOpCaseRepository) DeleteImage(_ context.Context, _ uuid.UUID) error {
	return nil
}

// UpdateHasTACImages implements CaseRepository.
func (r *NoOpCaseRepository) UpdateHasTACImages(_ context.Context, _ uuid.UUID) error {
	return nil
}

// Publish implements CaseRepository.
func (r *NoOpCaseRepository) Publish(_ context.Context, _ uuid.UUID) error {
	return nil
}

// Close implements CaseRepository.
func (r *NoOpCaseRepository) Close(_ context.Context, _ uuid.UUID) error {
	return nil
}

// IncrementResponseCount implements CaseRepository.
func (r *NoOpCaseRepository) IncrementResponseCount(_ context.Context, _ uuid.UUID) error {
	return nil
}

// UpdateUniqueUsers implements CaseRepository.
func (r *NoOpCaseRepository) UpdateUniqueUsers(_ context.Context, _ uuid.UUID, _ int) error {
	return nil
}

// GetByIDs implements CaseRepository.
func (r *NoOpCaseRepository) GetByIDs(_ context.Context, _ []uuid.UUID) ([]domain.Case, error) {
	return []domain.Case{}, nil
}

// GetDashboardStats implements CaseRepository.
func (r *NoOpCaseRepository) GetDashboardStats(_ context.Context) (*domain.DashboardStats, error) {
	return &domain.DashboardStats{}, nil
}

// GetRecentActiveCases implements CaseRepository.
func (r *NoOpCaseRepository) GetRecentActiveCases(_ context.Context, _ int) ([]domain.DashboardRecentCase, error) {
	return []domain.DashboardRecentCase{}, nil
}

// GetCasesNeedingAttention implements CaseRepository.
func (r *NoOpCaseRepository) GetCasesNeedingAttention(_ context.Context, _ int) ([]domain.DashboardAttentionCase, error) {
	return []domain.DashboardAttentionCase{}, nil
}

// NoOpCaseResponseRepository is a no-op implementation.
type NoOpCaseResponseRepository struct{}

// NewNoOpCaseResponseRepository returns a new NoOpCaseResponseRepository.
func NewNoOpCaseResponseRepository() *NoOpCaseResponseRepository {
	return &NoOpCaseResponseRepository{}
}

// Save implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) Save(_ context.Context, _ *domain.CaseResponse) error {
	return nil
}

// GetByCase implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) GetByCase(_ context.Context, _ uuid.UUID, _, _ int) ([]domain.CaseResponse, int64, error) {
	return []domain.CaseResponse{}, 0, nil
}

// GetByUserAndCase implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) GetByUserAndCase(_ context.Context, _, _ uuid.UUID) ([]domain.CaseResponse, error) {
	return []domain.CaseResponse{}, nil
}

// GetByUserAndCases implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) GetByUserAndCases(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	return make(map[uuid.UUID][]domain.CaseResponse), nil
}

// CountByCase implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) CountByCase(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

// CountUniqueUsersByCase implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) CountUniqueUsersByCase(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

// HasUserResponded implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) HasUserResponded(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}

// GetAllByCase implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) GetAllByCase(_ context.Context, _ uuid.UUID) ([]domain.CaseResponse, error) {
	return []domain.CaseResponse{}, nil
}

// GetResponsesWithUserExpertise implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) GetResponsesWithUserExpertise(_ context.Context, _ uuid.UUID) ([]domain.ResponseWithExpertise, error) {
	return []domain.ResponseWithExpertise{}, nil
}

// CountRespondedPublishedCases implements CaseResponseRepository.
func (r *NoOpCaseResponseRepository) CountRespondedPublishedCases(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

// NoOpCaseAnalyticsRepository is a no-op implementation.
type NoOpCaseAnalyticsRepository struct{}

// NewNoOpCaseAnalyticsRepository returns a new NoOpCaseAnalyticsRepository.
func NewNoOpCaseAnalyticsRepository() *NoOpCaseAnalyticsRepository {
	return &NoOpCaseAnalyticsRepository{}
}

// GetSummary implements CaseAnalyticsRepository.
func (r *NoOpCaseAnalyticsRepository) GetSummary(_ context.Context, caseID uuid.UUID) (*domain.CaseAnalyticsSummary, error) {
	return &domain.CaseAnalyticsSummary{
		CaseID:          caseID,
		DanisWeberDist:  make(map[string]int64),
		LaugeHansenDist: make(map[string]int64),
		AOOTADist:       make(map[string]int64),
		BartonicekDist:  make(map[string]int64),
	}, nil
}

// GetClassificationDistribution implements CaseAnalyticsRepository.
func (r *NoOpCaseAnalyticsRepository) GetClassificationDistribution(_ context.Context, _ uuid.UUID, _ string) (map[string]int64, error) {
	return make(map[string]int64), nil
}
