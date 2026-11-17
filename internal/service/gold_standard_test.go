package service

import (
	"encoding/json"
	"sort"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/datatypes"
)

// makeGoldStandard creates a Case with gold standard set from a ClassificationResult.
func makeGoldStandard(t *testing.T, cs *domain.Case, result domain.ClassificationResult) {
	t.Helper()
	data, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("failed to marshal gold standard: %v", err)
	}
	cs.GoldStandard = datatypes.JSON(data)
}

func ptr[T any](v T) *T {
	return &v
}

func TestCalculateGoldStandardAccuracy(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	tests := []struct {
		name            string
		goldStandard    *domain.ClassificationResult
		responses       []domain.CaseResponse
		wantHasGold     bool
		wantTotalRaters int
		wantDWAccuracy  *float64
		wantDWCorrect   *int
		wantDWMajority  *string
		wantDWMajGold   *bool
		wantLHAccuracy  *float64
		wantAOAccuracy  *float64
		wantBTAccuracy  *float64
	}{
		{
			name:            "no gold standard set",
			goldStandard:    nil,
			responses:       []domain.CaseResponse{{UserID: uuid.New(), DanisWeberType: ptr("Weber A")}},
			wantHasGold:     false,
			wantTotalRaters: 1,
		},
		{
			name:            "gold standard with no responses",
			goldStandard:    &domain.ClassificationResult{DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberA}},
			responses:       []domain.CaseResponse{},
			wantHasGold:     true,
			wantTotalRaters: 0,
		},
		{
			name: "all raters match gold standard",
			goldStandard: &domain.ClassificationResult{
				DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberA},
			},
			responses: []domain.CaseResponse{
				{UserID: uuid.New(), DanisWeberType: ptr("Weber A")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber A")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber A")},
			},
			wantHasGold:     true,
			wantTotalRaters: 3,
			wantDWAccuracy:  ptr(100.0),
			wantDWCorrect:   ptr(3),
			wantDWMajority:  ptr("Weber A"),
			wantDWMajGold:   ptr(true),
		},
		{
			name: "no raters match gold standard",
			goldStandard: &domain.ClassificationResult{
				DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberA},
			},
			responses: []domain.CaseResponse{
				{UserID: uuid.New(), DanisWeberType: ptr("Weber B")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber C")},
			},
			wantHasGold:     true,
			wantTotalRaters: 2,
			wantDWAccuracy:  ptr(0.0),
			wantDWCorrect:   ptr(0),
			wantDWMajority:  ptr("Weber B"),
			wantDWMajGold:   ptr(false),
		},
		{
			name: "mixed accuracy across systems",
			goldStandard: &domain.ClassificationResult{
				DanisWeber:  &domain.DanisWeberClassification{Type: domain.DanisWeberB},
				LaugeHansen: &domain.LaugeHansenClassification{Type: domain.LaugeHansenSER},
				AOOTA:       &domain.AOOTAClassification{Code: domain.AOOTAB1},
			},
			responses: []domain.CaseResponse{
				{UserID: uuid.New(), DanisWeberType: ptr("Weber B"), LaugeHansenType: ptr("SER"), AOOTACode: ptr("44-B1")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber B"), LaugeHansenType: ptr("SA"), AOOTACode: ptr("44-B2")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber A"), LaugeHansenType: ptr("SER"), AOOTACode: ptr("44-B1")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber B"), LaugeHansenType: ptr("SER"), AOOTACode: ptr("44-B1")},
			},
			wantHasGold:     true,
			wantTotalRaters: 4,
			wantDWAccuracy:  ptr(75.0), // 3/4
			wantDWCorrect:   ptr(3),
			wantLHAccuracy:  ptr(75.0), // 3/4
			wantAOAccuracy:  ptr(75.0), // 3/4
		},
		{
			name: "not_classifiable as gold standard",
			goldStandard: &domain.ClassificationResult{
				DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberNotClassifiable},
			},
			responses: []domain.CaseResponse{
				{UserID: uuid.New(), DanisWeberType: ptr("not_classifiable")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber A")},
			},
			wantHasGold:     true,
			wantTotalRaters: 2,
			wantDWAccuracy:  ptr(50.0),
			wantDWCorrect:   ptr(1),
			wantDWMajority:  ptr("not_classifiable"),
			wantDWMajGold:   ptr(true),
		},
		{
			name: "bartonicek only (CT case)",
			goldStandard: &domain.ClassificationResult{
				Bartonicek: &domain.BartonicekClassification{Type: domain.BartonicekType2},
			},
			responses: []domain.CaseResponse{
				{UserID: uuid.New(), BartonicekType: ptr("Bartonicek 2")},
				{UserID: uuid.New(), BartonicekType: ptr("Bartonicek 3")},
				{UserID: uuid.New(), BartonicekType: ptr("Bartonicek 2")},
			},
			wantHasGold:     true,
			wantTotalRaters: 3,
			wantBTAccuracy:  ptr(200.0 / 3.0), // 2/3
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			cs := &domain.Case{ID: uuid.New()}
			if tt.goldStandard != nil {
				makeGoldStandard(t, cs, *tt.goldStandard)
			}

			result, err := svc.CalculateGoldStandardAccuracy(cs, tt.responses)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.HasGold != tt.wantHasGold {
				t.Errorf("HasGold = %v, want %v", result.HasGold, tt.wantHasGold)
			}
			if result.TotalRaters != tt.wantTotalRaters {
				t.Errorf("TotalRaters = %d, want %d", result.TotalRaters, tt.wantTotalRaters)
			}

			// Check Danis-Weber accuracy
			if tt.wantDWAccuracy != nil {
				if result.DanisWeberAccuracy == nil {
					t.Fatal("expected DanisWeberAccuracy, got nil")
				}
				assertFloat(t, "DW accuracy", result.DanisWeberAccuracy.Accuracy, *tt.wantDWAccuracy)
			}
			if tt.wantDWCorrect != nil {
				if result.DanisWeberAccuracy == nil {
					t.Fatal("expected DanisWeberAccuracy, got nil")
				}
				if result.DanisWeberAccuracy.CorrectRaters != *tt.wantDWCorrect {
					t.Errorf("DW correct = %d, want %d", result.DanisWeberAccuracy.CorrectRaters, *tt.wantDWCorrect)
				}
			}
			if tt.wantDWMajority != nil {
				if result.DanisWeberAccuracy == nil {
					t.Fatal("expected DanisWeberAccuracy, got nil")
				}
				if result.DanisWeberAccuracy.MajorityValue != *tt.wantDWMajority {
					t.Errorf("DW majority = %q, want %q", result.DanisWeberAccuracy.MajorityValue, *tt.wantDWMajority)
				}
			}
			if tt.wantDWMajGold != nil {
				if result.DanisWeberAccuracy == nil {
					t.Fatal("expected DanisWeberAccuracy, got nil")
				}
				if result.DanisWeberAccuracy.MajorityMatchesGold != *tt.wantDWMajGold {
					t.Errorf("DW majority matches gold = %v, want %v", result.DanisWeberAccuracy.MajorityMatchesGold, *tt.wantDWMajGold)
				}
			}

			// Check Lauge-Hansen accuracy
			if tt.wantLHAccuracy != nil {
				if result.LaugeHansenAccuracy == nil {
					t.Fatal("expected LaugeHansenAccuracy, got nil")
				}
				assertFloat(t, "LH accuracy", result.LaugeHansenAccuracy.Accuracy, *tt.wantLHAccuracy)
			}

			// Check AO/OTA accuracy
			if tt.wantAOAccuracy != nil {
				if result.AOOTAAccuracy == nil {
					t.Fatal("expected AOOTAAccuracy, got nil")
				}
				assertFloat(t, "AO accuracy", result.AOOTAAccuracy.Accuracy, *tt.wantAOAccuracy)
			}

			// Check Bartonicek accuracy
			if tt.wantBTAccuracy != nil {
				if result.BartonicekAccuracy == nil {
					t.Fatal("expected BartonicekAccuracy, got nil")
				}
				assertFloat(t, "BT accuracy", result.BartonicekAccuracy.Accuracy, *tt.wantBTAccuracy)
			}

			// Systems without gold standard should be nil
			if tt.goldStandard != nil && tt.goldStandard.DanisWeber == nil && result.DanisWeberAccuracy != nil {
				t.Error("DanisWeberAccuracy should be nil when gold standard has no DW")
			}
			if tt.goldStandard != nil && tt.goldStandard.LaugeHansen == nil && result.LaugeHansenAccuracy != nil {
				t.Error("LaugeHansenAccuracy should be nil when gold standard has no LH")
			}
		})
	}
}

