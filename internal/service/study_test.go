package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// --- Mock implementations ---

// mockCaseResponseRepository is a mock for CaseResponseRepository used in service tests.
type mockCaseResponseRepository struct {
	responses []domain.CaseResponse
	err       error
}

func (m *mockCaseResponseRepository) GetAllByCase(_ context.Context, _ uuid.UUID) ([]domain.CaseResponse, error) {
	return m.responses, m.err
}
func (m *mockCaseResponseRepository) Save(_ context.Context, _ *domain.CaseResponse) error {
	return nil
}
func (m *mockCaseResponseRepository) GetByCase(_ context.Context, _ uuid.UUID, _, _ int) ([]domain.CaseResponse, int64, error) {
	return nil, 0, nil
}
func (m *mockCaseResponseRepository) GetByUserAndCase(_ context.Context, _, _ uuid.UUID) ([]domain.CaseResponse, error) {
	return nil, nil
}
func (m *mockCaseResponseRepository) GetByUserAndCases(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	return make(map[uuid.UUID][]domain.CaseResponse), nil
}
func (m *mockCaseResponseRepository) CountByCase(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockCaseResponseRepository) HasUserResponded(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (m *mockCaseResponseRepository) CountUniqueUsersByCase(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockCaseResponseRepository) GetResponsesWithUserExpertise(_ context.Context, _ uuid.UUID) ([]domain.ResponseWithExpertise, error) {
	return nil, nil
}
func (m *mockCaseResponseRepository) CountRespondedPublishedCases(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

// mockStudyRepository is a minimal mock for StudyRepository.
type mockStudyRepository struct {
	study             *domain.Study
	studyErr          error
	cases             []domain.Case
	casesErr          error
	addCaseErr        error
	removeCaseErr     error
	updateCountersErr error
}

func (m *mockStudyRepository) Create(_ context.Context, _ *domain.Study) error { return nil }
func (m *mockStudyRepository) GetByID(_ context.Context, _ uuid.UUID) (*domain.Study, error) {
	return m.study, m.studyErr
}
func (m *mockStudyRepository) Update(_ context.Context, _ *domain.Study) error { return nil }
func (m *mockStudyRepository) Delete(_ context.Context, _ uuid.UUID) error     { return nil }
func (m *mockStudyRepository) List(_ context.Context, _ *domain.StudyStatus, _, _ int) ([]domain.Study, int64, error) {
	return nil, 0, nil
}
func (m *mockStudyRepository) AddCase(_ context.Context, _, _ uuid.UUID, _ int) error {
	return m.addCaseErr
}
func (m *mockStudyRepository) RemoveCase(_ context.Context, _, _ uuid.UUID) error {
	return m.removeCaseErr
}
func (m *mockStudyRepository) GetCases(_ context.Context, _ uuid.UUID) ([]domain.Case, error) {
	return m.cases, m.casesErr
}
func (m *mockStudyRepository) ReorderCases(_ context.Context, _ uuid.UUID, _ []uuid.UUID) error {
	return nil
}
func (m *mockStudyRepository) GetStudyByCaseID(_ context.Context, _ uuid.UUID) (*domain.Study, error) {
	return m.study, m.studyErr
}
func (m *mockStudyRepository) GetNextCaseOrder(_ context.Context, _ uuid.UUID) (int, error) {
	return 0, nil
}
func (m *mockStudyRepository) Activate(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockStudyRepository) Close(_ context.Context, _ uuid.UUID) error    { return nil }
func (m *mockStudyRepository) UpdateCounters(_ context.Context, _ uuid.UUID) error {
	return m.updateCountersErr
}
func (m *mockStudyRepository) AddCases(_ context.Context, _ uuid.UUID, _ []repository.CaseAssignment) error {
	return m.addCaseErr
}

// mockStudyResponseRepository is a minimal mock for StudyResponseRepository.
type mockStudyResponseRepository struct {
	responsesByCase map[uuid.UUID][]domain.CaseResponse
	casesCompleted  int
	err             error
}

func (m *mockStudyResponseRepository) GetAllByStudy(_ context.Context, _ uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	if m.err != nil {
		return nil, m.err
	}
	if m.responsesByCase != nil {
		return m.responsesByCase, nil
	}
	return make(map[uuid.UUID][]domain.CaseResponse), nil
}
func (m *mockStudyResponseRepository) GetCompleteRaterResponses(_ context.Context, _ uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	return make(map[uuid.UUID][]domain.CaseResponse), nil
}
func (m *mockStudyResponseRepository) CountUniqueRaters(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockStudyResponseRepository) CountCompleteRaters(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockStudyResponseRepository) GetRaterCaseCompletion(_ context.Context, _ uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	return make(map[uuid.UUID][]uuid.UUID), nil
}
func (m *mockStudyResponseRepository) CountUserCasesCompleted(_ context.Context, _, _ uuid.UUID) (int, error) {
	return m.casesCompleted, m.err
}

// mockCaseRepositoryForStudy is a mock for CaseRepository used in study service tests.
// We use a different name to avoid collision with the mock in divergence_test.go.
type mockCaseRepositoryForStudy struct {
	cs  *domain.Case
	err error
}

func (m *mockCaseRepositoryForStudy) GetByID(_ context.Context, _ uuid.UUID) (*domain.Case, error) {
	return m.cs, m.err
}
func (m *mockCaseRepositoryForStudy) Create(_ context.Context, _ *domain.Case) error { return nil }
func (m *mockCaseRepositoryForStudy) Update(_ context.Context, _ *domain.Case) error { return nil }
func (m *mockCaseRepositoryForStudy) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (m *mockCaseRepositoryForStudy) List(_ context.Context, _ *domain.CaseStatus, _, _ int) ([]domain.Case, int64, error) {
	return nil, 0, nil
}
func (m *mockCaseRepositoryForStudy) ListPublished(_ context.Context, _, _ int) ([]domain.Case, int64, error) {
	return nil, 0, nil
}
func (m *mockCaseRepositoryForStudy) GetByIDs(_ context.Context, _ []uuid.UUID) ([]domain.Case, error) {
	return nil, nil
}
func (m *mockCaseRepositoryForStudy) Publish(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockCaseRepositoryForStudy) Close(_ context.Context, _ uuid.UUID) error   { return nil }
func (m *mockCaseRepositoryForStudy) AddImage(_ context.Context, _ *domain.CaseImage) error {
	return nil
}
func (m *mockCaseRepositoryForStudy) GetImages(_ context.Context, _ uuid.UUID) ([]domain.CaseImage, error) {
	return nil, nil
}
func (m *mockCaseRepositoryForStudy) GetImageByID(_ context.Context, _ uuid.UUID) (*domain.CaseImage, error) {
	return nil, nil
}
func (m *mockCaseRepositoryForStudy) DeleteImage(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockCaseRepositoryForStudy) UpdateImage(_ context.Context, _ *domain.CaseImage) error {
	return nil
}
func (m *mockCaseRepositoryForStudy) UpdateHasTACImages(_ context.Context, _ uuid.UUID) error {
	return nil
}
func (m *mockCaseRepositoryForStudy) IncrementResponseCount(_ context.Context, _ uuid.UUID) error {
	return nil
}
func (m *mockCaseRepositoryForStudy) UpdateUniqueUsers(_ context.Context, _ uuid.UUID, _ int) error {
	return nil
}
func (m *mockCaseRepositoryForStudy) GetImagesForCases(_ context.Context, _ []uuid.UUID) (map[uuid.UUID][]domain.CaseImage, error) {
	return make(map[uuid.UUID][]domain.CaseImage), nil
}
func (m *mockCaseRepositoryForStudy) GetDashboardStats(_ context.Context) (*domain.DashboardStats, error) {
	return &domain.DashboardStats{}, nil
}
func (m *mockCaseRepositoryForStudy) GetRecentActiveCases(_ context.Context, _ int) ([]domain.DashboardRecentCase, error) {
	return nil, nil
}
func (m *mockCaseRepositoryForStudy) GetCasesNeedingAttention(_ context.Context, _ int) ([]domain.DashboardAttentionCase, error) {
	return nil, nil
}
func (m *mockCaseRepositoryForStudy) ReorderImages(_ context.Context, _ uuid.UUID, _ map[uuid.UUID]int) error {
	return nil
}

// mockReliabilityCalculator is a mock for ReliabilityCalculator.
type mockReliabilityCalculator struct {
	metrics *domain.StudyReliabilityMetrics
	err     error
}

func (m *mockReliabilityCalculator) CalculateStudyReliabilityMetrics(_ *domain.Study, _ []domain.Case, _ map[uuid.UUID][]domain.CaseResponse) (*domain.StudyReliabilityMetrics, error) {
	return m.metrics, m.err
}

// mockGoldStandardCalculator is a mock for GoldStandardCalculator.
type mockGoldStandardCalculator struct {
	metrics *domain.StudyGoldStandardMetrics
	err     error
}

func (m *mockGoldStandardCalculator) CalculateStudyGoldStandardMetrics(_ *domain.Study, _ []domain.Case, _ map[uuid.UUID][]domain.CaseResponse) (*domain.StudyGoldStandardMetrics, error) {
	return m.metrics, m.err
}

// --- Test helpers ---

func newStudyService(
	studyRepo *mockStudyRepository,
	studyRespRepo *mockStudyResponseRepository,
	caseRepo *mockCaseRepositoryForStudy,
	responseRepo *mockCaseResponseRepository,
	calc *mockReliabilityCalculator,
) StudyService {
	return NewStudyService(studyRepo, studyRespRepo, caseRepo, responseRepo, calc, &mockGoldStandardCalculator{}, NewTTLStatsCache(time.Hour))
}

// --- Tests for IsCaseInStudy ---

func TestIsCaseInStudy(t *testing.T) {
	studyID := uuid.New()
	study := &domain.Study{ID: studyID}

	tests := []struct {
		name            string
		study           *domain.Study
		studyErr        error
		expectedInStudy bool
		expectedStudyID *uuid.UUID
	}{
		{
			name:            "case in study",
			study:           study,
			expectedInStudy: true,
			expectedStudyID: &studyID,
		},
		{
			name:            "case not in study",
			study:           nil,
			expectedInStudy: false,
			expectedStudyID: nil,
		},
		{
			name:            "repo error",
			study:           nil,
			studyErr:        errors.New("db error"),
			expectedInStudy: false,
			expectedStudyID: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			studyRepo := &mockStudyRepository{study: tt.study, studyErr: tt.studyErr}
			svc := newStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, &mockReliabilityCalculator{})

			inStudy, sid, err := svc.IsCaseInStudy(context.Background(), uuid.New())

			if tt.studyErr != nil {
				if err == nil {
					t.Errorf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if inStudy != tt.expectedInStudy {
				t.Errorf("expected inStudy=%v, got %v", tt.expectedInStudy, inStudy)
			}
			if tt.expectedStudyID == nil && sid != nil {
				t.Errorf("expected nil studyID, got %v", sid)
			}
			if tt.expectedStudyID != nil {
				if sid == nil {
					t.Errorf("expected studyID %v, got nil", *tt.expectedStudyID)
				} else if *sid != *tt.expectedStudyID {
					t.Errorf("expected studyID %v, got %v", *tt.expectedStudyID, *sid)
				}
			}
		})
	}
}

// --- Tests for AddCase ---

func TestAddCase(t *testing.T) {
	t.Run("success — counters updated", func(t *testing.T) {
		studyRepo := &mockStudyRepository{}
		svc := newStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, &mockReliabilityCalculator{})
		if err := svc.AddCase(context.Background(), uuid.New(), uuid.New(), 0); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("add case fails — error returned", func(t *testing.T) {
		studyRepo := &mockStudyRepository{addCaseErr: errors.New("constraint violation")}
		svc := newStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, &mockReliabilityCalculator{})
		err := svc.AddCase(context.Background(), uuid.New(), uuid.New(), 0)
		if err == nil {
			t.Error("expected error, got nil")
		}
	})

	t.Run("counter update fails — no error propagated", func(t *testing.T) {
		// Counter failure is non-fatal; AddCase itself succeeded
		studyRepo := &mockStudyRepository{updateCountersErr: errors.New("counter error")}
		svc := newStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, &mockReliabilityCalculator{})
		// Should not return an error even though UpdateCounters fails
		if err := svc.AddCase(context.Background(), uuid.New(), uuid.New(), 0); err != nil {
			t.Errorf("expected nil error despite counter failure, got %v", err)
		}
	})
}

// --- Tests for GetReliabilityMetrics ---

func TestGetReliabilityMetrics(t *testing.T) {
	studyID := uuid.New()
	study := &domain.Study{ID: studyID, Title: "Test Study"}
	cases := []domain.Case{{ID: uuid.New()}}
	expected := &domain.StudyReliabilityMetrics{}

	t.Run("success", func(t *testing.T) {
		studyRepo := &mockStudyRepository{study: study, cases: cases}
		calc := &mockReliabilityCalculator{metrics: expected}
		svc := newStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, calc)
		metrics, err := svc.GetReliabilityMetrics(context.Background(), studyID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if metrics != expected {
			t.Errorf("expected specific metrics, got different result")
		}
	})

	t.Run("study not found", func(t *testing.T) {
		studyRepo := &mockStudyRepository{study: nil}
		svc := newStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, &mockReliabilityCalculator{})
		_, err := svc.GetReliabilityMetrics(context.Background(), studyID)
		if !errors.Is(err, domain.ErrNotFound) {
			t.Errorf("expected ErrNotFound, got %v", err)
		}
	})
}

