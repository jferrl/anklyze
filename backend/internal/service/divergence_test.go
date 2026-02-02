package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/datatypes"
)

// mockCaseRepository is a mock implementation for testing.
type mockCaseRepository struct {
	cs  *domain.Case
	err error
}

func (m *mockCaseRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Case, error) {
	return m.cs, m.err
}

// Implement other required interface methods as no-ops
func (m *mockCaseRepository) Create(ctx context.Context, cs *domain.Case) error { return nil }
func (m *mockCaseRepository) Update(ctx context.Context, cs *domain.Case) error { return nil }
func (m *mockCaseRepository) Delete(ctx context.Context, id uuid.UUID) error    { return nil }
func (m *mockCaseRepository) List(ctx context.Context, status *domain.CaseStatus, limit, offset int) ([]domain.Case, int64, error) {
	return nil, 0, nil
}
func (m *mockCaseRepository) ListPublished(ctx context.Context, limit, offset int) ([]domain.Case, int64, error) {
	return nil, 0, nil
}
func (m *mockCaseRepository) ListForUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.Case, int64, error) {
	return nil, 0, nil
}
func (m *mockCaseRepository) Publish(ctx context.Context, id uuid.UUID) error            { return nil }
func (m *mockCaseRepository) Close(ctx context.Context, id uuid.UUID) error              { return nil }
func (m *mockCaseRepository) AddImage(ctx context.Context, image *domain.CaseImage) error { return nil }
func (m *mockCaseRepository) GetImages(ctx context.Context, caseID uuid.UUID) ([]domain.CaseImage, error) {
	return nil, nil
}
func (m *mockCaseRepository) GetImageByID(ctx context.Context, id uuid.UUID) (*domain.CaseImage, error) {
	return nil, nil
}
func (m *mockCaseRepository) DeleteImage(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockCaseRepository) UpdateImage(ctx context.Context, image *domain.CaseImage) error {
	return nil
}
func (m *mockCaseRepository) UpdateHasTACImages(ctx context.Context, caseID uuid.UUID) error {
	return nil
}
func (m *mockCaseRepository) IncrementResponseCount(ctx context.Context, caseID uuid.UUID) error {
	return nil
}
func (m *mockCaseRepository) UpdateUniqueUsers(ctx context.Context, caseID uuid.UUID, count int) error {
	return nil
}
func (m *mockCaseRepository) HasAccess(ctx context.Context, caseID, userID uuid.UUID) (bool, error) {
	return false, nil
}
func (m *mockCaseRepository) AddUser(ctx context.Context, caseID, userID uuid.UUID, email string) error {
	return nil
}
func (m *mockCaseRepository) RemoveUser(ctx context.Context, caseID, userID uuid.UUID) error {
	return nil
}
func (m *mockCaseRepository) GetUsers(ctx context.Context, caseID uuid.UUID) ([]domain.CaseUser, error) {
	return nil, nil
}
func (m *mockCaseRepository) GetByStudyID(ctx context.Context, studyID uuid.UUID) ([]domain.Case, error) {
	return nil, nil
}

// mockCaseResponseRepository is a mock implementation for testing.
type mockCaseResponseRepository struct {
	responses []domain.CaseResponse
	err       error
}

func (m *mockCaseResponseRepository) GetAllByCase(ctx context.Context, caseID uuid.UUID) ([]domain.CaseResponse, error) {
	return m.responses, m.err
}

// Implement other required interface methods as no-ops
func (m *mockCaseResponseRepository) Save(ctx context.Context, response *domain.CaseResponse) error {
	return nil
}
func (m *mockCaseResponseRepository) GetByCase(ctx context.Context, caseID uuid.UUID, limit, offset int) ([]domain.CaseResponse, int64, error) {
	return nil, 0, nil
}
func (m *mockCaseResponseRepository) GetByUserAndCase(ctx context.Context, userID, caseID uuid.UUID) ([]domain.CaseResponse, error) {
	return nil, nil
}
func (m *mockCaseResponseRepository) CountByCase(ctx context.Context, caseID uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockCaseResponseRepository) HasUserResponded(ctx context.Context, userID, caseID uuid.UUID) (bool, error) {
	return false, nil
}
func (m *mockCaseResponseRepository) CountUniqueUsersByCase(ctx context.Context, caseID uuid.UUID) (int64, error) {
	return 0, nil
}
func (m *mockCaseResponseRepository) GetResponsesWithUserExpertise(ctx context.Context, caseID uuid.UUID) ([]domain.ResponseWithExpertise, error) {
	return nil, nil
}
func (m *mockCaseResponseRepository) Close() error { return nil }

