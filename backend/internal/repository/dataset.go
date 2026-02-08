package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// DatasetRepository defines the interface for dataset persistence operations.
type DatasetRepository interface {
	// CreateDataset creates a new dataset.
	CreateDataset(ctx context.Context, dataset *domain.Dataset) error
	// GetDataset retrieves a dataset by its ID.
	GetDataset(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
	// ListDatasets retrieves datasets filtered by creator.
	ListDatasets(ctx context.Context, createdBy string) ([]domain.Dataset, error)
	// UpdateDataset updates a dataset.
	UpdateDataset(ctx context.Context, dataset *domain.Dataset) error
	// DeleteDataset deletes a dataset and cascades to records, logs, and filters.
	DeleteDataset(ctx context.Context, id uuid.UUID) error

	// BulkCreateRecords inserts dataset records in batches.
	BulkCreateRecords(ctx context.Context, records []domain.DatasetRecord) error
	// GetRecords retrieves paginated and filtered records for a dataset.
	GetRecords(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)

	// BulkCreateImportLog inserts import log entries in bulk.
	BulkCreateImportLog(ctx context.Context, entries []domain.ImportLogEntry) error
	// GetImportLog retrieves import log entries for a dataset.
	GetImportLog(ctx context.Context, datasetID uuid.UUID) ([]domain.ImportLogEntry, error)

	// SaveFilter saves a dataset filter view.
	SaveFilter(ctx context.Context, filter *domain.DatasetFilter) error
	// ListFilters retrieves all saved filters for a dataset.
	ListFilters(ctx context.Context, datasetID uuid.UUID) ([]domain.DatasetFilter, error)
	// DeleteFilter deletes a saved filter by ID.
	DeleteFilter(ctx context.Context, id uuid.UUID) error
}

// NoOpDatasetRepository is a no-op implementation for when DB is not configured.
type NoOpDatasetRepository struct{}

// NewNoOpDatasetRepository creates a no-op dataset repository.
func NewNoOpDatasetRepository() *NoOpDatasetRepository {
	return &NoOpDatasetRepository{}
}

func (r *NoOpDatasetRepository) CreateDataset(_ context.Context, _ *domain.Dataset) error {
	return nil
}

func (r *NoOpDatasetRepository) GetDataset(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
	return nil, nil
}

func (r *NoOpDatasetRepository) ListDatasets(_ context.Context, _ string) ([]domain.Dataset, error) {
	return []domain.Dataset{}, nil
}

func (r *NoOpDatasetRepository) UpdateDataset(_ context.Context, _ *domain.Dataset) error {
	return nil
}

func (r *NoOpDatasetRepository) DeleteDataset(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpDatasetRepository) BulkCreateRecords(_ context.Context, _ []domain.DatasetRecord) error {
	return nil
}

func (r *NoOpDatasetRepository) GetRecords(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
	return []domain.DatasetRecord{}, 0, nil
}

func (r *NoOpDatasetRepository) BulkCreateImportLog(_ context.Context, _ []domain.ImportLogEntry) error {
	return nil
}

func (r *NoOpDatasetRepository) GetImportLog(_ context.Context, _ uuid.UUID) ([]domain.ImportLogEntry, error) {
	return []domain.ImportLogEntry{}, nil
}

func (r *NoOpDatasetRepository) SaveFilter(_ context.Context, _ *domain.DatasetFilter) error {
	return nil
}

func (r *NoOpDatasetRepository) ListFilters(_ context.Context, _ uuid.UUID) ([]domain.DatasetFilter, error) {
	return []domain.DatasetFilter{}, nil
}

func (r *NoOpDatasetRepository) DeleteFilter(_ context.Context, _ uuid.UUID) error {
	return nil
}
