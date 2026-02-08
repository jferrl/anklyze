package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/lib/pq"
)

// mockDatasetRepository is a mock implementation of repository.DatasetRepository for testing.
type mockDatasetRepository struct {
	createDatasetFunc      func(ctx context.Context, d *domain.Dataset) error
	getDatasetFunc         func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
	listDatasetsFunc       func(ctx context.Context, createdBy string) ([]domain.Dataset, error)
	updateDatasetFunc      func(ctx context.Context, d *domain.Dataset) error
	deleteDatasetFunc      func(ctx context.Context, id uuid.UUID) error
	bulkCreateRecordsFunc  func(ctx context.Context, records []domain.DatasetRecord) error
	getRecordsFunc         func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
	bulkCreateImportLogFunc func(ctx context.Context, entries []domain.ImportLogEntry) error
	getImportLogFunc       func(ctx context.Context, datasetID uuid.UUID) ([]domain.ImportLogEntry, error)
	saveFilterFunc         func(ctx context.Context, filter *domain.DatasetFilter) error
	listFiltersFunc        func(ctx context.Context, datasetID uuid.UUID) ([]domain.DatasetFilter, error)
	deleteFilterFunc       func(ctx context.Context, id uuid.UUID) error
}

func (m *mockDatasetRepository) CreateDataset(ctx context.Context, d *domain.Dataset) error {
	if m.createDatasetFunc != nil {
		return m.createDatasetFunc(ctx, d)
	}
	return errors.New("CreateDataset not implemented")
}

func (m *mockDatasetRepository) GetDataset(ctx context.Context, id uuid.UUID) (*domain.Dataset, error) {
	if m.getDatasetFunc != nil {
		return m.getDatasetFunc(ctx, id)
	}
	return nil, errors.New("GetDataset not implemented")
}

func (m *mockDatasetRepository) ListDatasets(ctx context.Context, createdBy string) ([]domain.Dataset, error) {
	if m.listDatasetsFunc != nil {
		return m.listDatasetsFunc(ctx, createdBy)
	}
	return nil, errors.New("ListDatasets not implemented")
}

func (m *mockDatasetRepository) UpdateDataset(ctx context.Context, d *domain.Dataset) error {
	if m.updateDatasetFunc != nil {
		return m.updateDatasetFunc(ctx, d)
	}
	return errors.New("UpdateDataset not implemented")
}

func (m *mockDatasetRepository) DeleteDataset(ctx context.Context, id uuid.UUID) error {
	if m.deleteDatasetFunc != nil {
		return m.deleteDatasetFunc(ctx, id)
	}
	return errors.New("DeleteDataset not implemented")
}

func (m *mockDatasetRepository) BulkCreateRecords(ctx context.Context, records []domain.DatasetRecord) error {
	if m.bulkCreateRecordsFunc != nil {
		return m.bulkCreateRecordsFunc(ctx, records)
	}
	return errors.New("BulkCreateRecords not implemented")
}

func (m *mockDatasetRepository) GetRecords(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error) {
	if m.getRecordsFunc != nil {
		return m.getRecordsFunc(ctx, datasetID, filters, offset, limit)
	}
	return nil, 0, errors.New("GetRecords not implemented")
}

func (m *mockDatasetRepository) BulkCreateImportLog(ctx context.Context, entries []domain.ImportLogEntry) error {
	if m.bulkCreateImportLogFunc != nil {
		return m.bulkCreateImportLogFunc(ctx, entries)
	}
	return errors.New("BulkCreateImportLog not implemented")
}

func (m *mockDatasetRepository) GetImportLog(ctx context.Context, datasetID uuid.UUID) ([]domain.ImportLogEntry, error) {
	if m.getImportLogFunc != nil {
		return m.getImportLogFunc(ctx, datasetID)
	}
	return nil, errors.New("GetImportLog not implemented")
}

func (m *mockDatasetRepository) SaveFilter(ctx context.Context, filter *domain.DatasetFilter) error {
	if m.saveFilterFunc != nil {
		return m.saveFilterFunc(ctx, filter)
	}
	return errors.New("SaveFilter not implemented")
}

