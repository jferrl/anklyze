package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// Fakes embed the repository interface, so a method a test does not expect to
// reach panics instead of silently returning zero values.

type fakeCases struct {
	repository.CaseRepository
	cs    *domain.Case
	image *domain.CaseImage
	err   error
}

func (f *fakeCases) GetByID(context.Context, uuid.UUID) (*domain.Case, error) { return f.cs, f.err }
func (f *fakeCases) GetImageByID(context.Context, uuid.UUID) (*domain.CaseImage, error) {
	return f.image, f.err
}
func (f *fakeCases) GetImages(context.Context, uuid.UUID) ([]domain.CaseImage, error) {
	return nil, f.err
}

type fakeCaseResponses struct {
	repository.CaseResponseRepository
}

func (fakeCaseResponses) GetByUserAndCase(context.Context, uuid.UUID, uuid.UUID) ([]domain.CaseResponse, error) {
	return nil, nil
}
func (fakeCaseResponses) GetByCase(context.Context, uuid.UUID, int, int) ([]domain.CaseResponse, int64, error) {
	return nil, 0, nil
}
func (fakeCaseResponses) GetAllByCase(context.Context, uuid.UUID) ([]domain.CaseResponse, error) {
	return nil, nil
}
func (fakeCaseResponses) GetResponsesWithUserExpertise(context.Context, uuid.UUID) ([]domain.ResponseWithExpertise, error) {
	return nil, nil
}

type fakeCaseAnalytics struct {
	repository.CaseAnalyticsRepository
}

func (fakeCaseAnalytics) GetSummary(context.Context, uuid.UUID) (*domain.CaseAnalyticsSummary, error) {
	return &domain.CaseAnalyticsSummary{}, nil
}

type fakeStudies struct {
	repository.StudyRepository
	study *domain.Study
	err   error
}

func (f *fakeStudies) GetByID(context.Context, uuid.UUID) (*domain.Study, error) {
	return f.study, f.err
}
func (f *fakeStudies) GetCases(context.Context, uuid.UUID) ([]domain.Case, error) {
	return nil, nil
}

type fakeStudyService struct {
	StudyService
	inStudy bool
	err     error
}

func (f fakeStudyService) IsCaseInStudy(context.Context, uuid.UUID) (bool, *uuid.UUID, error) {
	return f.inStudy, nil, nil
}
func (f fakeStudyService) RemoveCase(context.Context, uuid.UUID, uuid.UUID) error { return f.err }
func (f fakeStudyService) GetReliabilityMetrics(context.Context, uuid.UUID) (*domain.StudyReliabilityMetrics, error) {
	return nil, f.err
}

type statusFixture struct {
	cases   *fakeCases
	studies *fakeStudies
	svc     fakeStudyService
	noUser  bool // leave the auth context empty
}

func (f statusFixture) router() *gin.Engine {
	gin.SetMode(gin.TestMode)
	resp := fakeCaseResponses{}
	svc := f.svc
	admin := NewCaseAdminHandler(f.cases, nil, nil, svc)
	image := NewCaseImageHandler(f.cases, nil, 0)
	access := NewCaseAccessHandler(f.cases, resp)
	responses := NewCaseResponseHandler(f.cases, resp, svc, nil, nil, 0)
	analytics := NewCaseAnalyticsHandler(f.cases, resp, fakeCaseAnalytics{}, nil)
	study := NewStudyHandler(f.studies, nil, f.cases, nil, svc)

	r := gin.New()
	if !f.noUser {
		r.Use(func(c *gin.Context) { c.Set(auth.ContextKeyUserID, uuid.NewString()) })
	}
	registerUserCaseRoutes(r.Group("/api/cases"), access, responses)
	registerProfileRoutes(r.Group("/api/me"), NewUserHandler(nil))
	registerAdminCaseRoutes(r.Group("/api/admin/cases"), admin, image, responses, analytics)
	registerAdminStudyRoutes(r.Group("/api/admin/studies"), study)
	return r
}

