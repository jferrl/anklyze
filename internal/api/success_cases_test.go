package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// respond submits the engine's classification of a lateral-only fracture at the
// given fibular level, as the given user.
func (e *apiEnv) respond(t *testing.T, as, caseID uuid.UUID, level domain.FibularLevel) SubmitResponseResult {
	t.Helper()
	in := domain.FractureInput{InvolvedMalleoli: domain.InvolvedLateralOnly, FibularLevel: level}
	body, err := json.Marshal(SubmitResponseRequest{Input: in, Classification: engineResult(t, in), TimeTakenMS: 1500})
	if err != nil {
		t.Fatal(err)
	}
	return call[SubmitResponseResult](t, e, as, "POST", "/api/cases/"+caseID.String()+"/responses", string(body), http.StatusCreated)
}

func TestAdminCaseLifecycle(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)

	cs := call[domain.Case](t, e, e.admin, "POST", "/api/admin/cases",
		`{"title":"Ankle 1","description":"first"}`, http.StatusCreated)
	if cs.Title != "Ankle 1" || cs.Description != "first" || cs.Status != domain.CaseStatusDraft || cs.CreatedBy != e.admin {
		t.Fatalf("created = %+v", cs)
	}
	path := "/api/admin/cases/" + cs.ID.String()

	cs = call[domain.Case](t, e, e.admin, "PUT", path, `{"title":"Ankle 1b","description":"edited"}`, http.StatusOK)
	if cs.Title != "Ankle 1b" || cs.Description != "edited" || cs.Status != domain.CaseStatusDraft {
		t.Fatalf("updated = %+v", cs)
	}

	e.addImage(t, cs.ID, domain.ImageCategoryXRay, 0)
	cs = call[domain.Case](t, e, e.admin, "PUT", path+"/publish", "", http.StatusOK)
	if cs.Status != domain.CaseStatusPublished || cs.PublishedAt == nil {
		t.Fatalf("published = %+v", cs)
	}

	// A published case keeps its title but accepts a new description.
	cs = call[domain.Case](t, e, e.admin, "PUT", path, `{"description":"clarified"}`, http.StatusOK)
	if cs.Title != "Ankle 1b" || cs.Description != "clarified" {
		t.Fatalf("published update = %+v", cs)
	}

	cs = call[domain.Case](t, e, e.admin, "PUT", path+"/close", "", http.StatusOK)
	if cs.Status != domain.CaseStatusClosed {
		t.Fatalf("closed = %+v", cs)
	}

	got := call[domain.CaseWithImages](t, e, e.admin, "GET", path, "", http.StatusOK)
	if got.ID != cs.ID || got.Status != domain.CaseStatusClosed || len(got.Images) != 1 {
		t.Fatalf("get = %+v", got)
	}
}

func TestAdminListCases(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	e.newCase(t, "draft a")
	e.newCase(t, "draft b")
	pub, _ := e.publishedCase(t, "published")

	t.Run("status filter", func(t *testing.T) {
		got := call[CaseListResponse](t, e, e.admin, "GET", "/api/admin/cases?status=published", "", http.StatusOK)
		if got.Total != 1 || len(got.Cases) != 1 || got.Cases[0].ID != pub.ID {
			t.Fatalf("published list = %+v", got)
		}
		got = call[CaseListResponse](t, e, e.admin, "GET", "/api/admin/cases?status=draft", "", http.StatusOK)
		if got.Total != 2 || len(got.Cases) != 2 {
			t.Fatalf("draft list = %+v", got)
		}
	})

	t.Run("pagination", func(t *testing.T) {
		p1 := call[CaseListResponse](t, e, e.admin, "GET", "/api/admin/cases?page=1&limit=2", "", http.StatusOK)
		p2 := call[CaseListResponse](t, e, e.admin, "GET", "/api/admin/cases?page=2&limit=2", "", http.StatusOK)
		if p1.Total != 3 || p1.Page != 1 || p1.Limit != 2 || len(p1.Cases) != 2 {
			t.Fatalf("page 1 = %+v", p1)
		}
		if p2.Total != 3 || p2.Page != 2 || len(p2.Cases) != 1 {
			t.Fatalf("page 2 = %+v", p2)
		}
		seen := map[uuid.UUID]bool{}
		for _, c := range append(p1.Cases, p2.Cases...) {
			seen[c.ID] = true
		}
		if len(seen) != 3 {
			t.Errorf("pages overlap: %d distinct cases, want 3", len(seen))
		}
	})
}

