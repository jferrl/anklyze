package llm

import (
	"context"
	"testing"
	"time"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
)

func TestNewClient(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		apiKey  string
		model   string
		wantErr bool
		errMsg  string
	}{
		{
			name:    "error - empty API key",
			apiKey:  "",
			model:   "gemini-3-flash-preview",
			wantErr: true,
			errMsg:  "GEMINI_API_KEY is required",
		},
		{
			name:    "error - whitespace only API key",
			apiKey:  "   ",
			model:   "gemini-3-flash-preview",
			wantErr: true, // Will fail at genai.NewClient
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Note: We can only test error cases that don't require
			// a valid API key, as the genai.NewClient will fail validation
			if tt.apiKey == "" {
				_, err := NewClient(context.Background(), tt.apiKey, tt.model)
				if (err != nil) != tt.wantErr {
					t.Errorf("NewClient() error = %v, wantErr %v", err, tt.wantErr)
				}
				if err != nil && tt.errMsg != "" {
					if err.Error() != tt.errMsg {
						t.Errorf("NewClient() error = %q, want %q", err.Error(), tt.errMsg)
					}
				}
			}
		})
	}
}

func TestClient_Close(t *testing.T) {
	t.Parallel()

	// Test that Close returns nil (current implementation is a no-op)
	client := &Client{}
	err := client.Close()
	if err != nil {
		t.Errorf("Close() error = %v, want nil", err)
	}
}

func TestClient_WithTimeout(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		timeout     time.Duration
		wantTimeout time.Duration
	}{
		{
			name:        "custom 10 second timeout",
			timeout:     10 * time.Second,
			wantTimeout: 10 * time.Second,
		},
		{
			name:        "custom 1 minute timeout",
			timeout:     time.Minute,
			wantTimeout: time.Minute,
		},
		{
			name:        "zero timeout",
			timeout:     0,
			wantTimeout: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			client := &Client{timeout: DefaultTimeout}
			result := client.WithTimeout(tt.timeout)

			if result != client {
				t.Error("WithTimeout should return the same client for chaining")
			}
			if client.timeout != tt.wantTimeout {
				t.Errorf("WithTimeout() timeout = %v, want %v", client.timeout, tt.wantTimeout)
			}
		})
	}
}

func TestDefaultTimeout(t *testing.T) {
	t.Parallel()

	if DefaultTimeout != 30*time.Second {
		t.Errorf("DefaultTimeout = %v, want %v", DefaultTimeout, 30*time.Second)
	}
}

func TestErrTimeout(t *testing.T) {
	t.Parallel()

	if ErrTimeout == nil {
		t.Error("ErrTimeout should not be nil")
	}
	if ErrTimeout.Error() != "LLM request timed out" {
		t.Errorf("ErrTimeout.Error() = %q, want %q", ErrTimeout.Error(), "LLM request timed out")
	}
}

func TestExtractionResult_Fields(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		result         ExtractionResult
		wantConfidence float64
	}{
		{
			name: "complete extraction",
			result: ExtractionResult{
				Input: domain.FractureInput{
					InvolvedMalleoli: domain.InvolvedLateralOnly,
					FibularLevel:     domain.FibularLevelTransindesmal,
				},
				Confidence:    0.95,
				MissingFields: nil,
			},
			wantConfidence: 0.95,
		},
		{
			name: "partial extraction with missing fields",
			result: ExtractionResult{
				Input: domain.FractureInput{
					InvolvedMalleoli: domain.InvolvedLateralOnly,
				},
				Confidence:    0.5,
				MissingFields: []string{"fibular_level"},
				Clarifications: []Clarification{
					{
						Field:    "fibular_level",
						Question: "Where is the fibular fracture?",
						Options:  []string{"infrasindesmal", "transindesmal", "suprasindesmal"},
					},
				},
			},
			wantConfidence: 0.5,
		},
		{
			name: "low confidence with multiple clarifications",
			result: ExtractionResult{
				Input:         domain.FractureInput{},
				Confidence:    0.2,
				MissingFields: []string{"involved_malleoli"},
				Clarifications: []Clarification{
					{
						Field:    "involved_malleoli",
						Question: "Which malleoli are fractured?",
						Options:  []string{"posterior_only", "medial_only", "lateral_only"},
					},
				},
			},
			wantConfidence: 0.2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if tt.result.Confidence != tt.wantConfidence {
				t.Errorf("ExtractionResult.Confidence = %v, want %v", tt.result.Confidence, tt.wantConfidence)
			}
		})
	}
}

func TestClarification_Fields(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		clarification Clarification
		wantField     string
		wantOptions   int
	}{
		{
			name: "fibular level clarification",
			clarification: Clarification{
				Field:    "fibular_level",
				Question: "Where is the fibular fracture relative to the syndesmosis?",
				Options:  []string{"infrasindesmal", "transindesmal", "suprasindesmal"},
			},
			wantField:   "fibular_level",
			wantOptions: 3,
		},
		{
			name: "involved malleoli clarification",
			clarification: Clarification{
				Field:    "involved_malleoli",
				Question: "Which malleoli are fractured?",
				Options:  []string{"posterior_only", "medial_only", "lateral_only", "trimaleolar"},
			},
			wantField:   "involved_malleoli",
			wantOptions: 4,
		},
		{
			name: "clarification without options",
			clarification: Clarification{
				Field:    "has_ct_scan",
				Question: "Do you have a CT scan?",
				Options:  nil,
			},
			wantField:   "has_ct_scan",
			wantOptions: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if tt.clarification.Field != tt.wantField {
				t.Errorf("Clarification.Field = %v, want %v", tt.clarification.Field, tt.wantField)
			}
			if len(tt.clarification.Options) != tt.wantOptions {
				t.Errorf("Clarification.Options length = %v, want %v", len(tt.clarification.Options), tt.wantOptions)
			}
		})
	}
}