func TestCalculateStudyGoldStandardMetrics(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	t.Run("empty study returns nil", func(t *testing.T) {
		t.Parallel()

		study := &domain.Study{ID: uuid.New(), Title: "Empty Study"}
		result, err := svc.CalculateStudyGoldStandardMetrics(study, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != nil {
			t.Error("expected nil for empty study")
		}
	})

	t.Run("study with no gold standards", func(t *testing.T) {
		t.Parallel()

		study := &domain.Study{ID: uuid.New(), Title: "No Gold"}
		cases := []domain.Case{
			{ID: uuid.New(), Title: "Case 1", CaseOrder: 1},
			{ID: uuid.New(), Title: "Case 2", CaseOrder: 2},
		}
		responsesByCase := map[uuid.UUID][]domain.CaseResponse{
			cases[0].ID: {{UserID: uuid.New(), DanisWeberType: ptr("Weber A")}},
			cases[1].ID: {{UserID: uuid.New(), DanisWeberType: ptr("Weber B")}},
		}

		result, err := svc.CalculateStudyGoldStandardMetrics(study, cases, responsesByCase)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.CasesWithGold != 0 {
			t.Errorf("CasesWithGold = %d, want 0", result.CasesWithGold)
		}
		if result.DanisWeberAccuracy != nil {
			t.Error("expected nil DanisWeberAccuracy when no cases have gold standard")
		}
	})

	t.Run("study with mixed gold standard cases", func(t *testing.T) {
		t.Parallel()

		study := &domain.Study{ID: uuid.New(), Title: "Mixed Gold"}
		user1 := uuid.New()
		user2 := uuid.New()

		case1 := domain.Case{ID: uuid.New(), Title: "Case 1", CaseOrder: 1}
		case2 := domain.Case{ID: uuid.New(), Title: "Case 2", CaseOrder: 2}
		case3 := domain.Case{ID: uuid.New(), Title: "Case 3 (no gold)", CaseOrder: 3}

		// Set gold standard on case1 and case2
		makeGoldStandard(t, &case1, domain.ClassificationResult{
			DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberA},
		})
		makeGoldStandard(t, &case2, domain.ClassificationResult{
			DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberB},
		})

		cases := []domain.Case{case1, case2, case3}
		responsesByCase := map[uuid.UUID][]domain.CaseResponse{
			case1.ID: {
				{UserID: user1, DanisWeberType: ptr("Weber A")}, // correct
				{UserID: user2, DanisWeberType: ptr("Weber A")}, // correct
			},
			case2.ID: {
				{UserID: user1, DanisWeberType: ptr("Weber B")}, // correct
				{UserID: user2, DanisWeberType: ptr("Weber A")}, // incorrect
			},
			case3.ID: {
				{UserID: user1, DanisWeberType: ptr("Weber C")},
			},
		}

		result, err := svc.CalculateStudyGoldStandardMetrics(study, cases, responsesByCase)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.TotalCases != 3 {
			t.Errorf("TotalCases = %d, want 3", result.TotalCases)
		}
		if result.CasesWithGold != 2 {
			t.Errorf("CasesWithGold = %d, want 2", result.CasesWithGold)
		}

		// Aggregate DW accuracy: case1=100%, case2=50% -> mean=75%
		if result.DanisWeberAccuracy == nil {
			t.Fatal("expected DanisWeberAccuracy")
		}
		assertFloat(t, "mean DW accuracy", result.DanisWeberAccuracy.MeanAccuracy, 75.0)
		if result.DanisWeberAccuracy.CasesEvaluated != 2 {
			t.Errorf("CasesEvaluated = %d, want 2", result.DanisWeberAccuracy.CasesEvaluated)
		}

		// Consensus: case1 majority=Weber A (matches gold), case2 majority=tied (Weber B first encounter? depends on order)
		// Both cases have consensus matching gold -> rate should be 100%
		if result.DanisWeberAccuracy.ConsensusTotal != 2 {
			t.Errorf("ConsensusTotal = %d, want 2", result.DanisWeberAccuracy.ConsensusTotal)
		}

		// Per-case accuracy
		if len(result.PerCaseAccuracy) != 3 {
			t.Fatalf("PerCaseAccuracy length = %d, want 3", len(result.PerCaseAccuracy))
		}

		// Case 3 should have HasGold=false
		found := false
		for _, pca := range result.PerCaseAccuracy {
			if pca.CaseID == case3.ID {
				found = true
				if pca.HasGold {
					t.Error("Case 3 should have HasGold=false")
				}
			}
		}
		if !found {
			t.Error("Case 3 not found in PerCaseAccuracy")
		}

		// Per-rater accuracy: user1 got both correct (100%), user2 got 1/2 (50%)
		if len(result.PerRaterAccuracy) != 2 {
			t.Fatalf("PerRaterAccuracy length = %d, want 2", len(result.PerRaterAccuracy))
		}
		for _, pra := range result.PerRaterAccuracy {
			if pra.UserID == user1 && pra.DanisWeberAccuracy != nil {
				assertFloat(t, "user1 DW accuracy", *pra.DanisWeberAccuracy, 100.0)
			}
			if pra.UserID == user2 && pra.DanisWeberAccuracy != nil {
				assertFloat(t, "user2 DW accuracy", *pra.DanisWeberAccuracy, 50.0)
			}
		}
	})

	t.Run("hard case flagging", func(t *testing.T) {
		t.Parallel()

		study := &domain.Study{ID: uuid.New(), Title: "Hard Cases"}
		cs := domain.Case{ID: uuid.New(), Title: "Hard Case", CaseOrder: 1}
		makeGoldStandard(t, &cs, domain.ClassificationResult{
			DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberA},
		})

		// Only 1 of 4 raters correct = 25% accuracy -> hard case
		responsesByCase := map[uuid.UUID][]domain.CaseResponse{
			cs.ID: {
				{UserID: uuid.New(), DanisWeberType: ptr("Weber A")}, // correct
				{UserID: uuid.New(), DanisWeberType: ptr("Weber B")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber B")},
				{UserID: uuid.New(), DanisWeberType: ptr("Weber C")},
			},
		}

		result, err := svc.CalculateStudyGoldStandardMetrics(study, []domain.Case{cs}, responsesByCase)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.PerCaseAccuracy) != 1 {
			t.Fatalf("expected 1 per-case result, got %d", len(result.PerCaseAccuracy))
		}
		if !result.PerCaseAccuracy[0].IsHardCase {
			t.Error("expected case to be flagged as hard case (25% accuracy)")
		}
	})
}

