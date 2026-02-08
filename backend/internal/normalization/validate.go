package normalization

import (
	"fmt"
	"math"
)

// validateRanges checks each numeric field against expected clinical ranges.
// Returns warnings (not errors) for out-of-range values, as extreme values may be clinically valid.
func validateRanges(record NormalizedRecord, row int) []ValidationIssue {
	var issues []ValidationIssue

	// Age validation
	if record.Age != nil {
		ageRange := clinicalRanges["age"]
		age := float64(*record.Age)
		if age < ageRange.Min || age > ageRange.Max {
			issues = append(issues, ValidationIssue{
				Row:       row,
				Column:    "age",
				Message:   fmt.Sprintf("field value %.1f is outside expected range [%.0f, %.0f] %s", age, ageRange.Min, ageRange.Max, ageRange.Unit),
				Severity:  "warning",
				IssueType: "range",
			})
		}
	}

	// Height validation
	if record.HeightCm != nil {
		heightRange := clinicalRanges["height_cm"]
		if *record.HeightCm < heightRange.Min || *record.HeightCm > heightRange.Max {
			issues = append(issues, ValidationIssue{
				Row:       row,
				Column:    "height_cm",
				Message:   fmt.Sprintf("field value %.1f is outside expected range [%.0f, %.0f] %s", *record.HeightCm, heightRange.Min, heightRange.Max, heightRange.Unit),
				Severity:  "warning",
				IssueType: "range",
			})
		}
	}

	// Weight validation
	if record.WeightKg != nil {
		weightRange := clinicalRanges["weight_kg"]
		if *record.WeightKg < weightRange.Min || *record.WeightKg > weightRange.Max {
			issues = append(issues, ValidationIssue{
				Row:       row,
				Column:    "weight_kg",
				Message:   fmt.Sprintf("field value %.1f is outside expected range [%.0f, %.0f] %s", *record.WeightKg, weightRange.Min, weightRange.Max, weightRange.Unit),
				Severity:  "warning",
				IssueType: "range",
			})
		}
	}

	// BMI validation
	if record.BMI != nil {
		bmiRange := clinicalRanges["bmi"]
		if *record.BMI < bmiRange.Min || *record.BMI > bmiRange.Max {
			issues = append(issues, ValidationIssue{
				Row:       row,
				Column:    "bmi",
				Message:   fmt.Sprintf("field value %.1f is outside expected range [%.0f, %.0f] %s", *record.BMI, bmiRange.Min, bmiRange.Max, bmiRange.Unit),
				Severity:  "warning",
				IssueType: "range",
			})
		}
	}

	// Vitamin D validation
	if record.VitaminD != nil {
		vitdRange := clinicalRanges["vitamin_d"]
		if *record.VitaminD < vitdRange.Min || *record.VitaminD > vitdRange.Max {
			issues = append(issues, ValidationIssue{
				Row:       row,
				Column:    "vitamin_d",
				Message:   fmt.Sprintf("field value %.1f is outside expected range [%.0f, %.0f] %s", *record.VitaminD, vitdRange.Min, vitdRange.Max, vitdRange.Unit),
				Severity:  "warning",
				IssueType: "range",
			})
		}
	}

	return issues
}

// validateDateCoherence checks for logical date ordering:
// FractureDate <= ERDate <= SurgeryDate
func validateDateCoherence(record NormalizedRecord, row int) []ValidationIssue {
	var issues []ValidationIssue

	// Check ER date vs fracture date
	if record.ERDate != nil && record.FractureDate != nil {
		if record.ERDate.Before(*record.FractureDate) {
			issues = append(issues, ValidationIssue{
				Row:       row,
				Column:    "er_date",
				Message:   fmt.Sprintf("ER date (%s) is before fracture date (%s)", record.ERDate.Format("2006-01-02"), record.FractureDate.Format("2006-01-02")),
				Severity:  "warning",
				IssueType: "coherence",
			})
		}
	}

	// Check surgery date vs fracture date
	if record.SurgeryDate != nil && record.FractureDate != nil {
		if record.SurgeryDate.Before(*record.FractureDate) {
			issues = append(issues, ValidationIssue{
				Row:       row,
				Column:    "surgery_date",
				Message:   fmt.Sprintf("surgery date (%s) is before fracture date (%s)", record.SurgeryDate.Format("2006-01-02"), record.FractureDate.Format("2006-01-02")),
				Severity:  "warning",
				IssueType: "coherence",
			})
		}
	}

	// Check surgery date vs ER date (info level - less critical)
	if record.SurgeryDate != nil && record.ERDate != nil {
		if record.SurgeryDate.Before(*record.ERDate) {
			issues = append(issues, ValidationIssue{
				Row:       row,
				Column:    "surgery_date",
				Message:   fmt.Sprintf("surgery date (%s) is before ER date (%s)", record.SurgeryDate.Format("2006-01-02"), record.ERDate.Format("2006-01-02")),
				Severity:  "warning",
				IssueType: "coherence",
			})
		}
	}

	return issues
}