func (m *mockDatasetRepository) ListFilters(ctx context.Context, datasetID uuid.UUID) ([]domain.DatasetFilter, error) {
	if m.listFiltersFunc != nil {
		return m.listFiltersFunc(ctx, datasetID)
	}
	return nil, errors.New("ListFilters not implemented")
}

func (m *mockDatasetRepository) DeleteFilter(ctx context.Context, id uuid.UUID) error {
	if m.deleteFilterFunc != nil {
		return m.deleteFilterFunc(ctx, id)
	}
	return errors.New("DeleteFilter not implemented")
}

func TestDatasetService_CreateDataset(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		inputName   string
		description string
		createdBy   string
		mockCreate  func(ctx context.Context, d *domain.Dataset) error
		wantErr     bool
	}{
		{
			name:      "success",
			inputName: "Test Dataset",
			createdBy: "user-1",
			mockCreate: func(_ context.Context, d *domain.Dataset) error {
				if d.Name != "Test Dataset" {
					return errors.New("unexpected name")
				}
				return nil
			},
		},
		{
			name:    "empty name",
			createdBy: "user-1",
			wantErr: true,
		},
		{
			name:      "empty created_by",
			inputName: "Test",
			wantErr:   true,
		},
		{
			name:      "repository error",
			inputName: "Test",
			createdBy: "user-1",
			mockCreate: func(_ context.Context, _ *domain.Dataset) error {
				return errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{createDatasetFunc: tt.mockCreate}
			svc := NewDatasetService(repo, nil)

			got, err := svc.CreateDataset(context.Background(), tt.inputName, tt.description, tt.createdBy)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateDataset() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got == nil {
				t.Error("CreateDataset() returned nil dataset on success")
			}
			if !tt.wantErr && got != nil {
				if got.Name != tt.inputName {
					t.Errorf("Name = %q, want %q", got.Name, tt.inputName)
				}
				if got.Status != domain.DatasetStatusDraft {
					t.Errorf("Status = %q, want %q", got.Status, domain.DatasetStatusDraft)
				}
			}
		})
	}
}

func TestDatasetService_GetDataset(t *testing.T) {
	t.Parallel()

	testID := uuid.New()
	testDataset := &domain.Dataset{
		ID:   testID,
		Name: "Test",
	}

	tests := []struct {
		name    string
		id      uuid.UUID
		mockGet func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
		wantErr bool
	}{
		{
			name: "found",
			id:   testID,
			mockGet: func(_ context.Context, id uuid.UUID) (*domain.Dataset, error) {
				if id == testID {
					return testDataset, nil
				}
				return nil, nil
			},
		},
		{
			name: "not found",
			id:   uuid.New(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return nil, nil
			},
			wantErr: true,
		},
		{
			name: "repository error",
			id:   testID,
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return nil, errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{getDatasetFunc: tt.mockGet}
			svc := NewDatasetService(repo, nil)

			got, err := svc.GetDataset(context.Background(), tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetDataset() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got.ID != tt.id {
				t.Errorf("ID = %v, want %v", got.ID, tt.id)
			}
		})
	}
}

func TestDatasetService_ListDatasets(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		createdBy string
		mockList  func(ctx context.Context, createdBy string) ([]domain.Dataset, error)
		wantCount int
		wantErr   bool
	}{
		{
			name:      "returns datasets",
			createdBy: "user-1",
			mockList: func(_ context.Context, _ string) ([]domain.Dataset, error) {
				return []domain.Dataset{{Name: "A"}, {Name: "B"}}, nil
			},
			wantCount: 2,
		},
		{
			name:      "empty list",
			createdBy: "user-2",
			mockList: func(_ context.Context, _ string) ([]domain.Dataset, error) {
				return []domain.Dataset{}, nil
			},
			wantCount: 0,
		},
		{
			name:      "repository error",
			createdBy: "user-1",
			mockList: func(_ context.Context, _ string) ([]domain.Dataset, error) {
				return nil, errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{listDatasetsFunc: tt.mockList}
			svc := NewDatasetService(repo, nil)

			got, err := svc.ListDatasets(context.Background(), tt.createdBy)
			if (err != nil) != tt.wantErr {
				t.Errorf("ListDatasets() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && len(got) != tt.wantCount {
				t.Errorf("len = %d, want %d", len(got), tt.wantCount)
			}
		})
	}
}

