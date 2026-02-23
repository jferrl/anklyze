package rules

import (
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
)

func TestNewEngine(t *testing.T) {
	engine := NewEngine()
	if engine == nil {
		t.Fatal("NewEngine() returned nil")
	}
}

func TestEngine_Classify_NoFractureSelected(t *testing.T) {
	engine := NewEngine()

	tests := []struct {
		name  string
		input domain.FractureInput
		lang  i18n.Language
	}{
		{
			name:  "empty input returns no fracture selected in English",
			input: domain.FractureInput{},
			lang:  i18n.English,
		},
		{
			name:  "empty input returns no fracture selected in Spanish",
			input: domain.FractureInput{},
			lang:  i18n.Spanish,
		},
		{
			name: "unknown involved malleoli returns no fracture selected",
			input: domain.FractureInput{
				InvolvedMalleoli: "unknown",
			},
			lang: i18n.English,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := engine.Classify(tt.input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}
			if result == nil {
				t.Fatal("Classify() returned nil result")
			}
			expectedType := "none_selected"
			if result.FractureType != expectedType {
				t.Errorf("FractureType = %q, want %q", result.FractureType, expectedType)
			}
		})
	}
}

func TestEngine_Classify_PosteriorOnly(t *testing.T) {
	engine := NewEngine()
	boolTrue := true
	boolFalse := false

	t.Run("large_with_extension + depression → distal_tibia AO 43-B2", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:       domain.InvolvedPosteriorOnly,
			ArticularInvolvement:   domain.ArticularLargeWithExtension,
			HasArticularDepression: &boolTrue,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "distal_tibia" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "distal_tibia")
		}
		if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTA43B2 {
			t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, domain.AOOTA43B2)
		}
		if result.LaugeHansen != nil {
			t.Error("LaugeHansen should be nil for distal tibia fractures")
		}
		if result.Bartonicek != nil {
			t.Error("Bartonicek should be nil for distal tibia fractures")
		}
		if result.DanisWeber != nil {
			t.Error("DanisWeber should be nil for distal tibia fractures")
		}
	})

	t.Run("large_with_extension + no depression → distal_tibia AO 43-B1", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:       domain.InvolvedPosteriorOnly,
			ArticularInvolvement:   domain.ArticularLargeWithExtension,
			HasArticularDepression: &boolFalse,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "distal_tibia" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "distal_tibia")
		}
		if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTA43B1 {
			t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, domain.AOOTA43B1)
		}
	})

	t.Run("large_with_extension + nil depression defaults to AO 43-B1", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:     domain.InvolvedPosteriorOnly,
			ArticularInvolvement: domain.ArticularLargeWithExtension,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "distal_tibia" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "distal_tibia")
		}
		if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTA43B1 {
			t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, domain.AOOTA43B1)
		}
	})

	// small_without_extension path: AO unclassifiable, LH PA, Bartonicek from CT
	tests := []struct {
		name                string
		posteriorType       domain.PosteriorFractureType
		hasCTScan           *bool
		expectedBartonicek  domain.BartonicekType
		expectBartonicekNil bool
	}{
		{
			name:               "small_without_extension + CT + extraincisural → Bartonicek 1",
			posteriorType:      domain.PosteriorExtraincisural,
			hasCTScan:          &boolTrue,
			expectedBartonicek: domain.BartonicekType1,
		},
		{
			name:               "small_without_extension + CT + posterolateral → Bartonicek 2",
			posteriorType:      domain.PosteriorPosterolateral,
			hasCTScan:          &boolTrue,
			expectedBartonicek: domain.BartonicekType2,
		},
		{
			name:               "small_without_extension + CT + posteromedial_posterolateral → Bartonicek 3",
			posteriorType:      domain.PosteriorPosteromedialPosterolateral,
			hasCTScan:          &boolTrue,
			expectedBartonicek: domain.BartonicekType3,
		},
		{
			name:               "small_without_extension + CT + large_posterolateral → Bartonicek 4",
			posteriorType:      domain.PosteriorLargePosterolateral,
			hasCTScan:          &boolTrue,
			expectedBartonicek: domain.BartonicekType4,
		},
		{
			name:                "small_without_extension + no CT → no Bartonicek",
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolFalse,
			expectBartonicekNil: true,
		},
		{
			name:                "small_without_extension + nil CT → no Bartonicek",
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           nil,
			expectBartonicekNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedPosteriorOnly,
				ArticularInvolvement:  domain.ArticularSmallWithoutExtension,
				PosteriorFractureType: tt.posteriorType,
				HasCTScan:             tt.hasCTScan,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			if result.FractureType != "unimaleolar_posterior" {
				t.Errorf("FractureType = %q, want %q", result.FractureType, "unimaleolar_posterior")
			}

			if result.AOOTA != nil {
				t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != domain.LaugeHansenPA {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, domain.LaugeHansenPA)
			}

			if tt.expectBartonicekNil {
				if result.Bartonicek != nil {
					t.Error("Bartonicek should be nil without CT scan")
				}
			} else {
				if result.Bartonicek == nil {
					t.Fatal("Bartonicek classification is nil")
				}
				if result.Bartonicek.Type != tt.expectedBartonicek {
					t.Errorf("Bartonicek.Type = %q, want %q", result.Bartonicek.Type, tt.expectedBartonicek)
				}
			}
		})
	}
}

