package normalization

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
)

// mockLLMClient is a mock implementation of LLMClient for testing.
type mockLLMClient struct {
	generateJSONFunc func(ctx context.Context, systemPrompt, userPrompt string) (string, error)
}

func (m *mockLLMClient) GenerateJSON(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	if m.generateJSONFunc != nil {
		return m.generateJSONFunc(ctx, systemPrompt, userPrompt)
	}
	return "", errors.New("not implemented")
}

func TestAIExtractor_ExtractSurgeryData_WithAI(t *testing.T) {
	t.Parallel()

	validResponse := SurgeryExtraction{
		Implants: []ExtractedImplant{
			{
				Malleolus: "lateral",
				Type:      "plate",
				Brand:     "Paragon",
				Model:     "",
				Size:      "8H",
				Count:     1,
			},
		},
		Approaches: []string{"lateral", "medial"},
		Syndesmosis: &SyndesmosisInfo{
			Repaired: true,
			Type:     "suture_button",
			Brand:    "Arthrex",
		},
	}

	jsonResp, _ := json.Marshal(validResponse)

	mock := &mockLLMClient{
		generateJSONFunc: func(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
			return string(jsonResp), nil
		},
	}

	extractor := newAIExtractor(mock, "es")
	result, err := extractor.ExtractSurgeryData(context.Background(), "placa Paragon lateral 8H + tight rope Arthrex")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if len(result.Implants) != 1 {
		t.Errorf("expected 1 implant, got %d", len(result.Implants))
	}
	if result.Implants[0].Brand != "Paragon" {
		t.Errorf("expected brand Paragon, got %s", result.Implants[0].Brand)
	}
	if result.Syndesmosis == nil || !result.Syndesmosis.Repaired {
		t.Error("expected syndesmosis to be repaired")
	}
}

func TestAIExtractor_ExtractSurgeryData_AIError_FallsBackToRegex(t *testing.T) {
	t.Parallel()

	mock := &mockLLMClient{
		generateJSONFunc: func(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
			return "", errors.New("AI error")
		},
	}

	extractor := newAIExtractor(mock, "es")
	result, err := extractor.ExtractSurgeryData(context.Background(), "placa Paragon lateral 8H")

	// Should not error - should fall back to regex
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result from regex fallback, got nil")
	}
	// Regex should have extracted the plate
	if len(result.Implants) == 0 {
		t.Error("expected regex fallback to extract implants")
	}
}

func TestAIExtractor_ExtractSurgeryData_NilClient(t *testing.T) {
	t.Parallel()

	extractor := newAIExtractor(nil, "es")
	result, err := extractor.ExtractSurgeryData(context.Background(), "placa Paragon lateral 8H + 2 tornillos canulados minimonster 3.5mm")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	// Should use regex extraction
	if len(result.Implants) < 2 {
		t.Errorf("expected at least 2 implants from regex, got %d", len(result.Implants))
	}
}

func TestAIExtractor_NormalizeAssociatedInjuries_WithAI(t *testing.T) {
	t.Parallel()

	mock := &mockLLMClient{
		generateJSONFunc: func(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
			return `["dislocation", "maisonneuve_fracture"]`, nil
		},
	}

	extractor := newAIExtractor(mock, "es")
	result, err := extractor.NormalizeAssociatedInjuries(context.Background(), "luxacion + fractura maisonneuve")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 injuries, got %d", len(result))
	}
}

func TestAIExtractor_NormalizeApproaches_WithAI(t *testing.T) {
	t.Parallel()

	mock := &mockLLMClient{
		generateJSONFunc: func(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
			return `["lateral", "medial"]`, nil
		},
	}

	extractor := newAIExtractor(mock, "es")
	result, err := extractor.NormalizeApproaches(context.Background(), "lateral y medial")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 approaches, got %d", len(result))
	}
}

