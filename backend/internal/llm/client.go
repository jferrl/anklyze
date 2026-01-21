package llm

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"google.golang.org/genai"
)

// ExtractionResult contains the extracted fracture data and metadata.
type ExtractionResult struct {
	Input          domain.FractureInput `json:"extracted_input"`
	Confidence     float64              `json:"confidence"`
	MissingFields  []string             `json:"missing_fields,omitempty"`
	Clarifications []Clarification      `json:"clarifications,omitempty"`
}

// Clarification represents a question to ask the user for ambiguous cases.
type Clarification struct {
	Field    string   `json:"field"`
	Question string   `json:"question"`
	Options  []string `json:"options,omitempty"`
}

// Client handles communication with the Gemini API.
type Client struct {
	client *genai.Client
	model  string
}

// NewClient creates a new Gemini client.
func NewClient(ctx context.Context, apiKey, model string) (*Client, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is required")
	}

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	if model == "" {
		model = "gemini-3-flash-preview"
	}

	return &Client{
		client: client,
		model:  model,
	}, nil
}

// ExtractFractureInput extracts structured FractureInput from a natural language description.
func (c *Client) ExtractFractureInput(ctx context.Context, description string, lang i18n.Language) (*ExtractionResult, error) {
	prompt := BuildExtractionPrompt(description, lang)

	config := &genai.GenerateContentConfig{
		Temperature:      genai.Ptr(float32(0.1)),
		ResponseMIMEType: "application/json",
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{
				genai.NewPartFromText(GetSystemPrompt(lang)),
			},
		},
	}

	resp, err := c.client.Models.GenerateContent(ctx, c.model, genai.Text(prompt), config)
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from Gemini")
	}

	text := resp.Candidates[0].Content.Parts[0].Text
	if text == "" {
		return nil, fmt.Errorf("empty text in response")
	}

	var result ExtractionResult
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, fmt.Errorf("failed to parse response JSON: %w (response: %s)", err, text)
	}

	return &result, nil
}

// Close closes the Gemini client.
func (c *Client) Close() error {
	return nil
}