func TestCalculateGoldStandardAccuracy_ResponseDistribution(t *testing.T) {
	t.Parallel()

	svc := NewStatisticsService()

	cs := &domain.Case{ID: uuid.New()}
	makeGoldStandard(t, cs, domain.ClassificationResult{
		DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberB},
	})

	responses := []domain.CaseResponse{
		{UserID: uuid.New(), DanisWeberType: ptr("Weber A")},
		{UserID: uuid.New(), DanisWeberType: ptr("Weber B")},
		{UserID: uuid.New(), DanisWeberType: ptr("Weber B")},
		{UserID: uuid.New(), DanisWeberType: ptr("Weber C")},
	}

	result, err := svc.CalculateGoldStandardAccuracy(cs, responses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.DanisWeberAccuracy == nil {
		t.Fatal("expected DanisWeberAccuracy")
	}

	dist := result.DanisWeberAccuracy.ResponseDistribution
	if dist["Weber A"] != 1 {
		t.Errorf("Weber A count = %d, want 1", dist["Weber A"])
	}
	if dist["Weber B"] != 2 {
		t.Errorf("Weber B count = %d, want 2", dist["Weber B"])
	}
	if dist["Weber C"] != 1 {
		t.Errorf("Weber C count = %d, want 1", dist["Weber C"])
	}
}

