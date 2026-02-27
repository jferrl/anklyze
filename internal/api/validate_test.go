package api

import (
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
)

func TestValidationClassificationResult(t *testing.T) {
	t.Run("valid complete ClassificationResult", func(t *testing.T) {
		cr := domain.ClassificationResult{
			FractureType: "bimaleolar",
			DanisWeber:   &domain.DanisWeberClassification{Type: domain.DanisWeberB},
			LaugeHansen:  &domain.LaugeHansenClassification{Type: domain.LaugeHansenSER},
			AOOTA:        &domain.AOOTAClassification{Code: domain.AOOTAB2},
			Bartonicek:   &domain.BartonicekClassification{Type: domain.BartonicekType2},
		}
		if err := validate.Struct(cr); err != nil {
			t.Errorf("expected no validation error, got: %v", err)
		}
	})

	t.Run("valid partial ClassificationResult — only FractureType and DanisWeber", func(t *testing.T) {
		cr := domain.ClassificationResult{
			FractureType: "lateral_only",
			DanisWeber:   &domain.DanisWeberClassification{Type: domain.DanisWeberA},
			// LaugeHansen, AOOTA, Bartonicek are nil — this is a legitimate partial payload
		}
		if err := validate.Struct(cr); err != nil {
			t.Errorf("expected no validation error for partial payload, got: %v", err)
		}
	})

	t.Run("valid impossible result — no classification sub-structs", func(t *testing.T) {
		cr := domain.ClassificationResult{
			FractureType:  "impossible",
			Impossible:    true,
			ImpossibleKey: "classification.impossible.reason",
		}
		if err := validate.Struct(cr); err != nil {
			t.Errorf("expected no validation error for impossible result, got: %v", err)
		}
	})

	t.Run("missing FractureType is rejected", func(t *testing.T) {
		cr := domain.ClassificationResult{
			// FractureType intentionally omitted
			DanisWeber: &domain.DanisWeberClassification{Type: domain.DanisWeberA},
		}
		err := validate.Struct(cr)
		if err == nil {
			t.Error("expected validation error for missing FractureType, got nil")
			return
		}
		fields := validationFieldErrors(err)
		found := false
		for _, f := range fields {
			if f["field"] != "" && containsSubstring(f["field"], "FractureType") {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected field error for FractureType, got: %v", fields)
		}
	})

	t.Run("DanisWeber present but Type empty is rejected", func(t *testing.T) {
		cr := domain.ClassificationResult{
			FractureType: "lateral_only",
			DanisWeber:   &domain.DanisWeberClassification{Type: ""}, // empty Type
		}
		err := validate.Struct(cr)
		if err == nil {
			t.Error("expected validation error for empty DanisWeber.Type, got nil")
			return
		}
		fields := validationFieldErrors(err)
		found := false
		for _, f := range fields {
			if f["field"] != "" && containsSubstring(f["field"], "Type") {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected field error for DanisWeber.Type, got: %v", fields)
		}
	})

	t.Run("AOOTA present but Code empty is rejected", func(t *testing.T) {
		cr := domain.ClassificationResult{
			FractureType: "lateral_only",
			AOOTA:        &domain.AOOTAClassification{Code: ""}, // empty Code
		}
		err := validate.Struct(cr)
		if err == nil {
			t.Error("expected validation error for empty AOOTA.Code, got nil")
			return
		}
		fields := validationFieldErrors(err)
		found := false
		for _, f := range fields {
			if f["field"] != "" && containsSubstring(f["field"], "Code") {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected field error for AOOTA.Code, got: %v", fields)
		}
	})
}

func TestValidationFractureInput(t *testing.T) {
	t.Run("valid FractureInput with InvolvedMalleoli present", func(t *testing.T) {
		fi := domain.FractureInput{
			InvolvedMalleoli: domain.InvolvedLateralOnly,
		}
		if err := validate.Struct(fi); err != nil {
			t.Errorf("expected no validation error, got: %v", err)
		}
	})

	t.Run("missing InvolvedMalleoli is rejected", func(t *testing.T) {
		fi := domain.FractureInput{
			// InvolvedMalleoli intentionally omitted
		}
		err := validate.Struct(fi)
		if err == nil {
			t.Error("expected validation error for missing InvolvedMalleoli, got nil")
			return
		}
		fields := validationFieldErrors(err)
		found := false
		for _, f := range fields {
			if f["field"] != "" && containsSubstring(f["field"], "InvolvedMalleoli") {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected field error for InvolvedMalleoli, got: %v", fields)
		}
	})
}

func TestValidationFieldErrors(t *testing.T) {
	t.Run("validationFieldErrors returns field and error keys", func(t *testing.T) {
		cr := domain.ClassificationResult{
			// FractureType intentionally missing to trigger a validation error
		}
		err := validate.Struct(cr)
		if err == nil {
			t.Fatal("expected validation error, got nil")
		}

		fields := validationFieldErrors(err)
		if len(fields) == 0 {
			t.Fatal("expected at least one field error, got none")
		}

		for _, f := range fields {
			if _, ok := f["field"]; !ok {
				t.Errorf("expected 'field' key in error map, got: %v", f)
			}
			if _, ok := f["error"]; !ok {
				t.Errorf("expected 'error' key in error map, got: %v", f)
			}
		}
	})

	t.Run("validationFieldErrors includes failed validation tag in error message", func(t *testing.T) {
		cr := domain.ClassificationResult{}
		err := validate.Struct(cr)
		if err == nil {
			t.Fatal("expected validation error, got nil")
		}

		fields := validationFieldErrors(err)
		for _, f := range fields {
			if !containsSubstring(f["error"], "failed validation:") {
				t.Errorf("expected error to contain 'failed validation:', got: %s", f["error"])
			}
		}
	})
}

// containsSubstring checks if s contains substr.
func containsSubstring(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsAt(s, substr))
}

func containsAt(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
