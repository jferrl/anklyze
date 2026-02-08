package normalization

import (
	"testing"
)

func TestTrimWhitespace(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "trailing space", input: "No ", want: "No"},
		{name: "leading space", input: " Si", want: "Si"},
		{name: "both sides", input: "  value  ", want: "value"},
		{name: "tabs", input: "\tvalue\t", want: "value"},
		{name: "multiple internal spaces", input: "two  words", want: "two words"},
		{name: "empty", input: "", want: ""},
		{name: "only spaces", input: "   ", want: ""},
		{name: "mixed whitespace", input: "  hello \t world  ", want: "hello world"},
		{name: "newlines and spaces", input: "hello\n\nworld", want: "hello world"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := trimWhitespace(tt.input)
			if got != tt.want {
				t.Errorf("trimWhitespace(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestClearExcelErrors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "DIV/0", input: "#DIV/0!", want: ""},
		{name: "N/A", input: "#N/A", want: ""},
		{name: "REF", input: "#REF!", want: ""},
		{name: "VALUE", input: "#VALUE!", want: ""},
		{name: "NULL", input: "#NULL!", want: ""},
		{name: "SUMA formula", input: "=SUMA(A1:A5)", want: ""},
		{name: "suma lowercase", input: "=suma(a1:a5)", want: ""},
		{name: "normal value", input: "normal value", want: "normal value"},
		{name: "empty", input: "", want: ""},
		{name: "number", input: "42", want: "42"},
		{name: "mixed case error", input: "#Div/0!", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := clearExcelErrors(tt.input)
			if got != tt.want {
				t.Errorf("clearExcelErrors(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizeNulls(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		input        string
		wantValue    string
		wantNullType string
	}{
		{name: "empty", input: "", wantValue: "", wantNullType: "not_recorded"},
		{name: "N/A uppercase", input: "N/A", wantValue: "", wantNullType: "not_applicable"},
		{name: "n/a lowercase", input: "n/a", wantValue: "", wantNullType: "not_applicable"},
		{name: "NA", input: "NA", wantValue: "", wantNullType: "not_applicable"},
		{name: "dash", input: "-", wantValue: "", wantNullType: "not_applicable"},
		{name: "Pendiente", input: "Pendiente", wantValue: "", wantNullType: "pending"},
		{name: "pendiente lowercase", input: "pendiente", wantValue: "", wantNullType: "pending"},
		{name: "question mark", input: "?", wantValue: "", wantNullType: "uncertain"},
		{name: "Duda prefix", input: "Duda: algo", wantValue: "", wantNullType: "uncertain"},
		{name: "duda lowercase", input: "duda", wantValue: "", wantNullType: "uncertain"},
		{name: "real value", input: "real value", wantValue: "real value", wantNullType: ""},
		{name: "number", input: "42", wantValue: "42", wantNullType: ""},
		{name: "with spaces", input: "  N/A  ", wantValue: "", wantNullType: "not_applicable"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			gotValue, gotNullType := normalizeNulls(tt.input)
			if gotValue != tt.wantValue {
				t.Errorf("normalizeNulls(%q) value = %q, want %q", tt.input, gotValue, tt.wantValue)
			}
			if gotNullType != tt.wantNullType {
				t.Errorf("normalizeNulls(%q) nullType = %q, want %q", tt.input, gotNullType, tt.wantNullType)
			}
		})
	}
}

func TestCleanNumeric(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "space in decimal", input: "29. 24", want: "29.24"},
		{name: "European comma", input: "29,24", want: "29.24"},
		{name: "thousands separator European", input: "1.234,56", want: "1234.56"},
		{name: "thousands separator US", input: "1,234.56", want: "1234.56"},
		{name: "integer", input: "100", want: "100"},
		{name: "empty", input: "", want: ""},
		{name: "non-numeric", input: "abc", want: "abc"},
		{name: "already clean", input: "29.24", want: "29.24"},
		{name: "multiple thousands", input: "1.234.567,89", want: "1234567.89"},
		{name: "just comma", input: "123,45", want: "123.45"},
		{name: "just dot", input: "123.45", want: "123.45"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := cleanNumeric(tt.input)
			if got != tt.want {
				t.Errorf("cleanNumeric(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestCleanQuotes(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "double quotes", input: `"value"`, want: "value"},
		{name: "smart double quotes", input: "\u201Cvalue\u201D", want: "value"},
		{name: "smart single quotes", input: "\u2018value\u2019", want: "value"},
		{name: "single quotes", input: "'value'", want: "value"},
		{name: "no quotes", input: "normal", want: "normal"},
		{name: "empty", input: "", want: ""},
		{name: "only quotes", input: `""`, want: ""},
		{name: "mismatched quotes", input: `"value'`, want: `"value'`},
		{name: "quotes in middle", input: `val"ue`, want: `val"ue`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := cleanQuotes(tt.input)
			if got != tt.want {
				t.Errorf("cleanQuotes(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestIsNumericField(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		fieldName string
		want      bool
	}{
		{name: "age", fieldName: "age", want: true},
		{name: "height_cm", fieldName: "height_cm", want: true},
		{name: "weight_kg", fieldName: "weight_kg", want: true},
		{name: "bmi", fieldName: "bmi", want: true},
		{name: "vitamin_d", fieldName: "vitamin_d", want: true},
		{name: "sex", fieldName: "sex", want: false},
		{name: "laterality", fieldName: "laterality", want: false},
		{name: "unknown", fieldName: "unknown", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := isNumericField(tt.fieldName)
			if got != tt.want {
				t.Errorf("isNumericField(%q) = %v, want %v", tt.fieldName, got, tt.want)
			}
		})
	}
}

func TestCleanPhase(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name             string
		records          []map[string]string
		wantRecordCount  int
		wantCellsCleaned int
		checkFunc        func(*testing.T, *cleanResult)
	}{
		{
			name: "clean various dirty values",
			records: []map[string]string{
				{
					"age":       "  30  ",
					"sex":       `"male"`,
					"height_cm": "175,5",
					"weight_kg": "#DIV/0!",
					"bmi":       "29. 24",
				},
				{
					"age":       "N/A",
					"sex":       "female",
					"height_cm": "160",
					"weight_kg": "Pendiente",
					"bmi":       "?",
				},
			},
			wantRecordCount:  2,
			wantCellsCleaned: 8,
			checkFunc: func(t *testing.T, cr *cleanResult) {
				// Check first record
				if cr.records[0]["age"] != "30" {
					t.Errorf("expected age=30, got %s", cr.records[0]["age"])
				}
				if cr.records[0]["sex"] != "male" {
					t.Errorf("expected sex=male, got %s", cr.records[0]["sex"])
				}
				if cr.records[0]["height_cm"] != "175.5" {
					t.Errorf("expected height_cm=175.5, got %s", cr.records[0]["height_cm"])
				}
				if cr.records[0]["weight_kg"] != "" {
					t.Errorf("expected weight_kg empty, got %s", cr.records[0]["weight_kg"])
				}
				if cr.records[0]["bmi"] != "29.24" {
					t.Errorf("expected bmi=29.24, got %s", cr.records[0]["bmi"])
				}

				// Check second record
				if cr.records[1]["age"] != "" {
					t.Errorf("expected age empty, got %s", cr.records[1]["age"])
				}
				if cr.records[1]["weight_kg"] != "" {
					t.Errorf("expected weight_kg empty, got %s", cr.records[1]["weight_kg"])
				}
				if cr.records[1]["bmi"] != "" {
					t.Errorf("expected bmi empty, got %s", cr.records[1]["bmi"])
				}
			},
		},
		{
			name: "no changes needed",
			records: []map[string]string{
				{
					"age": "30",
					"sex": "male",
				},
			},
			wantRecordCount:  1,
			wantCellsCleaned: 0,
			checkFunc: func(t *testing.T, cr *cleanResult) {
				if len(cr.log) > 0 {
					t.Errorf("expected no log entries, got %d", len(cr.log))
				}
			},
		},
		{
			name: "log entries created",
			records: []map[string]string{
				{
					"age":       "#N/A",
					"height_cm": "1.234,56",
				},
			},
			wantRecordCount:  1,
			wantCellsCleaned: 2,
			checkFunc: func(t *testing.T, cr *cleanResult) {
				if len(cr.log) < 2 {
					t.Errorf("expected at least 2 log entries, got %d", len(cr.log))
				}
				// Verify log contains expected actions
				hasExcelError := false
				hasNumericClean := false
				for _, entry := range cr.log {
					if entry.Action == "clear_excel_error" {
						hasExcelError = true
					}
					if entry.Action == "clean_numeric" {
						hasNumericClean = true
					}
				}
				if !hasExcelError {
					t.Error("expected Excel error clearing in log")
				}
				if !hasNumericClean {
					t.Error("expected numeric cleaning in log")
				}
			},
		},
		{
			name:             "empty records",
			records:          []map[string]string{},
			wantRecordCount:  0,
			wantCellsCleaned: 0,
			checkFunc: func(t *testing.T, cr *cleanResult) {
				if len(cr.records) != 0 {
					t.Errorf("expected 0 records, got %d", len(cr.records))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := cleanPhase(tt.records)
			if len(got.records) != tt.wantRecordCount {
				t.Errorf("cleanPhase() records = %d, want %d", len(got.records), tt.wantRecordCount)
			}
			if got.cellsCleaned != tt.wantCellsCleaned {
				t.Errorf("cleanPhase() cellsCleaned = %d, want %d", got.cellsCleaned, tt.wantCellsCleaned)
			}
			if tt.checkFunc != nil {
				tt.checkFunc(t, got)
			}
		})
	}
}
