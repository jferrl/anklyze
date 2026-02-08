package normalization

import (
	"context"
	"os"
	"testing"
)

// testMockLLMClient is a test mock for LLM operations.
type testMockLLMClient struct {
	generateJSONFunc func(ctx context.Context, systemPrompt, userPrompt string) (string, error)
}

func (m *testMockLLMClient) GenerateJSON(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	if m.generateJSONFunc != nil {
		return m.generateJSONFunc(ctx, systemPrompt, userPrompt)
	}
	return `{"implants":[],"approaches":[],"malleoli":[],"techniques":[],"syndesmosis":null}`, nil
}

func TestPipelineRun_GoldenFile(t *testing.T) {
	t.Parallel()

	input, err := os.ReadFile("testdata/input_golden.csv")
	if err != nil {
		t.Fatal(err)
	}

	result, err := Run(input, PipelineConfig{LLMClient: nil})
	if err != nil {
		t.Fatal(err)
	}

	// Verify stats
	if result.Stats.TotalRows < 10 {
		t.Errorf("TotalRows = %d, want >= 10", result.Stats.TotalRows)
	}
	if result.Stats.EmptyRowsRemoved < 1 {
		t.Error("expected at least 1 empty row removed")
	}
	if result.Stats.CellsCleaned < 5 {
		t.Error("expected at least 5 cells cleaned")
	}

	// Verify normalizations
	for _, r := range result.Records {
		if r.Sex != "" && r.Sex != "male" && r.Sex != "female" {
			t.Errorf("row %d: sex = %q, want male or female", r.RowNumber, r.Sex)
		}
		if r.Laterality != "" && r.Laterality != "left" && r.Laterality != "right" && r.Laterality != "bilateral" {
			t.Errorf("row %d: laterality = %q, want left/right/bilateral", r.RowNumber, r.Laterality)
		}
		if r.TraumaEnergy != "" && r.TraumaEnergy != "high" && r.TraumaEnergy != "low" {
			t.Errorf("row %d: trauma_energy = %q, want high or low", r.RowNumber, r.TraumaEnergy)
		}
		if r.InternalCode == "" {
			t.Errorf("row %d: InternalCode is empty", r.RowNumber)
		}
	}

	// Verify duplicate detection
	hasDuplicate := false
	for _, e := range result.Errors {
		if e.IssueType == "duplicate" {
			hasDuplicate = true
		}
	}
	if !hasDuplicate {
		t.Error("expected duplicate error in results")
	}

	// Verify AI was not used (nil client)
	if result.AIUsed {
		t.Error("expected AIUsed=false with nil client")
	}
}

func TestPipelineRun_EmptyCSV(t *testing.T) {
	t.Parallel()

	_, err := Run([]byte{}, PipelineConfig{})
	if err == nil {
		t.Error("expected error for empty input")
	}
}

func TestPipelineRun_HeaderOnly(t *testing.T) {
	t.Parallel()

	input := []byte("Edad,Sexo,Lateralidad\n")
	_, err := Run(input, PipelineConfig{})
	if err == nil {
		t.Error("expected error for header-only input")
	}
}

func TestPipelineRun_WithAI(t *testing.T) {
	t.Parallel()

	// Create mock LLM client that returns valid JSON
	mock := &testMockLLMClient{
		generateJSONFunc: func(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
			return `{"implants":[],"approaches":["lateral"],"malleoli":["lateral"],"techniques":[],"syndesmosis":null}`, nil
		},
	}

	input := []byte("Edad;Sexo;Tipo de cirugia\n65;Mujer;placa lateral\n")
	result, err := Run(input, PipelineConfig{LLMClient: mock})
	if err != nil {
		t.Fatal(err)
	}

	if !result.AIUsed {
		t.Error("expected AIUsed=true")
	}
}

func TestPipelineRun_AIFallback(t *testing.T) {
	t.Parallel()

	input := []byte("Edad;Sexo;Tipo de cirugia\n65;Mujer;placa Paragon 8H\n")
	result, err := Run(input, PipelineConfig{LLMClient: nil})
	if err != nil {
		t.Fatal(err)
	}

	if result.AIUsed {
		t.Error("expected AIUsed=false with nil client")
	}

	if result.Stats.AIFallbacks < 1 {
		t.Error("expected at least 1 AI fallback")
	}
}

