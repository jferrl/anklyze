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
