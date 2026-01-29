package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// StudyRepository defines the interface for study persistence operations.
type StudyRepository interface {
	// Create creates a new study.
	Create(ctx context.Context, study *domain.Study) error
	// GetByID retrieves a study by its ID.
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Study, error)
	// Update updates a study.
	Update(ctx context.Context, study *domain.Study) error
	// Delete deletes a study by its ID.
	Delete(ctx context.Context, id uuid.UUID) error
	// List retrieves studies with optional status filter and pagination.
	List(ctx context.Context, status *domain.StudyStatus, limit, offset int) ([]domain.Study, int64, error)
	// ListPublished retrieves only published studies with pagination.
	ListPublished(ctx context.Context, limit, offset int) ([]domain.Study, int64, error)

	// AddImage adds an image to a study.
	AddImage(ctx context.Context, image *domain.StudyImage) error
	// GetImages retrieves all images for a study.
	GetImages(ctx context.Context, studyID uuid.UUID) ([]domain.StudyImage, error)
	// GetImageByID retrieves an image by its ID.
	GetImageByID(ctx context.Context, imageID uuid.UUID) (*domain.StudyImage, error)
	// DeleteImage deletes an image by its ID.
	DeleteImage(ctx context.Context, imageID uuid.UUID) error
	// UpdateHasTACImages recalculates and updates the has_tac_images flag for a study.
	UpdateHasTACImages(ctx context.Context, studyID uuid.UUID) error

	// Publish changes a study status from draft to published.
	Publish(ctx context.Context, id uuid.UUID) error
	// Close changes a study status to closed.
	Close(ctx context.Context, id uuid.UUID) error

	// IncrementResponseCount increments the response count for a study.
	IncrementResponseCount(ctx context.Context, studyID uuid.UUID) error
	// UpdateUniqueUsers recalculates and updates the unique users count.
	UpdateUniqueUsers(ctx context.Context, studyID uuid.UUID, count int) error
}

// StudyResponseRepository defines the interface for study response persistence.
type StudyResponseRepository interface {
	// Save saves a study response asynchronously.
	Save(ctx context.Context, response *domain.StudyResponse) error
	// GetByStudy retrieves all responses for a study with pagination.
	GetByStudy(ctx context.Context, studyID uuid.UUID, limit, offset int) ([]domain.StudyResponse, int64, error)
	// GetByUserAndStudy retrieves all responses by a user for a study.
	GetByUserAndStudy(ctx context.Context, userID, studyID uuid.UUID) ([]domain.StudyResponse, error)
	// CountByStudy counts the total responses for a study.
	CountByStudy(ctx context.Context, studyID uuid.UUID) (int64, error)
	// CountUniqueUsersByStudy counts unique users who responded to a study.
	CountUniqueUsersByStudy(ctx context.Context, studyID uuid.UUID) (int64, error)
	// Close gracefully shuts down the repository.
	Close() error
}

// StudyAnalyticsRepository defines the interface for study analytics queries.
type StudyAnalyticsRepository interface {
	// GetSummary retrieves aggregated analytics for a study.
	GetSummary(ctx context.Context, studyID uuid.UUID) (*domain.StudyAnalyticsSummary, error)
	// GetClassificationDistribution retrieves distribution for a specific classification system.
	GetClassificationDistribution(ctx context.Context, studyID uuid.UUID, system string) (map[string]int64, error)
}

// NoOpStudyRepository is a no-op implementation for when DB is not configured.
type NoOpStudyRepository struct{}

func NewNoOpStudyRepository() *NoOpStudyRepository {
	return &NoOpStudyRepository{}
}

func (r *NoOpStudyRepository) Create(_ context.Context, _ *domain.Study) error {
	return nil
}

func (r *NoOpStudyRepository) GetByID(_ context.Context, _ uuid.UUID) (*domain.Study, error) {
	return nil, nil
}

func (r *NoOpStudyRepository) Update(_ context.Context, _ *domain.Study) error {
	return nil
}

func (r *NoOpStudyRepository) Delete(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpStudyRepository) List(_ context.Context, _ *domain.StudyStatus, _, _ int) ([]domain.Study, int64, error) {
	return []domain.Study{}, 0, nil
}

func (r *NoOpStudyRepository) ListPublished(_ context.Context, _, _ int) ([]domain.Study, int64, error) {
	return []domain.Study{}, 0, nil
}

func (r *NoOpStudyRepository) AddImage(_ context.Context, _ *domain.StudyImage) error {
	return nil
}

func (r *NoOpStudyRepository) GetImages(_ context.Context, _ uuid.UUID) ([]domain.StudyImage, error) {
	return []domain.StudyImage{}, nil
}

func (r *NoOpStudyRepository) GetImageByID(_ context.Context, _ uuid.UUID) (*domain.StudyImage, error) {
	return nil, nil
}

func (r *NoOpStudyRepository) DeleteImage(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpStudyRepository) UpdateHasTACImages(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpStudyRepository) Publish(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpStudyRepository) Close(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpStudyRepository) IncrementResponseCount(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpStudyRepository) UpdateUniqueUsers(_ context.Context, _ uuid.UUID, _ int) error {
	return nil
}

// NoOpStudyResponseRepository is a no-op implementation.
type NoOpStudyResponseRepository struct{}

func NewNoOpStudyResponseRepository() *NoOpStudyResponseRepository {
	return &NoOpStudyResponseRepository{}
}

func (r *NoOpStudyResponseRepository) Save(_ context.Context, _ *domain.StudyResponse) error {
	return nil
}

func (r *NoOpStudyResponseRepository) GetByStudy(_ context.Context, _ uuid.UUID, _, _ int) ([]domain.StudyResponse, int64, error) {
	return []domain.StudyResponse{}, 0, nil
}

func (r *NoOpStudyResponseRepository) GetByUserAndStudy(_ context.Context, _, _ uuid.UUID) ([]domain.StudyResponse, error) {
	return []domain.StudyResponse{}, nil
}

func (r *NoOpStudyResponseRepository) CountByStudy(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

func (r *NoOpStudyResponseRepository) CountUniqueUsersByStudy(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

func (r *NoOpStudyResponseRepository) Close() error {
	return nil
}

// NoOpStudyAnalyticsRepository is a no-op implementation.
type NoOpStudyAnalyticsRepository struct{}

func NewNoOpStudyAnalyticsRepository() *NoOpStudyAnalyticsRepository {
	return &NoOpStudyAnalyticsRepository{}
}

func (r *NoOpStudyAnalyticsRepository) GetSummary(_ context.Context, studyID uuid.UUID) (*domain.StudyAnalyticsSummary, error) {
	return &domain.StudyAnalyticsSummary{
		StudyID:             studyID,
		DanisWeberDist:      make(map[string]int64),
		LaugeHansenDist:     make(map[string]int64),
		AOOTADist:           make(map[string]int64),
		BartonicekDist:      make(map[string]int64),
	}, nil
}

func (r *NoOpStudyAnalyticsRepository) GetClassificationDistribution(_ context.Context, _ uuid.UUID, _ string) (map[string]int64, error) {
	return make(map[string]int64), nil
}
