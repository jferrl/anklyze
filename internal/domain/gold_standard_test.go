package domain

import (
	"testing"

	"gorm.io/datatypes"
)

func TestCase_HasGoldStandard(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		goldStandard datatypes.JSON
		want         bool
	}{
		{
			name:         "nil gold standard",
			goldStandard: nil,
			want:         false,
		},
		{
			name:         "empty gold standard",
			goldStandard: datatypes.JSON{},
			want:         false,
		},
		{
			name:         "null JSON",
			goldStandard: datatypes.JSON("null"),
			want:         false,
		},
		{
			name:         "valid gold standard",
			goldStandard: datatypes.JSON(`{"danis_weber":{"type":"Weber A"}}`),
			want:         true,
		},
		{
			name:         "empty object is valid",
			goldStandard: datatypes.JSON(`{"impossible":true}`),
			want:         true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			c := &Case{GoldStandard: tt.goldStandard}
			if got := c.HasGoldStandard(); got != tt.want {
				t.Errorf("HasGoldStandard() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCase_SetAndGetGoldStandard(t *testing.T) {
	t.Parallel()

	t.Run("set and get round-trip", func(t *testing.T) {
		t.Parallel()
		c := &Case{}
		input := &ClassificationResult{
			DanisWeber:  &DanisWeberClassification{Type: DanisWeberB},
			LaugeHansen: &LaugeHansenClassification{Type: LaugeHansenSER},
			AOOTA:       &AOOTAClassification{Code: AOOTAB1},
		}

		if err := c.SetGoldStandard(input); err != nil {
			t.Fatalf("SetGoldStandard() error: %v", err)
		}

		if !c.HasGoldStandard() {
			t.Fatal("expected HasGoldStandard() = true after set")
		}

		got, err := c.GetGoldStandard()
		if err != nil {
			t.Fatalf("GetGoldStandard() error: %v", err)
		}

		if got.DanisWeber == nil || got.DanisWeber.Type != DanisWeberB {
			t.Errorf("DanisWeber = %v, want Weber B", got.DanisWeber)
		}
		if got.LaugeHansen == nil || got.LaugeHansen.Type != LaugeHansenSER {
			t.Errorf("LaugeHansen = %v, want SER", got.LaugeHansen)
		}
		if got.AOOTA == nil || got.AOOTA.Code != AOOTAB1 {
			t.Errorf("AOOTA = %v, want 44-B1", got.AOOTA)
		}
	})

	t.Run("set nil clears gold standard", func(t *testing.T) {
		t.Parallel()
		c := &Case{GoldStandard: datatypes.JSON(`{"danis_weber":{"type":"Weber A"}}`)}

		if err := c.SetGoldStandard(nil); err != nil {
			t.Fatalf("SetGoldStandard(nil) error: %v", err)
		}

		if c.HasGoldStandard() {
			t.Error("expected HasGoldStandard() = false after setting nil")
		}

		got, err := c.GetGoldStandard()
		if err != nil {
			t.Fatalf("GetGoldStandard() error: %v", err)
		}
		if got != nil {
			t.Error("expected nil gold standard after clearing")
		}
	})

	t.Run("get from empty case returns nil", func(t *testing.T) {
		t.Parallel()
		c := &Case{}
		got, err := c.GetGoldStandard()
		if err != nil {
			t.Fatalf("GetGoldStandard() error: %v", err)
		}
		if got != nil {
			t.Error("expected nil gold standard from empty case")
		}
	})

	t.Run("impossible flag preserved", func(t *testing.T) {
		t.Parallel()
		c := &Case{}
		input := &ClassificationResult{
			Impossible: true,
			DanisWeber: &DanisWeberClassification{Type: DanisWeberNotClassifiable},
		}

		if err := c.SetGoldStandard(input); err != nil {
			t.Fatalf("SetGoldStandard() error: %v", err)
		}

		got, err := c.GetGoldStandard()
		if err != nil {
			t.Fatalf("GetGoldStandard() error: %v", err)
		}
		if !got.Impossible {
			t.Error("expected Impossible = true")
		}
		if got.DanisWeber == nil || got.DanisWeber.Type != DanisWeberNotClassifiable {
			t.Errorf("DanisWeber = %v, want not_classifiable", got.DanisWeber)
		}
	})
}