// validateBMICrossCheck recalculates BMI from height and weight and compares with recorded BMI.
func validateBMICrossCheck(record NormalizedRecord, row int) []ValidationIssue {
	var issues []ValidationIssue

	// Need all three values to perform cross-check
	if record.HeightCm == nil || record.WeightKg == nil || record.BMI == nil {
		return issues
	}

	// Recalculate BMI
	heightM := *record.HeightCm / 100.0
	if heightM <= 0 {
		return issues
	}

	expectedBMI := *record.WeightKg / (heightM * heightM)

	// Check if difference is significant (> 0.5)
	diff := math.Abs(expectedBMI - *record.BMI)
	if diff > 0.5 {
		issues = append(issues, ValidationIssue{
			Row:       row,
			Column:    "bmi",
			Message:   fmt.Sprintf("BMI mismatch: recorded %.1f, calculated from height/weight %.1f (difference %.1f)", *record.BMI, expectedBMI, diff),
			Severity:  "warning",
			IssueType: "coherence",
		})
	}

	return issues
}

// detectDuplicates identifies potential duplicate or bilateral fracture cases.
// Three-level strategy:
// - Level 1 (exact): Same Age + Sex + FractureDate + Laterality -> error
// - Level 2 (bilateral): Same Age + Sex + FractureDate + DIFFERENT Laterality -> info
// - Level 3 (possible): Same Age + Sex + FractureDate (same/missing laterality) -> warning
func detectDuplicates(records []NormalizedRecord) []ValidationIssue {
	var issues []ValidationIssue

	// Compare each pair of records
	for i := 0; i < len(records); i++ {
		for j := i + 1; j < len(records); j++ {
			r1, r2 := records[i], records[j]

			// Check if age, sex, and fracture date match
			if !matchesCore(r1, r2) {
				continue
			}

			// Both have laterality defined
			if r1.Laterality != "" && r2.Laterality != "" {
				if r1.Laterality == r2.Laterality {
					// Level 1: Exact duplicate
					issues = append(issues, ValidationIssue{
						Row:       r2.RowNumber,
						Column:    "",
						Message:   fmt.Sprintf("exact duplicate of row %d (same age, sex, fracture date, and laterality)", r1.RowNumber),
						Severity:  "error",
						IssueType: "duplicate",
					})
				} else {
					// Level 2: Bilateral fracture (both valid)
					issues = append(issues, ValidationIssue{
						Row:       r2.RowNumber,
						Column:    "",
						Message:   fmt.Sprintf("bilateral fracture with row %d (same age, sex, fracture date, different laterality)", r1.RowNumber),
						Severity:  "info",
						IssueType: "duplicate",
					})
				}
			} else {
				// Level 3: Possible duplicate (missing or same laterality but one is empty)
				issues = append(issues, ValidationIssue{
					Row:       r2.RowNumber,
					Column:    "",
					Message:   fmt.Sprintf("possible duplicate of row %d (same age, sex, fracture date)", r1.RowNumber),
					Severity:  "warning",
					IssueType: "duplicate",
				})
			}
		}
	}

	return issues
}

// matchesCore checks if two records have matching age, sex, and fracture date.
func matchesCore(r1, r2 NormalizedRecord) bool {
	// Age match
	if r1.Age == nil || r2.Age == nil {
		return false
	}
	if *r1.Age != *r2.Age {
		return false
	}

	// Sex match
	if r1.Sex == "" || r2.Sex == "" {
		return false
	}
	if r1.Sex != r2.Sex {
		return false
	}

	// Fracture date match
	if r1.FractureDate == nil || r2.FractureDate == nil {
		return false
	}
	// Compare dates (ignore time component)
	date1 := r1.FractureDate.Format("2006-01-02")
	date2 := r2.FractureDate.Format("2006-01-02")
	if date1 != date2 {
		return false
	}

	return true
}

// validatePhase orchestrates all validation checks.
func validatePhase(records []NormalizedRecord) *validateResult {
	var allErrors []ValidationIssue
	var allWarnings []ValidationIssue

	// Per-record validation
	for _, record := range records {
		// Range validation
		rangeIssues := validateRanges(record, record.RowNumber)
		for _, issue := range rangeIssues {
			if issue.Severity == "error" {
				allErrors = append(allErrors, issue)
			} else {
				allWarnings = append(allWarnings, issue)
			}
		}

		// Date coherence validation
		dateIssues := validateDateCoherence(record, record.RowNumber)
		for _, issue := range dateIssues {
			if issue.Severity == "error" {
				allErrors = append(allErrors, issue)
			} else {
				allWarnings = append(allWarnings, issue)
			}
		}

		// BMI cross-check validation
		bmiIssues := validateBMICrossCheck(record, record.RowNumber)
		for _, issue := range bmiIssues {
			if issue.Severity == "error" {
				allErrors = append(allErrors, issue)
			} else {
				allWarnings = append(allWarnings, issue)
			}
		}
	}

	// Duplicate detection across all records
	duplicateIssues := detectDuplicates(records)
	for _, issue := range duplicateIssues {
		if issue.Severity == "error" {
			allErrors = append(allErrors, issue)
		} else if issue.Severity == "warning" {
			allWarnings = append(allWarnings, issue)
		} else {
			// info level - add to warnings for visibility
			allWarnings = append(allWarnings, issue)
		}
	}

	return &validateResult{
		errors:   allErrors,
		warnings: allWarnings,
	}
}
