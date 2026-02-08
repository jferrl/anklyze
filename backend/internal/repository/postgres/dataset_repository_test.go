package postgres

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupDatasetTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	if err := db.AutoMigrate(
		&domain.Dataset{},
		&domain.DatasetRecord{},
		&domain.ImportLogEntry{},
		&domain.DatasetFilter{},
	); err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	return db
}

func createTestDataset(createdBy string) *domain.Dataset {
	return &domain.Dataset{
		ID:               uuid.New(),
		Name:             "Test Dataset",
		Description:      "A test dataset",
		Status:           domain.DatasetStatusDraft,
		RecordCount:      0,
		OriginalFilename: "test.csv",
		CreatedBy:        createdBy,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
}

func TestNewDatasetRepository(t *testing.T) {
	t.Parallel()

	db := setupDatasetTestDB(t)
	repo := NewDatasetRepository(db)

	if repo == nil {
		t.Error("NewDatasetRepository() returned nil")
	}
}

func TestDatasetRepository_CreateDataset(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		dataset *domain.Dataset
		wantErr bool
	}{
		{
			name:    "creates dataset successfully",
			dataset: createTestDataset("user-1"),
			wantErr: false,
		},
		{
			name: "creates dataset with empty description",
			dataset: &domain.Dataset{
				ID:        uuid.New(),
				Name:      "No Description",
				Status:    domain.DatasetStatusDraft,
				CreatedBy: "user-2",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			repo := NewDatasetRepository(db)

			err := repo.CreateDataset(context.Background(), tt.dataset)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateDataset() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Verify the dataset was persisted
				var found domain.Dataset
				if err := db.First(&found, "id = ?", tt.dataset.ID).Error; err != nil {
					t.Fatalf("failed to find created dataset: %v", err)
				}
				if found.Name != tt.dataset.Name {
					t.Errorf("Name = %q, want %q", found.Name, tt.dataset.Name)
				}
				if found.CreatedBy != tt.dataset.CreatedBy {
					t.Errorf("CreatedBy = %q, want %q", found.CreatedBy, tt.dataset.CreatedBy)
				}
				if found.Status != tt.dataset.Status {
					t.Errorf("Status = %q, want %q", found.Status, tt.dataset.Status)
				}
				if found.ID == uuid.Nil {
					t.Error("ID should not be nil")
				}
			}
		})
	}
}

func TestDatasetRepository_GetDataset(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		setup     func(db *gorm.DB) uuid.UUID
		wantFound bool
	}{
		{
			name: "found",
			setup: func(db *gorm.DB) uuid.UUID {
				ds := createTestDataset("user-1")
				db.Create(ds)
				return ds.ID
			},
			wantFound: true,
		},
		{
			name: "not found",
			setup: func(_ *gorm.DB) uuid.UUID {
				return uuid.New()
			},
			wantFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			repo := NewDatasetRepository(db)
			id := tt.setup(db)

			got, err := repo.GetDataset(context.Background(), id)
			if err != nil {
				t.Fatalf("GetDataset() unexpected error = %v", err)
			}

			if tt.wantFound && got == nil {
				t.Error("GetDataset() returned nil, want dataset")
			}
			if !tt.wantFound && got != nil {
				t.Errorf("GetDataset() returned %v, want nil", got)
			}
			if tt.wantFound && got != nil {
				if got.ID != id {
					t.Errorf("ID = %v, want %v", got.ID, id)
				}
			}
		})
	}
}

