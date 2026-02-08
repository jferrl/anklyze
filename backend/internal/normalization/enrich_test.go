package normalization

import (
	"math"
	"testing"
	"time"
)

func TestCalculateBMI(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		height  float64
		weight  float64
		wantBMI float64
	}{
		{
			name:    "normal",
			height:  170,
			weight:  70,
			wantBMI: 24.2,
		},
		{
			name:    "obese",
			height:  160,
			weight:  100,
			wantBMI: 39.1,
		},
		{
			name:    "underweight",
			height:  180,
			weight:  55,
			wantBMI: 17.0,
		},
		{
			name:    "zero height",
			height:  0,
			weight:  70,
			wantBMI: 0,
		},
		{
			name:    "zero weight",
			height:  170,
			weight:  0,
			wantBMI: 0,
		},
		{
			name:    "negative height",
			height:  -170,
			weight:  70,
			wantBMI: 0,
		},
		{
			name:    "tall person",
			height:  200,
			weight:  100,
			wantBMI: 25.0,
		},
		{
			name:    "short person",
			height:  150,
			weight:  50,
			wantBMI: 22.2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := calculateBMI(tt.height, tt.weight)
			// Compare with tolerance of 0.1
			if math.Abs(got-tt.wantBMI) > 0.1 {
				t.Errorf("calculateBMI(%v, %v) = %v, want %v", tt.height, tt.weight, got, tt.wantBMI)
			}
		})
	}
}

func TestCategorizeBMI(t *testing.T) {
	t.Parallel()

	tests := []struct {
		bmi  float64
		want string
	}{
		{17.5, "underweight"},
		{18.5, "normal"},
		{24.9, "normal"},
		{25.0, "overweight"},
		{29.9, "overweight"},
		{30.0, "obesity_class_1"},
		{34.9, "obesity_class_1"},
		{35.0, "obesity_class_2"},
		{39.9, "obesity_class_2"},
		{40.0, "obesity_class_3"},
		{50.0, "obesity_class_3"},
		{0, ""},
		{-1, ""},
		{18.4, "underweight"},
		{18.49, "underweight"},
		{24.99, "normal"},
		{29.99, "overweight"},
		{34.99, "obesity_class_1"},
		{39.99, "obesity_class_2"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			t.Parallel()
			got := categorizeBMI(tt.bmi)
			if got != tt.want {
				t.Errorf("categorizeBMI(%v) = %v, want %v", tt.bmi, got, tt.want)
			}
		})
	}
}

func TestCategorizeVitaminD(t *testing.T) {
	t.Parallel()

	tests := []struct {
		vd   float64
		want string
	}{
		{5, "severe_deficiency"},
		{9.9, "severe_deficiency"},
		{10, "deficiency"},
		{15, "deficiency"},
		{19.9, "deficiency"},
		{20, "insufficiency"},
		{25, "insufficiency"},
		{29.9, "insufficiency"},
		{30, "sufficiency"},
		{50, "sufficiency"},
		{100, "sufficiency"},
		{0, ""},
		{-1, ""},
		{9.99, "severe_deficiency"},
		{19.99, "deficiency"},
		{29.99, "insufficiency"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			t.Parallel()
			got := categorizeVitaminD(tt.vd)
			if got != tt.want {
				t.Errorf("categorizeVitaminD(%v) = %v, want %v", tt.vd, got, tt.want)
			}
		})
	}
}

func TestCategorizeAge(t *testing.T) {
	t.Parallel()

	tests := []struct {
		age  int
		want string
	}{
		{25, "young_adult"},
		{39, "young_adult"},
		{40, "middle_aged"},
		{50, "middle_aged"},
		{64, "middle_aged"},
		{65, "young_elderly"},
		{70, "young_elderly"},
		{79, "young_elderly"},
		{80, "old_elderly"},
		{90, "old_elderly"},
		{95, "old_elderly"},
		{18, "young_adult"},
		{100, "old_elderly"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			t.Parallel()
			got := categorizeAge(tt.age)
			if got != tt.want {
				t.Errorf("categorizeAge(%v) = %v, want %v", tt.age, got, tt.want)
			}
		})
	}
}

