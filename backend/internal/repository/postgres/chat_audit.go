package postgres

import (
	"context"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
)

// ChatAuditRepository implements chat audit persistence with PostgreSQL.
// It uses buffered channels for non-blocking writes.
type ChatAuditRepository struct {
	db         *gorm.DB
	sessionCh  chan *domain.ChatSession
	messageCh  chan *domain.ChatMessage
	feedbackCh chan *domain.ChatFeedback
	done       chan struct{}
	wg         sync.WaitGroup
	closed     bool
	mu         sync.RWMutex
}

// NewChatAuditRepository creates a new PostgreSQL chat audit repository.
// It starts background goroutines for non-blocking writes.
// Call Close() to gracefully shut down the background writers.
func NewChatAuditRepository(db *gorm.DB, bufferSize int) *ChatAuditRepository {
	r := &ChatAuditRepository{
		db:         db,
		sessionCh:  make(chan *domain.ChatSession, bufferSize),
		messageCh:  make(chan *domain.ChatMessage, bufferSize),
		feedbackCh: make(chan *domain.ChatFeedback, bufferSize),
		done:       make(chan struct{}),
	}

	r.wg.Add(3)
	go r.sessionWriter()
	go r.messageWriter()
	go r.feedbackWriter()

	return r
}

// CreateSession queues a new session for async persistence.
func (r *ChatAuditRepository) CreateSession(ctx context.Context, session *domain.ChatSession) error {
	r.mu.RLock()
	if r.closed {
		r.mu.RUnlock()
		return ErrRepositoryClosed
	}
	r.mu.RUnlock()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case r.sessionCh <- session:
		return nil
	default:
		slog.Warn("chat session buffer full, dropping session", "session_id", session.ID)
		return ErrBufferFull
	}
}

// UpdateSession performs a synchronous update (needed for session state changes).
func (r *ChatAuditRepository) UpdateSession(ctx context.Context, session *domain.ChatSession) error {
	return r.db.WithContext(ctx).Save(session).Error
}

// GetSession retrieves a session by ID.
func (r *ChatAuditRepository) GetSession(ctx context.Context, sessionID uuid.UUID) (*domain.ChatSession, error) {
	var session domain.ChatSession
	err := r.db.WithContext(ctx).First(&session, "id = ?", sessionID).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// SaveMessage queues a message for async persistence.
func (r *ChatAuditRepository) SaveMessage(ctx context.Context, message *domain.ChatMessage) error {
	r.mu.RLock()
	if r.closed {
		r.mu.RUnlock()
		return ErrRepositoryClosed
	}
	r.mu.RUnlock()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case r.messageCh <- message:
		return nil
	default:
		slog.Warn("chat message buffer full, dropping message", "message_id", message.ID)
		return ErrBufferFull
	}
}

// SaveFeedback queues feedback for async persistence.
func (r *ChatAuditRepository) SaveFeedback(ctx context.Context, feedback *domain.ChatFeedback) error {
	r.mu.RLock()
	if r.closed {
		r.mu.RUnlock()
		return ErrRepositoryClosed
	}
	r.mu.RUnlock()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case r.feedbackCh <- feedback:
		return nil
	default:
		slog.Warn("chat feedback buffer full, dropping feedback", "feedback_id", feedback.ID)
		return ErrBufferFull
	}
}

// GetFeedbackBySession retrieves feedback for a session.
func (r *ChatAuditRepository) GetFeedbackBySession(ctx context.Context, sessionID uuid.UUID) (*domain.ChatFeedback, error) {
	var feedback domain.ChatFeedback
	err := r.db.WithContext(ctx).First(&feedback, "session_id = ?", sessionID).Error
	if err != nil {
		return nil, err
	}
	return &feedback, nil
}

// Close gracefully shuts down the background writers.
// It waits for all pending entries to be written before returning.
func (r *ChatAuditRepository) Close() error {
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	r.mu.Unlock()

	close(r.sessionCh)
	close(r.messageCh)
	close(r.feedbackCh)
	r.wg.Wait()
	return nil
}

func (r *ChatAuditRepository) sessionWriter() {
	defer r.wg.Done()
	for session := range r.sessionCh {
		if err := r.db.Create(session).Error; err != nil {
			slog.Error("failed to save chat session", "session_id", session.ID, "error", err)
		}
	}
}

func (r *ChatAuditRepository) messageWriter() {
	defer r.wg.Done()
	for message := range r.messageCh {
		if err := r.db.Create(message).Error; err != nil {
			slog.Error("failed to save chat message", "message_id", message.ID, "error", err)
		}
	}
}

func (r *ChatAuditRepository) feedbackWriter() {
	defer r.wg.Done()
	for feedback := range r.feedbackCh {
		if err := r.db.Create(feedback).Error; err != nil {
			slog.Error("failed to save chat feedback", "feedback_id", feedback.ID, "error", err)
		}
	}
}
