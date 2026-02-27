package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/fs"
	"text/template"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/prompts"
)

// PromptLoader loads and caches prompt templates at startup.
type PromptLoader struct {
	systemEN  string // raw file content (no template parsing needed)
	systemES  string
	fewShotEN string
	fewShotES string
	extractEN *template.Template // template with {{.Description}} variable
	extractES *template.Template
}

// NewPromptLoader parses all prompt templates from the embedded filesystem.
// Returns an error if any template file is missing or malformed.
func NewPromptLoader() (*PromptLoader, error) {
	readFile := func(path string) (string, error) {
		data, err := fs.ReadFile(prompts.FS, path)
		if err != nil {
			return "", fmt.Errorf("failed to read prompt file %s: %w", path, err)
		}
		return string(data), nil
	}

	parseTmpl := func(name, path string) (*template.Template, error) {
		data, err := fs.ReadFile(prompts.FS, path)
		if err != nil {
			return nil, fmt.Errorf("failed to read template %s: %w", path, err)
		}
		t, err := template.New(name).Parse(string(data))
		if err != nil {
			return nil, fmt.Errorf("failed to parse template %s: %w", path, err)
		}
		return t, nil
	}

	loader := &PromptLoader{}
	var err error

	// Load static prompts as raw strings (no template parsing — avoids {{ escaping issues in JSON examples)
	if loader.systemEN, err = readFile("classification/system_en.tmpl"); err != nil {
		return nil, err
	}
	if loader.systemES, err = readFile("classification/system_es.tmpl"); err != nil {
		return nil, err
	}
	if loader.fewShotEN, err = readFile("classification/few_shot_en.tmpl"); err != nil {
		return nil, err
	}
	if loader.fewShotES, err = readFile("classification/few_shot_es.tmpl"); err != nil {
		return nil, err
	}

	// Load extraction templates (these use {{.Description}} variable)
	if loader.extractEN, err = parseTmpl("extraction_en", "chat/extraction_en.tmpl"); err != nil {
		return nil, err
	}
	if loader.extractES, err = parseTmpl("extraction_es", "chat/extraction_es.tmpl"); err != nil {
		return nil, err
	}

	return loader, nil
}

// GetSystemPrompt returns the combined system prompt + few-shot examples for the given language.
func (l *PromptLoader) GetSystemPrompt(lang i18n.Language) string {
	if lang == i18n.Spanish {
		return l.systemES + "\n" + l.fewShotES
	}
	return l.systemEN + "\n" + l.fewShotEN
}

// ExtractionData holds template variables for extraction prompts.
type ExtractionData struct {
	Description string
}

// BuildExtractionPrompt builds the user prompt for extraction.
func (l *PromptLoader) BuildExtractionPrompt(description string, lang i18n.Language) string {
	var buf bytes.Buffer
	tmpl := l.extractEN
	if lang == i18n.Spanish {
		tmpl = l.extractES
	}
	if err := tmpl.Execute(&buf, ExtractionData{Description: description}); err != nil {
		// Fallback to simple format if template execution fails
		return fmt.Sprintf("Extract the fracture information from the following description:\n\n%s", description)
	}
	return buf.String()
}

// BuildExtractionPromptWithContext builds the user prompt including previous context.
// The context prefix is constructed in Go (involves JSON serialization) — only the base
// extraction text comes from the template.
func (l *PromptLoader) BuildExtractionPromptWithContext(description string, lang i18n.Language, previousInput *domain.FractureInput) string {
	if previousInput == nil {
		return l.BuildExtractionPrompt(description, lang)
	}

	// Keep JSON serialization logic in Go — identical to current BuildExtractionPromptWithContext
	previousJSON, err := json.Marshal(previousInput)
	if err != nil {
		return l.BuildExtractionPrompt(description, lang)
	}

	if lang == i18n.Spanish {
		return fmt.Sprintf(`CONTEXTO IMPORTANTE: Esta es una conversación continua. Los siguientes campos ya fueron extraídos de mensajes anteriores:

%s

El usuario ahora proporciona información adicional. DEBES mantener TODOS los campos previamente extraídos y solo agregar/actualizar con la nueva información.

Nueva información del usuario:
%s

Responde con el JSON completo incluyendo TODOS los campos previos más cualquier información nueva.`, string(previousJSON), description)
	}

	return fmt.Sprintf(`IMPORTANT CONTEXT: This is a continuing conversation. The following fields were already extracted from previous messages:

%s

The user is now providing additional information. You MUST keep ALL previously extracted fields and only add/update with new information.

New information from user:
%s

Respond with the complete JSON including ALL previous fields plus any new information.`, string(previousJSON), description)
}
