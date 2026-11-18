package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

type devCases struct {
	repository.CaseRepository
	cs *domain.Case
}

func (d devCases) GetByID(context.Context, uuid.UUID) (*domain.Case, error) { return d.cs, nil }
func (d devCases) ListPublished(context.Context, int, int) ([]domain.Case, int64, error) {
	return []domain.Case{*d.cs}, 1, nil
}
func (devCases) GetImagesForCases(context.Context, []uuid.UUID) (map[uuid.UUID][]domain.CaseImage, error) {
	return nil, nil
}
func (devCases) Create(context.Context, *domain.Case) error { return nil }

type devResponses struct {
	repository.CaseResponseRepository
	saved []*domain.CaseResponse
}

func (*devResponses) GetByUserAndCases(context.Context, uuid.UUID, []uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	return nil, nil
}
func (*devResponses) CountRespondedPublishedCases(context.Context, uuid.UUID) (int64, error) {
	return 0, nil
}
func (*devResponses) HasUserResponded(context.Context, uuid.UUID, uuid.UUID) (bool, error) {
	return false, nil
}
func (d *devResponses) Save(_ context.Context, r *domain.CaseResponse) error {
	d.saved = append(d.saved, r)
	return nil
}

type devStudies struct {
	repository.StudyRepository
	created *domain.Study
}

func (d *devStudies) Create(_ context.Context, s *domain.Study) error { d.created = s; return nil }

// Dev mode (nil auth validator) gives every route the same mock user, so
// handlers that read the user from the Gin context work without a token.
func TestDevMode_RoutesWorkWithoutToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cs := domain.NewCase(uuid.New(), "t", "", nil)
	cs.Status = domain.CaseStatusPublished
	responses := &devResponses{}
	studies := &devStudies{}

	r := gin.New()
	SetupCaseRoutes(r, nil, nil, nil, devCases{cs: cs}, responses, nil, nil, newTestClassificationSvc(), nil, nil)
	SetupStudyRoutes(r, nil, nil, nil, studies, nil, devCases{cs: cs}, nil)
	setupPublicRoutes(r.Group("/api"), setupTestHandler(), nil)

	input := domain.FractureInput{InvolvedMalleoli: domain.InvolvedLateralOnly, FibularLevel: domain.FibularLevelSuprasindesmal}
	submit, err := json.Marshal(SubmitResponseRequest{Input: input, Classification: engineResult(t, input)})
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name, method, path, body string
		want                     int
	}{
		{"list cases", "GET", "/api/cases", "", http.StatusOK},
		{"submit response", "POST", "/api/cases/" + cs.ID.String() + "/responses", string(submit), http.StatusCreated},
		{"create case", "POST", "/api/admin/cases", `{"title":"t"}`, http.StatusCreated},
		{"create study", "POST", "/api/admin/studies", `{"title":"t"}`, http.StatusCreated},
		{"me", "GET", "/api/me", "", http.StatusOK},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tt.want {
				t.Fatalf("status = %d, want %d: %s", w.Code, tt.want, w.Body)
			}
		})
	}

	if len(responses.saved) != 1 || responses.saved[0].UserID != auth.DevUserID {
		t.Errorf("saved responses = %+v, want one owned by the dev user", responses.saved)
	}
	if studies.created == nil || studies.created.CreatedBy != auth.DevUserID {
		t.Errorf("created study = %+v, want one owned by the dev user", studies.created)
	}
}