func TestCalculateDaysToSurgery(t *testing.T) {
	t.Parallel()

	date1, _ := time.Parse("2006-01-02", "2025-01-01")
	date2, _ := time.Parse("2006-01-02", "2025-01-06")
	date3, _ := time.Parse("2006-01-02", "2025-01-10")

	tests := []struct {
		name         string
		fractureDate *time.Time
		surgeryDate  *time.Time
		wantDays     *int
	}{
		{
			name:         "5 days apart",
			fractureDate: &date1,
			surgeryDate:  &date2,
			wantDays:     intPtr(5),
		},
		{
			name:         "same day",
			fractureDate: &date1,
			surgeryDate:  &date1,
			wantDays:     intPtr(0),
		},
		{
			name:         "nil fracture date",
			fractureDate: nil,
			surgeryDate:  &date2,
			wantDays:     nil,
		},
		{
			name:         "nil surgery date",
			fractureDate: &date1,
			surgeryDate:  nil,
			wantDays:     nil,
		},
		{
			name:         "both nil",
			fractureDate: nil,
			surgeryDate:  nil,
			wantDays:     nil,
		},
		{
			name:         "surgery before fracture - negative",
			fractureDate: &date2,
			surgeryDate:  &date1,
			wantDays:     nil,
		},
		{
			name:         "9 days apart",
			fractureDate: &date1,
			surgeryDate:  &date3,
			wantDays:     intPtr(9),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := calculateDaysToSurgery(tt.fractureDate, tt.surgeryDate)
			if (got == nil) != (tt.wantDays == nil) {
				t.Errorf("calculateDaysToSurgery() = %v, want %v", got, tt.wantDays)
				return
			}
			if got != nil && *got != *tt.wantDays {
				t.Errorf("calculateDaysToSurgery() = %v, want %v", *got, *tt.wantDays)
			}
		})
	}
}

func TestGenerateInternalCode(t *testing.T) {
	t.Parallel()

	tests := []struct {
		index int
		want  string
	}{
		{1, "ANK-001"},
		{10, "ANK-010"},
		{99, "ANK-099"},
		{100, "ANK-100"},
		{999, "ANK-999"},
		{5, "ANK-005"},
		{50, "ANK-050"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			t.Parallel()
			got := generateInternalCode(tt.index)
			if got != tt.want {
				t.Errorf("generateInternalCode(%v) = %v, want %v", tt.index, got, tt.want)
			}
		})
	}
}

