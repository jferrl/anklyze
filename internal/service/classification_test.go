package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/rules"
)

// mockCacheForClassification records Get/Set calls for classification tests.
type mockCacheForClassification struct {
	getResult *domain.ClassificationResult
	getHit    bool
	setCalled bool
}

func (m *mockCacheForClassification) Get(_ context.Context, _ domain.FractureInput) (*domain.ClassificationResult, bool) {
	return m.getResult, m.getHit
}

func (m *mockCacheForClassification) Set(_ context.Context, _ domain.FractureInput, _ *domain.ClassificationResult) {
	m.setCalled = true
}

// mockResponseRepoForClassification is a controllable mock for CaseResponseRepository.
type mockResponseRepoForClassification struct {
	savedResponse *domain.CaseResponse
	saveErr       error
}

func (m *mockResponseRepoForClassification) Save(_ context.Context, response *domain.CaseResponse) error {
	if m.saveErr != nil {
		return m.saveErr
	}
	m.savedResponse = response
	return nil
}

func (m *mockResponseRepoForClassification) GetByCase(_ context.Context, _ uuid.UUID, _, _ int) ([]domain.CaseResponse, int64, error) {
	return nil, 0, nil
}
func (m *mockResponseRepoForClassification) GetByUserAndCase(_ context.Context, _, _ uuid.UUID) ([]domain.CaseResponse, error) {
	return nil, nil
}
func (m *mockResponseRepoForClassification) GetByUserAndCases(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	return make(map[uuid.UUID][]domain.CaseResponse), nil
}
func (m *mockResponseRepoForClassification) CountByCase(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockResponseRepoForClassification) CountUniqueUsersByCase(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockResponseRepoForClassification) HasUserResponded(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (m *mockResponseRepoForClassification) GetAllByCase(_ context.Context, _ uuid.UUID) ([]domain.CaseResponse, error) {
	return nil, nil
}
func (m *mockResponseRepoForClassification) GetResponsesWithUserExpertise(_ context.Context, _ uuid.UUID) ([]domain.ResponseWithExpertise, error) {
	return nil, nil
}
func (m *mockResponseRepoForClassification) CountRespondedPublishedCases(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockResponseRepoForClassification) Close() error { return nil }

func TestClassificationService_Classify(t *testing.T) {
	t.Parallel()

	engine := rules.NewEngine()

	t.Run("classify returns correct result for valid input", func(t *testing.T) {
		t.Parallel()

		repo := &mockResponseRepoForClassification{}
		svc := NewClassificationService(engine, repo)

		input := domain.FractureInput{
			InvolvedMalleoli:  domain.InvolvedLateralOnly,
			FibularLevel:      domain.FibularLevelTransindesmal,
			LateralMorphology: domain.LateralMorphologySpiral,
		}

		result, err := svc.Classify(context.Background(), input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("Classify() returned nil result")
			return
		}
		if result.FractureType != "unimaleolar_lateral" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "unimaleolar_lateral")
		}
		if result.LaugeHansen == nil {
			t.Fatal("LaugeHansen classification missing")
		}
		if result.LaugeHansen.Type != domain.LaugeHansenSER {
			t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, domain.LaugeHansenSER)
		}
	})

	t.Run("classify checks cache before calling engine", func(t *testing.T) {
		t.Parallel()

		repo := &mockResponseRepoForClassification{}
		svc := NewClassificationService(engine, repo)
		cs := svc.(*classificationService)

		cachedResult := &domain.ClassificationResult{FractureType: "cached"}
		mockCache := &mockCacheForClassification{
			getResult: cachedResult,
			getHit:    true,
		}
		cs.cache = mockCache

		input := domain.FractureInput{
			InvolvedMalleoli: domain.InvolvedLateralOnly,
		}

		result, err := svc.Classify(context.Background(), input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result != cachedResult {
			t.Error("Classify() should return cached result on cache hit")
		}
	})

	t.Run("classify populates cache on miss", func(t *testing.T) {
		t.Parallel()

		repo := &mockResponseRepoForClassification{}
		svc := NewClassificationService(engine, repo)
		cs := svc.(*classificationService)

		mockCache := &mockCacheForClassification{
			getResult: nil,
			getHit:    false,
		}
		cs.cache = mockCache

		input := domain.FractureInput{
			InvolvedMalleoli:  domain.InvolvedLateralOnly,
			FibularLevel:      domain.FibularLevelTransindesmal,
			LateralMorphology: domain.LateralMorphologySpiral,
		}

		_, err := svc.Classify(context.Background(), input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if !mockCache.setCalled {
			t.Error("Classify() should populate cache after engine call")
		}
	})

	t.Run("classify passes input verbatim to engine without modification", func(t *testing.T) {
		t.Parallel()

		repo := &mockResponseRepoForClassification{}
		svc := NewClassificationService(engine, repo)

		// Test that the engine's result is returned unchanged
		input := domain.FractureInput{
			InvolvedMalleoli: domain.InvolvedLateralOnly,
			FibularLevel:     domain.FibularLevelInfrasindesmal,
		}

		svcResult, err := svc.Classify(context.Background(), input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}

		// Compare with direct engine call
		directResult, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("engine.Classify() unexpected error: %v", err)
		}

		if svcResult.FractureType != directResult.FractureType {
			t.Errorf("FractureType mismatch: svc=%q, engine=%q", svcResult.FractureType, directResult.FractureType)
		}
		if svcResult.LaugeHansen == nil || directResult.LaugeHansen == nil {
			t.Fatal("LaugeHansen classification missing in one of the results")
		}
		if svcResult.LaugeHansen.Type != directResult.LaugeHansen.Type {
			t.Errorf("LaugeHansen.Type mismatch: svc=%q, engine=%q", svcResult.LaugeHansen.Type, directResult.LaugeHansen.Type)
		}
	})
}