func TestDatasetService_DeleteDataset(t *testing.T) {
	t.Parallel()

	testID := uuid.New()

	tests := []struct {
		name       string
		id         uuid.UUID
		mockGet    func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
		mockDelete func(ctx context.Context, id uuid.UUID) error
		wantErr    bool
	}{
		{
			name: "success",
			id:   testID,
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID}, nil
			},
			mockDelete: func(_ context.Context, _ uuid.UUID) error {
				return nil
			},
		},
		{
			name: "not found",
			id:   uuid.New(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return nil, nil
			},
			wantErr: true,
		},
		{
			name: "repository delete error",
			id:   testID,
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID}, nil
			},
			mockDelete: func(_ context.Context, _ uuid.UUID) error {
				return errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{
				getDatasetFunc:    tt.mockGet,
				deleteDatasetFunc: tt.mockDelete,
			}
			svc := NewDatasetService(repo, nil)

			err := svc.DeleteDataset(context.Background(), tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("DeleteDataset() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestDatasetService_ImportCSV(t *testing.T) {
	t.Parallel()

	testID := uuid.New()
	validCSV := []byte("internal_code,age,sex\nP001,45,male\nP002,55,female\n")

	tests := []struct {
		name    string
		id      uuid.UUID
		csvData []byte
		setup   func() *mockDatasetRepository
		wantErr bool
	}{
		{
			name:    "valid CSV - pipeline runs and records stored",
			id:      testID,
			csvData: validCSV,
			setup: func() *mockDatasetRepository {
				return &mockDatasetRepository{
					getDatasetFunc: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
						return &domain.Dataset{ID: testID, Status: domain.DatasetStatusDraft}, nil
					},
					updateDatasetFunc: func(_ context.Context, _ *domain.Dataset) error {
						return nil
					},
					bulkCreateRecordsFunc: func(_ context.Context, records []domain.DatasetRecord) error {
						if len(records) == 0 {
							return errors.New("expected records")
						}
						return nil
					},
					bulkCreateImportLogFunc: func(_ context.Context, _ []domain.ImportLogEntry) error {
						return nil
					},
				}
			},
		},
		{
			name:    "dataset not found",
			id:      uuid.New(),
			csvData: validCSV,
			setup: func() *mockDatasetRepository {
				return &mockDatasetRepository{
					getDatasetFunc: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
						return nil, nil
					},
				}
			},
			wantErr: true,
		},
		{
			name:    "empty CSV data",
			id:      testID,
			csvData: []byte{},
			setup: func() *mockDatasetRepository {
				return &mockDatasetRepository{
					getDatasetFunc: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
						return &domain.Dataset{ID: testID, Status: domain.DatasetStatusDraft}, nil
					},
					updateDatasetFunc: func(_ context.Context, _ *domain.Dataset) error {
						return nil
					},
				}
			},
			wantErr: true,
		},
		{
			name:    "bulk create fails",
			id:      testID,
			csvData: validCSV,
			setup: func() *mockDatasetRepository {
				return &mockDatasetRepository{
					getDatasetFunc: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
						return &domain.Dataset{ID: testID, Status: domain.DatasetStatusDraft}, nil
					},
					updateDatasetFunc: func(_ context.Context, _ *domain.Dataset) error {
						return nil
					},
					bulkCreateRecordsFunc: func(_ context.Context, _ []domain.DatasetRecord) error {
						return errors.New("db error")
					},
					bulkCreateImportLogFunc: func(_ context.Context, _ []domain.ImportLogEntry) error {
						return nil
					},
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := tt.setup()
			svc := NewDatasetService(repo, nil)

			result, err := svc.ImportCSV(context.Background(), tt.id, tt.csvData, "test.csv")
			if (err != nil) != tt.wantErr {
				t.Errorf("ImportCSV() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && result == nil {
				t.Error("ImportCSV() returned nil result on success")
			}
		})
	}
}

