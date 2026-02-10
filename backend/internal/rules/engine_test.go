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

	tests := []struct {
		name                string
		posteriorType       domain.PosteriorFractureType
		hasCTScan           *bool
		lang                i18n.Language
		expectedBartonicek  domain.BartonicekType
		expectBartonicekNil bool
		expectedAOOTA       domain.AOOTACode
	}{
		{
			name:               "extraincisural posterior fracture with CT scan",
			posteriorType:      domain.PosteriorExtraincisural,
			hasCTScan:          &boolTrue,
			lang:               i18n.English,
			expectedBartonicek: domain.BartonicekType1,
			expectedAOOTA:      domain.AOOTAB3,
		},
		{
			name:               "posterolateral posterior fracture with CT scan",
			posteriorType:      domain.PosteriorPosterolateral,
			hasCTScan:          &boolTrue,
			lang:               i18n.English,
			expectedBartonicek: domain.BartonicekType2,
			expectedAOOTA:      domain.AOOTAB3,
		},
		{
			name:               "posteromedial and posterolateral posterior fracture with CT scan",
			posteriorType:      domain.PosteriorPosteromedialPosterolateral,
			hasCTScan:          &boolTrue,
			lang:               i18n.English,
			expectedBartonicek: domain.BartonicekType3,
			expectedAOOTA:      domain.AOOTAB3,
		},
		{
			name:               "large posterolateral posterior fracture with CT scan",
			posteriorType:      domain.PosteriorLargePosterolateral,
			hasCTScan:          &boolTrue,
			lang:               i18n.English,
			expectedBartonicek: domain.BartonicekType4,
			expectedAOOTA:      domain.AOOTAB3,
		},
		{
			name:               "posterior only in Spanish with CT scan",
			posteriorType:      domain.PosteriorExtraincisural,
			hasCTScan:          &boolTrue,
			lang:               i18n.Spanish,
			expectedBartonicek: domain.BartonicekType1,
			expectedAOOTA:      domain.AOOTAB3,
		},
		{
			name:                "posterior only without CT scan - no Bartonicek",
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolFalse,
			lang:                i18n.English,
			expectBartonicekNil: true,
			expectedAOOTA:       domain.AOOTAB3,
		},
		{
			name:                "posterior only with nil CT scan - no Bartonicek",
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           nil,
			lang:                i18n.English,
			expectBartonicekNil: true,
			expectedAOOTA:       domain.AOOTAB3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedPosteriorOnly,
				PosteriorFractureType: tt.posteriorType,
				HasCTScan:             tt.hasCTScan,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			expectedType := "unimaleolar_posterior"
			if result.FractureType != expectedType {
				t.Errorf("FractureType = %q, want %q", result.FractureType, expectedType)
			}

			if result.AOOTA == nil {
				t.Fatal("AOOTA classification is nil")
			}
			if result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
			}

			// Posterior-only fractures are Lauge-Hansen unclassifiable
			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if !result.LaugeHansen.Ambiguous {
				t.Error("LaugeHansen.Ambiguous should be true for posterior-only fractures")
			}
			if result.LaugeHansen.Type != "" {
				t.Errorf("LaugeHansen.Type should be empty for unclassifiable, got %q", result.LaugeHansen.Type)
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

	tests := []struct {
		name                  string
		medialMorphology      domain.MedialMorphology
		lang                  i18n.Language
		expectedAOOTA         domain.AOOTACode
		expectedLaugeHansen   domain.LaugeHansenType
		expectedAmbiguous     bool
		expectedPossibleTypes []string
	}{
		{
			name:                "oblique medial morphology",
			medialMorphology:    domain.MedialMorphologyOblique,
			lang:                i18n.English,
			expectedAOOTA:       domain.AOOTAA1,
			expectedLaugeHansen: domain.LaugeHansenSA,
			expectedAmbiguous:   false,
		},
		{
			name:                  "transverse medial morphology - ambiguous",
			medialMorphology:      domain.MedialMorphologyTransverse,
			lang:                  i18n.English,
			expectedAOOTA:         domain.AOOTAA1,
			expectedLaugeHansen:   "", // No specific type when ambiguous
			expectedAmbiguous:     true,
			expectedPossibleTypes: []string{"PA", "SER", "PER"},
		},
		{
			name:                "oblique medial in Spanish",
			medialMorphology:    domain.MedialMorphologyOblique,
			lang:                i18n.Spanish,
			expectedAOOTA:       domain.AOOTAA1,
			expectedLaugeHansen: domain.LaugeHansenSA,
			expectedAmbiguous:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialOnly,
				MedialMorphology: tt.medialMorphology,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			expectedType := "unimaleolar_medial"
			if result.FractureType != expectedType {
				t.Errorf("FractureType = %q, want %q", result.FractureType, expectedType)
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
			if tt.expectedAmbiguous {
				if len(result.LaugeHansen.PossibleTypes) != len(tt.expectedPossibleTypes) {
					t.Errorf("LaugeHansen.PossibleTypes length = %d, want %d", len(result.LaugeHansen.PossibleTypes), len(tt.expectedPossibleTypes))
				}
				for i, pt := range tt.expectedPossibleTypes {
					if i < len(result.LaugeHansen.PossibleTypes) && result.LaugeHansen.PossibleTypes[i] != pt {
						t.Errorf("LaugeHansen.PossibleTypes[%d] = %q, want %q", i, result.LaugeHansen.PossibleTypes[i], pt)
					}
				}
			}

			// Medial only should not have DanisWeber
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

	tests := []struct {
		name                  string
		hasCTScan             *bool
		posteriorType         domain.PosteriorFractureType
		lang                  i18n.Language
		expectedAOOTA         domain.AOOTACode
		expectedLaugeHansen   domain.LaugeHansenType
		expectedAmbiguous     bool
		expectedPossibleTypes []string
		expectedBartonicek    domain.BartonicekType
		expectBartonicekNil   bool
	}{
		{
			name:                  "medial posterior bimaleolar in English without CT",
			hasCTScan:             &boolFalse,
			lang:                  i18n.English,
			expectedAOOTA:         domain.AOOTAB3,
			expectedLaugeHansen:   "", // Empty when ambiguous with possible types
			expectedAmbiguous:     true,
			expectedPossibleTypes: []string{"SER", "PA"},
			expectBartonicekNil:   true,
		},
		{
			name:                  "medial posterior bimaleolar in Spanish without CT",
			hasCTScan:             &boolFalse,
			lang:                  i18n.Spanish,
			expectedAOOTA:         domain.AOOTAB3,
			expectedLaugeHansen:   "", // Empty when ambiguous with possible types
			expectedAmbiguous:     true,
			expectedPossibleTypes: []string{"SER", "PA"},
			expectBartonicekNil:   true,
		},
		{
			name:                  "medial posterior with CT scan - Bartonicek available",
			hasCTScan:             &boolTrue,
			posteriorType:         domain.PosteriorPosterolateral,
			lang:                  i18n.English,
			expectedAOOTA:         domain.AOOTAB3,
			expectedLaugeHansen:   "", // Empty when ambiguous with possible types
			expectedAmbiguous:     true,
			expectedPossibleTypes: []string{"SER", "PA"},
			expectedBartonicek:    domain.BartonicekType2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedMedialPosterior,
				HasCTScan:             tt.hasCTScan,
				PosteriorFractureType: tt.posteriorType,
			}

			result, err := engine.Classify(input)
			if err != nil {
				t.Fatalf("Classify() unexpected error: %v", err)
			}

			expectedType := "bimaleolar_medial_posterior"
			if result.FractureType != expectedType {
				t.Errorf("FractureType = %q, want %q", result.FractureType, expectedType)
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
			if tt.expectedAmbiguous {
				if len(result.LaugeHansen.PossibleTypes) != len(tt.expectedPossibleTypes) {
					t.Errorf("LaugeHansen.PossibleTypes length = %d, want %d", len(result.LaugeHansen.PossibleTypes), len(tt.expectedPossibleTypes))
				}
			}

			// Medial posterior should not have DanisWeber
			if result.DanisWeber != nil {
				t.Error("DanisWeber should be nil for medial posterior fractures")
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

func TestEngine_Classify_LateralPosterior(t *testing.T) {
	engine := NewEngine()
	boolTrue := true
	boolFalse := false

	tests := []struct {
		name                string
		fibularLevel        domain.FibularLevel
		lateralMorphology   domain.LateralMorphology
		posteriorType       domain.PosteriorFractureType
		suprasindesmalType  domain.SuprasindesmalType
		fibulaTracePattern  domain.FibulaTracePattern
		hasCTScan           *bool
		lang                i18n.Language
		expectedImpossible  bool
		expectedDanisWeber  domain.DanisWeberType
		expectedAOOTA       domain.AOOTACode
		expectedLaugeHansen domain.LaugeHansenType
		expectedBartonicek  domain.BartonicekType
		expectBartonicekNil bool
	}{
		// ALL infrasindesmal cases are impossible
		// SA mechanism doesn't involve posterior malleolus
		// PA mechanism is transsyndesmotic or suprasyndesmotic
		{
			name:               "infrasindesmal is always impossible (no morphology question)",
			fibularLevel:       domain.FibularLevelInfrasindesmal,
			lang:               i18n.English,
			expectedImpossible: true,
		},
		// Transindesmal spiral with CT scan
		{
			name:                "transindesmal spiral lateral posterior with CT",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolTrue,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
			expectedBartonicek:  domain.BartonicekType1,
		},
		// Transindesmal spiral without CT scan - no Bartonicek
		{
			name:                "transindesmal spiral lateral posterior without CT",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolFalse,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
			expectBartonicekNil: true,
		},
		// Transindesmal oblique with CT
		{
			name:                "transindesmal oblique lateral posterior with CT",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologyOblique,
			posteriorType:       domain.PosteriorPosteromedialPosterolateral,
			hasCTScan:           &boolTrue,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenPA,
			expectedBartonicek:  domain.BartonicekType3,
		},
		// Suprasindesmal simple with long trace pattern (PER) with CT
		{
			name:                "suprasindesmal simple diaphyseal long trace lateral posterior with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			posteriorType:       domain.PosteriorLargePosterolateral,
			hasCTScan:           &boolTrue,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPER,
			expectedBartonicek:  domain.BartonicekType4,
		},
		// Suprasindesmal simple with short trace pattern (PA) with CT
		{
			name:                "suprasindesmal simple diaphyseal short trace lateral posterior with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticShort,
			posteriorType:       domain.PosteriorPosterolateral,
			hasCTScan:           &boolTrue,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPA,
			expectedBartonicek:  domain.BartonicekType2,
		},
		// Suprasindesmal multifragmentary with CT
		{
			name:                "suprasindesmal multifragmentary lateral posterior with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			fibulaTracePattern:  domain.FibulaTraceParasindesmoticLong,
			posteriorType:       domain.PosteriorPosterolateral,
			hasCTScan:           &boolTrue,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC2,
			expectedLaugeHansen: domain.LaugeHansenPER,
			expectedBartonicek:  domain.BartonicekType2,
		},
		// Suprasindesmal proximal with CT
		{
			name:                "suprasindesmal proximal lateral posterior with CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolTrue,
			lang:                i18n.English,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC3,
			expectedLaugeHansen: domain.LaugeHansenPER,
			expectedBartonicek:  domain.BartonicekType1,
		},
		// Suprasindesmal proximal without CT - no Bartonicek
		{
			name:                "suprasindesmal proximal lateral posterior without CT",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			posteriorType:       domain.PosteriorExtraincisural,
			hasCTScan:           &boolFalse,
			lang:                i18n.English,
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

			expectedType := "bimaleolar_lateral_posterior"
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
			medialMorphology:      domain.MedialMorphologyOblique,
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
			medialMorphology:          domain.MedialMorphologyOblique,
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
			medialMorphology:          domain.MedialMorphologyOblique,
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