func TestRaterBrowsesPublishedCases(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	e.newCase(t, "draft")
	pub, img := e.publishedCase(t, "visible")

	list := call[UserCaseListResponse](t, e, e.rater, "GET", "/api/cases", "", http.StatusOK)
	if list.Total != 1 || len(list.Cases) != 1 {
		t.Fatalf("list = %+v, want only the published case", list)
	}
	item := list.Cases[0]
	if item.ID != pub.ID || item.Title != "visible" || item.ImageCount != 1 || item.HasResponded || list.TotalCompleted != 0 {
		t.Fatalf("item = %+v total_completed=%d", item, list.TotalCompleted)
	}

	w := e.do(e.rater, "GET", "/api/cases/"+pub.ID.String(), "")
	if w.Code != http.StatusOK {
		t.Fatalf("detail = %d: %s", w.Code, w.Body)
	}
	var detail UserCaseDetailResponse
	if err := json.Unmarshal(w.Body.Bytes(), &detail); err != nil {
		t.Fatal(err)
	}
	if detail.ID != pub.ID || detail.IsExpired || len(detail.Images) != 1 || detail.Images[0].ID != img.ID || detail.Images[0].Category != domain.ImageCategoryXRay {
		t.Fatalf("detail = %+v", detail)
	}
	// Storage keys stay server-side.
	if strings.Contains(w.Body.String(), img.StoragePath) {
		t.Errorf("detail leaks the storage path: %s", w.Body)
	}
}

func TestRaterCannotSeeDraftCase(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	draft := e.newCase(t, "draft")
	assertAPIError(t, e.do(e.rater, "GET", "/api/cases/"+draft.ID.String(), ""), http.StatusNotFound, CodeNotFound)
}

func TestSignedURLsWithStorage(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	cs, img := e.publishedCase(t, "c")
	wantURL := "https://storage.test/" + img.StoragePath + "?sig=ok"
	before := time.Now()
	checkExpiry := func(t *testing.T, got time.Time) {
		t.Helper()
		if got.Before(before.Add(testSignedURLTTL)) || got.After(time.Now().Add(testSignedURLTTL)) {
			t.Errorf("expires_at = %v, want about now + %v", got, testSignedURLTTL)
		}
	}

	t.Run("rater batch", func(t *testing.T) {
		got := call[struct {
			URLs map[string]SignedURLResponse `json:"urls"`
		}](t, e, e.rater, "GET", "/api/cases/"+cs.ID.String()+"/images/urls", "", http.StatusOK)
		u, ok := got.URLs[img.ID.String()]
		if len(got.URLs) != 1 || !ok || u.URL != wantURL {
			t.Fatalf("urls = %+v, want %s", got.URLs, wantURL)
		}
		checkExpiry(t, u.ExpiresAt)
	})

	t.Run("rater single", func(t *testing.T) {
		got := call[SignedURLResponse](t, e, e.rater, "GET", "/api/cases/"+cs.ID.String()+"/images/"+img.ID.String()+"/url", "", http.StatusOK)
		if got.URL != wantURL {
			t.Fatalf("url = %q, want %q", got.URL, wantURL)
		}
		checkExpiry(t, got.ExpiresAt)
	})

	t.Run("admin single", func(t *testing.T) {
		got := call[SignedURLResponse](t, e, e.admin, "GET", "/api/admin/cases/"+cs.ID.String()+"/images/"+img.ID.String()+"/url", "", http.StatusOK)
		if got.URL != wantURL {
			t.Fatalf("url = %q, want %q", got.URL, wantURL)
		}
		checkExpiry(t, got.ExpiresAt)
	})

	t.Run("admin list", func(t *testing.T) {
		got := call[struct {
			Images []AdminImageResponse `json:"images"`
		}](t, e, e.admin, "GET", "/api/admin/cases/"+cs.ID.String()+"/images", "", http.StatusOK)
		if len(got.Images) != 1 || got.Images[0].ID != img.ID || got.Images[0].SignedURL != wantURL {
			t.Fatalf("images = %+v", got.Images)
		}
	})
}