func TestPipelineRun_MinimalCSV(t *testing.T) {
	t.Parallel()

	input := []byte("Edad;Sexo\n65;Mujer\n70;Hombre\n")
	result, err := Run(input, PipelineConfig{})
	if err != nil {
		t.Fatal(err)
	}

	if len(result.Records) != 2 {
		t.Errorf("expected 2 records, got %d", len(result.Records))
	}

	// Verify internal codes are set
	if result.Records[0].InternalCode != "ANK-001" {
		t.Errorf("first record InternalCode = %s, want ANK-001", result.Records[0].InternalCode)
	}
	if result.Records[1].InternalCode != "ANK-002" {
		t.Errorf("second record InternalCode = %s, want ANK-002", result.Records[1].InternalCode)
	}
}

func TestPipelineRun_WithBMICalculation(t *testing.T) {
	t.Parallel()

	input := []byte("Edad;Sexo;Talla;Peso\n65;Mujer;170;70\n")
	result, err := Run(input, PipelineConfig{})
	if err != nil {
		t.Fatal(err)
	}

	if len(result.Records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(result.Records))
	}

	r := result.Records[0]
	if r.BMI == nil {
		t.Error("BMI should be calculated")
	}
	if r.BMICategory == "" {
		t.Error("BMICategory should be set")
	}
}

func TestPipelineRun_WithDates(t *testing.T) {
	t.Parallel()

	input := []byte("Edad;Sexo;Fecha de fractura;Fecha cirugia\n65;Mujer;01/01/2025;05/01/2025\n")
	result, err := Run(input, PipelineConfig{})
	if err != nil {
		t.Fatal(err)
	}

	if len(result.Records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(result.Records))
	}

	r := result.Records[0]
	if r.FractureDate == nil {
		t.Error("FractureDate should be parsed")
	}
	if r.SurgeryDate == nil {
		t.Error("SurgeryDate should be parsed")
	}
	if r.DaysToSurgery == nil {
		t.Error("DaysToSurgery should be calculated")
	}
	if r.DaysToSurgery != nil && *r.DaysToSurgery != 4 {
		t.Errorf("DaysToSurgery = %d, want 4", *r.DaysToSurgery)
	}
}

func TestPipelineRun_WithValidationErrors(t *testing.T) {
	t.Parallel()

	// Create CSV with duplicate records
	input := []byte(`Edad;Sexo;Fecha de fractura;Lateralidad
65;Mujer;01/01/2025;Izquierda
65;Mujer;01/01/2025;Izquierda
`)

	result, err := Run(input, PipelineConfig{})
	if err != nil {
		t.Fatal(err)
	}

	if len(result.Errors) == 0 {
		t.Error("expected validation errors for duplicates")
	}

	// Check for duplicate error
	foundDuplicate := false
	for _, e := range result.Errors {
		if e.IssueType == "duplicate" {
			foundDuplicate = true
			break
		}
	}
	if !foundDuplicate {
		t.Error("expected duplicate error")
	}
}

func TestPipelineRun_WithValidationWarnings(t *testing.T) {
	t.Parallel()

	// Create CSV with out-of-range age
	input := []byte("Edad;Sexo\n120;Mujer\n")

	result, err := Run(input, PipelineConfig{})
	if err != nil {
		t.Fatal(err)
	}

	if len(result.Warnings) == 0 {
		t.Error("expected validation warnings for out-of-range age")
	}
}

func TestPipelineRun_LogAggregation(t *testing.T) {
	t.Parallel()

	input := []byte("Edad;Sexo;Lateralidad\n65;Mujer;Izquierda\n")
	result, err := Run(input, PipelineConfig{})
	if err != nil {
		t.Fatal(err)
	}

	// Should have logs from various phases
	if len(result.Log) == 0 {
		t.Error("expected log entries from pipeline phases")
	}
}

