package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/datatypes"
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
func (m *mockCaseResponseRepository) Close() error { return nil }

// --- Test helper functions ---

func boolPtr(b bool) *bool {
	return &b
}

func createResponseWithPath(caseID uuid.UUID, decisionPath string, answers []domain.QuestionAnswer, backClicks int) domain.CaseResponse {
	answersJSON, _ := json.Marshal(answers)
	return domain.CaseResponse{
		ID:           uuid.New(),
		CaseID:       caseID,
		UserID:       uuid.New(),
		DecisionPath: decisionPath,
		AnswerPath:   datatypes.JSON(answersJSON),
		BackClicks:   backClicks,
	}
}

// mockStudyRepository is a minimal mock for StudyRepository.
type mockStudyRepository struct {
	study        *domain.Study
	studyErr     error
	cases        []domain.Case
	casesErr     error
	hasAccess    bool
	hasAccessErr error
	addCaseErr   error
	removeCaseErr error
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
func (m *mockStudyRepository) AddRater(_ context.Context, _, _ uuid.UUID, _ string) error {
	return nil
}
func (m *mockStudyRepository) RemoveRater(_ context.Context, _, _ uuid.UUID) error { return nil }
func (m *mockStudyRepository) GetRaters(_ context.Context, _ uuid.UUID) ([]domain.StudyRater, error) {
	return nil, nil
}
func (m *mockStudyRepository) HasAccess(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return m.hasAccess, m.hasAccessErr
}
func (m *mockStudyRepository) GetRaterProgress(_ context.Context, _ uuid.UUID) ([]domain.RaterProgress, error) {
	return nil, nil
}
func (m *mockStudyRepository) UpdateRaterProgress(_ context.Context, _, _ uuid.UUID, _ int) error {
	return nil
}
func (m *mockStudyRepository) Activate(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockStudyRepository) Close(_ context.Context, _ uuid.UUID) error    { return nil }
func (m *mockStudyRepository) UpdateCounters(_ context.Context, _ uuid.UUID) error {
	return m.updateCountersErr
}

// mockStudyResponseRepository is a minimal mock for StudyResponseRepository.
type mockStudyResponseRepository struct {
	responsesByCase   map[uuid.UUID][]domain.CaseResponse
	casesCompleted    int
	err               error
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
func (m *mockCaseRepositoryForStudy) ListForUser(_ context.Context, _ uuid.UUID, _, _ int) ([]domain.Case, int64, error) {
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
func (m *mockCaseRepositoryForStudy) HasAccess(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (m *mockCaseRepositoryForStudy) AddUser(_ context.Context, _, _ uuid.UUID, _ string) error {
	return nil
}
func (m *mockCaseRepositoryForStudy) RemoveUser(_ context.Context, _, _ uuid.UUID) error {
	return nil
}
func (m *mockCaseRepositoryForStudy) GetUsers(_ context.Context, _ uuid.UUID) ([]domain.CaseUser, error) {
	return nil, nil
}
func (m *mockCaseRepositoryForStudy) GetImagesForCases(_ context.Context, _ []uuid.UUID) (map[uuid.UUID][]domain.CaseImage, error) {
	return make(map[uuid.UUID][]domain.CaseImage), nil
}

// mockReliabilityCalculator is a mock for ReliabilityCalculator.
type mockReliabilityCalculator struct {
	metrics *domain.StudyReliabilityMetrics
	err     error
}

func (m *mockReliabilityCalculator) CalculateStudyReliabilityMetrics(_ *domain.Study, _ []domain.Case, _ map[uuid.UUID][]domain.CaseResponse) (*domain.StudyReliabilityMetrics, error) {
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
	return NewStudyService(studyRepo, studyRespRepo, caseRepo, responseRepo, calc, noOpStatsCache{})
}

// --- Tests for ValidateResponseSubmission ---

func TestValidateResponseSubmission(t *testing.T) {
	studyID := uuid.New()

	tests := []struct {
		name          string
		cs            *domain.Case
		caseErr       error
		hasAccess     bool
		hasAccessErr  error
		expectedError error
	}{
		{
			name: "case not in study — no validation needed",
			cs: &domain.Case{
				ID:      uuid.New(),
				StudyID: nil, // Not in a study
			},
			hasAccess:     false, // Doesn't matter
			expectedError: nil,
		},
		{
			name: "case in study — user has access",
			cs: &domain.Case{
				ID:      uuid.New(),
				StudyID: &studyID,
			},
			hasAccess:     true,
			expectedError: nil,
		},
		{
			name: "case in study — user does NOT have access",
			cs: &domain.Case{
				ID:      uuid.New(),
				StudyID: &studyID,
			},
			hasAccess:     false,
			expectedError: domain.ErrNotStudyMember,
		},
		{
			name:          "case not found — treated as no validation needed",
			cs:            nil,
			expectedError: nil,
		},
		{
			name:          "case repo error",
			cs:            nil,
			caseErr:       errors.New("db error"),
			expectedError: errors.New("db error"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			studyRepo := &mockStudyRepository{hasAccess: tt.hasAccess, hasAccessErr: tt.hasAccessErr}
			caseRepo := &mockCaseRepositoryForStudy{cs: tt.cs, err: tt.caseErr}
			svc := newStudyService(studyRepo, &mockStudyResponseRepository{}, caseRepo, &mockCaseResponseRepository{}, &mockReliabilityCalculator{})

			err := svc.ValidateResponseSubmission(context.Background(), uuid.New(), uuid.New())

			if tt.expectedError == nil {
				if err != nil {
					t.Errorf("expected nil error, got %v", err)
				}
			} else {
				if err == nil {
					t.Errorf("expected error %v, got nil", tt.expectedError)
					return
				}
				if tt.expectedError == domain.ErrNotStudyMember {
					if !errors.Is(err, domain.ErrNotStudyMember) {
						t.Errorf("expected ErrNotStudyMember, got %v", err)
					}
				} else if err.Error() != tt.expectedError.Error() {
					t.Errorf("expected error %q, got %q", tt.expectedError, err)
				}
			}
		})
	}
}

// --- Tests for IsCaseInStudy ---

func TestIsCaseInStudy(t *testing.T) {
	studyID := uuid.New()
	study := &domain.Study{ID: studyID}

	tests := []struct {
		name           string
		study          *domain.Study
		studyErr       error
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

	svc := NewStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, calc, cache)
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

	svc := NewStudyService(studyRepo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, calc, cache)
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

// --- Tests for GetDivergenceAnalysis (ported from divergence_test.go) ---

func TestGetDivergenceAnalysis(t *testing.T) {
	caseID := uuid.New()

	// Create a reference input
	referenceInput := &domain.FractureInput{
		InvolvedMalleoli:  domain.InvolvedLateralOnly,
		FibularLevel:      domain.FibularLevelTransindesmal,
		LateralMorphology: domain.LateralMorphologySpiral,
	}
	referenceInputJSON, _ := json.Marshal(referenceInput)

	tests := []struct {
		name          string
		cs            *domain.Case
		responses     []domain.CaseResponse
		expectedError string
		validate      func(*testing.T, *DivergenceReport)
	}{
		{
			name:          "case not found",
			cs:            nil,
			responses:     nil,
			expectedError: "case not found",
		},
		{
			name: "case without reference input",
			cs: &domain.Case{
				ID:    caseID,
				Title: "Test Case",
			},
			responses:     nil,
			expectedError: "case has no gold standard input stored",
		},
		{
			name: "no responses with answer path",
			cs: &domain.Case{
				ID:             caseID,
				Title:          "Test Case",
				ReferenceInput: datatypes.JSON(referenceInputJSON),
			},
			responses: []domain.CaseResponse{
				{
					ID:           uuid.New(),
					CaseID:       caseID,
					DecisionPath: "", // No answer path
				},
			},
			validate: func(t *testing.T, report *DivergenceReport) {
				if report.TotalResponses != 1 {
					t.Errorf("expected 1 total response, got %d", report.TotalResponses)
				}
				if report.ResponsesWithPath != 0 {
					t.Errorf("expected 0 responses with path, got %d", report.ResponsesWithPath)
				}
			},
		},
		{
			name: "responses with correct path",
			cs: &domain.Case{
				ID:             caseID,
				Title:          "Test Case",
				ReferenceInput: datatypes.JSON(referenceInputJSON),
			},
			responses: []domain.CaseResponse{
				createResponseWithPath(caseID, "lateral_only→transindesmal→spiral", []domain.QuestionAnswer{
					{Question: "involved_malleoli", Answer: "lateral_only", Timestamp: 1000},
					{Question: "fibular_level", Answer: "transindesmal", Timestamp: 2000},
					{Question: "lateral_morphology", Answer: "spiral", Timestamp: 3000},
				}, 0),
			},
			validate: func(t *testing.T, report *DivergenceReport) {
				if report.TotalResponses != 1 {
					t.Errorf("expected 1 total response, got %d", report.TotalResponses)
				}
				if report.ResponsesWithPath != 1 {
					t.Errorf("expected 1 response with path, got %d", report.ResponsesWithPath)
				}
				if report.CorrectPath != "lateral_only→transindesmal→spiral" {
					t.Errorf("unexpected correct path: %s", report.CorrectPath)
				}
			},
		},
		{
			name: "responses with errors",
			cs: &domain.Case{
				ID:             caseID,
				Title:          "Test Case",
				ReferenceInput: datatypes.JSON(referenceInputJSON),
			},
			responses: []domain.CaseResponse{
				createResponseWithPath(caseID, "lateral_only→transindesmal→spiral", []domain.QuestionAnswer{
					{Question: "involved_malleoli", Answer: "lateral_only", Timestamp: 1000},
					{Question: "fibular_level", Answer: "transindesmal", Timestamp: 2000},
					{Question: "lateral_morphology", Answer: "spiral", Timestamp: 3000},
				}, 0),
				createResponseWithPath(caseID, "lateral_only→transindesmal→oblique", []domain.QuestionAnswer{
					{Question: "involved_malleoli", Answer: "lateral_only", Timestamp: 1000},
					{Question: "fibular_level", Answer: "transindesmal", Timestamp: 2000},
					{Question: "lateral_morphology", Answer: "oblique", Timestamp: 3000},
				}, 2),
			},
			validate: func(t *testing.T, report *DivergenceReport) {
				if report.TotalResponses != 2 {
					t.Errorf("expected 2 total responses, got %d", report.TotalResponses)
				}
				if report.ResponsesWithPath != 2 {
					t.Errorf("expected 2 responses with path, got %d", report.ResponsesWithPath)
				}
				if report.PathDistribution["lateral_only→transindesmal→spiral"] != 1 {
					t.Errorf("expected 1 correct path, got %d", report.PathDistribution["lateral_only→transindesmal→spiral"])
				}
				if report.PathDistribution["lateral_only→transindesmal→oblique"] != 1 {
					t.Errorf("expected 1 incorrect path, got %d", report.PathDistribution["lateral_only→transindesmal→oblique"])
				}
				for _, stat := range report.QuestionStats {
					if stat.Question == "lateral_morphology" {
						if stat.ErrorRate != 0.5 {
							t.Errorf("expected 50%% error rate for lateral_morphology, got %.2f", stat.ErrorRate)
						}
						if stat.WrongAnswerDist["oblique"] != 1 {
							t.Errorf("expected 1 wrong answer of 'oblique', got %d", stat.WrongAnswerDist["oblique"])
						}
					}
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			caseRepo := &mockCaseRepositoryForStudy{cs: tt.cs}
			responseRepo := &mockCaseResponseRepository{responses: tt.responses}
			studyRepo := &mockStudyRepository{}
			svc := newStudyService(studyRepo, &mockStudyResponseRepository{}, caseRepo, responseRepo, &mockReliabilityCalculator{})

			report, err := svc.GetDivergenceAnalysis(context.Background(), caseID)

			if tt.expectedError != "" {
				if err == nil {
					t.Errorf("expected error %q, got nil", tt.expectedError)
					return
				}
				if err.Error() != tt.expectedError {
					t.Errorf("expected error %q, got %q", tt.expectedError, err.Error())
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if tt.validate != nil {
				tt.validate(t, report)
			}
		})
	}
}

// --- Tests for helper functions (ported from divergence_test.go) ---

func TestBuildAnswerPathFromInputStudy(t *testing.T) {
	tests := []struct {
		name     string
		input    *domain.FractureInput
		expected map[string]string
	}{
		{
			name: "lateral only with transindesmal spiral",
			input: &domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralOnly,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
			},
			expected: map[string]string{
				"involved_malleoli":  "lateral_only",
				"fibular_level":      "transindesmal",
				"lateral_morphology": "spiral",
			},
		},
		{
			name: "medial only with vertical morphology",
			input: &domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialOnly,
				MedialMorphology: domain.MedialMorphologyVertical,
			},
			expected: map[string]string{
				"involved_malleoli": "medial_only",
				"medial_morphology": "vertical",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := buildAnswerPathFromInput(tt.input)
			if len(result) != len(tt.expected) {
				t.Errorf("expected %d keys, got %d", len(tt.expected), len(result))
			}
			for key, expectedVal := range tt.expected {
				if result[key] != expectedVal {
					t.Errorf("key %s: expected %q, got %q", key, expectedVal, result[key])
				}
			}
		})
	}
}

func TestGetQuestionDisplayNameStudy(t *testing.T) {
	tests := []struct {
		key      string
		expected string
	}{
		{"involved_malleoli", "Involved Malleoli"},
		{"fibular_level", "Fibular Level"},
		{"unknown_key", "unknown_key"},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			result := GetQuestionDisplayName(tt.key)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}