// TestGetReliabilityMetrics_CacheHit verifies that GetReliabilityMetrics returns cached metrics
// without hitting the database when the cache has a valid entry.
func TestGetReliabilityMetrics_CacheHit(t *testing.T) {
	studyID := uuid.New()
	cached := &domain.StudyReliabilityMetrics{}

	cache := NewTTLStatsCache(5 * time.Minute)
	cache.Set(studyID, cached)

	// Repos that always return errors — proves DB is not called when cache hits.
	studyRepo := &mockStudyRepository{studyErr: errors.New("should not be called")}
	calc := &mockReliabilityCalculator{err: errors.New("should not be called")}

	svc := NewStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, calc, &mockGoldStandardCalculator{}, cache)
	result, err := svc.GetReliabilityMetrics(context.Background(), studyID)
	if err != nil {
		t.Errorf("unexpected error on cache hit: %v", err)
	}
	if result != cached {
		t.Errorf("expected cached metrics pointer, got different value")
	}
}

// TestGetReliabilityMetrics_CacheMissPopulates verifies that a cache miss triggers a DB fetch
// and the result is stored in the cache for the next call.
func TestGetReliabilityMetrics_CacheMissPopulates(t *testing.T) {
	studyID := uuid.New()
	study := &domain.Study{ID: studyID, Title: "Test Study"}
	cases := []domain.Case{{ID: uuid.New()}}
	computed := &domain.StudyReliabilityMetrics{}

	cache := NewTTLStatsCache(5 * time.Minute)

	studyRepo := &mockStudyRepository{study: study, cases: cases}
	calc := &mockReliabilityCalculator{metrics: computed}

	svc := NewStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, calc, &mockGoldStandardCalculator{}, cache)
	result, err := svc.GetReliabilityMetrics(context.Background(), studyID)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if result != computed {
		t.Errorf("expected computed metrics, got different value")
	}

	// Verify the result was stored in cache.
	cachedResult, ok := cache.Get(studyID)
	if !ok {
		t.Error("expected cache to be populated after miss, but got miss again")
	}
	if cachedResult != computed {
		t.Errorf("expected cache to contain computed metrics pointer, got different value")
	}
}
