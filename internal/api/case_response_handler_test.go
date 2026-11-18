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
	"github.com/jferrl/anklyze/internal/rules"
)

type stubCaseRepo struct {
	repository.CaseRepository
	cs *domain.Case
}

func (s stubCaseRepo) GetByID(context.Context, uuid.UUID) (*domain.Case, error) { return s.cs, nil }

type stubResponseRepo struct {
	repository.CaseResponseRepository
	saved []*domain.CaseResponse
}

func (s *stubResponseRepo) HasUserResponded(context.Context, uuid.UUID, uuid.UUID) (bool, error) {
	return false, nil
}

func (s *stubResponseRepo) Save(_ context.Context, r *domain.CaseResponse) error {
	s.saved = append(s.saved, r)
	return nil
}

func answers(kv ...string) []domain.QuestionAnswer {
	var out []domain.QuestionAnswer
	for i := 0; i < len(kv); i += 2 {
		out = append(out, domain.QuestionAnswer{Question: kv[i], Answer: kv[i+1]})
	}
	return out
}

// engineResult classifies the same answers the server will rebuild.
func engineResult(t *testing.T, hasCT bool, path []domain.QuestionAnswer) domain.ClassificationResult {
	t.Helper()
	in, err := domain.FractureInputFromAnswers(path, hasCT)
	if err != nil {
		t.Fatal(err)
	}
	res, err := rules.NewEngine().Classify(in)
	if err != nil {
		t.Fatal(err)
	}
	return *res
}

func submit(t *testing.T, hasTAC bool, body SubmitResponseRequest) (*httptest.ResponseRecorder, *stubResponseRepo) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	repo := &stubResponseRepo{}
	h := NewCaseResponseHandler(
		stubCaseRepo{cs: &domain.Case{Status: domain.CaseStatusPublished, HasTACImages: hasTAC}},
		repo, nil, newTestClassificationSvc(), nil, 0)

	r := gin.New()
	r.POST("/api/cases/:id/responses", func(c *gin.Context) {
		c.Set(auth.ContextKeyUserID, uuid.NewString())
		h.SubmitResponse(c)
	})
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/cases/"+uuid.NewString()+"/responses", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	return w, repo
}

func TestSubmitResponse_ValidatesClassification(t *testing.T) {
	t.Parallel()

	infra := answers("involved_malleoli", "lateral_only", "fibular_level", "infrasindesmal")
	supra := answers("involved_malleoli", "lateral_only", "fibular_level", "suprasindesmal")
	repeated := append(append([]domain.QuestionAnswer{}, infra...), answers("fibular_level", "suprasindesmal")...)
	posterior := answers("involved_malleoli", "posterior_only", "articular_involvement", "small_without_extension", "posterior_fracture_type", "posterolateral")

	infraRes := engineResult(t, false, infra)
	supraRes := engineResult(t, false, supra)
	if infraRes.SameClassification(supraRes) {
		t.Fatal("test paths must classify differently")
	}
	postCT := engineResult(t, true, posterior)
	if postCT.SameClassification(engineResult(t, false, posterior)) {
		t.Fatal("CT must change the posterior result")
	}

	unknownCode := supraRes
	unknownCode.DanisWeber = &domain.DanisWeberClassification{Type: "Weber Z"}
	withNotes := supraRes
	withNotes.Notes = []string{"forged"}

	tests := []struct {
		name   string
		hasTAC bool
		path   []domain.QuestionAnswer
		result domain.ClassificationResult
		want   int
	}{
		{"valid is stored", false, supra, supraRes, http.StatusCreated},
		{"unknown code rejected", false, supra, unknownCode, http.StatusUnprocessableEntity},
		{"valid codes that do not follow from answers rejected", false, supra, infraRes, http.StatusUnprocessableEntity},
		{"repeated question uses last answer", false, repeated, supraRes, http.StatusCreated},
		{"repeated question first answer rejected", false, repeated, infraRes, http.StatusUnprocessableEntity},
		{"missing answer path rejected", false, nil, supraRes, http.StatusUnprocessableEntity},
		{"unknown question rejected", false, answers("involved_malleoli", "lateral_only", "bogus", "x"), supraRes, http.StatusUnprocessableEntity},
		{"unknown involved_malleoli rejected", false, answers("involved_malleoli", "nope"), engineResult(t, false, answers("involved_malleoli", "nope")), http.StatusUnprocessableEntity},
		{"CT comes from the case images", true, posterior, postCT, http.StatusCreated},
		{"CT result rejected for a case without TAC", false, posterior, postCT, http.StatusUnprocessableEntity},
		{"client-only fields are not stored", false, supra, withNotes, http.StatusCreated},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			w, repo := submit(t, tt.hasTAC, SubmitResponseRequest{Classification: tt.result, AnswerPath: tt.path})
			if w.Code != tt.want {
				t.Fatalf("status = %d, want %d: %s", w.Code, tt.want, w.Body)
			}
			if tt.want != http.StatusCreated {
				if len(repo.saved) != 0 {
					t.Fatal("rejected response was saved")
				}
				return
			}
			if len(repo.saved) != 1 {
				t.Fatalf("saved %d responses, want 1", len(repo.saved))
			}
			got, err := repo.saved[0].GetClassification()
			if err != nil {
				t.Fatal(err)
			}
			if !got.SameClassification(tt.result) || len(got.Notes) != 0 {
				t.Errorf("stored %+v, want engine result without client notes", got)
			}
		})
	}
}