func TestRegexExtractImplants(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		input         string
		wantCount     int
		checkIdx      int
		wantType      string
		wantBrand     string
		wantSize      string
		wantImplCount int
	}{
		{
			name:          "paragon plate",
			input:         "placa Paragon lateral 8H",
			wantCount:     1,
			checkIdx:      0,
			wantType:      "plate",
			wantBrand:     "Paragon",
			wantSize:      "8H",
			wantImplCount: 1,
		},
		{
			name:          "typo pargagon",
			input:         "placa Pargagon 6H",
			wantCount:     1,
			checkIdx:      0,
			wantType:      "plate",
			wantBrand:     "Paragon",
			wantSize:      "6H",
			wantImplCount: 1,
		},
		{
			name:          "arthrex plate",
			input:         "placa Arthrex posterolateral 7H",
			wantCount:     1,
			checkIdx:      0,
			wantType:      "plate",
			wantBrand:     "Arthrex",
			wantSize:      "7H",
			wantImplCount: 1,
		},
		{
			name:          "tight rope",
			input:         "tight rope Arthrex",
			wantCount:     1,
			checkIdx:      0,
			wantType:      "suture_button",
			wantBrand:     "Arthrex TightRope",
			wantSize:      "",
			wantImplCount: 1,
		},
		{
			name:          "cannulated screws",
			input:         "2 tornillos canulados minimonster 3.5mm",
			wantCount:     1,
			checkIdx:      0,
			wantType:      "cannulated_screw",
			wantBrand:     "Paragon MiniMonster",
			wantSize:      "3.5",
			wantImplCount: 2,
		},
		{
			name:          "multiple implants",
			input:         "placa Arthrex 7H + 2 tornillos canulados minimonster 3.5mm",
			wantCount:     2,
			checkIdx:      0,
			wantType:      "plate",
			wantBrand:     "Arthrex",
			wantSize:      "7H",
			wantImplCount: 1,
		},
		{
			name:      "empty string",
			input:     "",
			wantCount: 0,
		},
		{
			name:      "no implants",
			input:     "revision de herida quirurgica",
			wantCount: 0,
		},
		{
			name:          "cortical screws",
			input:         "3 tornillos corticales 4.5mm",
			wantCount:     1,
			checkIdx:      0,
			wantType:      "cortical_screw",
			wantSize:      "4.5",
			wantImplCount: 3,
		},
		{
			name:          "nail",
			input:         "clavo Phoenix 150mm x 8mm",
			wantCount:     1,
			checkIdx:      0,
			wantType:      "nail",
			wantSize:      "150mm x 8mm",
			wantImplCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := regexExtractImplants(tt.input)

			if len(got) != tt.wantCount {
				t.Errorf("regexExtractImplants(%q) returned %d implants, want %d", tt.input, len(got), tt.wantCount)
			}

			if tt.wantCount > 0 && tt.checkIdx < len(got) {
				implant := got[tt.checkIdx]
				if implant.Type != tt.wantType {
					t.Errorf("implant[%d].Type = %q, want %q", tt.checkIdx, implant.Type, tt.wantType)
				}
				if tt.wantBrand != "" && implant.Brand != tt.wantBrand {
					t.Errorf("implant[%d].Brand = %q, want %q", tt.checkIdx, implant.Brand, tt.wantBrand)
				}
				if tt.wantSize != "" && implant.Size != tt.wantSize {
					t.Errorf("implant[%d].Size = %q, want %q", tt.checkIdx, implant.Size, tt.wantSize)
				}
				if tt.wantImplCount > 0 && implant.Count != tt.wantImplCount {
					t.Errorf("implant[%d].Count = %d, want %d", tt.checkIdx, implant.Count, tt.wantImplCount)
				}
			}
		})
	}
}