func TestDatasetRepository_ListDatasets(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		createdBy string
		setup     func(db *gorm.DB)
		wantCount int
	}{
		{
			name:      "filters by createdBy",
			createdBy: "user-1",
			setup: func(db *gorm.DB) {
				ds1 := createTestDataset("user-1")
				ds1.CreatedAt = time.Now().Add(-2 * time.Hour)
				db.Create(ds1)

				ds2 := createTestDataset("user-1")
				ds2.Name = "Second Dataset"
				ds2.CreatedAt = time.Now().Add(-1 * time.Hour)
				db.Create(ds2)

				ds3 := createTestDataset("user-2")
				ds3.Name = "Other User Dataset"
				db.Create(ds3)
			},
			wantCount: 2,
		},
		{
			name:      "empty result",
			createdBy: "nonexistent",
			setup:     func(_ *gorm.DB) {},
			wantCount: 0,
		},
		{
			name:      "returns sorted by created_at desc",
			createdBy: "user-sort",
			setup: func(db *gorm.DB) {
				for i := 0; i < 3; i++ {
					ds := createTestDataset("user-sort")
					ds.Name = fmt.Sprintf("Dataset %d", i)
					ds.CreatedAt = time.Now().Add(time.Duration(-3+i) * time.Hour)
					db.Create(ds)
				}
			},
			wantCount: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			tt.setup(db)
			repo := NewDatasetRepository(db)

			datasets, err := repo.ListDatasets(context.Background(), tt.createdBy)
			if err != nil {
				t.Fatalf("ListDatasets() error = %v", err)
			}

			if len(datasets) != tt.wantCount {
				t.Errorf("ListDatasets() returned %d datasets, want %d", len(datasets), tt.wantCount)
			}

			// Verify descending order
			for i := 1; i < len(datasets); i++ {
				if datasets[i].CreatedAt.After(datasets[i-1].CreatedAt) {
					t.Errorf("datasets not sorted by created_at desc: [%d]=%v > [%d]=%v",
						i, datasets[i].CreatedAt, i-1, datasets[i-1].CreatedAt)
				}
			}
		})
	}
}

func TestDatasetRepository_UpdateDataset(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		newStatus  domain.DatasetStatus
		newCount   int
	}{
		{
			name:      "update status to ready",
			newStatus: domain.DatasetStatusReady,
			newCount:  150,
		},
		{
			name:      "update status to error",
			newStatus: domain.DatasetStatusError,
			newCount:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			repo := NewDatasetRepository(db)

			ds := createTestDataset("user-1")
			if err := db.Create(ds).Error; err != nil {
				t.Fatalf("failed to create dataset: %v", err)
			}

			ds.Status = tt.newStatus
			ds.RecordCount = tt.newCount

			if err := repo.UpdateDataset(context.Background(), ds); err != nil {
				t.Fatalf("UpdateDataset() error = %v", err)
			}

			var found domain.Dataset
			if err := db.First(&found, "id = ?", ds.ID).Error; err != nil {
				t.Fatalf("failed to find updated dataset: %v", err)
			}

			if found.Status != tt.newStatus {
				t.Errorf("Status = %q, want %q", found.Status, tt.newStatus)
			}
			if found.RecordCount != tt.newCount {
				t.Errorf("RecordCount = %d, want %d", found.RecordCount, tt.newCount)
			}
		})
	}
}

