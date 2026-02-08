package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/lib/pq"
)

// mockDatasetRepository implements repository.DatasetRepository for handler tests.
type mockDatasetRepository struct {
	createDatasetFunc       func(ctx context.Context, d *domain.Dataset) error
	getDatasetFunc          func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
	listDatasetsFunc        func(ctx context.Context, createdBy string) ([]domain.Dataset, error)
	updateDatasetFunc       func(ctx context.Context, d *domain.Dataset) error
	deleteDatasetFunc       func(ctx context.Context, id uuid.UUID) error
	bulkCreateRecordsFunc   func(ctx context.Context, records []domain.DatasetRecord) error
	getRecordsFunc          func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
	bulkCreateImportLogFunc func(ctx context.Context, entries []domain.ImportLogEntry) error
	getImportLogFunc        func(ctx context.Context, datasetID uuid.UUID) ([]domain.ImportLogEntry, error)
	saveFilterFunc          func(ctx context.Context, filter *domain.DatasetFilter) error
	listFiltersFunc         func(ctx context.Context, datasetID uuid.UUID) ([]domain.DatasetFilter, error)
	deleteFilterFunc        func(ctx context.Context, id uuid.UUID) error
}

func (m *mockDatasetRepository) CreateDataset(ctx context.Context, d *domain.Dataset) error {
	if m.createDatasetFunc != nil {
		return m.createDatasetFunc(ctx, d)
	}
	return nil
}

func (m *mockDatasetRepository) GetDataset(ctx context.Context, id uuid.UUID) (*domain.Dataset, error) {
	if m.getDatasetFunc != nil {
		return m.getDatasetFunc(ctx, id)
	}
	return &domain.Dataset{ID: id, Name: "Test", Status: domain.DatasetStatusReady}, nil
}

func (m *mockDatasetRepository) ListDatasets(ctx context.Context, createdBy string) ([]domain.Dataset, error) {
	if m.listDatasetsFunc != nil {
		return m.listDatasetsFunc(ctx, createdBy)
	}
	return []domain.Dataset{}, nil
}

func (m *mockDatasetRepository) UpdateDataset(ctx context.Context, d *domain.Dataset) error {
	if m.updateDatasetFunc != nil {
		return m.updateDatasetFunc(ctx, d)
	}
	return nil
}

func (m *mockDatasetRepository) DeleteDataset(ctx context.Context, id uuid.UUID) error {
	if m.deleteDatasetFunc != nil {
		return m.deleteDatasetFunc(ctx, id)
	}
	return nil
}

func (m *mockDatasetRepository) BulkCreateRecords(ctx context.Context, records []domain.DatasetRecord) error {
	if m.bulkCreateRecordsFunc != nil {
		return m.bulkCreateRecordsFunc(ctx, records)
	}
	return nil
}

func (m *mockDatasetRepository) GetRecords(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error) {
	if m.getRecordsFunc != nil {
		return m.getRecordsFunc(ctx, datasetID, filters, offset, limit)
	}
	return []domain.DatasetRecord{}, 0, nil
}

func (m *mockDatasetRepository) BulkCreateImportLog(ctx context.Context, entries []domain.ImportLogEntry) error {
	if m.bulkCreateImportLogFunc != nil {
		return m.bulkCreateImportLogFunc(ctx, entries)
	}
	return nil
}

func (m *mockDatasetRepository) GetImportLog(ctx context.Context, datasetID uuid.UUID) ([]domain.ImportLogEntry, error) {
	if m.getImportLogFunc != nil {
		return m.getImportLogFunc(ctx, datasetID)
	}
	return []domain.ImportLogEntry{}, nil
}

func (m *mockDatasetRepository) SaveFilter(ctx context.Context, filter *domain.DatasetFilter) error {
	if m.saveFilterFunc != nil {
		return m.saveFilterFunc(ctx, filter)
	}
	return nil
}

func (m *mockDatasetRepository) ListFilters(ctx context.Context, datasetID uuid.UUID) ([]domain.DatasetFilter, error) {
	if m.listFiltersFunc != nil {
		return m.listFiltersFunc(ctx, datasetID)
	}
	return []domain.DatasetFilter{}, nil
}

func (m *mockDatasetRepository) DeleteFilter(ctx context.Context, id uuid.UUID) error {
	if m.deleteFilterFunc != nil {
		return m.deleteFilterFunc(ctx, id)
	}
	return nil
}

