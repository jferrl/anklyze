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

func engineResult(t *testing.T, in domain.FractureInput) domain.ClassificationResult {
	t.Helper()
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

	ptr := func(b bool) *bool { return &b }
	infra := domain.FractureInput{InvolvedMalleoli: domain.InvolvedLateralOnly, FibularLevel: domain.FibularLevelInfrasindesmal}
	supra := domain.FractureInput{InvolvedMalleoli: domain.InvolvedLateralOnly, FibularLevel: domain.FibularLevelSuprasindesmal}
	postNoCT := domain.FractureInput{
		InvolvedMalleoli:      domain.InvolvedPosteriorOnly,
		ArticularInvolvement:  domain.ArticularSmallWithoutExtension,
		PosteriorFractureType: domain.PosteriorPosterolateral,
		HasCTScan:             ptr(false),
	}
	postCT := postNoCT
	postCT.HasCTScan = ptr(true)

	infraRes, supraRes := engineResult(t, infra), engineResult(t, supra)
	if infraRes.SameClassification(supraRes) {
		t.Fatal("test inputs must classify differently")
	}
	postNoCTRes, postCTRes := engineResult(t, postNoCT), engineResult(t, postCT)
	if postNoCTRes.SameClassification(postCTRes) {
		t.Fatal("CT must change the posterior result")
	}

	unknownCode := supraRes
	unknownCode.DanisWeber = &domain.DanisWeberClassification{Type: "Weber Z"}
	withNotes := supraRes
	withNotes.Notes = []string{"forged"}
	badEnum := supra
	badEnum.FibularLevel = "nope"

	// Stale answers: the rater first answered infrasindesmal, then went back.
	stale := answers("involved_malleoli", "lateral_only", "fibular_level", "infrasindesmal", "bogus", "x")

	tests := []struct {
		name   string
		hasTAC bool
		req    SubmitResponseRequest
		want   int
	}{
		{"valid is stored", false, SubmitResponseRequest{Input: supra, Classification: supraRes}, http.StatusCreated},
		{"unknown code rejected", false, SubmitResponseRequest{Input: supra, Classification: unknownCode}, http.StatusUnprocessableEntity},
		{"valid codes that do not follow from the input rejected", false, SubmitResponseRequest{Input: supra, Classification: infraRes}, http.StatusUnprocessableEntity},
		{"unknown enum value rejected", false, SubmitResponseRequest{Input: badEnum, Classification: supraRes}, http.StatusUnprocessableEntity},
		{"missing input rejected", false, SubmitResponseRequest{Classification: supraRes}, http.StatusUnprocessableEntity},
		{"stale answer_path does not matter", false, SubmitResponseRequest{Input: supra, Classification: supraRes, AnswerPath: stale}, http.StatusCreated},
		{"stale answer_path does not rescue a mismatch", false, SubmitResponseRequest{Input: supra, Classification: infraRes, AnswerPath: stale}, http.StatusUnprocessableEntity},
		{"CT comes from the input, not the case", false, SubmitResponseRequest{Input: postCT, Classification: postCTRes}, http.StatusCreated},
		{"CT in the input wins over a case with TAC", true, SubmitResponseRequest{Input: postNoCT, Classification: postNoCTRes}, http.StatusCreated},
		{"CT result for a no-CT input rejected", true, SubmitResponseRequest{Input: postNoCT, Classification: postCTRes}, http.StatusUnprocessableEntity},
		{"client-only fields are not stored", false, SubmitResponseRequest{Input: supra, Classification: withNotes}, http.StatusCreated},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			w, repo := submit(t, tt.hasTAC, tt.req)
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
			if !got.SameClassification(tt.req.Classification) || len(got.Notes) != 0 {
				t.Errorf("stored %+v, want engine result without client notes", got)
			}
		})
	}
}