func TestBuildAnswerPathFromInput(t *testing.T) {
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
			name: "trimaleolar with suprasindesmal",
			input: &domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedTrimaleolar,
				FibularLevel:       domain.FibularLevelSuprasindesmal,
				SuprasindesmalType: domain.SuprasindesmalSimpleDiaphyseal,
				FibulaTracePattern: domain.FibulaTraceParasindesmoticShort,
			},
			expected: map[string]string{
				"involved_malleoli":    "trimaleolar",
				"fibular_level":        "suprasindesmal",
				"suprasindesmal_type":  "simple_diaphyseal",
				"fibula_trace_pattern": "parasindesmotic_short",
			},
		},
		{
			name: "posterior only with CT scan",
			input: &domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedPosteriorOnly,
				HasCTScan:             boolPtr(true),
				PosteriorFractureType: domain.PosteriorExtraincisural,
			},
			expected: map[string]string{
				"involved_malleoli":       "posterior_only",
				"has_ct_scan":             "true",
				"posterior_fracture_type": "extraincisural",
			},
		},
		{
			name: "medial only with oblique morphology",
			input: &domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialOnly,
				MedialMorphology: domain.MedialMorphologyOblique,
			},
			expected: map[string]string{
				"involved_malleoli": "medial_only",
				"medial_morphology": "oblique",
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

func TestBuildDecisionPathString(t *testing.T) {
	tests := []struct {
		name     string
		input    *domain.FractureInput
		expected string
	}{
		{
			name: "lateral only transindesmal spiral",
			input: &domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralOnly,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
			},
			expected: "lateral_only→transindesmal→spiral",
		},
		{
			name: "trimaleolar suprasindesmal with trace pattern",
			input: &domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedTrimaleolar,
				FibularLevel:       domain.FibularLevelSuprasindesmal,
				SuprasindesmalType: domain.SuprasindesmalSimpleDiaphyseal,
				FibulaTracePattern: domain.FibulaTraceParasindesmoticShort,
			},
			expected: "trimaleolar→suprasindesmal→simple_diaphyseal→parasindesmotic_short",
		},
		{
			name: "medial only",
			input: &domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialOnly,
				MedialMorphology: domain.MedialMorphologyOblique,
			},
			expected: "medial_only→oblique",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := buildDecisionPathString(tt.input)

			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestGetQuestionDisplayName(t *testing.T) {
	tests := []struct {
		key      string
		expected string
	}{
		{"involved_malleoli", "Involved Malleoli"},
		{"fibular_level", "Fibular Level"},
		{"lateral_morphology", "Lateral Morphology"},
		{"medial_morphology", "Medial Morphology"},
		{"suprasindesmal_type", "Suprasindesmal Type"},
		{"fibula_trace_pattern", "Fibula Trace Pattern"},
		{"posterior_fracture_type", "Posterior Fracture Type"},
		{"has_ct_scan", "Has CT Scan"},
		{"unknown_key", "unknown_key"}, // Should return the key itself
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

func TestAnalyzeDivergence(t *testing.T) {
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
				// Correct response
				createResponseWithPath(caseID, "lateral_only→transindesmal→spiral", []domain.QuestionAnswer{
					{Question: "involved_malleoli", Answer: "lateral_only", Timestamp: 1000},
					{Question: "fibular_level", Answer: "transindesmal", Timestamp: 2000},
					{Question: "lateral_morphology", Answer: "spiral", Timestamp: 3000},
				}, 0),
				// Incorrect response - wrong morphology
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

				// Check path distribution
				if report.PathDistribution["lateral_only→transindesmal→spiral"] != 1 {
					t.Errorf("expected 1 correct path, got %d", report.PathDistribution["lateral_only→transindesmal→spiral"])
				}
				if report.PathDistribution["lateral_only→transindesmal→oblique"] != 1 {
					t.Errorf("expected 1 incorrect path, got %d", report.PathDistribution["lateral_only→transindesmal→oblique"])
				}

				// Check that lateral_morphology has 50% error rate
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
		{
			name: "back click correlation",
			cs: &domain.Case{
				ID:             caseID,
				Title:          "Test Case",
				ReferenceInput: datatypes.JSON(referenceInputJSON),
			},
			responses: []domain.CaseResponse{
				// Correct with high back clicks
				createResponseWithPath(caseID, "lateral_only→transindesmal→spiral", []domain.QuestionAnswer{
					{Question: "involved_malleoli", Answer: "lateral_only", Timestamp: 1000},
					{Question: "fibular_level", Answer: "transindesmal", Timestamp: 2000},
					{Question: "lateral_morphology", Answer: "spiral", Timestamp: 3000},
				}, 5),
				// Incorrect with low back clicks
				createResponseWithPath(caseID, "lateral_only→transindesmal→oblique", []domain.QuestionAnswer{
					{Question: "involved_malleoli", Answer: "lateral_only", Timestamp: 1000},
					{Question: "fibular_level", Answer: "transindesmal", Timestamp: 2000},
					{Question: "lateral_morphology", Answer: "oblique", Timestamp: 3000},
				}, 0),
			},
			validate: func(t *testing.T, report *DivergenceReport) {
				if report.AvgBackClicks != 2.5 {
					t.Errorf("expected avg back clicks 2.5, got %.2f", report.AvgBackClicks)
				}
				// High back clicks on correct, low on incorrect = positive correlation
				if report.BackClickCorrelation != "positive" {
					t.Errorf("expected positive correlation, got %s", report.BackClickCorrelation)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			caseRepo := &mockCaseRepository{cs: tt.cs}
			responseRepo := &mockCaseResponseRepository{responses: tt.responses}

			svc := NewDivergenceService(responseRepo, caseRepo)
			report, err := svc.AnalyzeDivergence(context.Background(), caseID)

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

// Helper functions

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