func TestDatasetRepository_DeleteDataset(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		setupRelated bool
	}{
		{
			name:         "deletes dataset only",
			setupRelated: false,
		},
		{
			name:         "cascades to records logs and filters",
			setupRelated: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			repo := NewDatasetRepository(db)

			ds := createTestDataset("user-1")
			if err := db.Create(ds).Error; err != nil {
				t.Fatalf("failed to create dataset: %v", err)
			}

			if tt.setupRelated {
				record := &domain.DatasetRecord{
					ID:           uuid.New(),
					DatasetID:    ds.ID,
					InternalCode: "ANK-001",
					Sex:          "male",
					CreatedAt:    time.Now(),
					UpdatedAt:    time.Now(),
				}
				if err := db.Create(record).Error; err != nil {
					t.Fatalf("failed to create record: %v", err)
				}

				logEntry := &domain.ImportLogEntry{
					DatasetID:       ds.ID,
					Row:             1,
					Column:          "age",
					OriginalValue:   "thirty",
					NormalizedValue: "30",
					Action:          "enum_mapped",
					Severity:        "info",
					CreatedAt:       time.Now(),
				}
				if err := db.Create(logEntry).Error; err != nil {
					t.Fatalf("failed to create log entry: %v", err)
				}

				filter := &domain.DatasetFilter{
					ID:        uuid.New(),
					DatasetID: ds.ID,
					Name:      "My Filter",
					Filters:   datatypes.JSON(`{"sex":"male"}`),
					CreatedBy: "user-1",
					CreatedAt: time.Now(),
				}
				if err := db.Create(filter).Error; err != nil {
					t.Fatalf("failed to create filter: %v", err)
				}
			}

			if err := repo.DeleteDataset(context.Background(), ds.ID); err != nil {
				t.Fatalf("DeleteDataset() error = %v", err)
			}

			// Verify dataset deleted
			var count int64
			db.Model(&domain.Dataset{}).Where("id = ?", ds.ID).Count(&count)
			if count != 0 {
				t.Errorf("dataset still exists after delete, count = %d", count)
			}

			if tt.setupRelated {
				// Verify records cascaded
				db.Model(&domain.DatasetRecord{}).Where("dataset_id = ?", ds.ID).Count(&count)
				if count != 0 {
					t.Errorf("records still exist after cascade delete, count = %d", count)
				}

				// Verify import logs cascaded
				db.Model(&domain.ImportLogEntry{}).Where("dataset_id = ?", ds.ID).Count(&count)
				if count != 0 {
					t.Errorf("import logs still exist after cascade delete, count = %d", count)
				}

				// Verify filters cascaded
				db.Model(&domain.DatasetFilter{}).Where("dataset_id = ?", ds.ID).Count(&count)
				if count != 0 {
					t.Errorf("filters still exist after cascade delete, count = %d", count)
				}
			}
		})
	}
}

func TestDatasetRepository_BulkCreateRecords(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		recordCount int
		wantErr     bool
	}{
		{
			name:        "inserts 150 records in batches",
			recordCount: 150,
			wantErr:     false,
		},
		{
			name:        "inserts small batch",
			recordCount: 5,
			wantErr:     false,
		},
		{
			name:        "empty slice",
			recordCount: 0,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			repo := NewDatasetRepository(db)

			ds := createTestDataset("user-1")
			if err := db.Create(ds).Error; err != nil {
				t.Fatalf("failed to create dataset: %v", err)
			}

			records := make([]domain.DatasetRecord, tt.recordCount)
			for i := range records {
				records[i] = domain.DatasetRecord{
					ID:           uuid.New(),
					DatasetID:    ds.ID,
					InternalCode: fmt.Sprintf("ANK-%03d", i+1),
					Sex:          "male",
					CreatedAt:    time.Now(),
					UpdatedAt:    time.Now(),
				}
				if i%2 == 0 {
					records[i].Sex = "female"
				}
			}

			err := repo.BulkCreateRecords(context.Background(), records)
			if (err != nil) != tt.wantErr {
				t.Errorf("BulkCreateRecords() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				var count int64
				db.Model(&domain.DatasetRecord{}).Where("dataset_id = ?", ds.ID).Count(&count)
				if count != int64(tt.recordCount) {
					t.Errorf("record count = %d, want %d", count, tt.recordCount)
				}
			}
		})
	}
}