// Pins the full output for a study covering all four systems, so refactors
// of CalculateStudyGoldStandardMetrics cannot change any reported number.
func TestCalculateStudyGoldStandardMetrics_FullOutput(t *testing.T) {
	t.Parallel()

	u1 := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	u2 := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	u3 := uuid.MustParse("00000000-0000-0000-0000-000000000003")

	study := &domain.Study{ID: uuid.MustParse("00000000-0000-0000-0000-0000000000aa"), Title: "Pinned"}
	allSystems := domain.Case{ID: uuid.MustParse("00000000-0000-0000-0000-00000000000a"), Title: "All systems", CaseOrder: 1}
	weberOnly := domain.Case{ID: uuid.MustParse("00000000-0000-0000-0000-00000000000b"), Title: "Weber only", CaseOrder: 2}
	noGold := domain.Case{ID: uuid.MustParse("00000000-0000-0000-0000-00000000000c"), Title: "No gold", CaseOrder: 3}

	makeGoldStandard(t, &allSystems, domain.ClassificationResult{
		DanisWeber:  &domain.DanisWeberClassification{Type: domain.DanisWeberB},
		LaugeHansen: &domain.LaugeHansenClassification{Type: domain.LaugeHansenSER},
		AOOTA:       &domain.AOOTAClassification{Code: domain.AOOTAB1},
		Bartonicek:  &domain.BartonicekClassification{Type: domain.BartonicekType2},
	})
	makeGoldStandard(t, &weberOnly, domain.ClassificationResult{
		DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberA},
	})

	responsesByCase := map[uuid.UUID][]domain.CaseResponse{
		allSystems.ID: {
			{UserID: u1, DanisWeberType: ptr("Weber B"), LaugeHansenType: ptr("SER"), AOOTACode: ptr("44-B1"), BartonicekType: ptr("Bartonicek 2")},
			{UserID: u2, DanisWeberType: ptr("Weber B"), LaugeHansenType: ptr("SA"), AOOTACode: ptr("44-B2"), BartonicekType: ptr("Bartonicek 3")},
			{UserID: u3, DanisWeberType: ptr("Weber A"), LaugeHansenType: ptr("SER"), AOOTACode: ptr("44-B2"), BartonicekType: ptr("Bartonicek 3")},
		},
		weberOnly.ID: {
			{UserID: u1, DanisWeberType: ptr("Weber A")},
			{UserID: u2, DanisWeberType: ptr("Weber A")},
		},
		noGold.ID: {
			{UserID: u1, DanisWeberType: ptr("Weber C")},
		},
	}

	result, err := NewStatisticsService().CalculateStudyGoldStandardMetrics(
		study, []domain.Case{allSystems, weberOnly, noGold}, responsesByCase,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Raters come out of a map, so order them before comparing.
	sort.Slice(result.PerRaterAccuracy, func(i, j int) bool {
		return result.PerRaterAccuracy[i].UserID.String() < result.PerRaterAccuracy[j].UserID.String()
	})
	got, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal result: %v", err)
	}

	const want = `{
  "study_id": "00000000-0000-0000-0000-0000000000aa",
  "study_title": "Pinned",
  "total_cases": 3,
  "cases_with_gold": 2,
  "danis_weber_accuracy": {
    "system": "danis_weber",
    "mean_accuracy": 83.33333333333333,
    "cases_evaluated": 2,
    "consensus_correct": 2,
    "consensus_total": 2,
    "consensus_rate": 100
  },
  "lauge_hansen_accuracy": {
    "system": "lauge_hansen",
    "mean_accuracy": 66.66666666666666,
    "cases_evaluated": 1,
    "consensus_correct": 1,
    "consensus_total": 1,
    "consensus_rate": 100
  },
  "ao_ota_accuracy": {
    "system": "ao_ota",
    "mean_accuracy": 33.33333333333333,
    "cases_evaluated": 1,
    "consensus_correct": 0,
    "consensus_total": 1,
    "consensus_rate": 0
  },
  "bartonicek_accuracy": {
    "system": "bartonicek",
    "mean_accuracy": 33.33333333333333,
    "cases_evaluated": 1,
    "consensus_correct": 0,
    "consensus_total": 1,
    "consensus_rate": 0
  },
  "per_case_accuracy": [
    {
      "case_order": 1,
      "case_id": "00000000-0000-0000-0000-00000000000a",
      "case_title": "All systems",
      "has_gold_standard": true,
      "danis_weber_accuracy": 66.66666666666666,
      "lauge_hansen_accuracy": 66.66666666666666,
      "ao_ota_accuracy": 33.33333333333333,
      "bartonicek_accuracy": 33.33333333333333,
      "is_hard_case": true
    },
    {
      "case_order": 2,
      "case_id": "00000000-0000-0000-0000-00000000000b",
      "case_title": "Weber only",
      "has_gold_standard": true,
      "danis_weber_accuracy": 100,
      "is_hard_case": false
    },
    {
      "case_order": 3,
      "case_id": "00000000-0000-0000-0000-00000000000c",
      "case_title": "No gold",
      "has_gold_standard": false,
      "is_hard_case": false
    }
  ],
  "per_rater_accuracy": [
    {
      "user_id": "00000000-0000-0000-0000-000000000001",
      "cases_completed": 2,
      "danis_weber_accuracy": 100,
      "lauge_hansen_accuracy": 100,
      "ao_ota_accuracy": 100,
      "bartonicek_accuracy": 100
    },
    {
      "user_id": "00000000-0000-0000-0000-000000000002",
      "cases_completed": 2,
      "danis_weber_accuracy": 100,
      "lauge_hansen_accuracy": 0,
      "ao_ota_accuracy": 0,
      "bartonicek_accuracy": 0
    },
    {
      "user_id": "00000000-0000-0000-0000-000000000003",
      "cases_completed": 1,
      "danis_weber_accuracy": 0,
      "lauge_hansen_accuracy": 100,
      "ao_ota_accuracy": 0,
      "bartonicek_accuracy": 0
    }
  ]
}`
	if string(got) != want {
		t.Errorf("metrics changed\n got: %s\nwant: %s", got, want)
	}
}

// assertFloat compares two float64 values with tolerance.
func assertFloat(t *testing.T, name string, got, want float64) {
	t.Helper()
	diff := got - want
	if diff < 0 {
		diff = -diff
	}
	if diff > 0.01 {
		t.Errorf("%s = %.4f, want %.4f", name, got, want)
	}
}
