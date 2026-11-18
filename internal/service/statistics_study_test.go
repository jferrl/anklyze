package service

import (
	"math"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// noResponse in a fixture row means the rater never submitted that case.
const noResponse = "-"

// studyFixture builds a study of len(rows[0]) cases answered by len(rows) raters.
// rows[r][c] is rater r's answer for case c in one system; "" is a response without
// an answer in that system, noResponse is no response at all.
type studyFixture struct {
	study     *domain.Study
	cases     []domain.Case
	responses map[uuid.UUID][]domain.CaseResponse
}

func newStudyFixture(system string, rows [][]string) studyFixture {
	f := studyFixture{
		study:     &domain.Study{ID: uuid.New(), Title: "fixture"},
		responses: map[uuid.UUID][]domain.CaseResponse{},
	}
	raters := make([]uuid.UUID, len(rows))
	for r := range rows {
		raters[r] = uuid.New()
	}
	for c := range rows[0] {
		cs := domain.Case{ID: uuid.New(), Title: "case", CaseOrder: c + 1}
		f.cases = append(f.cases, cs)
		for r := range rows {
			if rows[r][c] == noResponse {
				continue
			}
			resp := domain.CaseResponse{UserID: raters[r], CaseID: cs.ID}
			if v := rows[r][c]; v != "" {
				switch system {
				case "danis_weber":
					resp.DanisWeberType = &v
				case "ao_ota":
					resp.AOOTACode = &v
				case "bartonicek":
					resp.BartonicekType = &v
				}
			}
			f.responses[cs.ID] = append(f.responses[cs.ID], resp)
		}
	}
	return f
}

func (f studyFixture) metrics(t *testing.T) *domain.StudyReliabilityMetrics {
	t.Helper()
	m, err := NewStatisticsService().CalculateStudyReliabilityMetrics(f.study, f.cases, f.responses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	return m
}

func approx(a, b, tol float64) bool { return math.Abs(a-b) <= tol }

// F5: a complete rater left Bartonicek empty on one case. Everyone who answered agrees,
// so kappa must be 1; counting the empty answer as a missing rater pulled it down to 0.7624.
// The case is dropped for that system, and the result says so.
func TestStudyReliability_FleissDropsCaseWithUnansweredSystem(t *testing.T) {
	t.Parallel()

	f := newStudyFixture("bartonicek", [][]string{
		{"1", "2", "3", "1"},
		{"1", "2", "3", "1"},
		{"1", "2", "3", ""},
	})

	got := f.metrics(t).BartonicekFleiss
	if got == nil {
		t.Fatal("expected a Bartonicek Fleiss result")
	}
	if !approx(got.Kappa, 1, 1e-12) {
		t.Errorf("kappa = %v, want 1", got.Kappa)
	}
	if got.NumSubjects != 3 || got.NumCasesExcluded != 1 || got.NumRaters != 3 {
		t.Errorf("subjects %d, excluded %d, raters %d; want 3, 1, 3", got.NumSubjects, got.NumCasesExcluded, got.NumRaters)
	}
}

// A case nobody could rate in the system (no posterior fragment) is dropped, not a rater.
func TestStudyReliability_FleissDropsCaseNobodyAnswered(t *testing.T) {
	t.Parallel()

	f := newStudyFixture("bartonicek", [][]string{
		{"1", "", "2", "3"},
		{"1", "", "2", "3"},
		{"1", "", "2", "1"},
	})

	got := f.metrics(t).BartonicekFleiss
	if got == nil {
		t.Fatal("expected a Bartonicek Fleiss result")
	}
	if got.NumRaters != 3 || got.NumSubjects != 3 || got.NumCasesExcluded != 1 {
		t.Errorf("raters %d, subjects %d, excluded %d; want 3, 3, 1", got.NumRaters, got.NumSubjects, got.NumCasesExcluded)
	}
}

func TestStudyReliability_FleissNeedsTwoAnsweredCases(t *testing.T) {
	t.Parallel()

	f := newStudyFixture("bartonicek", [][]string{
		{"1", "", ""},
		{"1", "", "2"},
	})

	m := f.metrics(t)
	if m.BartonicekFleiss != nil || m.BartonicekCohen != nil {
		t.Errorf("expected no kappa from one answered case, got %+v %+v", m.BartonicekFleiss, m.BartonicekCohen)
	}
}

// Three raters, cases (A,A,A) (A,A,B) (B,B,B): rows (3,0) (2,1) (0,3).
// P_i = 1, 1/3, 1 so Pbar = 7/9; p_A = 5/9, p_B = 4/9 so Pe = 41/81; kappa = (7/9 - 41/81) / (40/81) = 0.55.
func TestStudyReliability_FleissHandComputed(t *testing.T) {
	t.Parallel()

	f := newStudyFixture("danis_weber", [][]string{
		{"A", "A", "B"},
		{"A", "A", "B"},
		{"A", "B", "B"},
	})

	m := f.metrics(t)
	got := m.DanisWeberFleiss
	if got == nil {
		t.Fatal("expected a Fleiss result")
	}
	if !approx(got.Kappa, 0.55, 1e-12) {
		t.Errorf("kappa = %v, want 0.55", got.Kappa)
	}
	if got.NumSubjects != 3 || got.NumRaters != 3 || got.NumCategories != 2 || got.NumCasesExcluded != 0 {
		t.Errorf("unexpected counts: %+v", got)
	}
	if got.ConfidenceInterval == nil {
		t.Error("expected a bootstrap interval")
	}
	if m.DanisWeberCohen != nil {
		t.Error("Cohen's kappa must not be computed for 3 raters")
	}
}

func TestStudyReliability_FleissIntervalReproducible(t *testing.T) {
	t.Parallel()

	rows := [][]string{
		{"A", "A", "B", "B", "A", "C"},
		{"A", "B", "B", "B", "A", "C"},
		{"A", "A", "B", "C", "B", "C"},
	}

	first := newStudyFixture("danis_weber", rows).metrics(t).DanisWeberFleiss
	second := newStudyFixture("danis_weber", rows).metrics(t).DanisWeberFleiss

	if first == nil || second == nil || first.ConfidenceInterval == nil {
		t.Fatal("expected a Fleiss result with an interval")
	}
	if *first.ConfidenceInterval != *second.ConfidenceInterval {
		t.Errorf("intervals differ between runs: %+v vs %+v", first.ConfidenceInterval, second.ConfidenceInterval)
	}
}

// Ten cases, two raters: 4 x (A,A), 3 x (B,B), 2 x (A,B), 1 x (B,A).
// Po = 0.7, Pe = 0.6*0.5 + 0.4*0.5 = 0.5, kappa = 0.4; SE = sqrt(0.7*0.3 / (10*0.25)) = 0.2898,
// so the 95% interval is [-0.1681, 0.9681].
func TestStudyReliability_CohenTwoRaters(t *testing.T) {
	t.Parallel()

	f := newStudyFixture("danis_weber", [][]string{
		{"A", "A", "A", "A", "B", "B", "B", "A", "A", "B"},
		{"A", "A", "A", "A", "B", "B", "B", "B", "B", "A"},
	})

	m := f.metrics(t)
	got := m.DanisWeberCohen
	if got == nil {
		t.Fatal("expected a Cohen result")
	}
	if !approx(got.Kappa, 0.4, 1e-12) {
		t.Errorf("kappa = %v, want 0.4", got.Kappa)
	}
	if got.ConfidenceInterval == nil || got.ConfidenceInterval.Lower != -0.1681 || got.ConfidenceInterval.Upper != 0.9681 {
		t.Errorf("CI = %+v, want [-0.1681, 0.9681]", got.ConfidenceInterval)
	}
	if got.NumSubjects != 10 || got.NumCasesExcluded != 0 {
		t.Errorf("subjects %d, excluded %d; want 10, 0", got.NumSubjects, got.NumCasesExcluded)
	}
	if got.WeightedKappa != nil {
		t.Error("weighted kappa is AO/OTA only")
	}
	if m.DanisWeberFleiss == nil {
		t.Error("Fleiss stays alongside Cohen with 2 raters")
	}
	if m.LaugeHansenCohen != nil {
		t.Error("a system nobody answered has no result")
	}
}

func TestStudyReliability_CohenOnlyForExactlyTwoCompleteRaters(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		rows      [][]string
		wantCohen bool
	}{
		{"one rater", [][]string{{"A", "B", "A"}}, false},
		{"two raters", [][]string{{"A", "B", "A"}, {"A", "B", "B"}}, true},
		{"three raters", [][]string{{"A", "B", "A"}, {"A", "B", "B"}, {"A", "A", "B"}}, false},
		// The third rater skipped a case, so only two raters are complete.
		{"two complete, one partial", [][]string{{"A", "B", "A"}, {"A", "B", "B"}, {"A", noResponse, "B"}}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			m := newStudyFixture("danis_weber", tt.rows).metrics(t)
			if got := m.DanisWeberCohen != nil; got != tt.wantCohen {
				t.Errorf("Cohen present = %v, want %v (complete raters: %d)", got, tt.wantCohen, m.CompleteRaters)
			}
		})
	}
}

