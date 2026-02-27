package llm

import (
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
)

func TestNewPromptLoader(t *testing.T) {
	t.Parallel()

	loader, err := NewPromptLoader()
	if err != nil {
		t.Fatalf("NewPromptLoader() error = %v, want nil", err)
	}
	if loader == nil {
		t.Fatal("NewPromptLoader() returned nil loader")
	}
}

func TestPromptLoaderGetSystemPrompt(t *testing.T) {
	t.Parallel()

	loader, err := NewPromptLoader()
	if err != nil {
		t.Fatalf("NewPromptLoader() error = %v", err)
	}

	tests := []struct {
		name     string
		lang     i18n.Language
		contains []string
	}{
		{
			name: "English system prompt",
			lang: i18n.English,
			contains: []string{
				"medical data extraction assistant",
				"ankle fracture",
				"Example",
				"Weber A",
				"Lauge-Hansen",
			},
		},
		{
			name: "Spanish system prompt",
			lang: i18n.Spanish,
			contains: []string{
				"extracción de datos médicos",
				"fracturas de tobillo",
				"Ejemplo",
				"Weber A",
				"Lauge-Hansen",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := loader.GetSystemPrompt(tt.lang)
			if got == "" {
				t.Error("GetSystemPrompt() returned empty string")
			}
			for _, substr := range tt.contains {
				if !containsSubstring(got, substr) {
					t.Errorf("GetSystemPrompt() should contain %q", substr)
				}
			}
		})
	}
}

func TestPromptLoaderBuildExtractionPrompt(t *testing.T) {
	t.Parallel()

	loader, err := NewPromptLoader()
	if err != nil {
		t.Fatalf("NewPromptLoader() error = %v", err)
	}

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

			got := loader.BuildExtractionPrompt(tt.description, tt.lang)
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

func TestPromptLoaderBuildExtractionPromptWithContext(t *testing.T) {
	t.Parallel()

	loader, err := NewPromptLoader()
	if err != nil {
		t.Fatalf("NewPromptLoader() error = %v", err)
	}

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

			got := loader.BuildExtractionPromptWithContext(tt.description, tt.lang, tt.previousInput)
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

// TestPromptLoaderContentIntegrity verifies that the PromptLoader produces
// output containing all expected content from the original hardcoded prompts.
func TestPromptLoaderContentIntegrity(t *testing.T) {
	t.Parallel()

	loader, err := NewPromptLoader()
	if err != nil {
		t.Fatalf("NewPromptLoader() error = %v", err)
	}

	// Verify English system prompt contains key medical terminology
	enPrompt := loader.GetSystemPrompt(i18n.English)
	enKeywords := []string{
		"medical data extraction assistant",
		"ankle fracture classification",
		"posterior_only",
		"medial_only",
		"lateral_only",
		"trimaleolar",
		"Weber A",
		"Lauge-Hansen",
		"AO-44",
		"Bartonicek",
		"infrasindesmal",
		"transindesmal",
		"suprasindesmal",
		"Example",
	}
	for _, kw := range enKeywords {
		if !containsSubstring(enPrompt, kw) {
			t.Errorf("English system prompt missing expected content: %q", kw)
		}
	}

	// Verify Spanish system prompt contains key medical terminology
	esPrompt := loader.GetSystemPrompt(i18n.Spanish)
	esKeywords := []string{
		"extracción de datos médicos",
		"fracturas de tobillo",
		"posterior_only",
		"lateral_only",
		"trimaleolar",
		"Weber A",
		"Lauge-Hansen",
		"AO-44",
		"Bartonicek",
		"infrasindesmal",
		"transindesmal",
		"suprasindesmal",
		"Ejemplo",
	}
	for _, kw := range esKeywords {
		if !containsSubstring(esPrompt, kw) {
			t.Errorf("Spanish system prompt missing expected content: %q", kw)
		}
	}

	// Verify extraction prompts embed the description
	desc := "test fracture description"
	enExtract := loader.BuildExtractionPrompt(desc, i18n.English)
	if !containsSubstring(enExtract, "Extract") || !containsSubstring(enExtract, desc) {
		t.Errorf("English extraction prompt missing expected content")
	}

	esExtract := loader.BuildExtractionPrompt(desc, i18n.Spanish)
	if !containsSubstring(esExtract, "Extrae") || !containsSubstring(esExtract, desc) {
		t.Errorf("Spanish extraction prompt missing expected content")
	}
}