func TestDatasetService_ExportCSV(t *testing.T) {
	t.Parallel()

	testID := uuid.New()
	age := 45

	tests := []struct {
		name     string
		id       uuid.UUID
		mockGet  func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
		mockRecs func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
		wantErr  bool
		wantRows int // expected rows including header
	}{
		{
			name: "generates valid CSV with records",
			id:   testID,
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID}, nil
			},
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{
					{InternalCode: "P001", Age: &age, Sex: "male"},
					{InternalCode: "P002", Sex: "female"},
				}, 2, nil
			},
			wantRows: 3, // header + 2 records
		},
		{
			name: "empty dataset returns CSV with headers only",
			id:   testID,
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID}, nil
			},
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{}, 0, nil
			},
			wantRows: 1, // header only
		},
		{
			name: "dataset not found",
			id:   uuid.New(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return nil, nil
			},
			wantErr: true,
		},
		{
			name: "repository error on records",
			id:   testID,
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID}, nil
			},
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return nil, 0, errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{
				getDatasetFunc: tt.mockGet,
				getRecordsFunc: tt.mockRecs,
			}
			svc := NewDatasetService(repo, nil)

			data, err := svc.ExportCSV(context.Background(), tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("ExportCSV() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				return
			}

			// Parse and count rows
			lines := 0
			for _, b := range data {
				if b == '\n' {
					lines++
				}
			}
			if lines != tt.wantRows {
				t.Errorf("CSV rows = %d, want %d", lines, tt.wantRows)
			}
		})
	}
}

func TestDatasetService_GetDemographicStats(t *testing.T) {
	t.Parallel()

	testID := uuid.New()
	age1, age2 := 30, 60
	bmi1, bmi2 := 22.5, 28.0

	tests := []struct {
		name     string
		mockRecs func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
		wantErr  bool
	}{
		{
			name: "computes stats from records",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{
					{Age: &age1, Sex: "male", BMI: &bmi1, BMICategory: "normal", AgeGroup: "young_adult"},
					{Age: &age2, Sex: "female", BMI: &bmi2, BMICategory: "overweight", AgeGroup: "middle_aged"},
				}, 2, nil
			},
		},
		{
			name: "empty dataset",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{}, 0, nil
			},
		},
		{
			name: "repository error",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return nil, 0, errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{getRecordsFunc: tt.mockRecs}
			svc := NewDatasetService(repo, nil)

			stats, err := svc.GetDemographicStats(context.Background(), testID, nil)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetDemographicStats() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && stats == nil {
				t.Error("GetDemographicStats() returned nil stats")
			}
		})
	}
}

func TestDatasetService_GetFractureStats(t *testing.T) {
	t.Parallel()

	testID := uuid.New()

	tests := []struct {
		name     string
		mockRecs func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
		wantErr  bool
	}{
		{
			name: "computes fracture stats",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{
					{Laterality: "left", InjuryMechanism: "fall", TraumaEnergy: "low", OpenClosed: "closed"},
					{Laterality: "right", InjuryMechanism: "fall", TraumaEnergy: "high", OpenClosed: "open"},
				}, 2, nil
			},
		},
		{
			name: "repository error",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return nil, 0, errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{getRecordsFunc: tt.mockRecs}
			svc := NewDatasetService(repo, nil)

			stats, err := svc.GetFractureStats(context.Background(), testID, nil)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetFractureStats() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && stats == nil {
				t.Error("GetFractureStats() returned nil stats")
			}
		})
	}
}

