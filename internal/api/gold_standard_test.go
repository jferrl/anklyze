package api

import (
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
)

func TestBuildGoldStandardResult(t *testing.T) {
	t.Parallel()

	ptr := func(s string) *string { return &s }

	tests := []struct {
		name       string
		req        SetGoldStandardRequest
		wantNil    bool
		wantDW     domain.DanisWeberType
		wantLH     domain.LaugeHansenType
		wantAO     domain.AOOTACode
		wantBT     domain.BartonicekType
		wantImposs bool
	}{
		{
			name:    "all empty returns nil",
			req:     SetGoldStandardRequest{},
			wantNil: true,
		},
		{
			name:   "danis weber only",
			req:    SetGoldStandardRequest{DanisWeber: ptr("Weber A")},
			wantDW: domain.DanisWeberA,
		},
		{
			name:   "lauge hansen only",
			req:    SetGoldStandardRequest{LaugeHansen: ptr("SER")},
			wantLH: domain.LaugeHansenSER,
		},
		{
			name:   "ao/ota only",
			req:    SetGoldStandardRequest{AOOTA: ptr("44-B1")},
			wantAO: domain.AOOTAB1,
		},
		{
			name:   "bartonicek only",
			req:    SetGoldStandardRequest{Bartonicek: ptr("Bartonicek 2")},
			wantBT: domain.BartonicekType2,
		},
		{
			name:       "impossible flag only",
			req:        SetGoldStandardRequest{Impossible: true},
			wantImposs: true,
		},
		{
			name: "all systems set",
			req: SetGoldStandardRequest{
				DanisWeber:  ptr("Weber B"),
				LaugeHansen: ptr("SER"),
				AOOTA:       ptr("44-B2"),
				Bartonicek:  ptr("Bartonicek 3"),
			},
			wantDW: domain.DanisWeberB,
			wantLH: domain.LaugeHansenSER,
			wantAO: domain.AOOTAB2,
			wantBT: domain.BartonicekType3,
		},
		{
			name:   "not_classifiable values",
			req:    SetGoldStandardRequest{DanisWeber: ptr("not_classifiable")},
			wantDW: domain.DanisWeberNotClassifiable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			result := buildGoldStandardResult(tt.req)

			if tt.wantNil {
				if result != nil {
					t.Error("expected nil result")
				}
				return
			}
			if result == nil {
				t.Fatal("expected non-nil result")
			}

			if tt.wantDW != "" {
				if result.DanisWeber == nil {
					t.Fatal("expected DanisWeber, got nil")
				}
				if result.DanisWeber.Type != tt.wantDW {
					t.Errorf("DanisWeber = %q, want %q", result.DanisWeber.Type, tt.wantDW)
				}
			}
			if tt.wantLH != "" {
				if result.LaugeHansen == nil {
					t.Fatal("expected LaugeHansen, got nil")
				}
				if result.LaugeHansen.Type != tt.wantLH {
					t.Errorf("LaugeHansen = %q, want %q", result.LaugeHansen.Type, tt.wantLH)
				}
			}
			if tt.wantAO != "" {
				if result.AOOTA == nil {
					t.Fatal("expected AOOTA, got nil")
				}
				if result.AOOTA.Code != tt.wantAO {
					t.Errorf("AOOTA = %q, want %q", result.AOOTA.Code, tt.wantAO)
				}
			}
			if tt.wantBT != "" {
				if result.Bartonicek == nil {
					t.Fatal("expected Bartonicek, got nil")
				}
				if result.Bartonicek.Type != tt.wantBT {
					t.Errorf("Bartonicek = %q, want %q", result.Bartonicek.Type, tt.wantBT)
				}
			}
			if result.Impossible != tt.wantImposs {
				t.Errorf("Impossible = %v, want %v", result.Impossible, tt.wantImposs)
			}
		})
	}
}