func (f statusFixture) do(method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	f.router().ServeHTTP(w, req)
	return w
}

// assertAPIError checks the status and the shared ErrorResponse shape.
func assertAPIError(t *testing.T, w *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status = %d, want %d: %s", w.Code, status, w.Body)
	}
	var e ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &e); err != nil {
		t.Fatalf("body is not JSON: %v: %s", err, w.Body)
	}
	if e.Code != code || e.Message == "" {
		t.Errorf("body = %s, want code %q and a message", w.Body, code)
	}
}

type route struct{ method, path, body string }

// idRoutes are every route keyed by a case or study id. {id} is replaced by
// the id under test.
func caseRoutes() []route {
	return []route{
		{"GET", "/api/cases/{id}", ""},
		{"GET", "/api/cases/{id}/images/urls", ""},
		{"GET", "/api/cases/{id}/images/" + uuid.NewString() + "/url", ""},
		{"POST", "/api/cases/{id}/responses", `{}`},
		{"GET", "/api/cases/{id}/my-responses", ""},
		{"GET", "/api/admin/cases/{id}", ""},
		{"PUT", "/api/admin/cases/{id}", `{"description":"x"}`},
		{"DELETE", "/api/admin/cases/{id}", ""},
		{"PUT", "/api/admin/cases/{id}/publish", ""},
		{"PUT", "/api/admin/cases/{id}/close", ""},
		{"POST", "/api/admin/cases/{id}/images", ""},
		{"GET", "/api/admin/cases/{id}/images", ""},
		{"GET", "/api/admin/cases/{id}/images/" + uuid.NewString() + "/url", ""},
		{"PATCH", "/api/admin/cases/{id}/images/" + uuid.NewString(), `{"display_order":1}`},
		{"DELETE", "/api/admin/cases/{id}/images/" + uuid.NewString(), ""},
		{"PUT", "/api/admin/cases/{id}/images/reorder", `{"image_order":[]}`},
		{"PUT", "/api/admin/cases/{id}/gold-standard", `{}`},
		{"DELETE", "/api/admin/cases/{id}/gold-standard", ""},
		{"GET", "/api/admin/cases/{id}/analytics", ""},
		{"GET", "/api/admin/cases/{id}/reliability", ""},
		{"GET", "/api/admin/cases/{id}/accuracy", ""},
		{"GET", "/api/admin/cases/{id}/responses", ""},
		{"GET", "/api/admin/cases/{id}/export", ""},
		{"GET", "/api/admin/cases/{id}/export/detailed", ""},
	}
}

func studyRoutes() []route {
	caseBody := `{"case_id":"` + uuid.NewString() + `"}`
	return []route{
		{"GET", "/api/admin/studies/{id}", ""},
		{"PUT", "/api/admin/studies/{id}", `{"title":"x"}`},
		{"DELETE", "/api/admin/studies/{id}", ""},
		{"POST", "/api/admin/studies/{id}/cases", caseBody},
		{"POST", "/api/admin/studies/{id}/cases/add-all", ""},
		{"DELETE", "/api/admin/studies/{id}/cases/" + uuid.NewString(), ""},
		{"PUT", "/api/admin/studies/{id}/cases/reorder", `{"case_ids":["` + uuid.NewString() + `"]}`},
		{"PUT", "/api/admin/studies/{id}/activate", ""},
		{"PUT", "/api/admin/studies/{id}/close", ""},
		{"GET", "/api/admin/studies/{id}/reliability", ""},
		{"GET", "/api/admin/studies/{id}/accuracy", ""},
		{"GET", "/api/admin/studies/{id}/export", ""},
	}
}

func allRoutes() []route { return append(caseRoutes(), studyRoutes()...) }

func (r route) url(id string) string { return strings.Replace(r.path, "{id}", id, 1) }