func TestEnrichPhase(t *testing.T) {
	t.Parallel()

	date1, _ := time.Parse("2006-01-02", "2025-01-01")
	date2, _ := time.Parse("2006-01-02", "2025-01-06")

	tests := []struct {
		name    string
		records []NormalizedRecord
		checks  func(t *testing.T, enriched []NormalizedRecord)
	}{
		{
			name: "records with height/weight - BMI calculated and categorized",
			records: []NormalizedRecord{
				{
					RowNumber: 1,
					HeightCm:  f64Ptr(170),
					WeightKg:  f64Ptr(70),
				},
			},
			checks: func(t *testing.T, enriched []NormalizedRecord) {
				t.Helper()
				if enriched[0].BMI == nil {
					t.Error("BMI should be calculated")
					return
				}
				if math.Abs(*enriched[0].BMI-24.2) > 0.1 {
					t.Errorf("BMI = %v, want ~24.2", *enriched[0].BMI)
				}
				if enriched[0].BMICategory != "normal" {
					t.Errorf("BMICategory = %v, want normal", enriched[0].BMICategory)
				}
			},
		},
		{
			name: "records with VitaminD - categorized",
			records: []NormalizedRecord{
				{
					RowNumber: 1,
					VitaminD:  f64Ptr(15),
				},
			},
			checks: func(t *testing.T, enriched []NormalizedRecord) {
				t.Helper()
				if enriched[0].VitaminDCategory != "deficiency" {
					t.Errorf("VitaminDCategory = %v, want deficiency", enriched[0].VitaminDCategory)
				}
			},
		},
		{
			name: "records with Age - categorized",
			records: []NormalizedRecord{
				{
					RowNumber: 1,
					Age:       intPtr(65),
				},
			},
			checks: func(t *testing.T, enriched []NormalizedRecord) {
				t.Helper()
				if enriched[0].AgeGroup != "young_elderly" {
					t.Errorf("AgeGroup = %v, want young_elderly", enriched[0].AgeGroup)
				}
			},
		},
		{
			name: "InternalCode set correctly",
			records: []NormalizedRecord{
				{RowNumber: 1},
				{RowNumber: 2},
				{RowNumber: 3},
			},
			checks: func(t *testing.T, enriched []NormalizedRecord) {
				t.Helper()
				if enriched[0].InternalCode != "ANK-001" {
					t.Errorf("InternalCode[0] = %v, want ANK-001", enriched[0].InternalCode)
				}
				if enriched[1].InternalCode != "ANK-002" {
					t.Errorf("InternalCode[1] = %v, want ANK-002", enriched[1].InternalCode)
				}
				if enriched[2].InternalCode != "ANK-003" {
					t.Errorf("InternalCode[2] = %v, want ANK-003", enriched[2].InternalCode)
				}
			},
		},
		{
			name: "DaysToSurgery calculated",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					FractureDate: &date1,
					SurgeryDate:  &date2,
				},
			},
			checks: func(t *testing.T, enriched []NormalizedRecord) {
				t.Helper()
				if enriched[0].DaysToSurgery == nil {
					t.Error("DaysToSurgery should be calculated")
					return
				}
				if *enriched[0].DaysToSurgery != 5 {
					t.Errorf("DaysToSurgery = %v, want 5", *enriched[0].DaysToSurgery)
				}
			},
		},
		{
			name: "full integration",
			records: []NormalizedRecord{
				{
					RowNumber:    1,
					Age:          intPtr(65),
					HeightCm:     f64Ptr(170),
					WeightKg:     f64Ptr(70),
					VitaminD:     f64Ptr(25),
					FractureDate: &date1,
					SurgeryDate:  &date2,
				},
			},
			checks: func(t *testing.T, enriched []NormalizedRecord) {
				t.Helper()
				r := enriched[0]
				if r.InternalCode != "ANK-001" {
					t.Errorf("InternalCode = %v, want ANK-001", r.InternalCode)
				}
				if r.BMI == nil {
					t.Error("BMI should be calculated")
				}
				if r.BMICategory == "" {
					t.Error("BMICategory should be set")
				}
				if r.VitaminDCategory == "" {
					t.Error("VitaminDCategory should be set")
				}
				if r.AgeGroup == "" {
					t.Error("AgeGroup should be set")
				}
				if r.DaysToSurgery == nil {
					t.Error("DaysToSurgery should be calculated")
				}
			},
		},
		{
			name: "BMI overwrite from CSV",
			records: []NormalizedRecord{
				{
					RowNumber: 1,
					HeightCm:  f64Ptr(170),
					WeightKg:  f64Ptr(70),
					BMI:       f64Ptr(30.0), // Wrong BMI from CSV
				},
			},
			checks: func(t *testing.T, enriched []NormalizedRecord) {
				t.Helper()
				if enriched[0].BMI == nil {
					t.Error("BMI should be set")
					return
				}
				// Should be recalculated, not use the CSV value
				if math.Abs(*enriched[0].BMI-24.2) > 0.1 {
					t.Errorf("BMI = %v, want ~24.2 (should be recalculated)", *enriched[0].BMI)
				}
			},
		},
		{
			name:    "empty records",
			records: []NormalizedRecord{},
			checks: func(t *testing.T, enriched []NormalizedRecord) {
				t.Helper()
				if len(enriched) != 0 {
					t.Errorf("len(enriched) = %v, want 0", len(enriched))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			enriched := enrichPhase(tt.records)
			tt.checks(t, enriched)
		})
	}
}
