package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// ChatSessionStatus represents the state of a chat session.
type ChatSessionStatus string

// ChatSessionStatusActive and related constants define the possible states of a chat session.
const (
	ChatSessionStatusActive    ChatSessionStatus = "active"
	ChatSessionStatusComplete  ChatSessionStatus = "complete"
	ChatSessionStatusAbandoned ChatSessionStatus = "abandoned"
)

// ChatSession represents a complete chat conversation for audit tracking.
type ChatSession struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time `gorm:"index"`
	UpdatedAt time.Time

	// Client metadata
	ClientIP  string `gorm:"size:45"`
	UserAgent string
	Language  string `gorm:"size:10;not null;index"`

	// Session state
	Status             ChatSessionStatus `gorm:"size:20;not null;index"`
	TotalMessages      int               `gorm:"default:0"`
	ClarificationCount int               `gorm:"default:0"`

	// Final results (populated when session completes)
	FinalConfidence *float64 `gorm:"column:final_confidence"`

	// Denormalized classification results for analytics queries
	DanisWeberType  *string `gorm:"column:danis_weber_type;size:10;index"`
	LaugeHansenType *string `gorm:"column:lauge_hansen_type;size:20;index"`
	AOOTACode       *string `gorm:"column:ao_ota_code;size:10;index"`

	// Total session duration in milliseconds
	DurationMS int64
}

// TableName specifies the table name for GORM.
func (ChatSession) TableName() string {
	return "chat_sessions"
}

// NewChatSession creates a new chat session.
func NewChatSession(clientIP, userAgent, language string) *ChatSession {
	now := time.Now()
	return &ChatSession{
		ID:        uuid.New(),
		CreatedAt: now,
		UpdatedAt: now,
		ClientIP:  clientIP,
		UserAgent: userAgent,
		Language:  language,
		Status:    ChatSessionStatusActive,
	}
}

// Complete marks the session as complete with final results.
func (s *ChatSession) Complete(confidence float64, result *ClassificationResult) {
	s.Status = ChatSessionStatusComplete
	s.UpdatedAt = time.Now()
	s.DurationMS = time.Since(s.CreatedAt).Milliseconds()
	s.FinalConfidence = &confidence

	if result != nil {
		if result.DanisWeber != nil {
			t := string(result.DanisWeber.Type)
			s.DanisWeberType = &t
		}
		if result.LaugeHansen != nil {
			t := string(result.LaugeHansen.Type)
			s.LaugeHansenType = &t
		}
		if result.AOOTA != nil {
			t := string(result.AOOTA.Code)
			s.AOOTACode = &t
		}
	}
}

// Abandon marks the session as abandoned.
func (s *ChatSession) Abandon() {
	s.Status = ChatSessionStatusAbandoned
	s.UpdatedAt = time.Now()
	s.DurationMS = time.Since(s.CreatedAt).Milliseconds()
}

// IncrementMessages increments the message count.
func (s *ChatSession) IncrementMessages() {
	s.TotalMessages++
	s.UpdatedAt = time.Now()
}

// IncrementClarifications increments the clarification count.
func (s *ChatSession) IncrementClarifications() {
	s.ClarificationCount++
	s.UpdatedAt = time.Now()
}

// ChatRole represents the role of a message sender.
type ChatRole string

// ChatRoleUser and related constants define the possible message sender roles.
const (
	ChatRoleUser      ChatRole = "user"
	ChatRoleAssistant ChatRole = "assistant"
)

// ChatMessageType classifies the type of chat message.
type ChatMessageType string

// ChatMessageTypeInitial and related constants define the possible chat message types.
const (
	ChatMessageTypeInitial              ChatMessageType = "initial"
	ChatMessageTypeClarificationRequest ChatMessageType = "clarification_request"
	ChatMessageTypeClarificationAnswer  ChatMessageType = "clarification_answer"
	ChatMessageTypeClassification       ChatMessageType = "classification"
)

// ChatMessage represents a single message in a chat session.
type ChatMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	SessionID uuid.UUID `gorm:"type:uuid;not null;index"`
	CreatedAt time.Time `gorm:"index"`

	// Message content
	Role    ChatRole `gorm:"size:10;not null"`
	Content string   `gorm:"type:text;not null"`

	// Message classification
	MessageType ChatMessageType `gorm:"size:25;not null;index"`

	// For assistant messages: extracted data and confidence
	ExtractedInput datatypes.JSON `gorm:"column:extracted_input"`
	Confidence     *float64       `gorm:"column:confidence"`

	// Processing time for this message (assistant messages only)
	ProcessingMS int64
}

// TableName specifies the table name for GORM.
func (ChatMessage) TableName() string {
	return "chat_messages"
}

// NewUserMessage creates a new user message.
func NewUserMessage(sessionID uuid.UUID, content string, msgType ChatMessageType) *ChatMessage {
	return &ChatMessage{
		ID:          uuid.New(),
		SessionID:   sessionID,
		CreatedAt:   time.Now(),
		Role:        ChatRoleUser,
		Content:     content,
		MessageType: msgType,
	}
}

// NewAssistantMessage creates a new assistant message.
func NewAssistantMessage(
	sessionID uuid.UUID,
	content string,
	msgType ChatMessageType,
	extractedInput *FractureInput,
	confidence *float64,
	processingMS int64,
) (*ChatMessage, error) {
	msg := &ChatMessage{
		ID:           uuid.New(),
		SessionID:    sessionID,
		CreatedAt:    time.Now(),
		Role:         ChatRoleAssistant,
		Content:      content,
		MessageType:  msgType,
		Confidence:   confidence,
		ProcessingMS: processingMS,
	}

	if extractedInput != nil {
		inputJSON, err := json.Marshal(extractedInput)
		if err != nil {
			return nil, err
		}
		msg.ExtractedInput = datatypes.JSON(inputJSON)
	}

	return msg, nil
}

// GetExtractedInput parses and returns the extracted input from the message.
func (m *ChatMessage) GetExtractedInput() (*FractureInput, error) {
	if len(m.ExtractedInput) == 0 {
		return nil, nil
	}

	var input FractureInput
	if err := json.Unmarshal(m.ExtractedInput, &input); err != nil {
		return nil, err
	}
	return &input, nil
}

// FeedbackRating represents the type of feedback.
type FeedbackRating string

// FeedbackRatingPositive and related constants define the possible feedback rating values.
const (
	FeedbackRatingPositive FeedbackRating = "positive"
	FeedbackRatingNegative FeedbackRating = "negative"
)

// ChatFeedback represents user feedback on a chat classification.
type ChatFeedback struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	SessionID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	CreatedAt time.Time `gorm:"index"`

	// Feedback data
	Rating  FeedbackRating `gorm:"size:10;not null;index"`
	Comment *string        `gorm:"type:text"`

	// Client metadata
	ClientIP string `gorm:"size:45"`
}

// TableName specifies the table name for GORM.
func (ChatFeedback) TableName() string {
	return "chat_feedback"
}

// NewChatFeedback creates a new feedback entry.
func NewChatFeedback(sessionID uuid.UUID, rating FeedbackRating, comment *string, clientIP string) *ChatFeedback {
	return &ChatFeedback{
		ID:        uuid.New(),
		SessionID: sessionID,
		CreatedAt: time.Now(),
		Rating:    rating,
		Comment:   comment,
		ClientIP:  clientIP,
	}
}