func TestStatus_MissingRecordIs404(t *testing.T) {
	t.Parallel()
	f := statusFixture{cases: &fakeCases{}, studies: &fakeStudies{}}
	for _, rt := range allRoutes() {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			t.Parallel()
			assertAPIError(t, f.do(rt.method, rt.url(uuid.NewString()), rt.body), http.StatusNotFound, CodeNotFound)
		})
	}
}

func TestStatus_MalformedIDIs400(t *testing.T) {
	t.Parallel()
	f := statusFixture{cases: &fakeCases{}, studies: &fakeStudies{}}
	for _, rt := range allRoutes() {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			t.Parallel()
			assertAPIError(t, f.do(rt.method, rt.url("not-a-uuid"), rt.body), http.StatusBadRequest, CodeInvalidInput)
		})
	}
}

// A repository failure is a 500 that never leaks the cause and is never
// reported as a missing record.
func TestStatus_RepositoryFailureIs500(t *testing.T) {
	t.Parallel()
	boom := errors.New("db down")
	f := statusFixture{cases: &fakeCases{err: boom}, studies: &fakeStudies{err: boom}}
	for _, rt := range allRoutes() {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			t.Parallel()
			w := f.do(rt.method, rt.url(uuid.NewString()), rt.body)
			assertAPIError(t, w, http.StatusInternalServerError, CodeInternalError)
			if strings.Contains(w.Body.String(), "db down") {
				t.Errorf("response leaks the cause: %s", w.Body)
			}
		})
	}
}

func TestStatus_MissingImageIs404(t *testing.T) {
	t.Parallel()
	draft := domain.NewCase(uuid.New(), "t", "", nil)
	published := domain.NewCase(uuid.New(), "t", "", nil)
	published.Status = domain.CaseStatusPublished
	tests := []struct {
		route
		cs *domain.Case
	}{
		{route{"GET", "/api/cases/{id}/images/" + uuid.NewString() + "/url", ""}, published},
		{route{"GET", "/api/admin/cases/{id}/images/" + uuid.NewString() + "/url", ""}, draft},
		{route{"PATCH", "/api/admin/cases/{id}/images/" + uuid.NewString(), `{"display_order":1}`}, draft},
		{route{"DELETE", "/api/admin/cases/{id}/images/" + uuid.NewString(), ""}, draft},
	}
	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			t.Parallel()
			f := statusFixture{cases: &fakeCases{cs: tt.cs}, studies: &fakeStudies{}}
			assertAPIError(t, f.do(tt.method, tt.url(tt.cs.ID.String()), tt.body), http.StatusNotFound, CodeNotFound)
		})
	}
}

func TestStatus_NonDraftCaseImagesIs400(t *testing.T) {
	t.Parallel()
	cs := domain.NewCase(uuid.New(), "t", "", nil)
	cs.Status = domain.CaseStatusPublished
	f := statusFixture{cases: &fakeCases{cs: cs}, studies: &fakeStudies{}}
	for _, rt := range []route{
		{"POST", "/api/admin/cases/{id}/images", ""},
		{"PATCH", "/api/admin/cases/{id}/images/" + uuid.NewString(), `{}`},
		{"DELETE", "/api/admin/cases/{id}/images/" + uuid.NewString(), ""},
		{"PUT", "/api/admin/cases/{id}/images/reorder", `{"image_order":[]}`},
	} {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			t.Parallel()
			assertAPIError(t, f.do(rt.method, rt.url(cs.ID.String()), rt.body), http.StatusBadRequest, domain.ErrCodeInvalidStateTransition)
		})
	}
}

func TestStatus_ClosedCaseGoldStandardIs409(t *testing.T) {
	t.Parallel()
	cs := domain.NewCase(uuid.New(), "t", "", nil)
	cs.Status = domain.CaseStatusClosed
	f := statusFixture{cases: &fakeCases{cs: cs}, studies: &fakeStudies{}}
	assertAPIError(t, f.do("PUT", "/api/admin/cases/"+cs.ID.String()+"/gold-standard", `{}`), http.StatusConflict, CodeConflict)
	assertAPIError(t, f.do("DELETE", "/api/admin/cases/"+cs.ID.String()+"/gold-standard", ""), http.StatusConflict, CodeConflict)
}