func TestEngine_Classify_MedialOnly(t *testing.T) {
	engine := NewEngine()
	boolTrue := true
	boolFalse := false

	t.Run("large_with_extension + depression → distal_tibia AO 43-B2", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:       domain.InvolvedMedialOnly,
			ArticularInvolvement:   domain.ArticularLargeWithExtension,
			HasArticularDepression: &boolTrue,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "distal_tibia" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "distal_tibia")
		}
		if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTA43B2 {
			t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, domain.AOOTA43B2)
		}
		if result.LaugeHansen != nil {
			t.Error("LaugeHansen should be nil for distal tibia fractures")
		}
		if result.DanisWeber != nil {
			t.Error("DanisWeber should be nil for distal tibia fractures")
		}
	})

	t.Run("large_with_extension + no depression → distal_tibia AO 43-B1", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:       domain.InvolvedMedialOnly,
			ArticularInvolvement:   domain.ArticularLargeWithExtension,
			HasArticularDepression: &boolFalse,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "distal_tibia" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "distal_tibia")
		}
		if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTA43B1 {
			t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, domain.AOOTA43B1)
		}
	})

	// small_without_extension path: morphology determines classification
	tests := []struct {
		name                  string
		medialMorphology      domain.MedialMorphology
		expectedAOOTA         domain.AOOTACode
		expectedLaugeHansen   domain.LaugeHansenType
		expectedAmbiguous     bool
		expectedPossibleTypes []string
	}{
		{
			name:                "small_without_extension + oblique → SA AO 44-A2",
			medialMorphology:    domain.MedialMorphologyVertical,
			expectedAOOTA:       domain.AOOTAA2,
			expectedLaugeHansen: domain.LaugeHansenSA,
			expectedAmbiguous:   false,
		},
		{
			name:                  "small_without_extension + transverse → ambiguous PA/SER/PER AO 44-A2",
			medialMorphology:      domain.MedialMorphologyTransverse,
			expectedAOOTA:         domain.AOOTAA2,
			expectedLaugeHansen:   "",
			expectedAmbiguous:     true,
			expectedPossibleTypes: []string{"PA", "SER", "PER"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:     domain.InvolvedMedialOnly,
				ArticularInvolvement: domain.ArticularSmallWithoutExtension,
				MedialMorphology:     tt.medialMorphology,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			if result.FractureType != "unimaleolar_medial" {
				t.Errorf("FractureType = %q, want %q", result.FractureType, "unimaleolar_medial")
			}

			if result.AOOTA == nil {
				t.Fatal("AOOTA classification is nil")
			}
			if result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
			}
			if result.LaugeHansen.Ambiguous != tt.expectedAmbiguous {
				t.Errorf("LaugeHansen.Ambiguous = %v, want %v", result.LaugeHansen.Ambiguous, tt.expectedAmbiguous)
			}

			if result.DanisWeber != nil {
				t.Error("DanisWeber should be nil for medial only fractures")
			}
		})
	}
}

