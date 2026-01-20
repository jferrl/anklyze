package postgres

import (
	"time"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"gorm.io/gorm"
)

// AnalyticsRepository implements repository.AnalyticsRepository with PostgreSQL.
type AnalyticsRepository struct {
	db *gorm.DB
}

// NewAnalyticsRepository creates a new PostgreSQL analytics repository.
func NewAnalyticsRepository(db *gorm.DB) repository.AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// GetSummary returns aggregated statistics for a time period.
func (r *AnalyticsRepository) GetSummary(from, to time.Time) (*domain.AnalyticsSummary, error) {
	summary := &domain.AnalyticsSummary{
		Period:                  domain.TimePeriod{From: from, To: to},
		LanguageDistribution:    make(map[string]int64),
		DanisWeberDistribution:  make(map[string]int64),
		LaugeHansenDistribution: make(map[string]int64),
		AOOTADistribution:       make(map[string]int64),
	}

	// Total count, impossible count, and avg processing time
	var stats struct {
		Total           int64
		ImpossibleCount int64
		AvgDuration     float64
	}

	err := r.db.Model(&domain.AuditEntry{}).
		Select("COUNT(*) as total, "+
			"SUM(CASE WHEN is_impossible THEN 1 ELSE 0 END) as impossible_count, "+
			"COALESCE(AVG(duration_ms), 0) as avg_duration").
		Where("created_at >= ? AND created_at <= ?", from, to).
		Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	summary.TotalClassifications = stats.Total
	summary.ImpossibleCount = stats.ImpossibleCount
	summary.AvgProcessingTimeMS = stats.AvgDuration
	if stats.Total > 0 {
		summary.ImpossiblePercentage = float64(stats.ImpossibleCount) / float64(stats.Total) * 100
	}

	// Language distribution
	var langRows []struct {
		Language string
		Count    int64
	}
	if err := r.db.Model(&domain.AuditEntry{}).
		Select("language, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ?", from, to).
		Group("language").
		Scan(&langRows).Error; err != nil {
		return nil, err
	}
	for _, row := range langRows {
		summary.LanguageDistribution[row.Language] = row.Count
	}

	// Danis-Weber distribution
	var dwRows []struct {
		Type  string
		Count int64
	}
	if err := r.db.Model(&domain.AuditEntry{}).
		Select("danis_weber_type as type, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ? AND danis_weber_type IS NOT NULL", from, to).
		Group("danis_weber_type").
		Scan(&dwRows).Error; err != nil {
		return nil, err
	}
	for _, row := range dwRows {
		summary.DanisWeberDistribution[row.Type] = row.Count
	}

	// Lauge-Hansen distribution
	var lhRows []struct {
		Type  string
		Count int64
	}
	if err := r.db.Model(&domain.AuditEntry{}).
		Select("lauge_hansen_type as type, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ? AND lauge_hansen_type IS NOT NULL", from, to).
		Group("lauge_hansen_type").
		Scan(&lhRows).Error; err != nil {
		return nil, err
	}
	for _, row := range lhRows {
		summary.LaugeHansenDistribution[row.Type] = row.Count
	}

	// AO/OTA distribution
	var aoRows []struct {
		Code  string
		Count int64
	}
	if err := r.db.Model(&domain.AuditEntry{}).
		Select("ao_ota_code as code, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ? AND ao_ota_code IS NOT NULL", from, to).
		Group("ao_ota_code").
		Scan(&aoRows).Error; err != nil {
		return nil, err
	}
	for _, row := range aoRows {
		summary.AOOTADistribution[row.Code] = row.Count
	}

	return summary, nil
}

// GetTrends returns time-series data with the specified granularity.
func (r *AnalyticsRepository) GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.TrendData, error) {
	trend := &domain.TrendData{
		Period:      domain.TimePeriod{From: from, To: to},
		Granularity: string(granularity),
		DataPoints:  []domain.TrendDataPoint{},
	}

	// Determine the date truncation based on granularity
	var dateTrunc string
	switch granularity {
	case domain.GranularityWeek:
		dateTrunc = "week"
	case domain.GranularityMonth:
		dateTrunc = "month"
	default:
		dateTrunc = "day"
	}

	var rows []struct {
		Date            time.Time
		Count           int64
		ImpossibleCount int64
	}

	err := r.db.Model(&domain.AuditEntry{}).
		Select("DATE_TRUNC('"+dateTrunc+"', created_at) as date, "+
			"COUNT(*) as count, "+
			"SUM(CASE WHEN is_impossible THEN 1 ELSE 0 END) as impossible_count").
		Where("created_at >= ? AND created_at <= ?", from, to).
		Group("DATE_TRUNC('" + dateTrunc + "', created_at)").
		Order("date ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for _, row := range rows {
		trend.DataPoints = append(trend.DataPoints, domain.TrendDataPoint{
			Date:            row.Date.Format("2006-01-02"),
			Count:           row.Count,
			ImpossibleCount: row.ImpossibleCount,
		})
	}

	return trend, nil
}

// GetDistribution returns detailed distribution for a classification system.
func (r *AnalyticsRepository) GetDistribution(system string, from, to time.Time) (*domain.ClassificationDistribution, error) {
	dist := &domain.ClassificationDistribution{
		System:       system,
		Period:       domain.TimePeriod{From: from, To: to},
		Distribution: []domain.DistributionItem{},
	}

	// Determine column based on system
	var column string
	switch system {
	case "danis-weber":
		column = "danis_weber_type"
	case "lauge-hansen":
		column = "lauge_hansen_type"
	case "ao-ota":
		column = "ao_ota_code"
	default:
		return dist, nil
	}

	var rows []struct {
		Value string
		Count int64
	}

	err := r.db.Model(&domain.AuditEntry{}).
		Select(column+" as value, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ? AND "+column+" IS NOT NULL", from, to).
		Group(column).
		Order("count DESC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	// Calculate total for percentages
	var total int64
	for _, row := range rows {
		total += row.Count
	}
	dist.Total = total

	for _, row := range rows {
		var percentage float64
		if total > 0 {
			percentage = float64(row.Count) / float64(total) * 100
		}
		dist.Distribution = append(dist.Distribution, domain.DistributionItem{
			Value:      row.Value,
			Count:      row.Count,
			Percentage: percentage,
		})
	}

	return dist, nil
}