func TestSubmitResponseStoresEngineClassification(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	cs, _ := e.publishedCase(t, "c")

	got := e.respond(t, e.rater, cs.ID, domain.FibularLevelSuprasindesmal)
	r := got.Response
	if r == nil || r.CaseID != cs.ID || r.UserID != e.rater || r.TimeTakenMS != 1500 {
		t.Fatalf("response = %+v", r)
	}
	stored, err := r.GetClassification()
	if err != nil {
		t.Fatal(err)
	}
	want := engineResult(t, domain.FractureInput{InvolvedMalleoli: domain.InvolvedLateralOnly, FibularLevel: domain.FibularLevelSuprasindesmal})
	if !stored.SameClassification(want) || stored.DanisWeber == nil || stored.DanisWeber.Type != "Weber C" {
		t.Errorf("stored = %+v, want %+v (Weber C)", stored, want)
	}

	// Denormalized columns feed analytics and exports.
	var row domain.CaseResponse
	if err := e.db.First(&row, "id = ?", r.ID).Error; err != nil {
		t.Fatal(err)
	}
	if row.DanisWeberType == nil || *row.DanisWeberType != "Weber C" || row.AOOTACode == nil || *row.AOOTACode != "44-C1" {
		t.Errorf("denormalized columns = %v %v", row.DanisWeberType, row.AOOTACode)
	}

	t.Run("duplicate is rejected", func(t *testing.T) {
		in := domain.FractureInput{InvolvedMalleoli: domain.InvolvedLateralOnly, FibularLevel: domain.FibularLevelSuprasindesmal}
		body, err := json.Marshal(SubmitResponseRequest{Input: in, Classification: want})
		if err != nil {
			t.Fatal(err)
		}
		w := e.do(e.rater, "POST", "/api/cases/"+cs.ID.String()+"/responses", string(body))
		assertAPIError(t, w, http.StatusConflict, domain.ErrCodeAlreadyResponded)
	})

	t.Run("my-responses", func(t *testing.T) {
		mine := call[struct {
			Responses []domain.CaseResponse `json:"responses"`
		}](t, e, e.rater, "GET", "/api/cases/"+cs.ID.String()+"/my-responses", "", http.StatusOK)
		if len(mine.Responses) != 1 || mine.Responses[0].ID != r.ID {
			t.Fatalf("my responses = %+v, want only %s", mine.Responses, r.ID)
		}
		// Another user sees none of it.
		other := call[struct {
			Responses []domain.CaseResponse `json:"responses"`
		}](t, e, e.admin, "GET", "/api/cases/"+cs.ID.String()+"/my-responses", "", http.StatusOK)
		if len(other.Responses) != 0 {
			t.Errorf("admin sees %d of the rater's responses", len(other.Responses))
		}
	})

	t.Run("rater list reflects the response", func(t *testing.T) {
		list := call[UserCaseListResponse](t, e, e.rater, "GET", "/api/cases", "", http.StatusOK)
		if list.TotalCompleted != 1 || !list.Cases[0].HasResponded || list.Cases[0].MyResponseCount != 1 {
			t.Fatalf("list = %+v", list)
		}
	})
}

