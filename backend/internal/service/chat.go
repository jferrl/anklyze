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
	Message       string               `json:"message"`
	Language      string               `json:"language"`
	SessionID     string               `json:"session_id,omitempty"`
	PreviousInput *domain.FractureInput `json:"-"` // Previous extracted input for context continuity
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

	// Extract fracture input from natural language, including previous context
	extraction, err := s.llmClient.ExtractFractureInput(ctx, req.Message, lang, req.PreviousInput)
	if err != nil {
		slog.Error("LLM extraction failed", "error", err)
		msg := "I couldn't understand the fracture description. Please try describing it differently."
		if lang == i18n.Spanish {
			msg = "No pude entender la descripción de la fractura. Por favor, intenta describirla de otra manera."
		}
		return &ChatResponse{
			Status:  ChatStatusError,
			Message: msg,
		}, nil
	}

	// Check if we need clarification
	if extraction.Confidence < 0.7 || len(extraction.Clarifications) > 0 {
		msg := "I need some clarification to classify this fracture accurately. Please answer the questions below."
		if lang == i18n.Spanish {
			msg = "Necesito algunas aclaraciones para clasificar esta fractura con precisión. Por favor, responde las siguientes preguntas."
		}
		return &ChatResponse{
			Status:         ChatStatusNeedsClarification,
			ExtractedInput: &extraction.Input,
			Confidence:     extraction.Confidence,
			MissingFields:  extraction.MissingFields,
			Clarifications: extraction.Clarifications,
			Message:        msg,
		}, nil
	}

	// Classify the extracted input
	result, err := s.classifier.Classify(extraction.Input)
	if err != nil {
		msg := "An error occurred while classifying the fracture. Please try again."
		if lang == i18n.Spanish {
			msg = "Ocurrió un error al clasificar la fractura. Por favor, inténtalo de nuevo."
		}
		return &ChatResponse{
			Status:         ChatStatusError,
			ExtractedInput: &extraction.Input,
			Confidence:     extraction.Confidence,
			Message:        msg,
		}, nil
	}

	return &ChatResponse{
		Status:         ChatStatusComplete,
		ExtractedInput: &extraction.Input,
		Classification: result,
		Confidence:     extraction.Confidence,
		Message:        generateClassificationMessage(result, lang),
	}, nil
}

// generateClassificationMessage creates a helpful message based on the classification result.
func generateClassificationMessage(result *domain.ClassificationResult, lang i18n.Language) string {
	// Check if classification is impossible
	if result.Impossible {
		if lang == i18n.Spanish {
			return "Esta combinación de fracturas no es anatómicamente posible. Por favor, verifica los datos ingresados."
		}
		return "This fracture combination is not anatomically possible. Please verify the input data."
	}

	// Check for ambiguous Lauge-Hansen classification with possible types
	if result.LaugeHansen != nil && result.LaugeHansen.Ambiguous && len(result.LaugeHansen.PossibleTypes) > 0 {
		if lang == i18n.Spanish {
			return "La clasificación Lauge-Hansen es ambigua para este patrón de fractura. Se muestran los mecanismos posibles para tu consideración."
		}
		return "The Lauge-Hansen classification is ambiguous for this fracture pattern. Possible mechanisms are shown for your consideration."
	}

	// Check for ambiguous Lauge-Hansen without possible types (truly unclassifiable)
	if result.LaugeHansen != nil && result.LaugeHansen.Ambiguous && len(result.LaugeHansen.PossibleTypes) == 0 {
		if lang == i18n.Spanish {
			return "La fractura aislada del maléolo posterior no se puede clasificar según Lauge-Hansen, ya que no encaja en los mecanismos clásicos de lesión."
		}
		return "Isolated posterior malleolus fracture cannot be classified by Lauge-Hansen as it doesn't fit classic injury mechanisms."
	}

	// Default success message
	if lang == i18n.Spanish {
		return "Clasificación completada con éxito."
	}
	return "Classification completed successfully."
}
