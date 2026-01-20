package repository

import (
	"time"

	"github.com/jferrl/anklyze/internal/domain"
)

// AuditRepository defines the interface for audit trail persistence.
type AuditRepository interface {
	Save(entry *domain.AuditEntry) error
}

// NoOpAuditRepository is a no-op implementation for when DB is not configured.
type NoOpAuditRepository struct{}

// Save does nothing and returns nil.
func (r *NoOpAuditRepository) Save(entry *domain.AuditEntry) error {
	return nil
}

// NewNoOpAuditRepository creates a no-op repository.
func NewNoOpAuditRepository() AuditRepository {
	return &NoOpAuditRepository{}
}

// AnalyticsRepository defines the interface for analytics queries.
type AnalyticsRepository interface {
	GetSummary(from, to time.Time) (*domain.AnalyticsSummary, error)
	GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.TrendData, error)
	GetDistribution(system string, from, to time.Time) (*domain.ClassificationDistribution, error)
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
func NewNoOpAnalyticsRepository() AnalyticsRepository {
	return &NoOpAnalyticsRepository{}
}
