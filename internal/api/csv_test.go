package api

import (
	"context"
	"encoding/csv"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

func TestCSVText(t *testing.T) {
	tests := []struct{ in, want string }{
		{"", ""},
		{"plain", "plain"},
		{"a=b", "a=b"},
		{"=SUM(A1:A9)", "'=SUM(A1:A9)"},
		{"+1", "'+1"},
		{"-0.12", "'-0.12"},
		{"@cmd", "'@cmd"},
		{"\tx", "'\tx"},
		{"\rx", "'\rx"},
	}
	for _, tt := range tests {
		if got := csvText(tt.in); got != tt.want {
			t.Errorf("csvText(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

type fakeCaseRepo struct {
	repository.CaseRepository
	c *domain.Case
}

func (f fakeCaseRepo) GetByID(context.Context, uuid.UUID) (*domain.Case, error) { return f.c, nil }

type fakeResponseRepo struct {
	repository.CaseResponseRepository
	plain     []domain.CaseResponse
	expertise []domain.ResponseWithExpertise
}

func (f fakeResponseRepo) GetAllByCase(context.Context, uuid.UUID) ([]domain.CaseResponse, error) {
	return f.plain, nil
}

func (f fakeResponseRepo) GetResponsesWithUserExpertise(context.Context, uuid.UUID) ([]domain.ResponseWithExpertise, error) {
	return f.expertise, nil
}

type fakeStudyRepo struct {
	repository.StudyRepository
	cases []domain.Case
}

func (f fakeStudyRepo) GetByID(context.Context, uuid.UUID) (*domain.Study, error) {
	return &domain.Study{}, nil
}

func (f fakeStudyRepo) GetCases(context.Context, uuid.UUID) ([]domain.Case, error) {
	return f.cases, nil
}

type fakeStudyResponseRepo struct {
	repository.StudyResponseRepository
	byCase map[uuid.UUID][]domain.CaseResponse
}

func (f fakeStudyResponseRepo) GetAllByStudy(context.Context, uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	return f.byCase, nil
}

func strp(s string) *string { return &s }

// getCSV runs handler on GET /x/:id and parses the body with encoding/csv.
func getCSV(t *testing.T, handler gin.HandlerFunc) (*httptest.ResponseRecorder, [][]string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/x/:id", handler)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/x/"+uuid.NewString(), http.NoBody))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body %s", w.Code, w.Body)
	}
	recs, err := csv.NewReader(w.Body).ReadAll()
	if err != nil {
		t.Fatalf("output is not valid CSV: %v\n%s", err, w.Body)
	}
	return w, recs
}

var nastyResponse = domain.CaseResponse{
	ID:             uuid.New(),
	UserID:         uuid.New(),
	CreatedAt:      time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC),
	TimeTakenMS:    1234,
	DanisWeberType: strp("=HYPERLINK(\"http://x\")"),
	AOOTACode:      strp("44-B2, \"quoted\"\nnewline"),
}

func TestExportResponses_CSV(t *testing.T) {
	h := &CaseAnalyticsHandler{
		caseRepo:     fakeCaseRepo{c: &domain.Case{}},
		responseRepo: fakeResponseRepo{plain: []domain.CaseResponse{nastyResponse}},
	}
	w, recs := getCSV(t, h.ExportResponses)

	if ct := w.Header().Get("Content-Type"); ct != "text/csv" {
		t.Errorf("Content-Type = %q", ct)
	}
	if cd := w.Header().Get("Content-Disposition"); !strings.HasPrefix(cd, `attachment; filename="case_`) || !strings.HasSuffix(cd, `_responses.csv"`) {
		t.Errorf("Content-Disposition = %q", cd)
	}
	wantHeader := "response_id,user_id,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek"
	if got := strings.Join(recs[0], ","); got != wantHeader {
		t.Errorf("header = %q", got)
	}
	if len(recs) != 2 || len(recs[1]) != 8 {
		t.Fatalf("records = %q", recs)
	}
	row := recs[1]
	if row[3] != "1234" {
		t.Errorf("time_taken_ms = %q", row[3])
	}
	if row[4] != "'=HYPERLINK(\"http://x\")" {
		t.Errorf("danis_weber = %q", row[4])
	}
	if row[6] != "44-B2, \"quoted\"\nnewline" {
		t.Errorf("ao_ota did not round-trip: %q", row[6])
	}
}

func TestExportDetailedResponses_CSV(t *testing.T) {
	years := 7
	h := &CaseAnalyticsHandler{
		caseRepo: fakeCaseRepo{c: &domain.Case{}},
		responseRepo: fakeResponseRepo{expertise: []domain.ResponseWithExpertise{{
			CaseResponse:    nastyResponse,
			UserEmail:       "+evil@example.com",
			YearsExperience: &years,
			Specialty:       strp("Trauma, Orthopaedic"),
			Institution:     strp("@Hospital\r\nWing"),
		}}},
	}
	_, recs := getCSV(t, h.ExportDetailedResponses)

	wantHeader := "response_id,user_email,years_experience,specialty,training_level,institution,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek"
	if got := strings.Join(recs[0], ","); got != wantHeader {
		t.Errorf("header = %q", got)
	}
	if len(recs) != 2 || len(recs[1]) != 12 {
		t.Fatalf("records = %q", recs)
	}
	row := recs[1]
	for i, want := range map[int]string{
		1: "'+evil@example.com",
		2: "7",
		3: "Trauma, Orthopaedic",
		5: "'@Hospital\nWing", // encoding/csv reads CRLF inside quotes as LF
		7: "1234",
	} {
		if row[i] != want {
			t.Errorf("column %d = %q, want %q", i, row[i], want)
		}
	}
}

func TestExportStudyResponses_CSV(t *testing.T) {
	cs := domain.Case{ID: uuid.New(), Title: "Weber B, \"left\"\nankle"}
	neg := domain.Case{ID: uuid.New(), Title: "-1 case"}
	negTime := nastyResponse
	negTime.TimeTakenMS = -5
	h := &StudyHandler{
		studyRepo: fakeStudyRepo{cases: []domain.Case{cs, neg}},
		studyResponseRepo: fakeStudyResponseRepo{byCase: map[uuid.UUID][]domain.CaseResponse{
			cs.ID:  {nastyResponse},
			neg.ID: {negTime},
		}},
	}
	_, recs := getCSV(t, h.ExportStudyResponses)

	wantHeader := "case_id,case_title,response_id,user_id,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek"
	if got := strings.Join(recs[0], ","); got != wantHeader {
		t.Errorf("header = %q", got)
	}
	if len(recs) != 3 {
		t.Fatalf("records = %q", recs)
	}
	for _, row := range recs {
		if len(row) != 10 {
			t.Errorf("row has %d columns: %q", len(row), row)
		}
	}
	if recs[1][1] != cs.Title {
		t.Errorf("title did not round-trip: %q", recs[1][1])
	}
	if recs[2][1] != "'-1 case" {
		t.Errorf("formula-leading title = %q", recs[2][1])
	}
	if recs[1][5] != "1234" || recs[2][5] != "-5" {
		t.Errorf("numeric columns altered: %q, %q", recs[1][5], recs[2][5])
	}
}
