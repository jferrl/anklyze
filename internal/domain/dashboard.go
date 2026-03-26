package domain

import (
	"time"

	"github.com/google/uuid"
)

// DashboardStats holds aggregated statistics for the admin dashboard.
type DashboardStats struct {
	TotalCases          int64 `json:"total_cases"`
	DraftCases          int64 `json:"draft_cases"`
	PublishedCases      int64 `json:"published_cases"`
	ClosedCases         int64 `json:"closed_cases"`
	TotalResponses      int64 `json:"total_responses"`
	TotalUniqueUsers    int64 `json:"total_unique_users"`
	AvgResponsesPerCase int64 `json:"avg_responses_per_case"`
}

// DashboardRecentCase is a summary of a recently active case.
type DashboardRecentCase struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Status        string    `json:"status"`
	ResponseCount int       `json:"response_count"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// DashboardAttentionCase is a case that needs admin attention.
type DashboardAttentionCase struct {
	ID       uuid.UUID  `json:"id"`
	Title    string     `json:"title"`
	Deadline *time.Time `json:"deadline,omitempty"`
}

// DashboardResponse is the full dashboard API response.
type DashboardResponse struct {
	Stats                 DashboardStats           `json:"stats"`
	RecentActiveCases     []DashboardRecentCase    `json:"recent_active_cases"`
	CasesNeedingAttention []DashboardAttentionCase `json:"cases_needing_attention"`
}