func TestPipelineRun_StatsAggregation(t *testing.T) {
	t.Parallel()

	input := []byte(`Edad;Sexo;Lateralidad
65;Mujer;Izquierda
70;Hombre;Derecha
80; Mujer ; Izquierda
`)

	result, err := Run(input, PipelineConfig{})
	if err != nil {
		t.Fatal(err)
	}

	stats := result.Stats
	if stats.TotalRows < 3 {
		t.Errorf("TotalRows = %d, want >= 3", stats.TotalRows)
	}
	if stats.CellsCleaned < 1 {
		t.Error("expected at least 1 cell cleaned (trailing spaces)")
	}
	if stats.EnumsMapped < 3 {
		t.Errorf("EnumsMapped = %d, want >= 3 (sex and laterality)", stats.EnumsMapped)
	}
}

func BenchmarkPipelineRun(b *testing.B) {
	input, err := os.ReadFile("testdata/input_golden.csv")
	if err != nil {
		// Skip benchmark if file doesn't exist
		b.Skip("testdata/input_golden.csv not found")
	}

	config := PipelineConfig{LLMClient: nil}
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_, _ = Run(input, config)
	}
}

func TestSafeParseInt(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  *int
	}{
		{"valid", "42", intPtr(42)},
		{"empty", "", nil},
		{"whitespace", "  ", nil},
		{"invalid", "abc", nil},
		{"with spaces", " 42 ", intPtr(42)},
		{"negative", "-5", intPtr(-5)},
		{"zero", "0", intPtr(0)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := safeParseInt(tt.input)
			if (got == nil) != (tt.want == nil) {
				t.Errorf("safeParseInt(%q) = %v, want %v", tt.input, got, tt.want)
				return
			}
			if got != nil && *got != *tt.want {
				t.Errorf("safeParseInt(%q) = %d, want %d", tt.input, *got, *tt.want)
			}
		})
	}
}

func TestSafeParseFloat(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  *float64
	}{
		{"valid", "42.5", f64Ptr(42.5)},
		{"empty", "", nil},
		{"whitespace", "  ", nil},
		{"invalid", "abc", nil},
		{"with spaces", " 42.5 ", f64Ptr(42.5)},
		{"integer", "42", f64Ptr(42.0)},
		{"zero", "0", f64Ptr(0.0)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := safeParseFloat(tt.input)
			if (got == nil) != (tt.want == nil) {
				t.Errorf("safeParseFloat(%q) = %v, want %v", tt.input, got, tt.want)
				return
			}
			if got != nil && *got != *tt.want {
				t.Errorf("safeParseFloat(%q) = %f, want %f", tt.input, *got, *tt.want)
			}
		})
	}
}

func TestSafeParseBool(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input string
		want  bool
	}{
		{"true", true},
		{"True", true},
		{"TRUE", true},
		{"yes", true},
		{"Yes", true},
		{"si", true},
		{"Si", true},
		{"1", true},
		{"false", false},
		{"no", false},
		{"0", false},
		{"", false},
		{"abc", false},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			t.Parallel()
			got := safeParseBool(tt.input)
			if got != tt.want {
				t.Errorf("safeParseBool(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestSplitAndTrim(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		sep   string
		want  []string
	}{
		{"simple", "a,b,c", ",", []string{"a", "b", "c"}},
		{"with spaces", "a , b , c", ",", []string{"a", "b", "c"}},
		{"empty", "", ",", nil},
		{"single", "a", ",", []string{"a"}},
		{"trailing sep", "a,b,", ",", []string{"a", "b"}},
		{"multiple spaces", "  a  ,  b  ", ",", []string{"a", "b"}},
		{"only separators", ",,,", ",", nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := splitAndTrim(tt.input, tt.sep)
			if len(got) != len(tt.want) {
				t.Errorf("splitAndTrim(%q, %q) length = %d, want %d", tt.input, tt.sep, len(got), len(tt.want))
				return
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("splitAndTrim(%q, %q)[%d] = %q, want %q", tt.input, tt.sep, i, got[i], tt.want[i])
				}
			}
		})
	}
}
