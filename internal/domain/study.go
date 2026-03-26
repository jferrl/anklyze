package domain

import (
	"time"

	"github.com/google/uuid"
)

// StudyStatus represents the lifecycle state of a study.
type StudyStatus string

const (
	// StudyStatusDraft indicates the study is being prepared.
	StudyStatusDraft StudyStatus = "draft"
	// StudyStatusActive indicates the study is open for responses.
	StudyStatusActive StudyStatus = "active"
	// StudyStatusClosed indicates the study is no longer accepting responses.
	StudyStatusClosed StudyStatus = "closed"
)

// Study groups multiple cases for multi-case reliability analysis.
// This enables proper Fleiss' Kappa calculation which requires multiple subjects.
type Study struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	CreatedBy uuid.UUID `gorm:"type:uuid;not null;index" json:"created_by"`

	Title       string      `gorm:"size:255;not null" json:"title"`
	Description string      `gorm:"type:text" json:"description,omitempty"`
	Status      StudyStatus `gorm:"size:20;not null;default:'draft';index" json:"status"`

	// Denormalized counters for efficient queries
	CaseCount      int `gorm:"default:0" json:"case_count"`
	TotalResponses int `gorm:"default:0" json:"total_responses"`
	UniqueRaters   int `gorm:"default:0" json:"unique_raters"`
	CompleteRaters int `gorm:"default:0" json:"complete_raters"`
}

// TableName returns the table name for GORM.
func (Study) TableName() string {
	return "studies"
}

// NewStudy creates a new study with the given parameters.
func NewStudy(createdBy uuid.UUID, title, description string) *Study {
	return &Study{
		ID:          uuid.New(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedBy:   createdBy,
		Title:       title,
		Description: description,
		Status:      StudyStatusDraft,
	}
}

// IsActive returns true if the study is accepting responses.
func (s *Study) IsActive() bool {
	return s.Status == StudyStatusActive
}

// IsDraft returns true if the study is in draft state.
func (s *Study) IsDraft() bool {
	return s.Status == StudyStatusDraft
}

// IsClosed returns true if the study is closed.
func (s *Study) IsClosed() bool {
	return s.Status == StudyStatusClosed
}

// StudyWithCases represents a study with its associated cases.
type StudyWithCases struct {
	Study
	Cases []Case `json:"cases"`
}

// StudyListItem represents a study in list views.
type StudyListItem struct {
	ID             uuid.UUID   `json:"id"`
	Title          string      `json:"title"`
	Description    string      `json:"description,omitempty"`
	Status         StudyStatus `json:"status"`
	CaseCount      int         `json:"case_count"`
	TotalResponses int         `json:"total_responses"`
	UniqueRaters   int         `json:"unique_raters"`
	CompleteRaters int         `json:"complete_raters"`
	CreatedAt      time.Time   `json:"created_at"`
	CreatedBy      uuid.UUID   `json:"created_by"`
}