func TestDatasetRepository_GetRecords(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		filters    map[string]interface{}
		offset     int
		limit      int
		wantCount  int
		wantTotal  int64
	}{
		{
			name:      "no filters with pagination",
			filters:   nil,
			offset:    0,
			limit:     5,
			wantCount: 5,
			wantTotal: 10,
		},
		{
			name:      "offset pagination",
			filters:   nil,
			offset:    8,
			limit:     5,
			wantCount: 2,
			wantTotal: 10,
		},
		{
			name:      "filter by sex",
			filters:   map[string]interface{}{"sex": "female"},
			offset:    0,
			limit:     100,
			wantCount: 5,
			wantTotal: 5,
		},
		{
			name:      "filter by trauma_energy",
			filters:   map[string]interface{}{"trauma_energy": "high"},
			offset:    0,
			limit:     100,
			wantCount: 5,
			wantTotal: 5,
		},
		{
			name:      "filter by age range",
			filters:   map[string]interface{}{"age_min": 30, "age_max": 50},
			offset:    0,
			limit:     100,
			wantCount: 5,
			wantTotal: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			repo := NewDatasetRepository(db)

			ds := createTestDataset("user-1")
			if err := db.Create(ds).Error; err != nil {
				t.Fatalf("failed to create dataset: %v", err)
			}

			// Create 10 records with varying attributes
			ages := []int{20, 25, 30, 35, 40, 45, 50, 55, 60, 65}
			for i := 0; i < 10; i++ {
				age := ages[i]
				sex := "male"
				if i%2 == 0 {
					sex = "female"
				}
				energy := "low"
				if i%2 == 0 {
					energy = "high"
				}
				record := &domain.DatasetRecord{
					ID:           uuid.New(),
					DatasetID:    ds.ID,
					InternalCode: fmt.Sprintf("ANK-%03d", i+1),
					Age:          &age,
					Sex:          sex,
					TraumaEnergy: energy,
					CreatedAt:    time.Now(),
					UpdatedAt:    time.Now(),
				}
				if err := db.Create(record).Error; err != nil {
					t.Fatalf("failed to create record %d: %v", i, err)
				}
			}

			records, total, err := repo.GetRecords(context.Background(), ds.ID, tt.filters, tt.offset, tt.limit)
			if err != nil {
				t.Fatalf("GetRecords() error = %v", err)
			}

			if total != tt.wantTotal {
				t.Errorf("total = %d, want %d", total, tt.wantTotal)
			}
			if len(records) != tt.wantCount {
				t.Errorf("records count = %d, want %d", len(records), tt.wantCount)
			}
		})
	}
}

func TestDatasetRepository_BulkCreateImportLog(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		entryCount int
		wantErr    bool
	}{
		{
			name:       "inserts multiple log entries",
			entryCount: 25,
			wantErr:    false,
		},
		{
			name:       "empty slice",
			entryCount: 0,
			wantErr:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			repo := NewDatasetRepository(db)

			ds := createTestDataset("user-1")
			if err := db.Create(ds).Error; err != nil {
				t.Fatalf("failed to create dataset: %v", err)
			}

			entries := make([]domain.ImportLogEntry, tt.entryCount)
			for i := range entries {
				entries[i] = domain.ImportLogEntry{
					DatasetID:       ds.ID,
					Row:             i + 1,
					Column:          "age",
					OriginalValue:   fmt.Sprintf("raw_%d", i),
					NormalizedValue: fmt.Sprintf("norm_%d", i),
					Action:          "whitespace_trimmed",
					Severity:        "info",
					CreatedAt:       time.Now(),
				}
			}

			err := repo.BulkCreateImportLog(context.Background(), entries)
			if (err != nil) != tt.wantErr {
				t.Errorf("BulkCreateImportLog() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				var count int64
				db.Model(&domain.ImportLogEntry{}).Where("dataset_id = ?", ds.ID).Count(&count)
				if count != int64(tt.entryCount) {
					t.Errorf("entry count = %d, want %d", count, tt.entryCount)
				}
			}
		})
	}
}

func TestDatasetRepository_GetImportLog(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		entryCount int
	}{
		{
			name:       "returns entries sorted by row",
			entryCount: 5,
		},
		{
			name:       "empty result",
			entryCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupDatasetTestDB(t)
			repo := NewDatasetRepository(db)

			ds := createTestDataset("user-1")
			if err := db.Create(ds).Error; err != nil {
				t.Fatalf("failed to create dataset: %v", err)
			}

			// Insert in reverse order to test sorting
			for i := tt.entryCount; i > 0; i-- {
				entry := &domain.ImportLogEntry{
					DatasetID:       ds.ID,
					Row:             i,
					Column:          "name",
					OriginalValue:   fmt.Sprintf("orig_%d", i),
					NormalizedValue: fmt.Sprintf("norm_%d", i),
					Action:          "date_normalized",
					Severity:        "warning",
					CreatedAt:       time.Now(),
				}
				if err := db.Create(entry).Error; err != nil {
					t.Fatalf("failed to create log entry: %v", err)
				}
			}

			entries, err := repo.GetImportLog(context.Background(), ds.ID)
			if err != nil {
				t.Fatalf("GetImportLog() error = %v", err)
			}

			if len(entries) != tt.entryCount {
				t.Errorf("entries count = %d, want %d", len(entries), tt.entryCount)
			}

			// Verify ascending row order
			for i := 1; i < len(entries); i++ {
				if entries[i].Row < entries[i-1].Row {
					t.Errorf("entries not sorted by row asc: [%d].Row=%d < [%d].Row=%d",
						i, entries[i].Row, i-1, entries[i-1].Row)
				}
			}
		})
	}
}

