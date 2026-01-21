package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// NoOpChatAuditRepository is a no-op implementation for when DB is not configured.
type NoOpChatAuditRepository struct{}

// CreateSession does nothing and returns nil.
func (r *NoOpChatAuditRepository) CreateSession(_ context.Context, _ *domain.ChatSession) error {
	return nil
}

// UpdateSession does nothing and returns nil.
func (r *NoOpChatAuditRepository) UpdateSession(_ context.Context, _ *domain.ChatSession) error {
	return nil
}

// GetSession returns nil session (not found).
func (r *NoOpChatAuditRepository) GetSession(_ context.Context, _ uuid.UUID) (*domain.ChatSession, error) {
	return nil, nil
}

// SaveMessage does nothing and returns nil.
func (r *NoOpChatAuditRepository) SaveMessage(_ context.Context, _ *domain.ChatMessage) error {
	return nil
}

// SaveFeedback does nothing and returns nil.
func (r *NoOpChatAuditRepository) SaveFeedback(_ context.Context, _ *domain.ChatFeedback) error {
	return nil
}

// GetFeedbackBySession returns nil feedback (not found).
func (r *NoOpChatAuditRepository) GetFeedbackBySession(_ context.Context, _ uuid.UUID) (*domain.ChatFeedback, error) {
	return nil, nil
}

// Close does nothing and returns nil.
func (r *NoOpChatAuditRepository) Close() error {
	return nil
}

// NewNoOpChatAuditRepository creates a no-op chat audit repository.
func NewNoOpChatAuditRepository() *NoOpChatAuditRepository {
	return &NoOpChatAuditRepository{}
}

// NoOpChatAnalyticsRepository is a no-op implementation for when DB is not configured.
type NoOpChatAnalyticsRepository struct{}

// GetSummary returns empty chat analytics summary.
func (r *NoOpChatAnalyticsRepository) GetSummary(from, to time.Time) (*domain.ChatAnalyticsSummary, error) {
	return &domain.ChatAnalyticsSummary{
		Period:                     domain.TimePeriod{From: from, To: to},
		LanguageDistribution:       make(map[string]int64),
		ClassificationDistribution: make(map[string]int64),
	}, nil
}

// GetFeedbackSummary returns empty feedback summary.
func (r *NoOpChatAnalyticsRepository) GetFeedbackSummary(from, to time.Time) (*domain.ChatFeedbackSummary, error) {
	return &domain.ChatFeedbackSummary{
		Period: domain.TimePeriod{From: from, To: to},
	}, nil
}

// GetConfidenceDistribution returns empty confidence distribution.
func (r *NoOpChatAnalyticsRepository) GetConfidenceDistribution(from, to time.Time) (*domain.ConfidenceDistribution, error) {
	return &domain.ConfidenceDistribution{
		Period:       domain.TimePeriod{From: from, To: to},
		Distribution: []domain.ConfidenceBucket{},
	}, nil
}

// GetTrends returns empty trend data.
func (r *NoOpChatAnalyticsRepository) GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.ChatTrendData, error) {
	return &domain.ChatTrendData{
		Period:      domain.TimePeriod{From: from, To: to},
		Granularity: string(granularity),
		DataPoints:  []domain.ChatTrendDataPoint{},
	}, nil
}

// NewNoOpChatAnalyticsRepository creates a no-op chat analytics repository.
func NewNoOpChatAnalyticsRepository() *NoOpChatAnalyticsRepository {
	return &NoOpChatAnalyticsRepository{}
}
