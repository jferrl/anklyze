package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
)

// mockChatAuditRepository is a mock implementation for testing session limits
type mockChatAuditRepository struct {
	sessions map[uuid.UUID]*domain.ChatSession
}

func newMockChatAuditRepository() *mockChatAuditRepository {
	return &mockChatAuditRepository{
		sessions: make(map[uuid.UUID]*domain.ChatSession),
	}
}

func (r *mockChatAuditRepository) CreateSession(_ context.Context, session *domain.ChatSession) error {
	r.sessions[session.ID] = session
	return nil
}

func (r *mockChatAuditRepository) UpdateSession(_ context.Context, session *domain.ChatSession) error {
	r.sessions[session.ID] = session
	return nil
}

func (r *mockChatAuditRepository) GetSession(_ context.Context, sessionID uuid.UUID) (*domain.ChatSession, error) {
	if session, ok := r.sessions[sessionID]; ok {
		return session, nil
	}
	return nil, nil
}

func (r *mockChatAuditRepository) SaveMessage(_ context.Context, _ *domain.ChatMessage) error {
	return nil
}

func (r *mockChatAuditRepository) SaveFeedback(_ context.Context, _ *domain.ChatFeedback) error {
	return nil
}

func (r *mockChatAuditRepository) GetFeedbackBySession(_ context.Context, _ uuid.UUID) (*domain.ChatFeedback, error) {
	return nil, nil
}

func (r *mockChatAuditRepository) GetLastAssistantMessage(_ context.Context, _ uuid.UUID) (*domain.ChatMessage, error) {
	return nil, nil
}

func (r *mockChatAuditRepository) Close() error {
	return nil
}

// mockChatService is a minimal chat service for testing
type mockChatService struct{}

func (s *mockChatService) ProcessMessage(_ context.Context, _ service.ChatRequest) (*service.ChatResponse, error) {
	return &service.ChatResponse{
		Status:     service.ChatStatusComplete,
		Message:    "Test response",
		Confidence: 0.9,
	}, nil
}

func TestHandler_SessionMessageLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		sessionLimit   int
		sessionMsgCount int
		wantStatus     int
		wantError      string
		description    string
	}{
		{
			name:           "allows message when under limit",
			sessionLimit:   10,
			sessionMsgCount: 5,
			wantStatus:     http.StatusOK,
			wantError:      "",
			description:    "Should allow messages when session is under limit",
		},
		{
			name:           "allows message at limit minus one",
			sessionLimit:   10,
			sessionMsgCount: 9,
			wantStatus:     http.StatusOK,
			wantError:      "",
			description:    "Should allow the last message before hitting limit",
		},
		{
			name:           "blocks message at limit",
			sessionLimit:   10,
			sessionMsgCount: 10,
			wantStatus:     http.StatusTooManyRequests,
			wantError:      "session_limit_exceeded",
			description:    "Should block when session has reached limit",
		},
		{
			name:           "blocks message over limit",
			sessionLimit:   5,
			sessionMsgCount: 20,
			wantStatus:     http.StatusTooManyRequests,
			wantError:      "session_limit_exceeded",
			description:    "Should block when session is well over limit",
		},
		{
			name:           "zero limit disables check",
			sessionLimit:   0,
			sessionMsgCount: 100,
			wantStatus:     http.StatusOK,
			wantError:      "",
			description:    "Zero limit should disable the session limit feature",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mock repository with a session
			mockRepo := newMockChatAuditRepository()
			sessionID := uuid.New()
			session := &domain.ChatSession{
				ID:            sessionID,
				CreatedAt:     time.Now(),
				Status:        domain.ChatSessionStatusActive,
				TotalMessages: tt.sessionMsgCount,
			}
			mockRepo.sessions[sessionID] = session

			// Setup handler with session limit
			ruleEngine := rules.NewEngine()
			chatService := &mockChatService{}
			handler := NewHandler(
				ruleEngine,
				chatService,
				repository.NewNoOpAuditRepository(),
				repository.NewNoOpAnalyticsRepository(),
				mockRepo,
				repository.NewNoOpChatAnalyticsRepository(),
				true,
			).WithSessionMessageLimit(tt.sessionLimit)

			// Setup router
			router := gin.New()
			router.POST("/api/chat", handler.ChatMessage)

			// Create request with session ID
			reqBody := map[string]string{
				"message":    "Test fracture description",
				"session_id": sessionID.String(),
			}
			body, _ := json.Marshal(reqBody)

			req := httptest.NewRequest(http.MethodPost, "/api/chat", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d - %s", w.Code, tt.wantStatus, tt.description)
			}

			// Check error code if expected
			if tt.wantError != "" {
				var response map[string]any
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("failed to parse response: %v", err)
				}
				if response["error_code"] != tt.wantError {
					t.Errorf("got error_code %q, want %q", response["error_code"], tt.wantError)
				}
			}
		})
	}
}

func TestHandler_SessionMessageLimit_NoSession(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Setup handler with session limit
	mockRepo := newMockChatAuditRepository()
	ruleEngine := rules.NewEngine()
	chatService := &mockChatService{}
	handler := NewHandler(
		ruleEngine,
		chatService,
		repository.NewNoOpAuditRepository(),
		repository.NewNoOpAnalyticsRepository(),
		mockRepo,
		repository.NewNoOpChatAnalyticsRepository(),
		true,
	).WithSessionMessageLimit(5)

	// Setup router
	router := gin.New()
	router.POST("/api/chat", handler.ChatMessage)

	// Create request without session ID (new conversation)
	reqBody := map[string]string{
		"message": "Test fracture description",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/chat", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Should succeed since there's no session to check
	if w.Code != http.StatusOK {
		t.Errorf("got status %d, want %d - request without session should not be limited", w.Code, http.StatusOK)
	}
}

func TestHandler_WithSessionMessageLimit(t *testing.T) {
	tests := []struct {
		name  string
		limit int
	}{
		{"default limit", 20},
		{"custom limit", 50},
		{"small limit", 5},
		{"disabled", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewHandler(nil, nil, nil, nil, nil, nil, false).
				WithSessionMessageLimit(tt.limit)

			if handler.sessionMessageLimit != tt.limit {
				t.Errorf("got limit %d, want %d", handler.sessionMessageLimit, tt.limit)
			}
		})
	}
}

// TestGetSessionLimitMessage removed - translations now handled on frontend
// The API now returns error_code instead of translated messages

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