func TestEngine_Classify_LateralOnly(t *testing.T) {
	engine := NewEngine()

	tests := []struct {
		name                string
		fibularLevel        domain.FibularLevel
		lateralMorphology   domain.LateralMorphology
		suprasindesmalType  domain.SuprasindesmalType
		fibulaTracePattern  domain.FibulaTracePattern
		lang                i18n.Language
		expectedDanisWeber  domain.DanisWeberType
		expectedAOOTA       domain.AOOTACode
		expectedLaugeHansen domain.LaugeHansenType
	}{
		// Infrasindesmal case - no morphology question, always SA
		{
			name:                "infrasindesmal lateral (no morphology question)",
			fibularLevel:        domain.FibularLevelInfrasindesmal,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberA,
			expectedAOOTA:       domain.AOOTAA1,
			expectedLaugeHansen: domain.LaugeHansenSA,
		},
		// Transindesmal cases
		{
			name:                "transindesmal spiral lateral",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "transindesmal oblique lateral",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologyOblique,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		// Suprasindesmal cases with fibula trace pattern
		{
			name:                "suprasindesmal simple diaphyseal long trace (PER)",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal simple diaphyseal short trace (PA)",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticShort,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		{
			name:                "suprasindesmal multifragmentary long trace (PER)",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC2,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal multifragmentary short trace (PA)",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticShort,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC2,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		{
			name:                "suprasindesmal proximal (Maisonneuve) - always PER",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		// Spanish language test
		{
			name:                "lateral only infrasindesmal in Spanish",
			fibularLevel:        domain.FibularLevelInfrasindesmal,
			lang:                i18n.Spanish,
			expectedDanisWeber:  domain.DanisWeberA,
			expectedAOOTA:       domain.AOOTAA1,
			expectedLaugeHansen: domain.LaugeHansenSA,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedLateralOnly,
				FibularLevel:       tt.fibularLevel,
				LateralMorphology:  tt.lateralMorphology,
				SuprasindesmalType: tt.suprasindesmalType,
				FibulaTracePattern: tt.fibulaTracePattern,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			expectedType := "unimaleolar_lateral"
			if result.FractureType != expectedType {
				t.Errorf("FractureType = %q, want %q", result.FractureType, expectedType)
			}

			if result.DanisWeber == nil {
				t.Fatal("DanisWeber classification is nil")
			}
			if result.DanisWeber.Type != tt.expectedDanisWeber {
				t.Errorf("DanisWeber.Type = %q, want %q", result.DanisWeber.Type, tt.expectedDanisWeber)
			}

			if result.AOOTA == nil {
				t.Fatal("AOOTA classification is nil")
			}
			if result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
			}
		})
	}
}

func TestEngine_Classify_MedialPosterior(t *testing.T) {
	engine := NewEngine()
	boolTrue := true
	boolFalse := false

	t.Run("no CT → AO unclassifiable + LH PA", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli: domain.InvolvedMedialPosterior,
			HasCTScan:        &boolFalse,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "bimaleolar_medial_posterior" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "bimaleolar_medial_posterior")
		}
		if result.AOOTA != nil {
			t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
		}
		if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenPA {
			t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, domain.LaugeHansenPA)
		}
		if result.Bartonicek != nil {
			t.Error("Bartonicek should be nil without CT")
		}
		if result.DanisWeber != nil {
			t.Error("DanisWeber should be nil for medial posterior fractures")
		}
	})

	t.Run("nil CT → AO unclassifiable + LH PA", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli: domain.InvolvedMedialPosterior,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.AOOTA != nil {
			t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
		}
		if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenPA {
			t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, domain.LaugeHansenPA)
		}
	})

	t.Run("CT + extraincisural_posteromedial → AO 44-A3 + LH unclassifiable", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:      domain.InvolvedMedialPosterior,
			HasCTScan:             &boolTrue,
			PosteriorFractureType: domain.PosteriorExtraincisuralPosteromedial,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTAA3 {
			t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, domain.AOOTAA3)
		}
		if result.LaugeHansen == nil || !result.LaugeHansen.Ambiguous {
			t.Error("LaugeHansen should be ambiguous (unclassifiable)")
		}
		if result.LaugeHansen != nil && result.LaugeHansen.Type != "" {
			t.Errorf("LaugeHansen.Type should be empty for unclassifiable, got %q", result.LaugeHansen.Type)
		}
		if result.Bartonicek != nil {
			t.Error("Bartonicek should be nil for extraincisural_posteromedial")
		}
	})

	// CT + standard 4 posterior types → AO 44-B3 + LH PA + Bartonicek
	ctTests := []struct {
		name               string
		posteriorType      domain.PosteriorFractureType
		expectedBartonicek domain.BartonicekType
	}{
		{"CT + extraincisural → B3 + PA + Bartonicek 1", domain.PosteriorExtraincisural, domain.BartonicekType1},
		{"CT + posterolateral → B3 + PA + Bartonicek 2", domain.PosteriorPosterolateral, domain.BartonicekType2},
		{"CT + posteromedial_posterolateral → B3 + PA + Bartonicek 3", domain.PosteriorPosteromedialPosterolateral, domain.BartonicekType3},
		{"CT + large_posterolateral → B3 + PA + Bartonicek 4", domain.PosteriorLargePosterolateral, domain.BartonicekType4},
	}

	for _, tt := range ctTests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedMedialPosterior,
				HasCTScan:             &boolTrue,
				PosteriorFractureType: tt.posteriorType,
			}
			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}
			if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTAB3 {
				t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, domain.AOOTAB3)
			}
			if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenPA {
				t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, domain.LaugeHansenPA)
			}
			if result.Bartonicek == nil || result.Bartonicek.Type != tt.expectedBartonicek {
				t.Errorf("Bartonicek.Type = %v, want %q", result.Bartonicek, tt.expectedBartonicek)
			}
			if result.DanisWeber != nil {
				t.Error("DanisWeber should be nil for medial posterior fractures")
			}
		})
	}
}