func TestDatasetRepository_FilterCRUD(t *testing.T) {
	t.Parallel()

	t.Run("save list and delete lifecycle", func(t *testing.T) {
		t.Parallel()

		db := setupDatasetTestDB(t)
		repo := NewDatasetRepository(db)

		ds := createTestDataset("user-1")
		if err := db.Create(ds).Error; err != nil {
			t.Fatalf("failed to create dataset: %v", err)
		}

		// Save a filter
		filter := domain.NewDatasetFilter(ds.ID, "Male patients", "user-1", datatypes.JSON(`{"sex":"male"}`))
		if err := repo.SaveFilter(context.Background(), filter); err != nil {
			t.Fatalf("SaveFilter() error = %v", err)
		}

		// Save another filter
		filter2 := domain.NewDatasetFilter(ds.ID, "High energy", "user-1", datatypes.JSON(`{"trauma_energy":"high"}`))
		if err := repo.SaveFilter(context.Background(), filter2); err != nil {
			t.Fatalf("SaveFilter() error = %v", err)
		}

		// List filters
		filters, err := repo.ListFilters(context.Background(), ds.ID)
		if err != nil {
			t.Fatalf("ListFilters() error = %v", err)
		}
		if len(filters) != 2 {
			t.Errorf("ListFilters() returned %d filters, want 2", len(filters))
		}

		// Delete first filter
		if err := repo.DeleteFilter(context.Background(), filter.ID); err != nil {
			t.Fatalf("DeleteFilter() error = %v", err)
		}

		// Verify only one filter remains
		filters, err = repo.ListFilters(context.Background(), ds.ID)
		if err != nil {
			t.Fatalf("ListFilters() after delete error = %v", err)
		}
		if len(filters) != 1 {
			t.Errorf("ListFilters() after delete returned %d filters, want 1", len(filters))
		}
		if filters[0].ID != filter2.ID {
			t.Errorf("remaining filter ID = %v, want %v", filters[0].ID, filter2.ID)
		}
	})

	t.Run("list filters for different datasets", func(t *testing.T) {
		t.Parallel()

		db := setupDatasetTestDB(t)
		repo := NewDatasetRepository(db)

		ds1 := createTestDataset("user-1")
		ds2 := createTestDataset("user-1")
		ds2.Name = "Second Dataset"
		db.Create(ds1)
		db.Create(ds2)

		// Add filters to both datasets
		repo.SaveFilter(context.Background(), domain.NewDatasetFilter(ds1.ID, "Filter A", "user-1", datatypes.JSON(`{}`)))
		repo.SaveFilter(context.Background(), domain.NewDatasetFilter(ds1.ID, "Filter B", "user-1", datatypes.JSON(`{}`)))
		repo.SaveFilter(context.Background(), domain.NewDatasetFilter(ds2.ID, "Filter C", "user-1", datatypes.JSON(`{}`)))

		// List for ds1
		filters1, err := repo.ListFilters(context.Background(), ds1.ID)
		if err != nil {
			t.Fatalf("ListFilters(ds1) error = %v", err)
		}
		if len(filters1) != 2 {
			t.Errorf("ListFilters(ds1) returned %d, want 2", len(filters1))
		}

		// List for ds2
		filters2, err := repo.ListFilters(context.Background(), ds2.ID)
		if err != nil {
			t.Fatalf("ListFilters(ds2) error = %v", err)
		}
		if len(filters2) != 1 {
			t.Errorf("ListFilters(ds2) returned %d, want 1", len(filters2))
		}
	})
}
