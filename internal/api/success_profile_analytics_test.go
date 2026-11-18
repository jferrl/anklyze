package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jferrl/anklyze/internal/domain"
)

func TestProfileGetAndUpdate(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)

	got := call[UserProfileResponse](t, e, e.rater, "GET", "/api/me/profile", "", http.StatusOK)
	if got.ID != e.rater.String() || got.Email != "rater@example.test" || got.Role != "user" || got.YearsExperience != nil || got.Specialty != "" {
		t.Fatalf("initial profile = %+v", got)
	}

	body := `{"display_name":"Dr Test","years_experience":12,"specialty":"foot_ankle","training_level":"attending","institution":"Test Hospital"}`
	put := call[UserProfileResponse](t, e, e.rater, "PUT", "/api/me/profile", body, http.StatusOK)
	if put.ID != e.rater.String() || put.DisplayName != "Dr Test" || put.YearsExperience == nil || *put.YearsExperience != 12 ||
		put.Specialty != "foot_ankle" || put.TrainingLevel != "attending" || put.Institution != "Test Hospital" {
		t.Fatalf("updated profile = %+v", put)
	}

	// A partial update leaves the other fields alone, and the change is persisted.
	call[UserProfileResponse](t, e, e.rater, "PUT", "/api/me/profile", `{"institution":"Other Hospital"}`, http.StatusOK)
	got = call[UserProfileResponse](t, e, e.rater, "GET", "/api/me/profile", "", http.StatusOK)
	if got.Institution != "Other Hospital" || got.DisplayName != "Dr Test" || got.YearsExperience == nil || *got.YearsExperience != 12 || got.Specialty != "foot_ankle" {
		t.Fatalf("profile after partial update = %+v", got)
	}

	// Another user's profile is untouched.
	other := call[UserProfileResponse](t, e, e.admin, "GET", "/api/me/profile", "", http.StatusOK)
	if other.DisplayName != "" || other.Institution != "" || other.Role != "admin" {
		t.Errorf("admin profile = %+v", other)
	}
}

// recordingAnalytics returns fixed data and remembers the range it was asked for.
type recordingAnalytics struct {
	from, to    time.Time
	system      string
	granularity domain.Granularity
}

func (r *recordingAnalytics) GetSummary(from, to time.Time) (*domain.AnalyticsSummary, error) {
	r.from, r.to = from, to
	return &domain.AnalyticsSummary{
		Period:                  domain.TimePeriod{From: from, To: to},
		TotalClassifications:    10,
		ImpossibleCount:         2,
		ImpossiblePercentage:    20,
		LanguageDistribution:    map[string]int64{"en": 7, "es": 3},
		DanisWeberDistribution:  map[string]int64{"Weber B": 6},
		LaugeHansenDistribution: map[string]int64{},
		AOOTADistribution:       map[string]int64{},
	}, nil
}

func (r *recordingAnalytics) GetTrends(from, to time.Time, g domain.Granularity) (*domain.TrendData, error) {
	r.from, r.to, r.granularity = from, to, g
	return &domain.TrendData{
		Period:      domain.TimePeriod{From: from, To: to},
		Granularity: string(g),
		DataPoints:  []domain.TrendDataPoint{{Date: "2024-01-01", Count: 4, ImpossibleCount: 1}},
	}, nil
}

func (r *recordingAnalytics) GetDistribution(system string, from, to time.Time) (*domain.ClassificationDistribution, error) {
	r.from, r.to, r.system = from, to, system
	return &domain.ClassificationDistribution{
		System:       system,
		Period:       domain.TimePeriod{From: from, To: to},
		Total:        10,
		Distribution: []domain.DistributionItem{{Value: "Weber B", Count: 6, Percentage: 60}},
	}, nil
}

func TestAnalyticsEndpointsReturnRepositoryData(t *testing.T) {
	t.Parallel()
	rec := &recordingAnalytics{}
	router := setupTestRouter(NewHandler(newTestClassificationSvc(), stubAudit{}, rec, nil))
	get := func(t *testing.T, path string, v any) {
		t.Helper()
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
		if w.Code != http.StatusOK {
			t.Fatalf("GET %s = %d: %s", path, w.Code, w.Body)
		}
		if err := json.Unmarshal(w.Body.Bytes(), v); err != nil {
			t.Fatal(err)
		}
	}
	// The handler turns the dates into the first instant of "from" and the last second of "to".
	wantFrom := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	wantTo := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
	checkRange := func(t *testing.T, p domain.TimePeriod) {
		t.Helper()
		if !rec.from.Equal(wantFrom) || !rec.to.Equal(wantTo) || !p.From.Equal(wantFrom) || !p.To.Equal(wantTo) {
			t.Errorf("repository range %v..%v, response period %v..%v, want %v..%v", rec.from, rec.to, p.From, p.To, wantFrom, wantTo)
		}
	}
	const q = "from=2024-01-01&to=2024-01-31"

	t.Run("summary", func(t *testing.T) {
		var got domain.AnalyticsSummary
		get(t, "/api/analytics/summary?"+q, &got)
		checkRange(t, got.Period)
		if got.TotalClassifications != 10 || got.ImpossibleCount != 2 || got.ImpossiblePercentage != 20 ||
			got.LanguageDistribution["es"] != 3 || got.DanisWeberDistribution["Weber B"] != 6 {
			t.Errorf("summary = %+v", got)
		}
	})

	t.Run("trends", func(t *testing.T) {
		var got domain.TrendData
		get(t, "/api/analytics/trends?granularity=week&"+q, &got)
		checkRange(t, got.Period)
		if rec.granularity != domain.GranularityWeek || got.Granularity != "week" {
			t.Errorf("granularity = %q / %q, want week", rec.granularity, got.Granularity)
		}
		if len(got.DataPoints) != 1 || got.DataPoints[0] != (domain.TrendDataPoint{Date: "2024-01-01", Count: 4, ImpossibleCount: 1}) {
			t.Errorf("data points = %+v", got.DataPoints)
		}
	})

	t.Run("distribution", func(t *testing.T) {
		var got domain.ClassificationDistribution
		get(t, "/api/analytics/distribution/ao-ota?"+q, &got)
		checkRange(t, got.Period)
		if rec.system != "ao-ota" || got.System != "ao-ota" || got.Total != 10 ||
			len(got.Distribution) != 1 || got.Distribution[0].Value != "Weber B" || got.Distribution[0].Percentage != 60 {
			t.Errorf("distribution = %+v (repository saw %q)", got, rec.system)
		}
	})
}
