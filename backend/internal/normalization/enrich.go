package normalization

import (
	"fmt"
	"math"
	"time"
)

// calculateBMI computes Body Mass Index from height and weight.
// Returns 0 if height is invalid.
func calculateBMI(heightCm, weightKg float64) float64 {
	if heightCm <= 0 {
		return 0
	}

	heightM := heightCm / 100.0
	bmi := weightKg / (heightM * heightM)

	// Round to 1 decimal place
	return math.Round(bmi*10) / 10
}

// categorizeBMI returns WHO BMI category.
func categorizeBMI(bmi float64) string {
	if bmi <= 0 {
		return ""
	}

	switch {
	case bmi < 18.5:
		return "underweight"
	case bmi < 25.0:
		return "normal"
	case bmi < 30.0:
		return "overweight"
	case bmi < 35.0:
		return "obesity_class_1"
	case bmi < 40.0:
		return "obesity_class_2"
	default:
		return "obesity_class_3"
	}
}

// categorizeVitaminD returns vitamin D status category.
func categorizeVitaminD(vd float64) string {
	if vd <= 0 {
		return ""
	}

	switch {
	case vd < 10:
		return "severe_deficiency"
	case vd < 20:
		return "deficiency"
	case vd < 30:
		return "insufficiency"
	default:
		return "sufficiency"
	}
}

// categorizeAge returns age group category.
func categorizeAge(age int) string {
	switch {
	case age < 40:
		return "young_adult"
	case age < 65:
		return "middle_aged"
	case age < 80:
		return "young_elderly"
	default:
		return "old_elderly"
	}
}

// calculateDaysToSurgery calculates days between fracture and surgery.
// Returns nil if either date is missing or if the result is negative (invalid).
func calculateDaysToSurgery(fractureDate, surgeryDate *time.Time) *int {
	if fractureDate == nil || surgeryDate == nil {
		return nil
	}

	days := int(surgeryDate.Sub(*fractureDate).Hours() / 24)

	// Return nil for invalid (negative) values - validation catches this
	if days < 0 {
		return nil
	}

	return &days
}

// generateInternalCode creates a standardized internal identifier.
// Format: ANK-001, ANK-002, etc.
func generateInternalCode(index int) string {
	return fmt.Sprintf("ANK-%03d", index)
}

// enrichPhase adds derived fields to normalized records.
// This phase calculates BMI, categorizes values, and generates internal codes.
func enrichPhase(records []NormalizedRecord) []NormalizedRecord {
	enriched := make([]NormalizedRecord, len(records))

	for i, record := range records {
		enriched[i] = record

		// Calculate and set BMI if height and weight are available
		if record.HeightCm != nil && record.WeightKg != nil {
			bmi := calculateBMI(*record.HeightCm, *record.WeightKg)
			enriched[i].BMI = &bmi
			enriched[i].BMICategory = categorizeBMI(bmi)
		}

		// Set vitamin D category if value is available
		if record.VitaminD != nil {
			enriched[i].VitaminDCategory = categorizeVitaminD(*record.VitaminD)
		}

		// Set age group if age is available
		if record.Age != nil {
			enriched[i].AgeGroup = categorizeAge(*record.Age)
		}

		// Calculate days to surgery
		enriched[i].DaysToSurgery = calculateDaysToSurgery(record.FractureDate, record.SurgeryDate)

		// Generate internal code (1-indexed)
		enriched[i].InternalCode = generateInternalCode(i + 1)
	}

	return enriched
}