func TestEngine_Classify_LateralPosterior(t *testing.T) {
	engine := NewEngine()
	boolTrue := true
	boolFalse := false

	// Infrasindesmal cases (separate due to different assertion patterns)
	t.Run("infrasindesmal without CT → Weber A only", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli: domain.InvolvedLateralPosterior,
			FibularLevel:     domain.FibularLevelInfrasindesmal,
			HasCTScan:        &boolFalse,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "bimaleolar_lateral_posterior" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "bimaleolar_lateral_posterior")
		}
		if result.DanisWeber == nil || result.DanisWeber.Type != domain.DanisWeberA {
			t.Errorf("DanisWeber.Type = %v, want %q", result.DanisWeber, domain.DanisWeberA)
		}
		if result.AOOTA != nil {
			t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
		}
		if result.LaugeHansen == nil || !result.LaugeHansen.Ambiguous {
			t.Error("LaugeHansen should be ambiguous (unclassifiable) for infrasindesmal without CT")
		}
		if result.Bartonicek != nil {
			t.Error("Bartonicek should be nil without CT")
		}
	})

	t.Run("infrasindesmal nil CT → Weber A + LH unclassifiable", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli: domain.InvolvedLateralPosterior,
			FibularLevel:     domain.FibularLevelInfrasindesmal,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.DanisWeber == nil || result.DanisWeber.Type != domain.DanisWeberA {
			t.Errorf("DanisWeber.Type = %v, want %q", result.DanisWeber, domain.DanisWeberA)
		}
		if result.AOOTA != nil {
			t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
		}
		if result.LaugeHansen == nil || !result.LaugeHansen.Ambiguous {
			t.Error("LaugeHansen should be ambiguous (unclassifiable) for infrasindesmal without CT")
		}
	})

	t.Run("infrasindesmal CT + posteromedial → AO 44-A3 + LH unclassifiable + Weber A", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:         domain.InvolvedLateralPosterior,
			FibularLevel:             domain.FibularLevelInfrasindesmal,
			HasCTScan:                &boolTrue,
			IsPosteriorPosteromedial: &boolTrue,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.DanisWeber == nil || result.DanisWeber.Type != domain.DanisWeberA {
			t.Errorf("DanisWeber.Type = %v, want %q", result.DanisWeber, domain.DanisWeberA)
		}
		if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTAA3 {
			t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, domain.AOOTAA3)
		}
		if result.LaugeHansen == nil || !result.LaugeHansen.Ambiguous {
			t.Error("LaugeHansen should be ambiguous (unclassifiable)")
		}
		if result.Bartonicek != nil {
			t.Error("Bartonicek should be nil for posteromedial")
		}
	})

	t.Run("infrasindesmal CT + not posteromedial + extraincisural → Weber A + Bartonicek 1", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:         domain.InvolvedLateralPosterior,
			FibularLevel:             domain.FibularLevelInfrasindesmal,
			HasCTScan:                &boolTrue,
			IsPosteriorPosteromedial: &boolFalse,
			PosteriorFractureType:    domain.PosteriorExtraincisural,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.DanisWeber == nil || result.DanisWeber.Type != domain.DanisWeberA {
			t.Errorf("DanisWeber.Type = %v, want %q", result.DanisWeber, domain.DanisWeberA)
		}
		if result.AOOTA != nil {
			t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
		}
		if result.LaugeHansen == nil || !result.LaugeHansen.Ambiguous {
			t.Error("LaugeHansen should be ambiguous (unclassifiable)")
		}
		if result.Bartonicek == nil || result.Bartonicek.Type != domain.BartonicekType1 {
			t.Errorf("Bartonicek.Type = %v, want %q", result.Bartonicek, domain.BartonicekType1)
		}
	})

	t.Run("infrasindesmal CT + not posteromedial + posterolateral → Weber A + Bartonicek 2", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:         domain.InvolvedLateralPosterior,
			FibularLevel:             domain.FibularLevelInfrasindesmal,
			HasCTScan:                &boolTrue,
			IsPosteriorPosteromedial: &boolFalse,
			PosteriorFractureType:    domain.PosteriorPosterolateral,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.Bartonicek == nil || result.Bartonicek.Type != domain.BartonicekType2 {
			t.Errorf("Bartonicek.Type = %v, want %q", result.Bartonicek, domain.BartonicekType2)
		}
	})

	// Transindesmal and suprasindesmal cases (table-driven)
	tests := []struct {
		name                string
		fibularLevel        domain.FibularLevel
		lateralMorphology   domain.LateralMorphology
		posteriorType       domain.PosteriorFractureType
		suprasindesmalType  domain.SuprasindesmalType
		fibulaTracePattern  domain.FibulaTracePattern
		hasCTScan           *bool
		expectedDanisWeber  domain.DanisWeberType
		expectedAOOTA       domain.AOOTACode
		expectedLaugeHansen domain.LaugeHansenType
		expectedBartonicek  domain.BartonicekType
		expectBartonicekNil bool
	}{
		{
			name:                "transindesmal spiral with CT",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
			expectedBartonicek:  domain.BartonicekType1,
		},
		{
			name:                "transindesmal spiral without CT",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolFalse,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
			expectBartonicekNil: true,
		},
		{
			name:                "transindesmal oblique with CT",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologyOblique,
			posteriorType:       domain.PosteriorPosteromedialPosterolateral,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenPA,
			expectedBartonicek:  domain.BartonicekType3,
		},
		{
			name:                "suprasindesmal simple long trace with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			posteriorType:       domain.PosteriorLargePosterolateral,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPER,
			expectedBartonicek:  domain.BartonicekType4,
		},
		{
			name:                "suprasindesmal simple short trace with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticShort,
			posteriorType:       domain.PosteriorPosterolateral,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPA,
			expectedBartonicek:  domain.BartonicekType2,
		},
		{
			name:                "suprasindesmal multifragmentary with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			posteriorType:       domain.PosteriorPosterolateral,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC2,
			expectedLaugeHansen: domain.LaugeHansenPER,
			expectedBartonicek:  domain.BartonicekType2,
		},
		{
			name:                "suprasindesmal proximal with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC3,
			expectedLaugeHansen: domain.LaugeHansenPER,
			expectedBartonicek:  domain.BartonicekType1,
		},
		{
			name:                "suprasindesmal proximal without CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolFalse,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC3,
			expectedLaugeHansen: domain.LaugeHansenPER,
			expectBartonicekNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedLateralPosterior,
				FibularLevel:          tt.fibularLevel,
				LateralMorphology:     tt.lateralMorphology,
				PosteriorFractureType: tt.posteriorType,
				SuprasindesmalType:    tt.suprasindesmalType,
				FibulaTracePattern:    tt.fibulaTracePattern,
				HasCTScan:             tt.hasCTScan,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			if result.FractureType != "bimaleolar_lateral_posterior" {
				t.Errorf("FractureType = %q, want %q", result.FractureType, "bimaleolar_lateral_posterior")
			}
			if result.Impossible {
				t.Errorf("unexpected Impossible = true with reason: %s", result.ImpossibleKey)
			}
			if result.DanisWeber == nil {
				t.Fatal("DanisWeber classification is nil")
			}
			if result.DanisWeber.Type != tt.expectedDanisWeber {
				t.Errorf("DanisWeber.Type = %q, want %q", result.DanisWeber.Type, tt.expectedDanisWeber)
			}
			if result.AOOTA == nil {
				t.Fatal("AOOTA classification is nil")
			}
			if result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
			}
			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
			}

			if tt.expectBartonicekNil {
				if result.Bartonicek != nil {
					t.Error("Bartonicek should be nil")
				}
			} else {
				if result.Bartonicek == nil {
					t.Fatal("Bartonicek classification is nil")
				}
				if result.Bartonicek.Type != tt.expectedBartonicek {
					t.Errorf("Bartonicek.Type = %q, want %q", result.Bartonicek.Type, tt.expectedBartonicek)
				}
			}
		})
	}
}