func TestDatasetService_GetSurgicalStats(t *testing.T) {
	t.Parallel()

	testID := uuid.New()
	days := 3

	tests := []struct {
		name     string
		mockRecs func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
		wantErr  bool
	}{
		{
			name: "computes surgical stats",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{
					{
						EmergencyTreatment: "splint",
						DaysToSurgery:      &days,
						SyndesmosisRepair:  true,
						PreopCT:            true,
						Approaches:         pq.StringArray{"lateral", "medial"},
					},
				}, 1, nil
			},
		},
		{
			name: "repository error",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return nil, 0, errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{getRecordsFunc: tt.mockRecs}
			svc := NewDatasetService(repo, nil)

			stats, err := svc.GetSurgicalStats(context.Background(), testID, nil)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetSurgicalStats() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if stats == nil {
					t.Fatal("GetSurgicalStats() returned nil stats")
				}
				if stats.SyndesmosisRepairCount != 1 {
					t.Errorf("SyndesmosisRepairCount = %d, want 1", stats.SyndesmosisRepairCount)
				}
				if stats.PreopCTCount != 1 {
					t.Errorf("PreopCTCount = %d, want 1", stats.PreopCTCount)
				}
			}
		})
	}
}

func TestDatasetService_GetOutcomeStats(t *testing.T) {
	t.Parallel()

	testID := uuid.New()

	tests := []struct {
		name     string
		mockRecs func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
		wantErr  bool
	}{
		{
			name: "computes outcome stats",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{
					{SecondaryDisplacement: true, PostopComplications: pq.StringArray{"infection"}},
					{SecondaryDisplacement: false, PostopComplications: pq.StringArray{"infection", "hardware_failure"}},
				}, 2, nil
			},
		},
		{
			name: "repository error",
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return nil, 0, errors.New("db error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockDatasetRepository{getRecordsFunc: tt.mockRecs}
			svc := NewDatasetService(repo, nil)

			stats, err := svc.GetOutcomeStats(context.Background(), testID, nil)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetOutcomeStats() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if stats == nil {
					t.Fatal("GetOutcomeStats() returned nil stats")
				}
				if stats.SecondaryDisplacementCount != 1 {
					t.Errorf("SecondaryDisplacementCount = %d, want 1", stats.SecondaryDisplacementCount)
				}
				if stats.ComplicationDistribution["infection"] != 2 {
					t.Errorf("infection count = %d, want 2", stats.ComplicationDistribution["infection"])
				}
			}
		})
	}
}

func TestComputeNumericStats(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		values     []float64
		wantNil    bool
		wantMean   float64
		wantMedian float64
		wantMin    float64
		wantMax    float64
	}{
		{
			name:    "empty values",
			values:  nil,
			wantNil: true,
		},
		{
			name:       "single value",
			values:     []float64{42.0},
			wantMean:   42.0,
			wantMedian: 42.0,
			wantMin:    42.0,
			wantMax:    42.0,
		},
		{
			name:       "even count",
			values:     []float64{10, 20, 30, 40},
			wantMean:   25.0,
			wantMedian: 25.0,
			wantMin:    10.0,
			wantMax:    40.0,
		},
		{
			name:       "odd count",
			values:     []float64{10, 20, 30},
			wantMean:   20.0,
			wantMedian: 20.0,
			wantMin:    10.0,
			wantMax:    30.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := computeNumericStats(tt.values)
			if tt.wantNil {
				if got != nil {
					t.Errorf("expected nil, got %+v", got)
				}
				return
			}
			if got == nil {
				t.Fatal("expected non-nil stats")
			}
			if got.Mean != tt.wantMean {
				t.Errorf("Mean = %v, want %v", got.Mean, tt.wantMean)
			}
			if got.Median != tt.wantMedian {
				t.Errorf("Median = %v, want %v", got.Median, tt.wantMedian)
			}
			if got.Min != tt.wantMin {
				t.Errorf("Min = %v, want %v", got.Min, tt.wantMin)
			}
			if got.Max != tt.wantMax {
				t.Errorf("Max = %v, want %v", got.Max, tt.wantMax)
			}
		})
	}
}

