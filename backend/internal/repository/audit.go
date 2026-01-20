package repository

import (
	"context"
	"time"

	"github.com/jferrl/anklyze/internal/domain"
)

// NoOpAuditRepository is a no-op implementation for when DB is not configured.
type NoOpAuditRepository struct{}

// Save does nothing and returns nil.
func (r *NoOpAuditRepository) Save(_ context.Context, _ *domain.AuditEntry) error {
	return nil
}

// Close does nothing and returns nil.
func (r *NoOpAuditRepository) Close() error {
	return nil
}

// NewNoOpAuditRepository creates a no-op audit repository.
func NewNoOpAuditRepository() *NoOpAuditRepository {
	return &NoOpAuditRepository{}
}

// NoOpAnalyticsRepository is a no-op implementation for when DB is not configured.
type NoOpAnalyticsRepository struct{}

// GetSummary returns empty analytics summary.
func (r *NoOpAnalyticsRepository) GetSummary(from, to time.Time) (*domain.AnalyticsSummary, error) {
	return &domain.AnalyticsSummary{
		Period:                  domain.TimePeriod{From: from, To: to},
		LanguageDistribution:    make(map[string]int64),
		DanisWeberDistribution:  make(map[string]int64),
		LaugeHansenDistribution: make(map[string]int64),
		AOOTADistribution:       make(map[string]int64),
	}, nil
}

// GetTrends returns empty trend data.
func (r *NoOpAnalyticsRepository) GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.TrendData, error) {
	return &domain.TrendData{
		Period:      domain.TimePeriod{From: from, To: to},
		Granularity: string(granularity),
		DataPoints:  []domain.TrendDataPoint{},
	}, nil
}

// GetDistribution returns empty distribution data.
func (r *NoOpAnalyticsRepository) GetDistribution(system string, from, to time.Time) (*domain.ClassificationDistribution, error) {
	return &domain.ClassificationDistribution{
		System:       system,
		Period:       domain.TimePeriod{From: from, To: to},
		Distribution: []domain.DistributionItem{},
	}, nil
}

// NewNoOpAnalyticsRepository creates a no-op analytics repository.
func NewNoOpAnalyticsRepository() *NoOpAnalyticsRepository {
	return &NoOpAnalyticsRepository{}
}