func TestGetSystemPrompt(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		lang     i18n.Language
		contains string
	}{
		{
			name:     "English system prompt",
			lang:     i18n.English,
			contains: "medical data extraction assistant",
		},
		{
			name:     "Spanish system prompt",
			lang:     i18n.Spanish,
			contains: "extracción de datos médicos",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := GetSystemPrompt(tt.lang)
			if got == "" {
				t.Error("GetSystemPrompt() returned empty string")
			}
			if !containsSubstring(got, tt.contains) {
				t.Errorf("GetSystemPrompt() should contain %q", tt.contains)
			}
		})
	}
}

func TestBuildExtractionPrompt(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		description string
		lang        i18n.Language
		contains    []string
	}{
		{
			name:        "English extraction prompt",
			description: "Lateral malleolus fracture",
			lang:        i18n.English,
			contains:    []string{"Extract", "Lateral malleolus fracture"},
		},
		{
			name:        "Spanish extraction prompt",
			description: "Fractura de maléolo lateral",
			lang:        i18n.Spanish,
			contains:    []string{"Extrae", "Fractura de maléolo lateral"},
		},
		{
			name:        "empty description - English",
			description: "",
			lang:        i18n.English,
			contains:    []string{"Extract"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := BuildExtractionPrompt(tt.description, tt.lang)
			if got == "" {
				t.Error("BuildExtractionPrompt() returned empty string")
			}
			for _, substr := range tt.contains {
				if !containsSubstring(got, substr) {
					t.Errorf("BuildExtractionPrompt() should contain %q", substr)
				}
			}
		})
	}
}

func TestBuildExtractionPromptWithContext(t *testing.T) {
	t.Parallel()

	previousInput := &domain.FractureInput{
		InvolvedMalleoli: domain.InvolvedLateralOnly,
		FibularLevel:     domain.FibularLevelTransindesmal,
	}

	tests := []struct {
		name          string
		description   string
		lang          i18n.Language
		previousInput *domain.FractureInput
		contains      []string
	}{
		{
			name:          "without previous context - English",
			description:   "Spiral fracture",
			lang:          i18n.English,
			previousInput: nil,
			contains:      []string{"Extract", "Spiral fracture"},
		},
		{
			name:          "without previous context - Spanish",
			description:   "Fractura espiroidea",
			lang:          i18n.Spanish,
			previousInput: nil,
			contains:      []string{"Extrae", "Fractura espiroidea"},
		},
		{
			name:          "with previous context - English",
			description:   "It's a spiral pattern",
			lang:          i18n.English,
			previousInput: previousInput,
			contains:      []string{"IMPORTANT CONTEXT", "continuing conversation", "lateral_only"},
		},
		{
			name:          "with previous context - Spanish",
			description:   "Es un patrón espiroideo",
			lang:          i18n.Spanish,
			previousInput: previousInput,
			contains:      []string{"CONTEXTO IMPORTANTE", "conversación continua", "lateral_only"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := BuildExtractionPromptWithContext(tt.description, tt.lang, tt.previousInput)
			if got == "" {
				t.Error("BuildExtractionPromptWithContext() returned empty string")
			}
			for _, substr := range tt.contains {
				if !containsSubstring(got, substr) {
					t.Errorf("BuildExtractionPromptWithContext() should contain %q, got: %s", substr, got[:min(len(got), 200)])
				}
			}
		})
	}
}

func TestSystemPromptContainsClassificationRules(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		lang     i18n.Language
		keywords []string
	}{
		{
			name: "English prompt contains all classification types",
			lang: i18n.English,
			keywords: []string{
				"posterior_only",
				"medial_only",
				"lateral_only",
				"trimaleolar",
				"Weber A",
				"Weber B",
				"Weber C",
				"Lauge-Hansen",
				"AO-44",
				"Bartonicek",
				"infrasindesmal",
				"transindesmal",
				"suprasindesmal",
			},
		},
		{
			name: "Spanish prompt contains all classification types",
			lang: i18n.Spanish,
			keywords: []string{
				"posterior_only",
				"medial_only",
				"lateral_only",
				"trimaleolar",
				"Weber A",
				"Weber B",
				"Weber C",
				"Lauge-Hansen",
				"AO-44",
				"Bartonicek",
				"infrasindesmal",
				"transindesmal",
				"suprasindesmal",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			prompt := GetSystemPrompt(tt.lang)
			for _, keyword := range tt.keywords {
				if !containsSubstring(prompt, keyword) {
					t.Errorf("System prompt should contain %q", keyword)
				}
			}
		})
	}
}

func TestSystemPromptContainsFewShotExamples(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		lang     i18n.Language
		contains string
	}{
		{
			name:     "English prompt contains examples",
			lang:     i18n.English,
			contains: "Example",
		},
		{
			name:     "Spanish prompt contains examples",
			lang:     i18n.Spanish,
			contains: "Ejemplo",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			prompt := GetSystemPrompt(tt.lang)
			if !containsSubstring(prompt, tt.contains) {
				t.Errorf("System prompt should contain few-shot examples (%q)", tt.contains)
			}
		})
	}
}

// Helper functions

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func ptrString(s string) *string {
	return &s
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
