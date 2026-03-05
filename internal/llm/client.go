package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"google.golang.org/genai"
)

// DefaultTimeout is the default timeout for LLM API calls.
const DefaultTimeout = 30 * time.Second

// ErrTimeout is returned when the LLM request times out.
var ErrTimeout = errors.New("LLM request timed out")

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
	client  *genai.Client
	model   string
	timeout time.Duration
	loader  *PromptLoader
}

// NewClient creates a new Gemini client.
func NewClient(ctx context.Context, apiKey, model string, loader *PromptLoader) (*Client, error) {
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
		client:  client,
		model:   model,
		timeout: DefaultTimeout,
		loader:  loader,
	}, nil
}

// WithTimeout sets a custom timeout for LLM API calls.
func (c *Client) WithTimeout(timeout time.Duration) *Client {
	c.timeout = timeout
	return c
}

// maxRetries is the number of times to retry on transient LLM failures (empty/unparseable responses).
const maxRetries = 2

// ExtractFractureInput extracts structured FractureInput from a natural language description.
// If previousInput is provided, it will be included as context for multi-turn conversations.
// Retries up to maxRetries times on transient failures (empty or unparseable JSON responses).
func (c *Client) ExtractFractureInput(ctx context.Context, description string, lang i18n.Language, previousInput *domain.FractureInput) (*ExtractionResult, error) {
	// Check context cancellation before starting
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context cancelled before LLM request: %w", err)
	}

	// Apply timeout to prevent hanging on slow responses
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	prompt := c.loader.BuildExtractionPromptWithContext(description, lang, previousInput)

	config := &genai.GenerateContentConfig{
		Temperature:      genai.Ptr(float32(0.1)),
		ResponseMIMEType: "application/json",
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{
				genai.NewPartFromText(c.loader.GetSystemPrompt(lang)),
			},
		},
	}

	var lastErr error
	for attempt := range maxRetries + 1 {
		if err := ctx.Err(); err != nil {
			return nil, fmt.Errorf("context cancelled during retry %d: %w", attempt, err)
		}

		resp, err := c.client.Models.GenerateContent(ctx, c.model, genai.Text(prompt), config)
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				return nil, fmt.Errorf("%w: %w", ErrTimeout, err)
			}
			if errors.Is(err, context.Canceled) {
				return nil, fmt.Errorf("request cancelled: %w", err)
			}
			lastErr = fmt.Errorf("failed to generate content: %w", err)
			continue
		}

		if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("empty response from Gemini (attempt %d)", attempt+1)
			continue
		}

		text := resp.Candidates[0].Content.Parts[0].Text
		if text == "" {
			lastErr = fmt.Errorf("empty text in response (attempt %d)", attempt+1)
			continue
		}

		var result ExtractionResult
		if err := json.Unmarshal([]byte(text), &result); err != nil {
			lastErr = fmt.Errorf("failed to parse response JSON (attempt %d): %w (response: %s)", attempt+1, err, text)
			continue
		}

		return &result, nil
	}

	return nil, lastErr
}

// Close closes the Gemini client.
func (c *Client) Close() error {
	return nil
}
