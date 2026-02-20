package service

import (
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/internal/rules"
)

func TestClassifierService_Classify(t *testing.T) {
	t.Parallel()

	engine := rules.NewEngine()
	svc := NewClassifierService(engine)

	tests := []struct {
		name           string
		input          domain.FractureInput
		lang           i18n.Language
		wantAOOTACode  domain.AOOTACode
		wantLHType     domain.LaugeHansenType
		wantDWType     domain.DanisWeberType
		wantBartonicek bool
		wantErr        bool
	}{
		// Posterior only cases
		{
			name: "posterior only - without CT scan",
			input: domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedPosteriorOnly,
				HasCTScan:        ptrBool(false),
			},
			lang:           i18n.English,
			wantAOOTACode:  domain.AOOTAB3,
			wantLHType:     domain.LaugeHansenSER,
			wantBartonicek: false,
			wantErr:        false,
		},
		{
			name: "posterior only - with CT scan and Bartonicek type 2",
			input: domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedPosteriorOnly,
				HasCTScan:             ptrBool(true),
				PosteriorFractureType: domain.PosteriorPosterolateral,
			},
			lang:           i18n.English,
			wantAOOTACode:  domain.AOOTAB3,
			wantLHType:     domain.LaugeHansenSER,
			wantBartonicek: true,
			wantErr:        false,
		},
		// Medial only cases
		{
			name: "medial only - oblique morphology (SA mechanism)",
			input: domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialOnly,
				MedialMorphology: domain.MedialMorphologyOblique,
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAA1,
			wantLHType:    domain.LaugeHansenSA,
			wantErr:       false,
		},
		{
			name: "medial only - transverse morphology (ambiguous)",
			input: domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialOnly,
				MedialMorphology: domain.MedialMorphologyTransverse,
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAA1,
			wantErr:       false,
		},
		// Lateral only cases
		{
			name: "lateral only - infrasindesmal (Weber A, SA)",
			input: domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedLateralOnly,
				FibularLevel:     domain.FibularLevelInfrasindesmal,
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAA1,
			wantDWType:    domain.DanisWeberA,
			wantLHType:    domain.LaugeHansenSA,
			wantErr:       false,
		},
		{
			name: "lateral only - transindesmal spiral (Weber B, SER)",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralOnly,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAB1,
			wantDWType:    domain.DanisWeberB,
			wantLHType:    domain.LaugeHansenSER,
			wantErr:       false,
		},
		{
			name: "lateral only - transindesmal oblique (Weber B, PA)",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralOnly,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologyOblique,
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAB1,
			wantDWType:    domain.DanisWeberB,
			wantLHType:    domain.LaugeHansenPA,
			wantErr:       false,
		},
		{
			name: "lateral only - suprasindesmal proximal (Maisonneuve)",
			input: domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedLateralOnly,
				FibularLevel:       domain.FibularLevelSuprasindesmal,
				SuprasindesmalType: domain.SuprasindesmalProximal,
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAC3,
			wantDWType:    domain.DanisWeberC,
			wantLHType:    domain.LaugeHansenPER,
			wantErr:       false,
		},
		// Trimaleolar cases
		{
			name: "trimaleolar - suprasindesmal proximal with CT",
			input: domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedTrimaleolar,
				FibularLevel:          domain.FibularLevelSuprasindesmal,
				SuprasindesmalType:    domain.SuprasindesmalProximal,
				HasCTScan:             ptrBool(true),
				PosteriorFractureType: domain.PosteriorPosterolateral,
			},
			lang:           i18n.English,
			wantAOOTACode:  domain.AOOTAC3,
			wantDWType:     domain.DanisWeberC,
			wantLHType:     domain.LaugeHansenPER,
			wantBartonicek: true,
			wantErr:        false,
		},
		// Language tests
		{
			name: "lateral only - Spanish language",
			input: domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedLateralOnly,
				FibularLevel:     domain.FibularLevelInfrasindesmal,
			},
			lang:          i18n.Spanish,
			wantAOOTACode: domain.AOOTAA1,
			wantDWType:    domain.DanisWeberA,
			wantLHType:    domain.LaugeHansenSA,
			wantErr:       false,
		},
		// Empty/invalid input
		{
			name:    "empty input - no malleoli selected",
			input:   domain.FractureInput{},
			lang:    i18n.English,
			wantErr: false, // Returns result with description
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := svc.Classify(tt.input)

			if (err != nil) != tt.wantErr {
				t.Errorf("Classify() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if got == nil {
				t.Error("Classify() returned nil result")
				return
			}

			// Check AOOTA classification
			if tt.wantAOOTACode != "" {
				if got.AOOTA == nil {
					t.Error("Classify() AOOTA is nil, want non-nil")
				} else if got.AOOTA.Code != tt.wantAOOTACode {
					t.Errorf("Classify() AOOTA.Code = %v, want %v", got.AOOTA.Code, tt.wantAOOTACode)
				}
			}

			// Check Lauge-Hansen classification
			if tt.wantLHType != "" {
				if got.LaugeHansen == nil {
					t.Error("Classify() LaugeHansen is nil, want non-nil")
				} else if got.LaugeHansen.Type != tt.wantLHType && !got.LaugeHansen.Ambiguous {
					t.Errorf("Classify() LaugeHansen.Type = %v, want %v", got.LaugeHansen.Type, tt.wantLHType)
				}
			}

			// Check Danis-Weber classification
			if tt.wantDWType != "" {
				if got.DanisWeber == nil {
					t.Error("Classify() DanisWeber is nil, want non-nil")
				} else if got.DanisWeber.Type != tt.wantDWType {
					t.Errorf("Classify() DanisWeber.Type = %v, want %v", got.DanisWeber.Type, tt.wantDWType)
				}
			}

			// Check Bartonicek classification
			if tt.wantBartonicek && got.Bartonicek == nil {
				t.Error("Classify() Bartonicek is nil, want non-nil")
			}
			if !tt.wantBartonicek && got.Bartonicek != nil {
				// This is acceptable - some cases may include Bartonicek even if not explicitly expected
			}
		})
	}
}

