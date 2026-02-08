package normalization

import (
	"testing"
	"time"
)

// Helper functions for creating pointers
func intPtr(v int) *int             { return &v }
func f64Ptr(v float64) *float64     { return &v }
func timePtr(t time.Time) *time.Time { return &t }

func TestValidateRanges(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		record  NormalizedRecord
		wantLen int // number of issues
	}{
		{
			name: "all normal",
			record: NormalizedRecord{
				Age:      intPtr(65),
				HeightCm: f64Ptr(170),
				WeightKg: f64Ptr(70),
				BMI:      f64Ptr(24.2),
				VitaminD: f64Ptr(30),
			},
			wantLen: 0,
		},
		{
			name: "age too high",
			record: NormalizedRecord{
				Age: intPtr(120),
			},
			wantLen: 1,
		},
		{
			name: "age too low",
			record: NormalizedRecord{
				Age: intPtr(10),
			},
			wantLen: 1,
		},
		{
			name: "age edge low valid",
			record: NormalizedRecord{
				Age: intPtr(18),
			},
			wantLen: 0,
		},
		{
			name: "age edge high valid",
			record: NormalizedRecord{
				Age: intPtr(105),
			},
			wantLen: 0,
		},
		{
			name: "bmi extreme but valid",
			record: NormalizedRecord{
				BMI: f64Ptr(44.3),
			},
			wantLen: 0,
		},
		{
			name: "bmi impossible low",
			record: NormalizedRecord{
				BMI: f64Ptr(5),
			},
			wantLen: 1,
		},
		{
			name: "vitamin_d very low",
			record: NormalizedRecord{
				VitaminD: f64Ptr(1),
			},
			wantLen: 1,
		},
		{
			name:    "all nil",
			record:  NormalizedRecord{},
			wantLen: 0,
		},
		{
			name: "multiple out of range",
			record: NormalizedRecord{
				Age:      intPtr(120),
				HeightCm: f64Ptr(220),
				WeightKg: f64Ptr(300),
			},
			wantLen: 3,
		},
		{
			name: "height too low",
			record: NormalizedRecord{
				HeightCm: f64Ptr(120),
			},
			wantLen: 1,
		},
		{
			name: "weight too high",
			record: NormalizedRecord{
				WeightKg: f64Ptr(300),
			},
			wantLen: 1,
		},
		{
			name: "bmi too high",
			record: NormalizedRecord{
				BMI: f64Ptr(65),
			},
			wantLen: 1,
		},
		{
			name: "vitamin_d too high",
			record: NormalizedRecord{
				VitaminD: f64Ptr(200),
			},
			wantLen: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			issues := validateRanges(tt.record, 1)
			if len(issues) != tt.wantLen {
				t.Errorf("validateRanges() returned %d issues, want %d", len(issues), tt.wantLen)
			}
			// All range issues should be warnings
			for _, issue := range issues {
				if issue.Severity != "warning" {
					t.Errorf("expected warning severity, got %s", issue.Severity)
				}
				if issue.IssueType != "range" {
					t.Errorf("expected range issue type, got %s", issue.IssueType)
				}
			}
		})
	}
}

func TestValidateDateCoherence(t *testing.T) {
	t.Parallel()

	// Parse dates for testing
	date1, _ := time.Parse("2006-01-02", "2025-01-01")
	date2, _ := time.Parse("2006-01-02", "2025-01-05")
	date3, _ := time.Parse("2006-01-02", "2025-01-10")

	tests := []struct {
		name    string
		record  NormalizedRecord
		wantLen int
	}{
		{
			name: "normal order: fracture < ER < surgery",
			record: NormalizedRecord{
				FractureDate: timePtr(date1),
				ERDate:       timePtr(date2),
				SurgeryDate:  timePtr(date3),
			},
			wantLen: 0,
		},
		{
			name: "ER before fracture",
			record: NormalizedRecord{
				FractureDate: timePtr(date2),
				ERDate:       timePtr(date1),
			},
			wantLen: 1,
		},
		{
			name: "surgery before fracture",
			record: NormalizedRecord{
				FractureDate: timePtr(date2),
				SurgeryDate:  timePtr(date1),
			},
			wantLen: 1,
		},
		{
			name: "surgery before ER",
			record: NormalizedRecord{
				ERDate:      timePtr(date2),
				SurgeryDate: timePtr(date1),
			},
			wantLen: 1,
		},
		{
			name:    "all nil",
			record:  NormalizedRecord{},
			wantLen: 0,
		},
		{
			name: "some nil",
			record: NormalizedRecord{
				FractureDate: timePtr(date1),
			},
			wantLen: 0,
		},
		{
			name: "same dates",
			record: NormalizedRecord{
				FractureDate: timePtr(date1),
				ERDate:       timePtr(date1),
				SurgeryDate:  timePtr(date1),
			},
			wantLen: 0,
		},
		{
			name: "all dates wrong order",
			record: NormalizedRecord{
				FractureDate: timePtr(date3),
				ERDate:       timePtr(date2),
				SurgeryDate:  timePtr(date1),
			},
			wantLen: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			issues := validateDateCoherence(tt.record, 1)
			if len(issues) != tt.wantLen {
				t.Errorf("validateDateCoherence() returned %d issues, want %d", len(issues), tt.wantLen)
			}
			// All coherence issues should be warnings
			for _, issue := range issues {
				if issue.Severity != "warning" {
					t.Errorf("expected warning severity, got %s", issue.Severity)
				}
				if issue.IssueType != "coherence" {
					t.Errorf("expected coherence issue type, got %s", issue.IssueType)
				}
			}
		})
	}
}