func TestRegexExtractAssociatedInjuries(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  []string
	}{
		{
			name:  "luxacion autorreducida",
			input: "luxacion autorreducida",
			want:  []string{"dislocation_auto_reduced"},
		},
		{
			name:  "luxacion simple",
			input: "luxacion del tobillo",
			want:  []string{"dislocation"},
		},
		{
			name:  "subluxacion",
			input: "subluxacion tibioperonea",
			want:  []string{"subluxation"},
		},
		{
			name:  "maisonneuve variants",
			input: "fractura maissonave",
			want:  []string{"maisonneuve_fracture"},
		},
		{
			name:  "maisonneuve exact",
			input: "fractura maisonneuve",
			want:  []string{"maisonneuve_fracture"},
		},
		{
			name:  "wagstaffe",
			input: "fractura wagstaffe",
			want:  []string{"wagstaffe_fracture"},
		},
		{
			name:  "pilon tibial",
			input: "fractura pilon tibial asociada",
			want:  []string{"tibial_pilon_fracture"},
		},
		{
			name:  "vertebral fracture",
			input: "fractura vertebral L1",
			want:  []string{"vertebral_fracture"},
		},
		{
			name:  "pelvic fracture",
			input: "fractura de pelvis",
			want:  []string{"pelvic_fracture"},
		},
		{
			name:  "fibular shaft",
			input: "fractura diafisaria de perone",
			want:  []string{"fibular_shaft_fracture"},
		},
		{
			name:  "multiple injuries",
			input: "luxacion + fractura maisonneuve + subluxacion",
			want:  []string{"dislocation", "maisonneuve_fracture", "subluxation"},
		},
		{
			name:  "empty string",
			input: "",
			want:  []string{},
		},
		{
			name:  "no injuries",
			input: "sin lesiones asociadas",
			want:  []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := regexExtractAssociatedInjuries(tt.input)

			if len(got) != len(tt.want) {
				t.Errorf("regexExtractAssociatedInjuries(%q) returned %d injuries, want %d", tt.input, len(got), len(tt.want))
				t.Errorf("got: %v", got)
				t.Errorf("want: %v", tt.want)
				return
			}

			// Check all expected values are present
			gotMap := make(map[string]bool)
			for _, v := range got {
				gotMap[v] = true
			}
			for _, w := range tt.want {
				if !gotMap[w] {
					t.Errorf("expected injury %q not found in result", w)
				}
			}
		})
	}
}

func TestRegexExtractApproaches(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  []string
	}{
		{
			name:  "lateral+medial",
			input: "Lateral+medial",
			want:  []string{"lateral", "medial"},
		},
		{
			name:  "posterolateral",
			input: "posterolateral",
			want:  []string{"posterolateral"},
		},
		{
			name:  "lateral+medial with question",
			input: "Lateral+medial ?el tornillo va medial?",
			want:  []string{"lateral", "medial"},
		},
		{
			name:  "lateral y medial",
			input: "lateral y medial",
			want:  []string{"lateral", "medial"},
		},
		{
			name:  "lateral/medial",
			input: "lateral/medial",
			want:  []string{"lateral", "medial"},
		},
		{
			name:  "percutaneo medial",
			input: "percutaneo medial",
			want:  []string{"percutaneous_medial"},
		},
		{
			name:  "clavo",
			input: "clavo intramedular",
			want:  []string{"intramedullary_nail"},
		},
		{
			name:  "minopen anterolateral",
			input: "minopen anterolateral",
			want:  []string{"mini_open_anterolateral"},
		},
		{
			name:  "empty string",
			input: "",
			want:  []string{},
		},
		{
			name:  "unknown approach",
			input: "abordaje no reconocido",
			want:  []string{},
		},
		{
			name:  "multiple with capital Y",
			input: "Lateral Y Medial",
			want:  []string{"lateral", "medial"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := regexExtractApproaches(tt.input)

			if len(got) != len(tt.want) {
				t.Errorf("regexExtractApproaches(%q) returned %d approaches, want %d", tt.input, len(got), len(tt.want))
				t.Errorf("got: %v", got)
				t.Errorf("want: %v", tt.want)
				return
			}

			// Check all expected values are present (order may vary)
			gotMap := make(map[string]bool)
			for _, v := range got {
				gotMap[v] = true
			}
			for _, w := range tt.want {
				if !gotMap[w] {
					t.Errorf("expected approach %q not found in result", w)
				}
			}
		})
	}
}