func TestClassificationService_ClassifyAndSave(t *testing.T) {
	t.Parallel()

	engine := rules.NewEngine()

	t.Run("ClassifyAndSave creates and persists CaseResponse", func(t *testing.T) {
		t.Parallel()

		repo := &mockResponseRepoForClassification{}
		svc := NewClassificationService(engine, repo)

		caseID := uuid.New()
		userID := uuid.New()
		input := domain.FractureInput{
			InvolvedMalleoli:  domain.InvolvedLateralOnly,
			FibularLevel:      domain.FibularLevelTransindesmal,
			LateralMorphology: domain.LateralMorphologySpiral,
		}

		resp, err := svc.ClassifyAndSave(context.Background(), input, caseID, userID, 1500, nil)
		if err != nil {
			t.Fatalf("ClassifyAndSave() unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("ClassifyAndSave() returned nil response")
			return
		}
		if resp.CaseID != caseID {
			t.Errorf("CaseID = %v, want %v", resp.CaseID, caseID)
		}
		if resp.UserID != userID {
			t.Errorf("UserID = %v, want %v", resp.UserID, userID)
		}
		if resp.TimeTakenMS != 1500 {
			t.Errorf("TimeTakenMS = %d, want 1500", resp.TimeTakenMS)
		}
		if repo.savedResponse == nil {
			t.Error("ClassifyAndSave() should have called responseRepo.Save()")
		}
	})

	t.Run("ClassifyAndSave persists classification data", func(t *testing.T) {
		t.Parallel()

		repo := &mockResponseRepoForClassification{}
		svc := NewClassificationService(engine, repo)

		caseID := uuid.New()
		userID := uuid.New()
		input := domain.FractureInput{
			InvolvedMalleoli:  domain.InvolvedLateralOnly,
			FibularLevel:      domain.FibularLevelTransindesmal,
			LateralMorphology: domain.LateralMorphologySpiral,
		}

		resp, err := svc.ClassifyAndSave(context.Background(), input, caseID, userID, 0, nil)
		if err != nil {
			t.Fatalf("ClassifyAndSave() unexpected error: %v", err)
		}

		// Classification JSONB should be populated
		if len(resp.Classification) == 0 {
			t.Error("ClassifyAndSave() should populate Classification JSONB")
		}

		// Denormalized field should be set (LaugeHansen type for this input is SER)
		if resp.LaugeHansenType == nil {
			t.Fatal("LaugeHansenType should be set for this input")
		}
		if *resp.LaugeHansenType != string(domain.LaugeHansenSER) {
			t.Errorf("LaugeHansenType = %q, want %q", *resp.LaugeHansenType, domain.LaugeHansenSER)
		}
	})

	t.Run("ClassifyAndSave propagates answer tracking", func(t *testing.T) {
		t.Parallel()

		repo := &mockResponseRepoForClassification{}
		svc := NewClassificationService(engine, repo)

		caseID := uuid.New()
		userID := uuid.New()
		input := domain.FractureInput{
			InvolvedMalleoli:  domain.InvolvedLateralOnly,
			FibularLevel:      domain.FibularLevelTransindesmal,
			LateralMorphology: domain.LateralMorphologySpiral,
		}
		tracking := &domain.AnswerTracking{
			DecisionPath: "lateral_only→transindesmal→spiral",
			BackClicks:   2,
			AnswerPath: []domain.QuestionAnswer{
				{Question: "involved_malleoli", Answer: "lateral_only", Timestamp: 1000},
			},
		}

		resp, err := svc.ClassifyAndSave(context.Background(), input, caseID, userID, 3000, tracking)
		if err != nil {
			t.Fatalf("ClassifyAndSave() unexpected error: %v", err)
		}
		if resp.DecisionPath != "lateral_only→transindesmal→spiral" {
			t.Errorf("DecisionPath = %q, want %q", resp.DecisionPath, "lateral_only→transindesmal→spiral")
		}
		if resp.BackClicks != 2 {
			t.Errorf("BackClicks = %d, want 2", resp.BackClicks)
		}
	})

	t.Run("ClassifyAndSave returns error when repository fails", func(t *testing.T) {
		t.Parallel()

		saveErr := errors.New("database unavailable")
		repo := &mockResponseRepoForClassification{saveErr: saveErr}
		svc := NewClassificationService(engine, repo)

		input := domain.FractureInput{
			InvolvedMalleoli: domain.InvolvedLateralOnly,
			FibularLevel:     domain.FibularLevelInfrasindesmal,
		}

		_, err := svc.ClassifyAndSave(context.Background(), input, uuid.New(), uuid.New(), 0, nil)
		if err == nil {
			t.Fatal("ClassifyAndSave() should return error when repository fails")
		}
		if !errors.Is(err, saveErr) {
			t.Errorf("error = %v, want wrapping %v", err, saveErr)
		}
	})
}

func TestNewClassificationService(t *testing.T) {
	t.Parallel()

	engine := rules.NewEngine()
	repo := &mockResponseRepoForClassification{}

	svc := NewClassificationService(engine, repo)
	if svc == nil {
		t.Fatal("NewClassificationService() returned nil")
	}

	// Verify it returns a classificationService with noOpCache
	cs, ok := svc.(*classificationService)
	if !ok {
		t.Fatal("NewClassificationService() did not return *classificationService")
	}
	if cs.engine != engine {
		t.Error("engine not set correctly")
	}
	if cs.responseRepo != repo {
		t.Error("responseRepo not set correctly")
	}
	if cs.cache == nil {
		t.Error("cache should not be nil (should be noOpCache)")
	}

	// Verify noOpCache returns false on Get
	result, ok := cs.cache.Get(context.Background(), domain.FractureInput{})
	if ok {
		t.Error("noOpCache.Get() should return false")
	}
	if result != nil {
		t.Error("noOpCache.Get() should return nil result")
	}
}