func TestAdminCaseResponsesAndExports(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	cs, _ := e.publishedCase(t, "c")
	e.respond(t, e.rater, cs.ID, domain.FibularLevelInfrasindesmal)
	second := uuid.New()
	e.addUser(t, second, "second@example.test", domain.UserRoleUser)
	e.respond(t, second, cs.ID, domain.FibularLevelTransindesmal)
	base := "/api/admin/cases/" + cs.ID.String()

	t.Run("list", func(t *testing.T) {
		got := call[struct {
			Responses []domain.CaseResponse `json:"responses"`
			Total     int64                 `json:"total"`
			Page      int                   `json:"page"`
			Limit     int                   `json:"limit"`
		}](t, e, e.admin, "GET", base+"/responses?limit=1", "", http.StatusOK)
		if got.Total != 2 || len(got.Responses) != 1 || got.Page != 1 || got.Limit != 1 {
			t.Fatalf("list = %+v", got)
		}
	})

	t.Run("analytics summary", func(t *testing.T) {
		got := call[domain.CaseAnalyticsSummary](t, e, e.admin, "GET", base+"/analytics", "", http.StatusOK)
		if got.CaseID != cs.ID || got.ResponseCount != 2 || got.UniqueRespondents != 2 {
			t.Fatalf("summary = %+v", got)
		}
	})

	t.Run("csv export", func(t *testing.T) {
		w := e.do(e.admin, "GET", base+"/export", "")
		rows := parseCSV(t, w, "text/csv")
		if got := strings.Join(rows[0], ","); got != "response_id,user_id,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek" {
			t.Errorf("header = %s", got)
		}
		if len(rows) != 3 {
			t.Fatalf("%d rows, want header + 2", len(rows))
		}
		codes := map[string]bool{rows[1][4]: true, rows[2][4]: true}
		if !codes["Weber A"] || !codes["Weber B"] {
			t.Errorf("danis_weber column = %v, want Weber A and Weber B", codes)
		}
	})

	t.Run("detailed csv export", func(t *testing.T) {
		w := e.do(e.admin, "GET", base+"/export/detailed", "")
		rows := parseCSV(t, w, "text/csv")
		if rows[0][1] != "user_email" || len(rows) != 3 {
			t.Fatalf("rows = %v, want header + 2", rows)
		}
	})

	t.Run("reliability", func(t *testing.T) {
		got := call[ReliabilityMetricsResponse](t, e, e.admin, "GET", base+"/reliability", "", http.StatusOK)
		if got.ReliabilityMetrics == nil || got.CaseID != cs.ID || got.TotalResponses != 2 || got.UniqueRaters != 2 || got.CalculatedAt.IsZero() {
			t.Fatalf("reliability = %+v", got)
		}
		dw := got.DanisWeberAgreement
		if dw == nil || dw.PercentAgreement == nil || *dw.PercentAgreement != 50 || dw.CategoryCounts["Weber A"] != 1 || dw.CategoryCounts["Weber B"] != 1 {
			t.Fatalf("danis_weber agreement = %+v, want 50%% over Weber A and Weber B", dw)
		}
	})
}

func TestAdminGoldStandardAndAccuracy(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	cs, _ := e.publishedCase(t, "c")
	base := "/api/admin/cases/" + cs.ID.String()

	set := call[domain.Case](t, e, e.admin, "PUT", base+"/gold-standard", `{"danis_weber":"Weber B"}`, http.StatusOK)
	gold, err := set.GetGoldStandard()
	if err != nil || gold == nil || gold.DanisWeber == nil || gold.DanisWeber.Type != "Weber B" {
		t.Fatalf("gold standard = %+v, %v", gold, err)
	}

	e.respond(t, e.rater, cs.ID, domain.FibularLevelTransindesmal) // Weber B: matches
	second := uuid.New()
	e.addUser(t, second, "second@example.test", domain.UserRoleUser)
	e.respond(t, second, cs.ID, domain.FibularLevelInfrasindesmal) // Weber A: misses

	acc := call[domain.GoldStandardAccuracy](t, e, e.admin, "GET", base+"/accuracy", "", http.StatusOK)
	if !acc.HasGold || acc.TotalRaters != 2 || acc.DanisWeberAccuracy == nil {
		t.Fatalf("accuracy = %+v", acc)
	}
	if dw := acc.DanisWeberAccuracy; dw.GoldValue != "Weber B" || dw.Accuracy != 50 {
		t.Errorf("danis_weber accuracy = %+v, want gold Weber B at 50%%", dw)
	}

	w := e.do(e.admin, "DELETE", base+"/gold-standard", "")
	if w.Code != http.StatusNoContent {
		t.Fatalf("delete gold standard = %d: %s", w.Code, w.Body)
	}
	got := call[domain.CaseWithImages](t, e, e.admin, "GET", base, "", http.StatusOK)
	if got.HasGoldStandard() {
		t.Errorf("gold standard still set: %s", got.GoldStandard)
	}
}
