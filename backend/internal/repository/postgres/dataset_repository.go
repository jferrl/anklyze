package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
)

// DatasetRepository implements dataset persistence with PostgreSQL.
type DatasetRepository struct {
	db *gorm.DB
}

// NewDatasetRepository creates a new PostgreSQL dataset repository.
func NewDatasetRepository(db *gorm.DB) *DatasetRepository {
	return &DatasetRepository{db: db}
}

// CreateDataset creates a new dataset.
func (r *DatasetRepository) CreateDataset(ctx context.Context, dataset *domain.Dataset) error {
	return r.db.WithContext(ctx).Create(dataset).Error
}

// GetDataset retrieves a dataset by its ID.
func (r *DatasetRepository) GetDataset(ctx context.Context, id uuid.UUID) (*domain.Dataset, error) {
	var dataset domain.Dataset
	result := r.db.WithContext(ctx).First(&dataset, "id = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}
	return &dataset, nil
}

// ListDatasets retrieves datasets filtered by creator, sorted by created_at desc.
func (r *DatasetRepository) ListDatasets(ctx context.Context, createdBy string) ([]domain.Dataset, error) {
	var datasets []domain.Dataset
	err := r.db.WithContext(ctx).
		Where("created_by = ?", createdBy).
		Order("created_at DESC").
		Find(&datasets).Error
	return datasets, err
}

// UpdateDataset updates a dataset.
func (r *DatasetRepository) UpdateDataset(ctx context.Context, dataset *domain.Dataset) error {
	dataset.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(dataset).Error
}

// DeleteDataset deletes a dataset and cascades to records, import logs, and filters.
func (r *DatasetRepository) DeleteDataset(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&domain.DatasetFilter{}, "dataset_id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Delete(&domain.ImportLogEntry{}, "dataset_id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Delete(&domain.DatasetRecord{}, "dataset_id = ?", id).Error; err != nil {
			return err
		}
		return tx.Delete(&domain.Dataset{}, "id = ?", id).Error
	})
}

// BulkCreateRecords inserts dataset records in batches of 100.
func (r *DatasetRepository) BulkCreateRecords(ctx context.Context, records []domain.DatasetRecord) error {
	return r.db.WithContext(ctx).CreateInBatches(records, 100).Error
}

// GetRecords retrieves paginated and filtered records for a dataset.
// Supported filter keys: "sex", "trauma_energy", "age_min", "age_max".
func (r *DatasetRepository) GetRecords(ctx context.Context, datasetID uuid.UUID, filters map[string]interface{}, offset, limit int) ([]domain.DatasetRecord, int64, error) {
	var records []domain.DatasetRecord
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.DatasetRecord{}).Where("dataset_id = ?", datasetID)

	for key, value := range filters {
		switch key {
		case "sex":
			query = query.Where("sex = ?", value)
		case "trauma_energy":
			query = query.Where("trauma_energy = ?", value)
		case "age_min":
			query = query.Where("age >= ?", value)
		case "age_max":
			query = query.Where("age <= ?", value)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("internal_code ASC").Offset(offset).Limit(limit).Find(&records).Error; err != nil {
		return nil, 0, err
	}

	return records, total, nil
}

// BulkCreateImportLog inserts import log entries in bulk.
func (r *DatasetRepository) BulkCreateImportLog(ctx context.Context, entries []domain.ImportLogEntry) error {
	return r.db.WithContext(ctx).CreateInBatches(entries, 100).Error
}

// GetImportLog retrieves import log entries for a dataset sorted by row.
func (r *DatasetRepository) GetImportLog(ctx context.Context, datasetID uuid.UUID) ([]domain.ImportLogEntry, error) {
	var entries []domain.ImportLogEntry
	err := r.db.WithContext(ctx).
		Where("dataset_id = ?", datasetID).
		Order("row ASC").
		Find(&entries).Error
	return entries, err
}

// SaveFilter saves a dataset filter view.
func (r *DatasetRepository) SaveFilter(ctx context.Context, filter *domain.DatasetFilter) error {
	return r.db.WithContext(ctx).Create(filter).Error
}

// ListFilters retrieves all saved filters for a dataset.
func (r *DatasetRepository) ListFilters(ctx context.Context, datasetID uuid.UUID) ([]domain.DatasetFilter, error) {
	var filters []domain.DatasetFilter
	err := r.db.WithContext(ctx).
		Where("dataset_id = ?", datasetID).
		Order("created_at ASC").
		Find(&filters).Error
	return filters, err
}

// DeleteFilter deletes a saved filter by ID.
func (r *DatasetRepository) DeleteFilter(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.DatasetFilter{}, "id = ?", id).Error
}