func setupDatasetTestHandler(t *testing.T) (*DatasetHandler, *gin.Engine, *mockDatasetRepository) {
	t.Helper()

	mockRepo := &mockDatasetRepository{}
	svc := service.NewDatasetService(mockRepo, nil)
	handler := NewDatasetHandler(svc)

	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Register routes matching the real route pattern
	datasets := router.Group("/api/admin/research/datasets")
	{
		datasets.POST("", handler.CreateDataset)
		datasets.GET("", handler.ListDatasets)
		datasets.GET("/:id", handler.GetDataset)
		datasets.DELETE("/:id", handler.DeleteDataset)
		datasets.POST("/:id/import", handler.ImportCSV)
		datasets.GET("/:id/records", handler.GetRecords)
		datasets.GET("/:id/stats/demographics", handler.GetDemographicStats)
		datasets.GET("/:id/stats/fractures", handler.GetFractureStats)
		datasets.GET("/:id/stats/surgical", handler.GetSurgicalStats)
		datasets.GET("/:id/stats/outcomes", handler.GetOutcomeStats)
		datasets.GET("/:id/export", handler.ExportCSV)
		datasets.GET("/:id/import-log", handler.GetImportLog)
	}

	return handler, router, mockRepo
}

func TestDatasetHandler_Create(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "valid request",
			body:       `{"name":"Test Dataset","description":"A test"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "missing name",
			body:       `{"description":"no name"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty body",
			body:       ``,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty JSON object",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, router, _ := setupDatasetTestHandler(t)

			req := httptest.NewRequest(http.MethodPost, "/api/admin/research/datasets", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestDatasetHandler_Create_RepositoryError(t *testing.T) {
	t.Parallel()

	_, router, mockRepo := setupDatasetTestHandler(t)
	mockRepo.createDatasetFunc = func(_ context.Context, _ *domain.Dataset) error {
		return errors.New("db error")
	}

	req := httptest.NewRequest(http.MethodPost, "/api/admin/research/datasets", strings.NewReader(`{"name":"Test"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

func TestDatasetHandler_List(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		mockList   func(ctx context.Context, createdBy string) ([]domain.Dataset, error)
		wantStatus int
	}{
		{
			name: "empty list",
			mockList: func(_ context.Context, _ string) ([]domain.Dataset, error) {
				return []domain.Dataset{}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "multiple datasets",
			mockList: func(_ context.Context, _ string) ([]domain.Dataset, error) {
				return []domain.Dataset{
					{ID: uuid.New(), Name: "Dataset 1"},
					{ID: uuid.New(), Name: "Dataset 2"},
				}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "repository error",
			mockList: func(_ context.Context, _ string) ([]domain.Dataset, error) {
				return nil, errors.New("db error")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, router, mockRepo := setupDatasetTestHandler(t)
			mockRepo.listDatasetsFunc = tt.mockList

			req := httptest.NewRequest(http.MethodGet, "/api/admin/research/datasets", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestDatasetHandler_Get(t *testing.T) {
	t.Parallel()

	testID := uuid.New()

	tests := []struct {
		name       string
		id         string
		mockGet    func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
		wantStatus int
	}{
		{
			name: "found",
			id:   testID.String(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID, Name: "Test"}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "not found",
			id:   uuid.New().String(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return nil, nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid ID",
			id:         "not-a-uuid",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, router, mockRepo := setupDatasetTestHandler(t)
			if tt.mockGet != nil {
				mockRepo.getDatasetFunc = tt.mockGet
			}

			req := httptest.NewRequest(http.MethodGet, "/api/admin/research/datasets/"+tt.id, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestDatasetHandler_Delete(t *testing.T) {
	t.Parallel()

	testID := uuid.New()

	tests := []struct {
		name       string
		id         string
		mockGet    func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
		mockDelete func(ctx context.Context, id uuid.UUID) error
		wantStatus int
	}{
		{
			name: "success",
			id:   testID.String(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID}, nil
			},
			mockDelete: func(_ context.Context, _ uuid.UUID) error {
				return nil
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name: "not found",
			id:   uuid.New().String(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return nil, nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid ID",
			id:         "bad-id",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, router, mockRepo := setupDatasetTestHandler(t)
			if tt.mockGet != nil {
				mockRepo.getDatasetFunc = tt.mockGet
			}
			if tt.mockDelete != nil {
				mockRepo.deleteDatasetFunc = tt.mockDelete
			}

			req := httptest.NewRequest(http.MethodDelete, "/api/admin/research/datasets/"+tt.id, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestDatasetHandler_Import(t *testing.T) {
	t.Parallel()

	testID := uuid.New()

	tests := []struct {
		name       string
		id         string
		setupRepo  func(repo *mockDatasetRepository)
		csvContent string
		wantStatus int
	}{
		{
			name: "success",
			id:   testID.String(),
			setupRepo: func(repo *mockDatasetRepository) {
				repo.getDatasetFunc = func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
					return &domain.Dataset{ID: testID, Status: domain.DatasetStatusDraft}, nil
				}
			},
			csvContent: "internal_code,age,sex\nP001,45,male\n",
			wantStatus: http.StatusOK,
		},
		{
			name: "dataset not found",
			id:   uuid.New().String(),
			setupRepo: func(repo *mockDatasetRepository) {
				repo.getDatasetFunc = func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
					return nil, nil
				}
			},
			csvContent: "internal_code,age\nP001,45\n",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid ID",
			id:         "bad",
			csvContent: "a,b\n1,2\n",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, router, mockRepo := setupDatasetTestHandler(t)
			if tt.setupRepo != nil {
				tt.setupRepo(mockRepo)
			}

			// Build multipart form
			var buf bytes.Buffer
			writer := multipart.NewWriter(&buf)
			part, err := writer.CreateFormFile("file", "test.csv")
			if err != nil {
				t.Fatal(err)
			}
			if _, err := part.Write([]byte(tt.csvContent)); err != nil {
				t.Fatal(err)
			}
			writer.Close()

			req := httptest.NewRequest(http.MethodPost, "/api/admin/research/datasets/"+tt.id+"/import", &buf)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestDatasetHandler_Import_NoFile(t *testing.T) {
	t.Parallel()

	_, router, _ := setupDatasetTestHandler(t)

	id := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/api/admin/research/datasets/"+id+"/import", nil)
	req.Header.Set("Content-Type", "multipart/form-data")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestDatasetHandler_GetRecords(t *testing.T) {
	t.Parallel()

	testID := uuid.New()
	age := 45

	tests := []struct {
		name       string
		id         string
		query      string
		mockRecs   func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
		wantStatus int
	}{
		{
			name: "returns records",
			id:   testID.String(),
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{
					{InternalCode: "P001", Age: &age},
				}, 1, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:  "with filters",
			id:    testID.String(),
			query: "?sex=male&trauma_energy=low",
			mockRecs: func(_ context.Context, _ uuid.UUID, filters map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				if filters["sex"] != "male" {
					return nil, 0, errors.New("expected sex filter")
				}
				return []domain.DatasetRecord{}, 0, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid ID",
			id:         "bad",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, router, mockRepo := setupDatasetTestHandler(t)
			if tt.mockRecs != nil {
				mockRepo.getRecordsFunc = tt.mockRecs
			}

			req := httptest.NewRequest(http.MethodGet, "/api/admin/research/datasets/"+tt.id+"/records"+tt.query, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestDatasetHandler_GetStats(t *testing.T) {
	t.Parallel()

	testID := uuid.New()
	age := 45
	days := 3

	endpoints := []struct {
		path string
		name string
	}{
		{"/stats/demographics", "demographics"},
		{"/stats/fractures", "fractures"},
		{"/stats/surgical", "surgical"},
		{"/stats/outcomes", "outcomes"},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			t.Parallel()

			_, router, mockRepo := setupDatasetTestHandler(t)
			mockRepo.getRecordsFunc = func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{
					{
						Age: &age, Sex: "male", Laterality: "left",
						InjuryMechanism: "fall", TraumaEnergy: "low", OpenClosed: "closed",
						EmergencyTreatment: "splint", DaysToSurgery: &days,
						SyndesmosisRepair: true, PreopCT: true,
						Approaches:            pq.StringArray{"lateral"},
						SecondaryDisplacement: true, PostopComplications: pq.StringArray{"infection"},
					},
				}, 1, nil
			}

			req := httptest.NewRequest(http.MethodGet, "/api/admin/research/datasets/"+testID.String()+ep.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("%s: status = %d, want %d, body: %s", ep.name, w.Code, http.StatusOK, w.Body.String())
			}
		})
	}
}

func TestDatasetHandler_GetStats_InvalidID(t *testing.T) {
	t.Parallel()

	endpoints := []string{
		"/stats/demographics",
		"/stats/fractures",
		"/stats/surgical",
		"/stats/outcomes",
	}

	for _, ep := range endpoints {
		t.Run(ep, func(t *testing.T) {
			t.Parallel()

			_, router, _ := setupDatasetTestHandler(t)

			req := httptest.NewRequest(http.MethodGet, "/api/admin/research/datasets/bad-id"+ep, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestDatasetHandler_ExportCSV(t *testing.T) {
	t.Parallel()

	testID := uuid.New()

	tests := []struct {
		name       string
		id         string
		mockGet    func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
		mockRecs   func(ctx context.Context, datasetID uuid.UUID, filters map[string]any, offset, limit int) ([]domain.DatasetRecord, int64, error)
		wantStatus int
		wantHeader string
	}{
		{
			name: "success with Content-Disposition header",
			id:   testID.String(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID}, nil
			},
			mockRecs: func(_ context.Context, _ uuid.UUID, _ map[string]any, _, _ int) ([]domain.DatasetRecord, int64, error) {
				return []domain.DatasetRecord{
					{InternalCode: "P001", Sex: "male"},
				}, 1, nil
			},
			wantStatus: http.StatusOK,
			wantHeader: "attachment; filename=dataset_export.csv",
		},
		{
			name: "not found",
			id:   uuid.New().String(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return nil, nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid ID",
			id:         "bad",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, router, mockRepo := setupDatasetTestHandler(t)
			if tt.mockGet != nil {
				mockRepo.getDatasetFunc = tt.mockGet
			}
			if tt.mockRecs != nil {
				mockRepo.getRecordsFunc = tt.mockRecs
			}

			req := httptest.NewRequest(http.MethodGet, "/api/admin/research/datasets/"+tt.id+"/export", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}

			if tt.wantHeader != "" {
				got := w.Header().Get("Content-Disposition")
				if got != tt.wantHeader {
					t.Errorf("Content-Disposition = %q, want %q", got, tt.wantHeader)
				}
			}
		})
	}
}

func TestDatasetHandler_GetImportLog(t *testing.T) {
	t.Parallel()

	testID := uuid.New()

	tests := []struct {
		name       string
		id         string
		mockGet    func(ctx context.Context, id uuid.UUID) (*domain.Dataset, error)
		mockLog    func(ctx context.Context, datasetID uuid.UUID) ([]domain.ImportLogEntry, error)
		wantStatus int
	}{
		{
			name: "returns entries",
			id:   testID.String(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return &domain.Dataset{ID: testID}, nil
			},
			mockLog: func(_ context.Context, _ uuid.UUID) ([]domain.ImportLogEntry, error) {
				return []domain.ImportLogEntry{
					{Row: 1, Column: "age", Action: "cleaned"},
				}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "dataset not found",
			id:   uuid.New().String(),
			mockGet: func(_ context.Context, _ uuid.UUID) (*domain.Dataset, error) {
				return nil, nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid ID",
			id:         "bad",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, router, mockRepo := setupDatasetTestHandler(t)
			if tt.mockGet != nil {
				mockRepo.getDatasetFunc = tt.mockGet
			}
			if tt.mockLog != nil {
				mockRepo.getImportLogFunc = tt.mockLog
			}

			req := httptest.NewRequest(http.MethodGet, "/api/admin/research/datasets/"+tt.id+"/import-log", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}

			if tt.wantStatus == http.StatusOK {
				var resp map[string]json.RawMessage
				if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}
				if _, ok := resp["entries"]; !ok {
					t.Error("response missing 'entries' field")
				}
			}
		})
	}
}

func TestParseRecordFilters(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		query      string
		wantKeys   []string
	}{
		{
			name:     "no filters",
			query:    "/test",
			wantKeys: nil,
		},
		{
			name:     "sex filter",
			query:    "/test?sex=male",
			wantKeys: []string{"sex"},
		},
		{
			name:     "multiple filters",
			query:    "/test?sex=female&trauma_energy=high&age_min=18&age_max=65",
			wantKeys: []string{"sex", "trauma_energy", "age_min", "age_max"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, tt.query, nil)

			filters := parseRecordFilters(c)

			if len(tt.wantKeys) == 0 && len(filters) != 0 {
				t.Errorf("expected empty filters, got %v", filters)
			}
			for _, key := range tt.wantKeys {
				if _, ok := filters[key]; !ok {
					t.Errorf("missing filter key %q", key)
				}
			}
		})
	}
}