func TestEngine_Classify_LateralMedial(t *testing.T) {
	engine := NewEngine()

	boolTrue := true
	boolFalse := false

	tests := []struct {
		name                      string
		medialMorphology          domain.MedialMorphology
		fibulaInfraTransverse     *bool
		fibularLevelForTransverse domain.FibularLevel
		fibularLevel              domain.FibularLevel
		lateralMorphology         domain.LateralMorphology
		suprasindesmalType        domain.SuprasindesmalType
		lang                      i18n.Language
		expectedDanisWeber        domain.DanisWeberType
		expectedAOOTA             domain.AOOTACode
		expectedLaugeHansen       domain.LaugeHansenType
	}{
		// Path: Oblique medial + infrasindesmal transverse fibula
		{
			name:                  "oblique medial with infrasindesmal transverse fibula",
			medialMorphology:      domain.MedialMorphologyVertical,
			fibulaInfraTransverse: &boolTrue,
			lang:                  i18n.English,
			expectedDanisWeber:    domain.DanisWeberA,
			expectedAOOTA:         domain.AOOTAA2,
			expectedLaugeHansen:   domain.LaugeHansenSA,
		},
		// Path: High (suprasindesmal)
		{
			name:                "suprasindesmal simple diaphyseal",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal multifragmentary",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC2,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal proximal",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		// Path: Low - transverse lateral morphology - infrasindesmal
		{
			name:                      "low transverse lateral infrasindesmal",
			medialMorphology:          domain.MedialMorphologyVertical,
			fibulaInfraTransverse:     &boolFalse,
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelInfrasindesmal,
			lang:                      i18n.English,
			expectedDanisWeber:        domain.DanisWeberA,
			expectedAOOTA:             domain.AOOTAA2,
			expectedLaugeHansen:       domain.LaugeHansenSA,
		},
		// Path: Low - transverse lateral morphology - transindesmal
		{
			name:                      "low transverse lateral transindesmal",
			medialMorphology:          domain.MedialMorphologyVertical,
			fibulaInfraTransverse:     &boolFalse,
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelTransindesmal,
			lang:                      i18n.English,
			expectedDanisWeber:        domain.DanisWeberB,
			expectedAOOTA:             domain.AOOTAB2,
			expectedLaugeHansen:       domain.LaugeHansenPA,
		},
		// Path: Low - oblique lateral morphology
		{
			name:                "low oblique lateral",
			lateralMorphology:   domain.LateralMorphologyOblique,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB2,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		// Path: Low - spiral lateral morphology
		{
			name:                "low spiral lateral",
			lateralMorphology:   domain.LateralMorphologySpiral,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB2,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:               domain.InvolvedLateralMedial,
				MedialMorphology:               tt.medialMorphology,
				FibulaInfrasindesmalTransverse: tt.fibulaInfraTransverse,
				FibularLevelForTransverse:      tt.fibularLevelForTransverse,
				FibularLevel:                   tt.fibularLevel,
				LateralMorphology:              tt.lateralMorphology,
				SuprasindesmalType:             tt.suprasindesmalType,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			expectedType := "bimaleolar_lateral_medial"
			if result.FractureType != expectedType {
				t.Errorf("FractureType = %q, want %q", result.FractureType, expectedType)
			}

			if result.DanisWeber == nil {
				t.Fatal("DanisWeber classification is nil")
			}
			if result.DanisWeber.Type != tt.expectedDanisWeber {
				t.Errorf("DanisWeber.Type = %q, want %q", result.DanisWeber.Type, tt.expectedDanisWeber)
			}

			if result.AOOTA == nil {
				t.Fatal("AOOTA classification is nil")
			}
			if result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
			}
		})
	}
}

