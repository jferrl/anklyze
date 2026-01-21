package postgres

import (
	"time"

	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
)

// ChatAnalyticsRepository implements chat analytics queries with PostgreSQL.
type ChatAnalyticsRepository struct {
	db *gorm.DB
}

// NewChatAnalyticsRepository creates a new PostgreSQL chat analytics repository.
func NewChatAnalyticsRepository(db *gorm.DB) *ChatAnalyticsRepository {
	return &ChatAnalyticsRepository{db: db}
}

// GetSummary returns aggregated chat statistics for a time period.
func (r *ChatAnalyticsRepository) GetSummary(from, to time.Time) (*domain.ChatAnalyticsSummary, error) {
	summary := &domain.ChatAnalyticsSummary{
		Period:                     domain.TimePeriod{From: from, To: to},
		LanguageDistribution:       make(map[string]int64),
		ClassificationDistribution: make(map[string]int64),
	}

	// Session counts and averages
	var stats struct {
		TotalSessions     int64
		CompletedSessions int64
		AbandonedSessions int64
		AvgMessages       float64
		AvgClarifications float64
		AvgConfidence     float64
		AvgDuration       float64
	}

	err := r.db.Model(&domain.ChatSession{}).
		Select(`
			COUNT(*) as total_sessions,
			SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as completed_sessions,
			SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_sessions,
			COALESCE(AVG(total_messages), 0) as avg_messages,
			COALESCE(AVG(clarification_count), 0) as avg_clarifications,
			COALESCE(AVG(final_confidence), 0) as avg_confidence,
			COALESCE(AVG(duration_ms), 0) as avg_duration
		`).
		Where("created_at >= ? AND created_at <= ?", from, to).
		Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	summary.TotalSessions = stats.TotalSessions
	summary.CompletedSessions = stats.CompletedSessions
	summary.AbandonedSessions = stats.AbandonedSessions
	summary.AvgMessagesPerSession = stats.AvgMessages
	summary.AvgClarificationsPerSession = stats.AvgClarifications
	summary.AvgConfidence = stats.AvgConfidence
	summary.AvgSessionDurationMS = stats.AvgDuration

	if stats.TotalSessions > 0 {
		summary.CompletionRate = float64(stats.CompletedSessions) / float64(stats.TotalSessions) * 100
	}

	// Language distribution
	var langRows []struct {
		Language string
		Count    int64
	}
	if err := r.db.Model(&domain.ChatSession{}).
		Select("language, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ?", from, to).
		Group("language").
		Scan(&langRows).Error; err != nil {
		return nil, err
	}
	for _, row := range langRows {
		summary.LanguageDistribution[row.Language] = row.Count
	}

	// Classification distribution (Danis-Weber types from completed sessions)
	var classRows []struct {
		Type  string
		Count int64
	}
	if err := r.db.Model(&domain.ChatSession{}).
		Select("danis_weber_type as type, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ? AND danis_weber_type IS NOT NULL", from, to).
		Group("danis_weber_type").
		Scan(&classRows).Error; err != nil {
		return nil, err
	}
	for _, row := range classRows {
		summary.ClassificationDistribution[row.Type] = row.Count
	}

	return summary, nil
}

// GetFeedbackSummary returns feedback statistics for a time period.
func (r *ChatAnalyticsRepository) GetFeedbackSummary(from, to time.Time) (*domain.ChatFeedbackSummary, error) {
	summary := &domain.ChatFeedbackSummary{
		Period: domain.TimePeriod{From: from, To: to},
	}

	var stats struct {
		TotalFeedback       int64
		PositiveCount       int64
		NegativeCount       int64
		FeedbackWithComment int64
	}

	err := r.db.Model(&domain.ChatFeedback{}).
		Select(`
			COUNT(*) as total_feedback,
			SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive_count,
			SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative_count,
			SUM(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 ELSE 0 END) as feedback_with_comment
		`).
		Where("created_at >= ? AND created_at <= ?", from, to).
		Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	summary.TotalFeedback = stats.TotalFeedback
	summary.PositiveCount = stats.PositiveCount
	summary.NegativeCount = stats.NegativeCount
	summary.FeedbackWithComment = stats.FeedbackWithComment

	if stats.TotalFeedback > 0 {
		summary.PositiveRate = float64(stats.PositiveCount) / float64(stats.TotalFeedback) * 100
	}

	return summary, nil
}