func TestValidateBMICrossCheck(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		record  NormalizedRecord
		wantLen int
	}{
		{
			name: "matching BMI",
			record: NormalizedRecord{
				HeightCm: f64Ptr(170),
				WeightKg: f64Ptr(70),
				BMI:      f64Ptr(24.2),
			},
			wantLen: 0,
		},
		{
			name: "mismatched BMI",
			record: NormalizedRecord{
				HeightCm: f64Ptr(170),
				WeightKg: f64Ptr(70),
				BMI:      f64Ptr(30.0),
			},
			wantLen: 1,
		},
		{
			name: "missing height",
			record: NormalizedRecord{
				WeightKg: f64Ptr(70),
				BMI:      f64Ptr(24.2),
			},
			wantLen: 0,
		},
		{
			name: "missing weight",
			record: NormalizedRecord{
				HeightCm: f64Ptr(170),
				BMI:      f64Ptr(24.2),
			},
			wantLen: 0,
		},
		{
			name: "missing BMI",
			record: NormalizedRecord{
				HeightCm: f64Ptr(170),
				WeightKg: f64Ptr(70),
			},
			wantLen: 0,
		},
		{
			name:    "all missing",
			record:  NormalizedRecord{},
			wantLen: 0,
		},
		{
			name: "BMI within tolerance",
			record: NormalizedRecord{
				HeightCm: f64Ptr(170),
				WeightKg: f64Ptr(70),
				BMI:      f64Ptr(24.5),
			},
			wantLen: 0,
		},
		{
			name: "BMI exact match",
			record: NormalizedRecord{
				HeightCm: f64Ptr(160),
				WeightKg: f64Ptr(100),
				BMI:      f64Ptr(39.1),
			},
			wantLen: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			issues := validateBMICrossCheck(tt.record, 1)
			if len(issues) != tt.wantLen {
				t.Errorf("validateBMICrossCheck() returned %d issues, want %d", len(issues), tt.wantLen)
			}
			for _, issue := range issues {
				if issue.Severity != "warning" {
					t.Errorf("expected warning severity, got %s", issue.Severity)
				}
			}
		})
	}
}