func TestEngine_Classify_Trimaleolar(t *testing.T) {
	engine := NewEngine()

	tests := []struct {
		name                      string
		fibularLevel              domain.FibularLevel
		fibularLevelForTransverse domain.FibularLevel
		lateralMorphology         domain.LateralMorphology
		suprasindesmalType        domain.SuprasindesmalType
		lang                      i18n.Language
		expectedImpossible        bool
		expectedDanisWeber        domain.DanisWeberType
		expectedAOOTA             domain.AOOTACode
		expectedLaugeHansen       domain.LaugeHansenType
	}{
		// Path: High (suprasindesmal)
		{
			name:                "suprasindesmal simple diaphyseal trimaleolar",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal multifragmentary trimaleolar",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC2,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal proximal trimaleolar",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		// Path: Low - transverse - infrasindesmal (impossible/exceptional)
		{
			name:                      "low transverse infrasindesmal trimaleolar - impossible",
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelInfrasindesmal,
			lang:                      i18n.English,
			expectedImpossible:        true,
		},
		// Path: Low - transverse - transindesmal
		{
			name:                      "low transverse transindesmal trimaleolar",
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelTransindesmal,
			lang:                      i18n.English,
			expectedDanisWeber:        domain.DanisWeberB,
			expectedAOOTA:             domain.AOOTAB3,
			expectedLaugeHansen:       domain.LaugeHansenPA,
		},
		// Path: Low - oblique
		{
			name:                "low oblique trimaleolar",
			lateralMorphology:   domain.LateralMorphologyOblique,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		// Path: Low - spiral
		{
			name:                "low spiral trimaleolar",
			lateralMorphology:   domain.LateralMorphologySpiral,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		// Spanish language test
		{
			name:                "trimaleolar in Spanish",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			lang:                i18n.Spanish,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:          domain.InvolvedTrimaleolar,
				FibularLevel:              tt.fibularLevel,
				FibularLevelForTransverse: tt.fibularLevelForTransverse,
				LateralMorphology:         tt.lateralMorphology,
				SuprasindesmalType:        tt.suprasindesmalType,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			expectedType := "trimaleolar"
			if result.FractureType != expectedType {
				t.Errorf("FractureType = %q, want %q", result.FractureType, expectedType)
			}

			if tt.expectedImpossible {
				if !result.Impossible {
					t.Error("expected Impossible = true, got false")
				}
				if result.ImpossibleKey == "" {
					t.Error("ImpossibleReason should not be empty for impossible cases")
				}
				return
			}

			if result.Impossible {
				t.Errorf("unexpected Impossible = true with reason: %s", result.ImpossibleKey)
			}

			if result.DanisWeber == nil {
				t.Fatal("DanisWeber classification is nil")
			}
			if result.DanisWeber.Type != tt.expectedDanisWeber {
				t.Errorf("DanisWeber.Type = %q, want %q", result.DanisWeber.Type, tt.expectedDanisWeber)
			}

			if result.AOOTA == nil {
				t.Fatal("AOOTA classification is nil")
			}
			if result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
			}
		})
	}
}

// TestEngine_Classify_LateralMedial_SuprasindesmalTracePatterns tests the fibula trace
// pattern differentiation for PA vs PER in suprasindesmal lateral+medial fractures.
func TestEngine_Classify_LateralMedial_SuprasindesmalTracePatterns(t *testing.T) {
	engine := NewEngine()

	tests := []struct {
		name                string
		suprasindesmalType  domain.SuprasindesmalType
		fibulaTracePattern  domain.FibulaTracePattern
		expectedLaugeHansen domain.LaugeHansenType
		expectedAOOTA       domain.AOOTACode
	}{
		{
			name:                "simple diaphyseal with parasindesmotic short trace → PA",
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticShort,
			expectedLaugeHansen: domain.LaugeHansenPA,
			expectedAOOTA:       domain.AOOTAC1,
		},
		{
			name:                "simple diaphyseal with parasindesmotic long trace → PER",
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			expectedLaugeHansen: domain.LaugeHansenPER,
			expectedAOOTA:       domain.AOOTAC1,
		},
		{
			name:                "multifragmentary with parasindesmotic short trace → PA",
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticShort,
			expectedLaugeHansen: domain.LaugeHansenPA,
			expectedAOOTA:       domain.AOOTAC2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedLateralMedial,
				FibularLevel:       domain.FibularLevelSuprasindesmal,
				SuprasindesmalType: tt.suprasindesmalType,
				FibulaTracePattern: tt.fibulaTracePattern,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			if result.DanisWeber == nil || result.DanisWeber.Type != domain.DanisWeberC {
				t.Errorf("DanisWeber.Type = %v, want %q", result.DanisWeber, domain.DanisWeberC)
			}
			if result.AOOTA == nil || result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %v, want %q", result.AOOTA, tt.expectedAOOTA)
			}
			if result.LaugeHansen == nil || result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, tt.expectedLaugeHansen)
			}
		})
	}
}