// GetConfidenceDistribution returns confidence level distribution.
func (r *ChatAnalyticsRepository) GetConfidenceDistribution(from, to time.Time) (*domain.ConfidenceDistribution, error) {
	dist := &domain.ConfidenceDistribution{
		Period:       domain.TimePeriod{From: from, To: to},
		Distribution: []domain.ConfidenceBucket{},
	}

	var rows []struct {
		Bucket string
		Count  int64
	}

	err := r.db.Model(&domain.ChatSession{}).
		Select(`
			CASE
				WHEN final_confidence < 0.5 THEN '0-50%'
				WHEN final_confidence < 0.7 THEN '50-70%'
				WHEN final_confidence < 0.9 THEN '70-90%'
				ELSE '90-100%'
			END as bucket,
			COUNT(*) as count
		`).
		Where("created_at >= ? AND created_at <= ? AND final_confidence IS NOT NULL", from, to).
		Group("bucket").
		Order("bucket").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	var total int64
	for _, row := range rows {
		total += row.Count
	}
	dist.Total = total

	for _, row := range rows {
		var pct float64
		if total > 0 {
			pct = float64(row.Count) / float64(total) * 100
		}
		dist.Distribution = append(dist.Distribution, domain.ConfidenceBucket{
			Range:      row.Bucket,
			Count:      row.Count,
			Percentage: pct,
		})
	}

	return dist, nil
}

// GetTrends returns time-series chat analytics data.
func (r *ChatAnalyticsRepository) GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.ChatTrendData, error) {
	trend := &domain.ChatTrendData{
		Period:      domain.TimePeriod{From: from, To: to},
		Granularity: string(granularity),
		DataPoints:  []domain.ChatTrendDataPoint{},
	}

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
		Date           time.Time
		SessionCount   int64
		CompletedCount int64
		AbandonedCount int64
		AvgConfidence  float64
	}

	err := r.db.Model(&domain.ChatSession{}).
		Select(`
			DATE_TRUNC('`+dateTrunc+`', created_at) as date,
			COUNT(*) as session_count,
			SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as completed_count,
			SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_count,
			COALESCE(AVG(final_confidence), 0) as avg_confidence
		`).
		Where("created_at >= ? AND created_at <= ?", from, to).
		Group("DATE_TRUNC('" + dateTrunc + "', created_at)").
		Order("date ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	// Get feedback data separately and merge
	var feedbackRows []struct {
		Date             time.Time
		FeedbackCount    int64
		PositiveFeedback int64
	}

	_ = r.db.Model(&domain.ChatFeedback{}).
		Select(`
			DATE_TRUNC('`+dateTrunc+`', created_at) as date,
			COUNT(*) as feedback_count,
			SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive_feedback
		`).
		Where("created_at >= ? AND created_at <= ?", from, to).
		Group("DATE_TRUNC('" + dateTrunc + "', created_at)").
		Scan(&feedbackRows)

	// Create a map for feedback data
	feedbackMap := make(map[string]struct {
		Count    int64
		Positive int64
	})
	for _, row := range feedbackRows {
		feedbackMap[row.Date.Format("2006-01-02")] = struct {
			Count    int64
			Positive int64
		}{row.FeedbackCount, row.PositiveFeedback}
	}

	for _, row := range rows {
		dateStr := row.Date.Format("2006-01-02")
		fb := feedbackMap[dateStr]
		trend.DataPoints = append(trend.DataPoints, domain.ChatTrendDataPoint{
			Date:             dateStr,
			SessionCount:     row.SessionCount,
			CompletedCount:   row.CompletedCount,
			AbandonedCount:   row.AbandonedCount,
			AvgConfidence:    row.AvgConfidence,
			FeedbackCount:    fb.Count,
			PositiveFeedback: fb.Positive,
		})
	}

	return trend, nil
}