func TestDetectDuplicates(t *testing.T) {
	t.Parallel()

	date1, _ := time.Parse("2006-01-02", "2025-01-01")
	date2, _ := time.Parse("2006-01-02", "2025-01-05")

	tests := []struct {
		name        string
		records     []NormalizedRecord
		wantLen     int
		wantErrors  int
		wantWarning int
		wantInfo    int
	}{
		{
			name: "two identical records - exact duplicate",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
				{
					RowNumber:    2,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
			},
			wantLen:     1,
			wantErrors:  1,
			wantWarning: 0,
			wantInfo:    0,
		},
		{
			name: "same patient different laterality - bilateral",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
				{
					RowNumber:    2,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "right",
				},
			},
			wantLen:     1,
			wantErrors:  0,
			wantWarning: 0,
			wantInfo:    1,
		},
		{
			name: "same age+sex+date - possible duplicate",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "",
				},
				{
					RowNumber:    2,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
			},
			wantLen:     1,
			wantErrors:  0,
			wantWarning: 1,
			wantInfo:    0,
		},
		{
			name: "all different",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
				{
					RowNumber:    2,
					Age:          intPtr(70),
					Sex:          "female",
					FractureDate: timePtr(date2),
					Laterality:   "right",
				},
			},
			wantLen:     0,
			wantErrors:  0,
			wantWarning: 0,
			wantInfo:    0,
		},
		{
			name:        "empty list",
			records:     []NormalizedRecord{},
			wantLen:     0,
			wantErrors:  0,
			wantWarning: 0,
			wantInfo:    0,
		},
		{
			name: "single record",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
			},
			wantLen:     0,
			wantErrors:  0,
			wantWarning: 0,
			wantInfo:    0,
		},
		{
			name: "different dates",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
				{
					RowNumber:    2,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date2),
					Laterality:   "left",
				},
			},
			wantLen:     0,
			wantErrors:  0,
			wantWarning: 0,
			wantInfo:    0,
		},
		{
			name: "missing age",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
				{
					RowNumber:    2,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
			},
			wantLen:     0,
			wantErrors:  0,
			wantWarning: 0,
			wantInfo:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			issues := detectDuplicates(tt.records)
			if len(issues) != tt.wantLen {
				t.Errorf("detectDuplicates() returned %d issues, want %d", len(issues), tt.wantLen)
			}

			errorCount := 0
			warningCount := 0
			infoCount := 0
			for _, issue := range issues {
				switch issue.Severity {
				case "error":
					errorCount++
				case "warning":
					warningCount++
				case "info":
					infoCount++
				}
				if issue.IssueType != "duplicate" {
					t.Errorf("expected duplicate issue type, got %s", issue.IssueType)
				}
			}

			if errorCount != tt.wantErrors {
				t.Errorf("got %d errors, want %d", errorCount, tt.wantErrors)
			}
			if warningCount != tt.wantWarning {
				t.Errorf("got %d warnings, want %d", warningCount, tt.wantWarning)
			}
			if infoCount != tt.wantInfo {
				t.Errorf("got %d info, want %d", infoCount, tt.wantInfo)
			}
		})
	}
}

func TestValidatePhase(t *testing.T) {
	t.Parallel()

	date1, _ := time.Parse("2006-01-02", "2025-01-01")

	tests := []struct {
		name          string
		records       []NormalizedRecord
		wantErrors    int
		wantWarnings  int
		minWarnings   bool // true if we want "at least" wantWarnings
		wantHasError  bool
		wantHasWarn   bool
	}{
		{
			name: "integration test with mixed records",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					Sex:          "male",
					HeightCm:     f64Ptr(170),
					WeightKg:     f64Ptr(70),
					BMI:          f64Ptr(24.2),
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
				{
					RowNumber:    2,
					Age:          intPtr(120), // out of range
					Sex:          "female",
					FractureDate: timePtr(date1),
					Laterality:   "right",
				},
				{
					RowNumber:    3,
					Age:          intPtr(65),
					Sex:          "male",
					FractureDate: timePtr(date1),
					Laterality:   "left", // duplicate of row 1
				},
			},
			wantErrors:   1, // exact duplicate
			wantWarnings: 1, // age out of range
			minWarnings:  true,
			wantHasError: true,
			wantHasWarn:  true,
		},
		{
			name: "all valid records",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					Sex:          "male",
					HeightCm:     f64Ptr(170),
					WeightKg:     f64Ptr(70),
					BMI:          f64Ptr(24.2),
					FractureDate: timePtr(date1),
					Laterality:   "left",
				},
			},
			wantErrors:   0,
			wantWarnings: 0,
			wantHasError: false,
			wantHasWarn:  false,
		},
		{
			name:         "empty records",
			records:      []NormalizedRecord{},
			wantErrors:   0,
			wantWarnings: 0,
			wantHasError: false,
			wantHasWarn:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			result := validatePhase(tt.records)

			if tt.minWarnings {
				if len(result.warnings) < tt.wantWarnings {
					t.Errorf("validatePhase() returned %d warnings, want at least %d", len(result.warnings), tt.wantWarnings)
				}
			} else {
				if len(result.warnings) != tt.wantWarnings {
					t.Errorf("validatePhase() returned %d warnings, want %d", len(result.warnings), tt.wantWarnings)
				}
			}

			if len(result.errors) != tt.wantErrors {
				t.Errorf("validatePhase() returned %d errors, want %d", len(result.errors), tt.wantErrors)
			}

			if tt.wantHasError && len(result.errors) == 0 {
				t.Error("expected at least one error")
			}

			if tt.wantHasWarn && len(result.warnings) == 0 {
				t.Error("expected at least one warning")
			}
		})
	}
}
