package domain

// ChatAnalyticsSummary contains aggregated chat analytics data.
type ChatAnalyticsSummary struct {
	Period                      TimePeriod       `json:"period"`
	TotalSessions               int64            `json:"total_sessions"`
	CompletedSessions           int64            `json:"completed_sessions"`
	AbandonedSessions           int64            `json:"abandoned_sessions"`
	CompletionRate              float64          `json:"completion_rate"`
	AvgMessagesPerSession       float64          `json:"avg_messages_per_session"`
	AvgClarificationsPerSession float64          `json:"avg_clarifications_per_session"`
	AvgConfidence               float64          `json:"avg_confidence"`
	AvgSessionDurationMS        float64          `json:"avg_session_duration_ms"`
	LanguageDistribution        map[string]int64 `json:"language_distribution"`
	ClassificationDistribution  map[string]int64 `json:"classification_distribution"`
}

// ChatFeedbackSummary contains feedback analytics.
type ChatFeedbackSummary struct {
	Period              TimePeriod `json:"period"`
	TotalFeedback       int64      `json:"total_feedback"`
	PositiveCount       int64      `json:"positive_count"`
	NegativeCount       int64      `json:"negative_count"`
	PositiveRate        float64    `json:"positive_rate"`
	FeedbackWithComment int64      `json:"feedback_with_comment"`
}

// ConfidenceBucket represents a confidence level range with count.
type ConfidenceBucket struct {
	Range      string  `json:"range"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

// ConfidenceDistribution shows distribution of extraction confidence levels.
type ConfidenceDistribution struct {
	Period       TimePeriod         `json:"period"`
	Total        int64              `json:"total"`
	Distribution []ConfidenceBucket `json:"distribution"`
}

// FieldClarification represents clarification frequency for a specific field.
type FieldClarification struct {
	Field      string  `json:"field"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

// ClarificationPatterns shows which fields most often require clarification.
type ClarificationPatterns struct {
	Period              TimePeriod           `json:"period"`
	TotalClarifications int64                `json:"total_clarifications"`
	ByField             []FieldClarification `json:"by_field"`
}

// ChatTrendDataPoint represents a single point in a chat analytics time series.
type ChatTrendDataPoint struct {
	Date              string  `json:"date"`
	SessionCount      int64   `json:"session_count"`
	CompletedCount    int64   `json:"completed_count"`
	AbandonedCount    int64   `json:"abandoned_count"`
	AvgConfidence     float64 `json:"avg_confidence"`
	FeedbackCount     int64   `json:"feedback_count"`
	PositiveFeedback  int64   `json:"positive_feedback"`
}

// ChatTrendData contains time-series chat analytics data.
type ChatTrendData struct {
	Period      TimePeriod           `json:"period"`
	Granularity string               `json:"granularity"`
	DataPoints  []ChatTrendDataPoint `json:"data_points"`
}