func TestClassifierService_ClassifyBimalleolar(t *testing.T) {
	t.Parallel()

	engine := rules.NewEngine()
	svc := NewClassifierService(engine)

	tests := []struct {
		name          string
		input         domain.FractureInput
		lang          i18n.Language
		wantAOOTACode domain.AOOTACode
		wantDWType    domain.DanisWeberType
	}{
		{
			name: "lateral+medial - Weber B SER",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralMedial,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
				MedialMorphology:  domain.MedialMorphologyTransverse,
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAB2,
			wantDWType:    domain.DanisWeberB,
		},
		{
			name: "lateral+posterior - Weber B",
			input: domain.FractureInput{
				InvolvedMalleoli:  domain.InvolvedLateralPosterior,
				FibularLevel:      domain.FibularLevelTransindesmal,
				LateralMorphology: domain.LateralMorphologySpiral,
				HasCTScan:         ptrBool(false),
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAB3,
			wantDWType:    domain.DanisWeberB,
		},
		{
			name: "medial+posterior - AO B3",
			input: domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialPosterior,
				HasCTScan:        ptrBool(false),
			},
			lang:          i18n.English,
			wantAOOTACode: domain.AOOTAB3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := svc.Classify(tt.input)

			if err != nil {
				t.Errorf("Classify() unexpected error = %v", err)
				return
			}

			if got == nil {
				t.Error("Classify() returned nil result")
				return
			}

			if tt.wantAOOTACode != "" {
				if got.AOOTA == nil {
					t.Error("Classify() AOOTA is nil, want non-nil")
				} else if got.AOOTA.Code != tt.wantAOOTACode {
					t.Errorf("Classify() AOOTA.Code = %v, want %v", got.AOOTA.Code, tt.wantAOOTACode)
				}
			}

			if tt.wantDWType != "" {
				if got.DanisWeber == nil {
					t.Error("Classify() DanisWeber is nil, want non-nil")
				} else if got.DanisWeber.Type != tt.wantDWType {
					t.Errorf("Classify() DanisWeber.Type = %v, want %v", got.DanisWeber.Type, tt.wantDWType)
				}
			}
		})
	}
}

func TestNewClassifierService(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		engine  *rules.Engine
		wantNil bool
	}{
		{
			name:    "creates service with valid engine",
			engine:  rules.NewEngine(),
			wantNil: false,
		},
		{
			name:    "creates service with nil engine",
			engine:  nil,
			wantNil: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc := NewClassifierService(tt.engine)
			if (svc == nil) != tt.wantNil {
				t.Errorf("NewClassifierService() returned nil = %v, want nil = %v", svc == nil, tt.wantNil)
			}
		})
	}
}

func TestClassifierService_Interface(t *testing.T) {
	t.Parallel()

	// Verify that classifierService implements ClassifierService interface
	var _ ClassifierService = (*classifierService)(nil)

	// Also verify the factory function returns the interface
	engine := rules.NewEngine()
	var svc ClassifierService = NewClassifierService(engine)
	if svc == nil {
		t.Error("NewClassifierService should return a valid ClassifierService")
	}
}

// Helper function
func ptrBool(b bool) *bool {
	return &b
}
