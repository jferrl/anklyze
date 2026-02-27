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

// TestPromptLoaderOutputMatchesOldFunctions is a regression test verifying that
// PromptLoader produces the same output as the old free functions (GetSystemPrompt,
// BuildExtractionPrompt, BuildExtractionPromptWithContext).
func TestPromptLoaderOutputMatchesOldFunctions(t *testing.T) {
	t.Parallel()

	loader, err := NewPromptLoader()
	if err != nil {
		t.Fatalf("NewPromptLoader() error = %v", err)
	}

	// Regression: GetSystemPrompt output must match
	for _, lang := range []i18n.Language{i18n.English, i18n.Spanish} {
		oldOut := GetSystemPrompt(lang)
		newOut := loader.GetSystemPrompt(lang)
		if oldOut != newOut {
			t.Errorf("GetSystemPrompt(%s) output mismatch:\nold len=%d, new len=%d", lang, len(oldOut), len(newOut))
		}
	}

	// Regression: BuildExtractionPrompt output must match
	descriptions := []string{"Lateral malleolus fracture", "", "Fractura de maléolo lateral"}
	for _, lang := range []i18n.Language{i18n.English, i18n.Spanish} {
		for _, desc := range descriptions {
			oldOut := BuildExtractionPrompt(desc, lang)
			newOut := loader.BuildExtractionPrompt(desc, lang)
			if oldOut != newOut {
				t.Errorf("BuildExtractionPrompt(%q, %s) mismatch:\nold=%q\nnew=%q", desc, lang, oldOut, newOut)
			}
		}
	}

	// Regression: BuildExtractionPromptWithContext (no previous input) must match
	previousInput := &domain.FractureInput{
		InvolvedMalleoli: domain.InvolvedLateralOnly,
		FibularLevel:     domain.FibularLevelTransindesmal,
	}
	for _, lang := range []i18n.Language{i18n.English, i18n.Spanish} {
		for _, prev := range []*domain.FractureInput{nil, previousInput} {
			oldOut := BuildExtractionPromptWithContext("test description", lang, prev)
			newOut := loader.BuildExtractionPromptWithContext("test description", lang, prev)
			if oldOut != newOut {
				t.Errorf("BuildExtractionPromptWithContext(lang=%s, prev=%v) mismatch:\nold len=%d\nnew len=%d", lang, prev != nil, len(oldOut), len(newOut))
			}
		}
	}
}