func TestStatus_BadBodyIs400(t *testing.T) {
	t.Parallel()
	cs := domain.NewCase(uuid.New(), "t", "", nil)
	study := domain.NewStudy(uuid.New(), "t", "")
	f := statusFixture{cases: &fakeCases{cs: cs, image: &domain.CaseImage{CaseID: cs.ID}}, studies: &fakeStudies{study: study}}
	tests := []route{
		{"POST", "/api/admin/cases", `{}`},
		{"PUT", "/api/admin/cases/" + cs.ID.String(), `{"deadline":"nope"}`},
		{"PATCH", "/api/admin/cases/" + cs.ID.String() + "/images/" + uuid.NewString(), `{`},
		{"POST", "/api/admin/studies", `{}`},
		{"PUT", "/api/admin/studies/" + study.ID.String(), `{`},
		{"PUT", "/api/admin/studies/" + study.ID.String(), `{"title":""}`},
		{"PUT", "/api/admin/studies/" + study.ID.String(), `{"title":"` + strings.Repeat("x", MaxTitleLength+1) + `"}`},
		{"POST", "/api/admin/studies/" + study.ID.String() + "/cases", `{}`},
		{"PUT", "/api/admin/studies/" + study.ID.String() + "/cases/reorder", `{"case_ids":["nope"]}`},
		{"PUT", "/api/me/profile", `{"specialty":"astrology"}`},
		{"PUT", "/api/me/profile", `{"training_level":"wizard"}`},
		{"PUT", "/api/me/profile", `{"years_experience":99}`},
	}
	for _, rt := range tests {
		t.Run(rt.method+" "+rt.path+" "+rt.body, func(t *testing.T) {
			t.Parallel()
			assertAPIError(t, f.do(rt.method, rt.path, rt.body), http.StatusBadRequest, CodeInvalidInput)
		})
	}
}

func TestStatus_StudyStateErrors(t *testing.T) {
	t.Parallel()
	active := domain.NewStudy(uuid.New(), "t", "")
	active.Status = domain.StudyStatusActive
	draft := domain.NewStudy(uuid.New(), "t", "")
	published := domain.NewCase(uuid.New(), "t", "", nil)

	t.Run("activate non-draft", func(t *testing.T) {
		t.Parallel()
		f := statusFixture{cases: &fakeCases{}, studies: &fakeStudies{study: active}}
		assertAPIError(t, f.do("PUT", "/api/admin/studies/"+active.ID.String()+"/activate", ""), http.StatusBadRequest, domain.ErrCodeInvalidStateTransition)
	})
	t.Run("activate without cases", func(t *testing.T) {
		t.Parallel()
		f := statusFixture{cases: &fakeCases{}, studies: &fakeStudies{study: draft}}
		assertAPIError(t, f.do("PUT", "/api/admin/studies/"+draft.ID.String()+"/activate", ""), http.StatusBadRequest, domain.ErrCodeInvalidStateTransition)
	})
	t.Run("add-all to non-draft", func(t *testing.T) {
		t.Parallel()
		f := statusFixture{cases: &fakeCases{}, studies: &fakeStudies{study: active}}
		assertAPIError(t, f.do("POST", "/api/admin/studies/"+active.ID.String()+"/cases/add-all", ""), http.StatusBadRequest, domain.ErrCodeInvalidStateTransition)
	})
	t.Run("case already in a study", func(t *testing.T) {
		t.Parallel()
		f := statusFixture{cases: &fakeCases{cs: published}, studies: &fakeStudies{study: draft}, svc: fakeStudyService{inStudy: true}}
		body := `{"case_id":"` + published.ID.String() + `"}`
		assertAPIError(t, f.do("POST", "/api/admin/studies/"+draft.ID.String()+"/cases", body), http.StatusConflict, CodeConflict)
	})
	t.Run("study deleted between check and metrics", func(t *testing.T) {
		t.Parallel()
		f := statusFixture{cases: &fakeCases{}, studies: &fakeStudies{study: draft}, svc: fakeStudyService{err: domain.ErrNotFound}}
		assertAPIError(t, f.do("GET", "/api/admin/studies/"+draft.ID.String()+"/reliability", ""), http.StatusNotFound, CodeNotFound)
	})
	t.Run("service failure", func(t *testing.T) {
		t.Parallel()
		f := statusFixture{cases: &fakeCases{}, studies: &fakeStudies{study: draft}, svc: fakeStudyService{err: errors.New("boom")}}
		assertAPIError(t, f.do("DELETE", "/api/admin/studies/"+draft.ID.String()+"/cases/"+uuid.NewString(), ""), http.StatusInternalServerError, CodeInternalError)
	})
}