func TestAINormalizePhase(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name            string
		input           []map[string]string
		useNilClient    bool
		wantAIUsed      bool
		checkRecord     int
		checkField      string
		wantValueExists bool
	}{
		{
			name: "surgery extraction with nil client",
			input: []map[string]string{
				{
					"surgery_type": "placa Paragon lateral 8H + 2 tornillos canulados minimonster 3.5mm",
				},
			},
			useNilClient:    true,
			wantAIUsed:      false,
			checkRecord:     0,
			checkField:      "extracted_implants",
			wantValueExists: true,
		},
		{
			name: "associated injuries with nil client",
			input: []map[string]string{
				{
					"associated_injuries": "luxacion + fractura maisonneuve",
				},
			},
			useNilClient:    true,
			wantAIUsed:      false,
			checkRecord:     0,
			checkField:      "associated_injuries",
			wantValueExists: true,
		},
		{
			name: "approaches with nil client",
			input: []map[string]string{
				{
					"approaches": "lateral y medial",
				},
			},
			useNilClient:    true,
			wantAIUsed:      false,
			checkRecord:     0,
			checkField:      "approaches",
			wantValueExists: true,
		},
		{
			name: "multiple records",
			input: []map[string]string{
				{
					"surgery_type":        "placa Arthrex 7H",
					"associated_injuries": "luxacion",
				},
				{
					"approaches": "posterolateral",
				},
			},
			useNilClient:    true,
			wantAIUsed:      false,
			checkRecord:     0,
			checkField:      "extracted_implants",
			wantValueExists: true,
		},
		{
			name: "empty records",
			input: []map[string]string{
				{
					"patient_code": "12345",
				},
			},
			useNilClient:    true,
			wantAIUsed:      false,
			checkRecord:     0,
			checkField:      "extracted_implants",
			wantValueExists: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			var client LLMClient
			if !tt.useNilClient {
				client = &mockLLMClient{
					generateJSONFunc: func(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
						return `{"implants":[], "approaches":[], "malleoli":[], "techniques":[]}`, nil
					},
				}
			}

			result := aiNormalizePhase(context.Background(), tt.input, client, "es")

			if result.aiUsed != tt.wantAIUsed {
				t.Errorf("aiUsed = %v, want %v", result.aiUsed, tt.wantAIUsed)
			}

			if len(result.records) != len(tt.input) {
				t.Errorf("records count = %d, want %d", len(result.records), len(tt.input))
			}

			if tt.checkRecord < len(result.records) {
				_, exists := result.records[tt.checkRecord][tt.checkField]
				if exists != tt.wantValueExists {
					t.Errorf("field %q exists = %v, want %v", tt.checkField, exists, tt.wantValueExists)
				}

				// If field should exist, verify it has content
				if tt.wantValueExists {
					value := result.records[tt.checkRecord][tt.checkField]
					if value == "" {
						t.Errorf("field %q exists but is empty", tt.checkField)
					}
				}
			}

			// Verify log entries were created for processed fields
			if tt.wantValueExists && len(result.log) == 0 {
				t.Error("expected log entries but got none")
			}
		})
	}
}

func TestAINormalizePhase_WithAIClient(t *testing.T) {
	t.Parallel()

	validExtraction := SurgeryExtraction{
		Implants: []ExtractedImplant{
			{
				Malleolus: "lateral",
				Type:      "plate",
				Brand:     "Paragon",
				Size:      "8H",
				Count:     1,
			},
		},
		Approaches: []string{"lateral"},
	}
	jsonResp, _ := json.Marshal(validExtraction)

	mock := &mockLLMClient{
		generateJSONFunc: func(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
			return string(jsonResp), nil
		},
	}

	input := []map[string]string{
		{
			"surgery_type": "placa Paragon lateral 8H",
		},
	}

	result := aiNormalizePhase(context.Background(), input, mock, "es")

	if !result.aiUsed {
		t.Error("expected aiUsed to be true")
	}
	if result.aiExtractions == 0 {
		t.Error("expected aiExtractions > 0")
	}
	if _, exists := result.records[0]["extracted_implants"]; !exists {
		t.Error("expected extracted_implants field to exist")
	}
}
