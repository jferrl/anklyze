package service

import (
	"context"
	"log/slog"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/internal/llm"
)

// ChatStatus represents the status of a chat response.
type ChatStatus string

const (
	ChatStatusComplete           ChatStatus = "complete"
	ChatStatusNeedsClarification ChatStatus = "needs_clarification"
	ChatStatusError              ChatStatus = "error"
)

// ChatRequest represents a chat message request.
type ChatRequest struct {
	Message   string `json:"message"`
	Language  string `json:"language"`
	SessionID string `json:"session_id,omitempty"`
}

// ChatResponse represents the response from chat classification.
type ChatResponse struct {
	Status         ChatStatus                   `json:"status"`
	ExtractedInput *domain.FractureInput        `json:"extracted_input,omitempty"`
	Classification *domain.ClassificationResult `json:"classification,omitempty"`
	Confidence     float64                      `json:"confidence"`
	MissingFields  []string                     `json:"missing_fields,omitempty"`
	Clarifications []llm.Clarification          `json:"clarifications,omitempty"`
	Message        string                       `json:"message"`
}

// ChatService defines the interface for chat-based classification.
type ChatService interface {
	ProcessMessage(ctx context.Context, req ChatRequest) (*ChatResponse, error)
}

// chatService implements ChatService.
type chatService struct {
	llmClient  *llm.Client
	classifier ClassifierService
}

// NewChatService creates a new ChatService.
func NewChatService(llmClient *llm.Client, classifier ClassifierService) ChatService {
	return &chatService{
		llmClient:  llmClient,
		classifier: classifier,
	}
}

// ProcessMessage processes a chat message and returns classification results.
func (s *chatService) ProcessMessage(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	lang := i18n.ParseLanguage(req.Language)

	// Extract fracture input from natural language
	extraction, err := s.llmClient.ExtractFractureInput(ctx, req.Message, lang)
	if err != nil {
		slog.Error("LLM extraction failed", "error", err)
		return &ChatResponse{
			Status:  ChatStatusError,
			Message: getErrorMessage(lang),
		}, nil
	}

	// Check if we need clarification
	if extraction.Confidence < 0.7 || len(extraction.Clarifications) > 0 {
		return &ChatResponse{
			Status:         ChatStatusNeedsClarification,
			ExtractedInput: &extraction.Input,
			Confidence:     extraction.Confidence,
			MissingFields:  extraction.MissingFields,
			Clarifications: extraction.Clarifications,
			Message:        getClarificationMessage(lang),
		}, nil
	}

	// Classify the extracted input
	result, err := s.classifier.Classify(extraction.Input, lang)
	if err != nil {
		return &ChatResponse{
			Status:         ChatStatusError,
			ExtractedInput: &extraction.Input,
			Confidence:     extraction.Confidence,
			Message:        getClassificationErrorMessage(lang),
		}, nil
	}

	return &ChatResponse{
		Status:         ChatStatusComplete,
		ExtractedInput: &extraction.Input,
		Classification: result,
		Confidence:     extraction.Confidence,
		Message:        getSuccessMessage(lang),
	}, nil
}

func getErrorMessage(lang i18n.Language) string {
	if lang == i18n.Spanish {
		return "Lo siento, no pude procesar esa descripción. Por favor, intenta de nuevo."
	}
	return "Sorry, I couldn't process that description. Please try again."
}

func getClarificationMessage(lang i18n.Language) string {
	if lang == i18n.Spanish {
		return "Necesito más información para clasificar esta fractura."
	}
	return "I need more information to classify this fracture."
}

func getClassificationErrorMessage(lang i18n.Language) string {
	if lang == i18n.Spanish {
		return "Error al clasificar la fractura. Por favor, verifica los datos extraídos."
	}
	return "Error classifying the fracture. Please verify the extracted data."
}

func getSuccessMessage(lang i18n.Language) string {
	if lang == i18n.Spanish {
		return "Fractura clasificada exitosamente."
	}
	return "Fracture classified successfully."
}