// TestEngine_Classify_Trimaleolar_WithBartonicek tests Bartonicek classification
// for trimaleolar fractures when CT scan is available.
func TestEngine_Classify_Trimaleolar_WithBartonicek(t *testing.T) {
	engine := NewEngine()
	boolTrue := true
	boolFalse := false

	tests := []struct {
		name                string
		fibularLevel        domain.FibularLevel
		suprasindesmalType  domain.SuprasindesmalType
		fibulaTracePattern  domain.FibulaTracePattern
		lateralMorphology   domain.LateralMorphology
		posteriorType       domain.PosteriorFractureType
		hasCTScan           *bool
		expectedBartonicek  domain.BartonicekType
		expectBartonicekNil bool
		expectedLaugeHansen domain.LaugeHansenType
	}{
		{
			name:                "suprasindesmal proximal with CT → Bartonicek 1",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolTrue,
			expectedBartonicek:  domain.BartonicekType1,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal simple short trace with CT → Bartonicek 2",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticShort,
			posteriorType:       domain.PosteriorPosterolateral,
			hasCTScan:           &boolTrue,
			expectedBartonicek:  domain.BartonicekType2,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		{
			name:                "suprasindesmal simple default trace with CT → Bartonicek 3",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			posteriorType:       domain.PosteriorPosteromedialPosterolateral,
			hasCTScan:           &boolTrue,
			expectedBartonicek:  domain.BartonicekType3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal proximal without CT → no Bartonicek",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolFalse,
			expectBartonicekNil: true,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "low oblique with CT → Bartonicek 4",
			lateralMorphology:   domain.LateralMorphologyOblique,
			posteriorType:       domain.PosteriorLargePosterolateral,
			hasCTScan:           &boolTrue,
			expectedBartonicek:  domain.BartonicekType4,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		{
			name:                "low spiral with CT → Bartonicek 2",
			lateralMorphology:   domain.LateralMorphologySpiral,
			posteriorType:       domain.PosteriorPosterolateral,
			hasCTScan:           &boolTrue,
			expectedBartonicek:  domain.BartonicekType2,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedTrimaleolar,
				FibularLevel:          tt.fibularLevel,
				SuprasindesmalType:    tt.suprasindesmalType,
				FibulaTracePattern:    tt.fibulaTracePattern,
				LateralMorphology:     tt.lateralMorphology,
				PosteriorFractureType: tt.posteriorType,
				HasCTScan:             tt.hasCTScan,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}
			if result.FractureType != "trimaleolar" {
				t.Errorf("FractureType = %q, want %q", result.FractureType, "trimaleolar")
			}
			if result.Impossible {
				t.Fatalf("unexpected Impossible = true")
			}
			if result.LaugeHansen == nil || result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, tt.expectedLaugeHansen)
			}
			if tt.expectBartonicekNil {
				if result.Bartonicek != nil {
					t.Error("Bartonicek should be nil without CT scan")
				}
			} else {
				if result.Bartonicek == nil {
					t.Fatal("Bartonicek classification is nil")
				}
				if result.Bartonicek.Type != tt.expectedBartonicek {
					t.Errorf("Bartonicek.Type = %q, want %q", result.Bartonicek.Type, tt.expectedBartonicek)
				}
			}
		})
	}
}

