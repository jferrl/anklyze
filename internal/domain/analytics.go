package domain

import "time"

// TimePeriod represents a date range for analytics queries.
type TimePeriod struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// AnalyticsSummary contains aggregated analytics data.
type AnalyticsSummary struct {
	Period                  TimePeriod       `json:"period"`
	TotalClassifications    int64            `json:"total_classifications"`
	ImpossibleCount         int64            `json:"impossible_count"`
	ImpossiblePercentage    float64          `json:"impossible_percentage"`
	AvgProcessingTimeMS     float64          `json:"avg_processing_time_ms"`
	LanguageDistribution    map[string]int64 `json:"classifications_by_language"`
	DanisWeberDistribution  map[string]int64 `json:"danis_weber_distribution"`
	LaugeHansenDistribution map[string]int64 `json:"lauge_hansen_distribution"`
	AOOTADistribution       map[string]int64 `json:"ao_ota_distribution"`
}

// TrendDataPoint represents a single point in a time series.
type TrendDataPoint struct {
	Date            string `json:"date"`
	Count           int64  `json:"count"`
	ImpossibleCount int64  `json:"impossible_count"`
}

// TrendData contains time-series classification data.
type TrendData struct {
	Period      TimePeriod       `json:"period"`
	Granularity string           `json:"granularity"`
	DataPoints  []TrendDataPoint `json:"data_points"`
}

// DistributionItem represents a single item in a distribution.
type DistributionItem struct {
	Value      string  `json:"value"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

// ClassificationDistribution contains detailed distribution for a single system.
type ClassificationDistribution struct {
	System       string             `json:"system"`
	Period       TimePeriod         `json:"period"`
	Total        int64              `json:"total"`
	Distribution []DistributionItem `json:"distribution"`
}

// Granularity represents time aggregation granularity.
type Granularity string

const (
	GranularityDay   Granularity = "day"
	GranularityWeek  Granularity = "week"
	GranularityMonth Granularity = "month"
)

// ParseGranularity parses a string into a Granularity.
func ParseGranularity(s string) Granularity {
	switch s {
	case "week":
		return GranularityWeek
	case "month":
		return GranularityMonth
	default:
		return GranularityDay
	}
}
