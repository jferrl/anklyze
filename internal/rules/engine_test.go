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

	// small_without_extension + vertical → SA, AO nil
	t.Run("small_without_extension + vertical → SA, AO nil", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:     domain.InvolvedMedialOnly,
			ArticularInvolvement: domain.ArticularSmallWithoutExtension,
			MedialMorphology:     domain.MedialMorphologyVertical,
		}

		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "unimaleolar_medial" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "unimaleolar_medial")
		}
		if result.AOOTA != nil {
			t.Errorf("AOOTA should be nil, got %v", result.AOOTA.Code)
		}
		if result.LaugeHansen == nil {
			t.Fatal("LaugeHansen classification is nil")
		}
		if result.LaugeHansen.Type != domain.LaugeHansenSA {
			t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, domain.LaugeHansenSA)
		}
		if result.DanisWeber != nil {
			t.Error("DanisWeber should be nil for medial only fractures")
		}
	})

	// small_without_extension + transverse → LH nil (no clasificable per drawio 2026-02-28), AO nil
	t.Run("small_without_extension + transverse → LH nil, AO nil", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:     domain.InvolvedMedialOnly,
			ArticularInvolvement: domain.ArticularSmallWithoutExtension,
			MedialMorphology:     domain.MedialMorphologyTransverse,
		}

		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.FractureType != "unimaleolar_medial" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "unimaleolar_medial")
		}
		if result.AOOTA != nil {
			t.Errorf("AOOTA should be nil, got %v", result.AOOTA.Code)
		}
		// LH should be nil (no clasificable) per drawio 2026-02-28
		if result.LaugeHansen != nil {
			t.Errorf("LaugeHansen should be nil for transverse medial-only, got %+v", result.LaugeHansen)
		}
		if result.DanisWeber != nil {
			t.Error("DanisWeber should be nil for medial only fractures")
		}
	})
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
			expectedAOOTA:       domain.AOOTAB1,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "transindesmal oblique lateral",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologyOblique,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB1,
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

	t.Run("CT + extraincisural_posteromedial → AO nil + LH PA", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:      domain.InvolvedMedialPosterior,
			HasCTScan:             &boolTrue,
			PosteriorFractureType: domain.PosteriorExtraincisuralPosteromedial,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		// AO = nil per drawio 2026-02-28
		if result.AOOTA != nil {
			t.Errorf("AOOTA should be nil, got %v", result.AOOTA.Code)
		}
		// LH = PA per drawio 2026-02-28
		if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenPA {
			t.Errorf("LaugeHansen.Type = %v, want PA", result.LaugeHansen)
		}
		if result.Bartonicek != nil {
			t.Error("Bartonicek should be nil for extraincisural_posteromedial")
		}
	})

	// CT + standard 4 posterior types → AO unclassifiable + LH PA + Bartonicek
	ctTests := []struct {
		name               string
		posteriorType      domain.PosteriorFractureType
		expectedBartonicek domain.BartonicekType
	}{
		{"CT + extraincisural → AO unclassifiable + PA + Bartonicek 1", domain.PosteriorExtraincisural, domain.BartonicekType1},
		{"CT + posterolateral → AO unclassifiable + PA + Bartonicek 2", domain.PosteriorPosterolateral, domain.BartonicekType2},
		{"CT + posteromedial_posterolateral → AO unclassifiable + PA + Bartonicek 3", domain.PosteriorPosteromedialPosterolateral, domain.BartonicekType3},
		{"CT + large_posterolateral → AO unclassifiable + PA + Bartonicek 4", domain.PosteriorLargePosterolateral, domain.BartonicekType4},
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
			if result.AOOTA != nil {
				t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
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

	// Infrasindesmal cases
	t.Run("infrasindesmal without CT → Weber A + LH SA", func(t *testing.T) {
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
		if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenSA {
			t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, domain.LaugeHansenSA)
		}
		if result.Bartonicek != nil {
			t.Error("Bartonicek should be nil without CT")
		}
	})

	t.Run("infrasindesmal nil CT → Weber A + LH SA", func(t *testing.T) {
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
		if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenSA {
			t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, domain.LaugeHansenSA)
		}
	})

	t.Run("infrasindesmal CT + posteromedial → AO 44-A3 + LH SA + Weber A", func(t *testing.T) {
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
		if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenSA {
			t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, domain.LaugeHansenSA)
		}
		if result.Bartonicek != nil {
			t.Error("Bartonicek should be nil for posteromedial")
		}
	})

	t.Run("infrasindesmal CT + not posteromedial + extraincisural → Weber A + LH SA + Bartonicek 1", func(t *testing.T) {
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
		if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenSA {
			t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, domain.LaugeHansenSA)
		}
		if result.Bartonicek == nil || result.Bartonicek.Type != domain.BartonicekType1 {
			t.Errorf("Bartonicek.Type = %v, want %q", result.Bartonicek, domain.BartonicekType1)
		}
	})

	t.Run("infrasindesmal CT + not posteromedial + posterolateral → Weber A + LH SA + Bartonicek 2", func(t *testing.T) {
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
		if result.LaugeHansen == nil || result.LaugeHansen.Type != domain.LaugeHansenSA {
			t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, domain.LaugeHansenSA)
		}
		if result.Bartonicek == nil || result.Bartonicek.Type != domain.BartonicekType2 {
			t.Errorf("Bartonicek.Type = %v, want %q", result.Bartonicek, domain.BartonicekType2)
		}
	})

	// Transindesmal and suprasindesmal cases (table-driven)
	// AO: transindesmal → nil (no clasificable per drawio 2026-02-28), suprasindesmal → nil
	tests := []struct {
		name                string
		fibularLevel        domain.FibularLevel
		lateralMorphology   domain.LateralMorphology
		posteriorType       domain.PosteriorFractureType
		suprasindesmalType  domain.SuprasindesmalType
		fibulaTracePattern  domain.FibulaTracePattern
		hasCTScan           *bool
		expectedDanisWeber  domain.DanisWeberType
		expectedLaugeHansen domain.LaugeHansenType
		expectedBartonicek  domain.BartonicekType
		expectedAOOTA       domain.AOOTACode
		expectBartonicekNil bool
	}{
		{
			name:                "transindesmal spiral with CT → AO nil (no clasificable)",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedLaugeHansen: domain.LaugeHansenSER,
			expectedBartonicek:  domain.BartonicekType1,
			// expectedAOOTA left empty: AO is not classifiable per drawio 2026-02-28
		},
		{
			name:                "transindesmal spiral without CT → AO nil (no clasificable)",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolFalse,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedLaugeHansen: domain.LaugeHansenSER,
			expectBartonicekNil: true,
			// expectedAOOTA left empty: AO is not classifiable per drawio 2026-02-28
		},
		{
			name:                "transindesmal oblique with CT → AO nil (no clasificable)",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologyOblique,
			posteriorType:       domain.PosteriorPosteromedialPosterolateral,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedLaugeHansen: domain.LaugeHansenPA,
			expectedBartonicek:  domain.BartonicekType3,
			// expectedAOOTA left empty: AO is not classifiable per drawio 2026-02-28
		},
		{
			name:                "suprasindesmal simple long trace with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			posteriorType:       domain.PosteriorLargePosterolateral,
			hasCTScan:           &boolTrue,
			expectedDanisWeber:  domain.DanisWeberC,
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
			if tt.expectedAOOTA != "" {
				if result.AOOTA == nil {
					t.Fatalf("AOOTA is nil, expected %v", tt.expectedAOOTA)
				}
				if result.AOOTA.Code != tt.expectedAOOTA {
					t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
				}
			} else if result.AOOTA != nil {
				t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
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
		medialSubtype             domain.MedialSubtype
		lang                      i18n.Language
		expectedImpossible        bool
		expectedDanisWeber        domain.DanisWeberType
		expectedAOOTA             domain.AOOTACode
		expectedAOOTANil          bool
		expectedLaugeHansen       domain.LaugeHansenType
		expectedLHNil             bool
	}{
		// Path: High (suprasindesmal) — trimaleolar uses .3 subtypes per drawio 2026-02-28
		{
			name:                "suprasindesmal simple diaphyseal trimaleolar",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1_3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal multifragmentary trimaleolar",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC2_3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal proximal trimaleolar",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC3_3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		// Path: Low - transverse - infrasindesmal (valid classification per drawio 2026-02-28)
		{
			name:                      "low transverse infrasindesmal trimaleolar → A3.3 Weber A",
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelInfrasindesmal,
			lang:                      i18n.English,
			expectedDanisWeber:        domain.DanisWeberA,
			expectedAOOTA:             domain.AOOTAA3_3,
			expectedLHNil:             true,
		},
		// Path: Low - transverse - transindesmal — B3 subtype by medial subtype
		{
			name:                      "low transverse transindesmal trimaleolar no medial subtype → B3",
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelTransindesmal,
			lang:                      i18n.English,
			expectedDanisWeber:        domain.DanisWeberB,
			expectedAOOTA:             domain.AOOTAB3,
			expectedLaugeHansen:       domain.LaugeHansenPA,
		},
		{
			name:                      "low transverse transindesmal trimaleolar open mortise → B3.1",
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelTransindesmal,
			medialSubtype:             domain.MedialSubtypeOpenMortise,
			lang:                      i18n.English,
			expectedDanisWeber:        domain.DanisWeberB,
			expectedAOOTA:             domain.AOOTAB3_1,
			expectedLaugeHansen:       domain.LaugeHansenPA,
		},
		{
			name:                      "low transverse transindesmal trimaleolar malleolus fracture → B3.2",
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelTransindesmal,
			medialSubtype:             domain.MedialSubtypeMalleolusFracture,
			lang:                      i18n.English,
			expectedDanisWeber:        domain.DanisWeberB,
			expectedAOOTA:             domain.AOOTAB3_2,
			expectedLaugeHansen:       domain.LaugeHansenPA,
		},
		// Path: Low - oblique — B3 subtype depends on medial subtype per drawio 2026-02-28
		// Oblique + malleolus_fracture → B3.3; oblique + open_mortise → nil (no clasificable)
		{
			name:                "low oblique trimaleolar malleolus fracture → B3.3",
			lateralMorphology:   domain.LateralMorphologyOblique,
			medialSubtype:       domain.MedialSubtypeMalleolusFracture,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3_3,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		{
			name:                "low oblique trimaleolar open mortise → nil AO (no clasificable)",
			lateralMorphology:   domain.LateralMorphologyOblique,
			medialSubtype:       domain.MedialSubtypeOpenMortise,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTANil:    true,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		// Path: Low - spiral — B3 subtype by medial subtype
		{
			name:                "low spiral trimaleolar no medial subtype → B3",
			lateralMorphology:   domain.LateralMorphologySpiral,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "low spiral trimaleolar open mortise → B3.1",
			lateralMorphology:   domain.LateralMorphologySpiral,
			medialSubtype:       domain.MedialSubtypeOpenMortise,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3_1,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "low spiral trimaleolar malleolus fracture → B3.2",
			lateralMorphology:   domain.LateralMorphologySpiral,
			medialSubtype:       domain.MedialSubtypeMalleolusFracture,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3_2,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		// Spanish language test
		{
			name:                "trimaleolar in Spanish",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			lang:                i18n.Spanish,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1_3,
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
				MedialSubtype:             tt.medialSubtype,
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

			if tt.expectedAOOTANil {
				if result.AOOTA != nil {
					t.Errorf("AOOTA should be nil (no clasificable), got %q", result.AOOTA.Code)
				}
			} else {
				if result.AOOTA == nil {
					t.Fatal("AOOTA classification is nil")
				}
				if result.AOOTA.Code != tt.expectedAOOTA {
					t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
				}
			}

			if tt.expectedLHNil {
				if result.LaugeHansen != nil {
					t.Errorf("LaugeHansen should be nil, got %v", result.LaugeHansen.Type)
				}
			} else {
				if result.LaugeHansen == nil {
					t.Fatal("LaugeHansen classification is nil")
				}
				if result.LaugeHansen.Type != tt.expectedLaugeHansen {
					t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
				}
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
		name                      string
		fibularLevel              domain.FibularLevel
		fibularLevelForTransverse domain.FibularLevel
		suprasindesmalType        domain.SuprasindesmalType
		fibulaTracePattern        domain.FibulaTracePattern
		lateralMorphology         domain.LateralMorphology
		posteriorType             domain.PosteriorFractureType
		hasCTScan                 *bool
		expectedBartonicek        domain.BartonicekType
		expectBartonicekNil       bool
		expectedLaugeHansen       domain.LaugeHansenType
		expectedLHNil             bool
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
			name:                      "low transverse infrasindesmal with CT → Bartonicek 1",
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelInfrasindesmal,
			posteriorType:             domain.PosteriorExtraincisural,
			hasCTScan:                 &boolTrue,
			expectedBartonicek:        domain.BartonicekType1,
			expectedLHNil:             true,
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
				InvolvedMalleoli:          domain.InvolvedTrimaleolar,
				FibularLevel:              tt.fibularLevel,
				FibularLevelForTransverse: tt.fibularLevelForTransverse,
				SuprasindesmalType:        tt.suprasindesmalType,
				FibulaTracePattern:        tt.fibulaTracePattern,
				LateralMorphology:         tt.lateralMorphology,
				PosteriorFractureType:     tt.posteriorType,
				HasCTScan:                 tt.hasCTScan,
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
			if tt.expectedLHNil {
				if result.LaugeHansen != nil {
					t.Errorf("LaugeHansen should be nil, got %v", result.LaugeHansen.Type)
				}
			} else {
				if result.LaugeHansen == nil || result.LaugeHansen.Type != tt.expectedLaugeHansen {
					t.Errorf("LaugeHansen.Type = %v, want %q", result.LaugeHansen, tt.expectedLaugeHansen)
				}
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

// TestEngine_Classify_TrimaleolarInfrasindesmal verifies the trimaleolar transverse infrasindesmal path
// returns a valid classification (no longer impossible per drawio 2026-02-28).
func TestEngine_Classify_TrimaleolarInfrasindesmal(t *testing.T) {
	engine := NewEngine()

	t.Run("trimaleolar transverse infrasindesmal → 44-A3.3 Weber A", func(t *testing.T) {
		input := domain.FractureInput{
			InvolvedMalleoli:          domain.InvolvedTrimaleolar,
			LateralMorphology:         domain.LateralMorphologyTransverse,
			FibularLevelForTransverse: domain.FibularLevelInfrasindesmal,
		}
		result, err := engine.Classify(input)
		if err != nil {
			t.Fatalf("Classify() unexpected error: %v", err)
		}
		if result.Impossible {
			t.Fatal("expected Impossible = false, got true")
		}
		if result.FractureType != "trimaleolar" {
			t.Errorf("FractureType = %q, want %q", result.FractureType, "trimaleolar")
		}
		if result.DanisWeber == nil || result.DanisWeber.Type != domain.DanisWeberA {
			t.Errorf("DanisWeber = %v, want Weber A", result.DanisWeber)
		}
		if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTAA3_3 {
			t.Errorf("AOOTA = %v, want 44-A3.3", result.AOOTA)
		}
		if result.LaugeHansen != nil {
			t.Errorf("LaugeHansen should be nil, got %v", result.LaugeHansen.Type)
		}
	})
}

// TestEngine_Classify_AOSubtypes tests the new AO subtype codes.
func TestEngine_Classify_AOSubtypes(t *testing.T) {
	engine := NewEngine()

	tests := []struct {
		name        string
		input       domain.FractureInput
		expectedAO  domain.AOOTACode
		expectedNil bool // AO should be nil
	}{
		// Lateral-only infrasindesmal subtypes
		{
			name: "lateral_only infra avulsion → 44-A1.2",
			input: domain.FractureInput{
				InvolvedMalleoli:         domain.InvolvedLateralOnly,
				FibularLevel:             domain.FibularLevelInfrasindesmal,
				InfrasindesmalMorphology: domain.LateralSubtypeAvulsion,
			},
			expectedAO: domain.AOOTAA1_2,
		},
		{
			name: "lateral_only infra malleolus → 44-A1.3",
			input: domain.FractureInput{
				InvolvedMalleoli:         domain.InvolvedLateralOnly,
				FibularLevel:             domain.FibularLevelInfrasindesmal,
				InfrasindesmalMorphology: domain.LateralSubtypeMalleolusFracture,
			},
			expectedAO: domain.AOOTAA1_3,
		},
		// Lateral-only transindesmal subtypes
		{
			name: "lateral_only trans simple → 44-B1.1",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralOnly,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
				LateralSubtype:    domain.LateralSubtypeSimple,
			},
			expectedAO: domain.AOOTAB1_1,
		},
		{
			name: "lateral_only trans syndesmosis → 44-B1.2",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralOnly,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologyOblique,
				LateralSubtype:    domain.LateralSubtypeSyndesmosisRupture,
			},
			expectedAO: domain.AOOTAB1_2,
		},
		{
			name: "lateral_only trans butterfly → 44-B1.3",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralOnly,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
				LateralSubtype:    domain.LateralSubtypeButterfly,
			},
			expectedAO: domain.AOOTAB1_3,
		},
		// Lateral+medial transindesmal subtypes
		{
			name: "lateral_medial trans oblique + open_mortise → 44-B2.1",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralMedial,
				MedialMorphology:  domain.MedialMorphologyTransverse,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologyOblique,
				MedialSubtype:     domain.MedialSubtypeOpenMortise,
			},
			expectedAO: domain.AOOTAB2_1,
		},
		{
			name: "lateral_medial trans spiral + malleolus → 44-B2.2",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralMedial,
				MedialMorphology:  domain.MedialMorphologyTransverse,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
				MedialSubtype:     domain.MedialSubtypeMalleolusFracture,
			},
			expectedAO: domain.AOOTAB2_2,
		},
		// Lateral+medial suprasindesmal subtypes
		{
			name: "lateral_medial supra C1 + open_mortise → 44-C1.1",
			input: domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedLateralMedial,
				MedialMorphology:   domain.MedialMorphologyTransverse,
				FibularLevel:       domain.FibularLevelSuprasindesmal,
				SuprasindesmalType: domain.SuprasindesmalSimpleDiaphyseal,
				FibulaTracePattern: domain.FibulaTraceParasindesmoticLong,
				MedialSubtype:      domain.MedialSubtypeOpenMortise,
			},
			expectedAO: domain.AOOTAC1_1,
		},
		{
			name: "lateral_medial supra C2 + malleolus → 44-C2.2",
			input: domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedLateralMedial,
				MedialMorphology:   domain.MedialMorphologyTransverse,
				FibularLevel:       domain.FibularLevelSuprasindesmal,
				SuprasindesmalType: domain.SuprasindesmalMultifragmentary,
				FibulaTracePattern: domain.FibulaTraceParasindesmoticShort,
				MedialSubtype:      domain.MedialSubtypeMalleolusFracture,
			},
			expectedAO: domain.AOOTAC2_2,
		},
		// Lateral+medial proximal C3 subtypes
		{
			name: "lateral_medial proximal + no shortening → 44-C3.1",
			input: domain.FractureInput{
				InvolvedMalleoli:        domain.InvolvedLateralMedial,
				MedialMorphology:        domain.MedialMorphologyTransverse,
				FibularLevel:            domain.FibularLevelSuprasindesmal,
				SuprasindesmalType:      domain.SuprasindesmalProximal,
				HasFibulaHeadShortening: boolPtr(false),
			},
			expectedAO: domain.AOOTAC3_1,
		},
		{
			name: "lateral_medial proximal + shortening → 44-C3.2",
			input: domain.FractureInput{
				InvolvedMalleoli:        domain.InvolvedLateralMedial,
				MedialMorphology:        domain.MedialMorphologyTransverse,
				FibularLevel:            domain.FibularLevelSuprasindesmal,
				SuprasindesmalType:      domain.SuprasindesmalProximal,
				HasFibulaHeadShortening: boolPtr(true),
			},
			expectedAO: domain.AOOTAC3_2,
		},
		// Conminuta morphology → AO nil
		{
			name: "trimaleolar conminuta → AO nil",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedTrimaleolar,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologyConminuta,
				HasCTScan:         boolPtr(false),
			},
			expectedNil: true,
		},
		{
			name: "lateral_medial conminuta → 44-B2.3",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralMedial,
				MedialMorphology:  domain.MedialMorphologyTransverse,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologyConminuta,
			},
			expectedAO: domain.AOOTAB2_3,
		},
		// Lateral+posterior transindesmal → AO nil (no clasificable per drawio 2026-02-28)
		{
			name: "lateral_posterior trans → AO nil (no clasificable)",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralPosterior,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
				HasCTScan:         boolPtr(false),
			},
			expectedNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := engine.Classify(tt.input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}
			if tt.expectedNil {
				if result.AOOTA != nil {
					t.Errorf("AOOTA should be nil, got %v", result.AOOTA.Code)
				}
			} else {
				if result.AOOTA == nil {
					t.Fatalf("AOOTA is nil, expected %v", tt.expectedAO)
				}
				if result.AOOTA.Code != tt.expectedAO {
					t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAO)
				}
			}
		})
	}
}

func boolPtr(b bool) *bool {
	return &b
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