// TestEngine_Classify_SuprasindesmoticFarTracePattern verifies that suprasindesmotic_far
// trace pattern produces PER mechanism (same as parasindesmotic_long) across all paths.
func TestEngine_Classify_SuprasindesmoticFarTracePattern(t *testing.T) {
	engine := NewEngine()
	boolTrue := true

	tests := []struct {
		name             string
		involvedMalleoli domain.InvolvedMalleoli
		posteriorType    domain.PosteriorFractureType
		hasCTScan        *bool
	}{
		{"lateral_only", domain.InvolvedLateralOnly, "", nil},
		{"lateral_posterior", domain.InvolvedLateralPosterior, domain.PosteriorExtraincisural, &boolTrue},
		{"lateral_medial", domain.InvolvedLateralMedial, "", nil},
		{"trimaleolar", domain.InvolvedTrimaleolar, domain.PosteriorExtraincisural, &boolTrue},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:      tt.involvedMalleoli,
				FibularLevel:          domain.FibularLevelSuprasindesmal,
				SuprasindesmalType:    domain.SuprasindesmalSimpleDiaphyseal,
				FibulaTracePattern:    domain.FibulaTraceSuprasindesmoticFar,
				PosteriorFractureType: tt.posteriorType,
				HasCTScan:             tt.hasCTScan,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != domain.LaugeHansenPER {
				t.Errorf("LaugeHansen.Type = %q, want %q (same as parasindesmotic_long)",
					result.LaugeHansen.Type, domain.LaugeHansenPER)
			}
		})
	}
}

// TestEngine_Classify_ImpossibleCombinations_SpecificKeys verifies exact ImpossibleKey values
// for anatomically impossible fracture combinations.
func TestEngine_Classify_ImpossibleCombinations_SpecificKeys(t *testing.T) {
	engine := NewEngine()

	tests := []struct {
		name              string
		input             domain.FractureInput
		expectedKey       string
		expectedFracType  string
	}{
		{
			name: "trimaleolar transverse infrasindesmal → exceptional",
			input: domain.FractureInput{
				InvolvedMalleoli:          domain.InvolvedTrimaleolar,
				LateralMorphology:         domain.LateralMorphologyTransverse,
				FibularLevelForTransverse: domain.FibularLevelInfrasindesmal,
			},
			expectedKey:      "exceptional",
			expectedFracType: "trimaleolar",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := engine.Classify(tt.input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}
			if !result.Impossible {
				t.Fatal("expected Impossible = true, got false")
			}
			if result.ImpossibleKey != tt.expectedKey {
				t.Errorf("ImpossibleKey = %q, want %q", result.ImpossibleKey, tt.expectedKey)
			}
			if result.FractureType != tt.expectedFracType {
				t.Errorf("FractureType = %q, want %q", result.FractureType, tt.expectedFracType)
			}
		})
	}
}

// Benchmark tests for performance validation
func BenchmarkEngine_Classify(b *testing.B) {
	engine := NewEngine()

	inputs := []struct {
		name  string
		input domain.FractureInput
	}{
		{
			name: "posterior_only",
			input: domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedPosteriorOnly,
				PosteriorFractureType: domain.PosteriorPosterolateral,
			},
		},
		{
			name: "lateral_only_transindesmal",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralOnly,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
			},
		},
		{
			name: "trimaleolar_suprasindesmal",
			input: domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedTrimaleolar,
				FibularLevel:       domain.FibularLevelSuprasindesmal,
				SuprasindesmalType: domain.SuprasindesmalMultifragmentary,
			},
		},
	}

	for _, input := range inputs {
		b.Run(input.name, func(b *testing.B) {
			for b.Loop() {
				_, _ = engine.Classify(input.input)
			}
		})
	}
}