// Six cases of AO/OTA codes. Plain Cohen compares the raw codes: no pair matches, Po = 0,
// and only 44-B1 is used by both raters (1/6 and 2/6), so Pe = 1/18 and kappa = -1/17.
// Weighted kappa compares groups: (44-B1.2,44-B1) becomes (B1,B1); (44-A3,44-A1) and (43-B1,44-B1)
// leave the ordering and are excluded. The 4 pairs left give kappa_w = 9/19 (worked in the statistics tests).
func TestStudyReliability_CohenAOOTAWeightedMapsSubgroupsAndExcludes(t *testing.T) {
	t.Parallel()

	f := newStudyFixture("ao_ota", [][]string{
		{"44-B1.2", "44-B2", "44-A3", "44-C1", "43-B1", "44-B1"},
		{"44-B1", "44-B3", "44-A1", "44-C3", "44-B1", "44-A1"},
	})

	got := f.metrics(t).AOOTACohen
	if got == nil {
		t.Fatal("expected a Cohen result")
	}
	if !approx(got.Kappa, -1.0/17.0, 1e-12) {
		t.Errorf("kappa = %v, want %v", got.Kappa, -1.0/17.0)
	}
	w := got.WeightedKappa
	if w == nil {
		t.Fatal("expected a weighted kappa for AO/OTA")
	}
	if !approx(w.Kappa, 9.0/19.0, 1e-12) {
		t.Errorf("weighted kappa = %v, want %v", w.Kappa, 9.0/19.0)
	}
	if w.NumPairs != 4 || w.NumPairsExcluded != 2 || w.Type != domain.KappaWeightLinear {
		t.Errorf("pairs %d, excluded %d, type %q; want 4, 2, linear", w.NumPairs, w.NumPairsExcluded, w.Type)
	}
}

func TestStudyReliability_WeightedKappaNilWhenTooFewPairsRemain(t *testing.T) {
	t.Parallel()

	f := newStudyFixture("ao_ota", [][]string{
		{"44-A3", "44-B1", "43-B1"},
		{"44-A3", "44-B2", "44-B1"},
	})

	got := f.metrics(t).AOOTACohen
	if got == nil {
		t.Fatal("plain Cohen's kappa is still computed")
	}
	if got.WeightedKappa != nil {
		t.Errorf("expected no weighted kappa with one usable pair, got %+v", got.WeightedKappa)
	}
}
