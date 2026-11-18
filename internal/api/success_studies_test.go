package api

import (
	"math"
	"net/http"
	"slices"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

func (e *apiEnv) newStudy(t *testing.T, title string) domain.Study {
	t.Helper()
	return call[domain.Study](t, e, e.admin, "POST", "/api/admin/studies", `{"title":"`+title+`","description":"d"}`, http.StatusCreated)
}

func caseIDs(cases []domain.Case) []uuid.UUID {
	ids := make([]uuid.UUID, len(cases))
	for i, c := range cases {
		ids[i] = c.ID
	}
	return ids
}

func TestStudyLifecycle(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	c1, _ := e.publishedCase(t, "c1")
	c2, _ := e.publishedCase(t, "c2")
	c3, _ := e.publishedCase(t, "c3")

	st := e.newStudy(t, "Study 1")
	if st.Title != "Study 1" || st.Status != domain.StudyStatusDraft || st.CreatedBy != e.admin || st.CaseCount != 0 {
		t.Fatalf("created = %+v", st)
	}
	path := "/api/admin/studies/" + st.ID.String()

	st = call[domain.Study](t, e, e.admin, "PUT", path, `{"title":"Study 1b","description":"edited"}`, http.StatusOK)
	if st.Title != "Study 1b" || st.Description != "edited" {
		t.Fatalf("updated = %+v", st)
	}

	// Case management: auto order, explicit order, then add-all picks up the rest.
	added := call[domain.Case](t, e, e.admin, "POST", path+"/cases", `{"case_id":"`+c1.ID.String()+`"}`, http.StatusCreated)
	if added.StudyID == nil || *added.StudyID != st.ID || added.CaseOrder != 0 {
		t.Fatalf("added = %+v", added)
	}
	added = call[domain.Case](t, e, e.admin, "POST", path+"/cases", `{"case_id":"`+c2.ID.String()+`","case_order":5}`, http.StatusCreated)
	if added.CaseOrder != 5 {
		t.Fatalf("added with order = %+v", added)
	}
	assertAPIError(t, e.do(e.admin, "POST", path+"/cases", `{"case_id":"`+c1.ID.String()+`"}`), http.StatusConflict, CodeConflict)
	all := call[AddAllCasesResponse](t, e, e.admin, "POST", path+"/cases/add-all", "", http.StatusOK)
	if all.Added != 1 {
		t.Fatalf("add-all added %d, want 1 (c3 only)", all.Added)
	}

	detail := call[StudyDetailResponse](t, e, e.admin, "GET", path, "", http.StatusOK)
	if detail.CaseCount != 3 || !slices.Equal(caseIDs(detail.Cases), []uuid.UUID{c1.ID, c2.ID, c3.ID}) {
		t.Fatalf("detail case_count=%d cases=%v, want c1 c2 c3 in that order", detail.CaseCount, caseIDs(detail.Cases))
	}

	w := e.do(e.admin, "PUT", path+"/cases/reorder", `{"case_ids":["`+c3.ID.String()+`","`+c1.ID.String()+`","`+c2.ID.String()+`"]}`)
	if w.Code != http.StatusNoContent {
		t.Fatalf("reorder = %d: %s", w.Code, w.Body)
	}
	detail = call[StudyDetailResponse](t, e, e.admin, "GET", path, "", http.StatusOK)
	if !slices.Equal(caseIDs(detail.Cases), []uuid.UUID{c3.ID, c1.ID, c2.ID}) {
		t.Fatalf("after reorder = %v, want c3 c1 c2", caseIDs(detail.Cases))
	}

	w = e.do(e.admin, "DELETE", path+"/cases/"+c2.ID.String(), "")
	if w.Code != http.StatusNoContent {
		t.Fatalf("remove = %d: %s", w.Code, w.Body)
	}
	detail = call[StudyDetailResponse](t, e, e.admin, "GET", path, "", http.StatusOK)
	if detail.CaseCount != 2 || !slices.Equal(caseIDs(detail.Cases), []uuid.UUID{c3.ID, c1.ID}) {
		t.Fatalf("after remove case_count=%d cases=%v", detail.CaseCount, caseIDs(detail.Cases))
	}

	// Status transitions: draft -> active -> closed.
	st = call[domain.Study](t, e, e.admin, "PUT", path+"/activate", "", http.StatusOK)
	if st.Status != domain.StudyStatusActive {
		t.Fatalf("activated = %+v", st)
	}
	assertAPIError(t, e.do(e.admin, "PUT", path+"/activate", ""), http.StatusBadRequest, domain.ErrCodeInvalidStateTransition)

	e.respond(t, e.rater, c1.ID, domain.FibularLevelInfrasindesmal) // an active study takes responses
	st = call[domain.Study](t, e, e.admin, "PUT", path+"/close", "", http.StatusOK)
	if st.Status != domain.StudyStatusClosed {
		t.Fatalf("closed = %+v", st)
	}
	in := `{"input":{"involved_malleoli":"lateral_only","fibular_level":"infrasindesmal"},"classification":{}}`
	assertAPIError(t, e.do(e.admin, "POST", "/api/cases/"+c3.ID.String()+"/responses", in), http.StatusForbidden, domain.ErrCodeStudyClosed)

	got := call[domain.Study](t, e, e.admin, "GET", path, "", http.StatusOK)
	if got.Status != domain.StudyStatusClosed || got.TotalResponses != 1 || got.UniqueRaters != 1 {
		t.Fatalf("final study = %+v, want closed with 1 response from 1 rater", got)
	}

	w = e.do(e.admin, "DELETE", path, "")
	if w.Code != http.StatusNoContent {
		t.Fatalf("delete = %d: %s", w.Code, w.Body)
	}
	assertAPIError(t, e.do(e.admin, "GET", path, ""), http.StatusNotFound, CodeNotFound)
}

func TestListStudies(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	c, _ := e.publishedCase(t, "c")
	active := e.newStudy(t, "active")
	e.newStudy(t, "draft 1")
	e.newStudy(t, "draft 2")
	call[domain.Case](t, e, e.admin, "POST", "/api/admin/studies/"+active.ID.String()+"/cases", `{"case_id":"`+c.ID.String()+`"}`, http.StatusCreated)
	call[domain.Study](t, e, e.admin, "PUT", "/api/admin/studies/"+active.ID.String()+"/activate", "", http.StatusOK)

	got := call[StudyListResponse](t, e, e.admin, "GET", "/api/admin/studies?status=active", "", http.StatusOK)
	if got.Total != 1 || len(got.Studies) != 1 || got.Studies[0].ID != active.ID {
		t.Fatalf("active = %+v", got)
	}
	got = call[StudyListResponse](t, e, e.admin, "GET", "/api/admin/studies?page=2&limit=2", "", http.StatusOK)
	if got.Total != 3 || got.Page != 2 || got.Limit != 2 || len(got.Studies) != 1 {
		t.Fatalf("page 2 = %+v", got)
	}
}

// kappaStudy builds a study of four published cases rated by two raters. In
// Danis-Weber terms the ratings are
//
//	case:    1 2 3 4
//	rater A: A A B A
//	rater B: A A B B
//
// and the AO/OTA codes (44-A1 / 44-B1) follow the same pattern. Case 1 has
// gold standard Weber A and case 4 has Weber B.
func kappaStudy(t *testing.T, e *apiEnv) (domain.Study, []domain.Case, uuid.UUID) {
	t.Helper()
	st := e.newStudy(t, "kappa")
	rater2 := uuid.New()
	e.addUser(t, rater2, "second@example.test", domain.UserRoleUser)

	infra, trans := domain.FibularLevelInfrasindesmal, domain.FibularLevelTransindesmal
	byA := []domain.FibularLevel{infra, infra, trans, infra}
	byB := []domain.FibularLevel{infra, infra, trans, trans}
	var cases []domain.Case
	for i := range byA {
		cs, _ := e.publishedCase(t, "case "+string(rune('1'+i)))
		call[domain.Case](t, e, e.admin, "POST", "/api/admin/studies/"+st.ID.String()+"/cases", `{"case_id":"`+cs.ID.String()+`"}`, http.StatusCreated)
		e.respond(t, e.rater, cs.ID, byA[i])
		e.respond(t, rater2, cs.ID, byB[i])
		cases = append(cases, cs)
	}
	call[domain.Case](t, e, e.admin, "PUT", "/api/admin/cases/"+cases[0].ID.String()+"/gold-standard", `{"danis_weber":"Weber A"}`, http.StatusOK)
	call[domain.Case](t, e, e.admin, "PUT", "/api/admin/cases/"+cases[3].ID.String()+"/gold-standard", `{"danis_weber":"Weber B"}`, http.StatusOK)
	return st, cases, rater2
}

func TestStudyReliability(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	st, cases, _ := kappaStudy(t, e)

	got := call[StudyReliabilityResponse](t, e, e.admin, "GET", "/api/admin/studies/"+st.ID.String()+"/reliability", "", http.StatusOK)
	if got.StudyReliabilityMetrics == nil || got.CalculatedAt.IsZero() {
		t.Fatalf("response = %+v", got)
	}
	if got.StudyID != st.ID || got.StudyTitle != "kappa" || got.TotalCases != 4 || got.TotalResponses != 8 || got.UniqueRaters != 2 || got.CompleteRaters != 2 {
		t.Fatalf("counts = %+v", got.StudyReliabilityMetrics)
	}
	if len(got.PerCaseMetrics) != len(cases) {
		t.Errorf("per_case_metrics has %d rows, want %d", len(got.PerCaseMetrics), len(cases))
	}

	// Hand computed from the table above, two raters and categories A and B.
	// Cohen: po = 3/4, pe = (3/4)(1/2) + (1/4)(1/2) = 1/2, kappa = (3/4 - 1/2) / (1 - 1/2) = 1/2.
	// Fleiss: P-bar = 3/4, pe = (5/8)^2 + (3/8)^2 = 17/32, kappa = (3/4 - 17/32) / (15/32) = 7/15.
	const wantCohen, wantFleiss = 0.5, 7.0 / 15.0
	for _, tt := range []struct {
		system string
		cohen  *domain.CohensKappaResult
		fleiss *domain.FleissKappaResult
	}{
		{"danis_weber", got.DanisWeberCohen, got.DanisWeberFleiss},
		{"ao_ota", got.AOOTACohen, got.AOOTAFleiss},
	} {
		if tt.cohen == nil || tt.fleiss == nil {
			t.Fatalf("%s: missing kappa: cohen=%v fleiss=%v", tt.system, tt.cohen, tt.fleiss)
		}
		if tt.cohen.Kappa == nil || math.Abs(*tt.cohen.Kappa-wantCohen) > 1e-9 || tt.cohen.NumSubjects != 4 {
			t.Errorf("%s: cohen = %+v, want kappa %v over 4 cases", tt.system, tt.cohen, wantCohen)
		}
		if tt.fleiss.Kappa == nil || math.Abs(*tt.fleiss.Kappa-wantFleiss) > 1e-9 || tt.fleiss.NumSubjects != 4 || tt.fleiss.NumRaters != 2 || tt.fleiss.NumCategories != 2 || tt.fleiss.ConfidenceInterval == nil {
			t.Errorf("%s: fleiss = %+v, want kappa %v over 4 cases, 2 raters, 2 categories", tt.system, tt.fleiss, wantFleiss)
		}
	}
	if got.DanisWeberCohen.Interpretation != domain.KappaInterpretation(wantCohen) {
		t.Errorf("interpretation = %q", got.DanisWeberCohen.Interpretation)
	}
}

func TestStudyGoldStandardAccuracy(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	st, cases, rater2 := kappaStudy(t, e)

	got := call[StudyGoldStandardResponse](t, e, e.admin, "GET", "/api/admin/studies/"+st.ID.String()+"/accuracy", "", http.StatusOK)
	if got.StudyGoldStandardMetrics == nil || got.CalculatedAt.IsZero() {
		t.Fatalf("response = %+v", got)
	}
	if got.TotalCases != 4 || got.CasesWithGold != 2 || len(got.PerCaseAccuracy) != 4 {
		t.Fatalf("counts = cases %d, with gold %d, per case %d", got.TotalCases, got.CasesWithGold, len(got.PerCaseAccuracy))
	}
	// Case 1: both raters say A, gold A -> 100%. Case 4: A and B, gold B -> 50%.
	if dw := got.DanisWeberAccuracy; dw == nil || dw.MeanAccuracy != 75 || dw.CasesEvaluated != 2 {
		t.Errorf("danis_weber aggregate = %+v, want mean 75 over 2 cases", dw)
	}
	byCase := map[uuid.UUID]domain.PerCaseAccuracy{}
	for _, p := range got.PerCaseAccuracy {
		byCase[p.CaseID] = p
	}
	if p := byCase[cases[0].ID]; !p.HasGold || p.DanisWeberAccuracy == nil || *p.DanisWeberAccuracy != 100 {
		t.Errorf("case 1 = %+v, want gold at 100", p)
	}
	if p := byCase[cases[3].ID]; !p.HasGold || p.DanisWeberAccuracy == nil || *p.DanisWeberAccuracy != 50 {
		t.Errorf("case 4 = %+v, want gold at 50", p)
	}
	if p := byCase[cases[1].ID]; p.HasGold || p.DanisWeberAccuracy != nil {
		t.Errorf("case 2 = %+v, want no gold standard", p)
	}

	// Rater names are filled in from the user table; rater A misses case 4.
	if len(got.PerRaterAccuracy) != 2 {
		t.Fatalf("per_rater_accuracy = %+v", got.PerRaterAccuracy)
	}
	wantRaters := map[uuid.UUID]struct {
		email string
		dw    float64
	}{e.rater: {"rater@example.test", 50}, rater2: {"second@example.test", 100}}
	for _, r := range got.PerRaterAccuracy {
		want, ok := wantRaters[r.UserID]
		if !ok || r.UserEmail != want.email || r.CasesCompleted != 2 || r.DanisWeberAccuracy == nil || *r.DanisWeberAccuracy != want.dw {
			t.Errorf("rater %s = %+v, want %+v", r.UserID, r, want)
		}
	}
}

func TestStudyExport(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	st, cases, _ := kappaStudy(t, e)

	rows := parseCSV(t, e.do(e.admin, "GET", "/api/admin/studies/"+st.ID.String()+"/export", ""), "text/csv")
	if len(rows) != 1+8 {
		t.Fatalf("%d rows, want header + 8 responses", len(rows))
	}
	if rows[0][0] != "case_id" || rows[0][6] != "danis_weber" {
		t.Errorf("header = %v", rows[0])
	}
	perCase := map[string]int{}
	for _, r := range rows[1:] {
		perCase[r[0]]++
	}
	for _, c := range cases {
		if perCase[c.ID.String()] != 2 {
			t.Errorf("case %s has %d rows, want 2", c.Title, perCase[c.ID.String()])
		}
	}
}