func TestStatus_UnauthenticatedIs401(t *testing.T) {
	t.Parallel()
	f := statusFixture{cases: &fakeCases{}, studies: &fakeStudies{}, noUser: true}
	id := uuid.NewString()
	for _, rt := range []route{
		{"GET", "/api/cases", ""},
		{"GET", "/api/cases/" + id, ""},
		{"POST", "/api/cases/" + id + "/responses", `{}`},
		{"GET", "/api/cases/" + id + "/my-responses", ""},
		{"GET", "/api/me/profile", ""},
		{"PUT", "/api/me/profile", `{}`},
		{"POST", "/api/admin/cases", `{"title":"t"}`},
		{"POST", "/api/admin/studies", `{"title":"t"}`},
	} {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			t.Parallel()
			assertAPIError(t, f.do(rt.method, rt.path, rt.body), http.StatusUnauthorized, CodeUnauthorized)
		})
	}
}

type failingAnalytics struct{}

func (failingAnalytics) GetSummary(_, _ time.Time) (*domain.AnalyticsSummary, error) {
	return nil, errors.New("db down")
}
func (failingAnalytics) GetTrends(_, _ time.Time, _ domain.Granularity) (*domain.TrendData, error) {
	return nil, errors.New("db down")
}
func (failingAnalytics) GetDistribution(string, time.Time, time.Time) (*domain.ClassificationDistribution, error) {
	return nil, errors.New("db down")
}

func TestStatus_Analytics(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)
	h := NewHandler(newTestClassificationSvc(), stubAudit{}, failingAnalytics{}, nil)
	r := gin.New()
	registerAnalyticsRoutes(r.Group("/api/analytics"), h)
	ok := NewHandler(newTestClassificationSvc(), stubAudit{}, stubAnalytics{}, nil)
	rOK := gin.New()
	registerAnalyticsRoutes(rOK.Group("/api/analytics"), ok)

	tests := []struct {
		name   string
		router *gin.Engine
		path   string
		status int
		code   string
	}{
		{"summary failure", r, "/api/analytics/summary", 500, CodeInternalError},
		{"trends failure", r, "/api/analytics/trends", 500, CodeInternalError},
		{"distribution failure", r, "/api/analytics/distribution/ao-ota", 500, CodeInternalError},
		{"unknown system", rOK, "/api/analytics/distribution/unknown", 400, CodeInvalidInput},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			tt.router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tt.path, nil))
			assertAPIError(t, w, tt.status, tt.code)
		})
	}
}

func TestStatus_ClassifyBadBodyKeepsInvalidInputCode(t *testing.T) {
	t.Parallel()
	h := setupTestHandler()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/classify", strings.NewReader(`{`))
	req.Header.Set("Content-Type", "application/json")
	setupTestRouter(h).ServeHTTP(w, req)
	assertAPIError(t, w, http.StatusBadRequest, CodeInvalidInput)
}
