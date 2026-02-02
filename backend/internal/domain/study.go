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
	ID        uuid.UUID   `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time   `gorm:"index" json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	CreatedBy uuid.UUID   `gorm:"type:uuid;not null;index" json:"created_by"`

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

// StudyRater tracks user participation in a study.
// Only users in this table can respond to cases in the study (pre-assigned raters).
type StudyRater struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	StudyID        uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_study_rater" json:"study_id"`
	UserID         uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_study_rater" json:"user_id"`
	UserEmail      string     `gorm:"size:255" json:"user_email"`
	CasesCompleted int        `gorm:"default:0" json:"cases_completed"`
	LastResponseAt *time.Time `json:"last_response_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// TableName returns the table name for GORM.
func (StudyRater) TableName() string {
	return "study_raters"
}

// NewStudyRater creates a new study rater assignment.
func NewStudyRater(studyID, userID uuid.UUID, email string) *StudyRater {
	return &StudyRater{
		ID:        uuid.New(),
		StudyID:   studyID,
		UserID:    userID,
		UserEmail: email,
		CreatedAt: time.Now(),
	}
}

// IsComplete returns true if the rater has completed all cases in the study.
func (sr *StudyRater) IsComplete(totalCases int) bool {
	return sr.CasesCompleted >= totalCases
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

// RaterProgress tracks a rater's completion status across a study.
type RaterProgress struct {
	UserID         uuid.UUID  `json:"user_id"`
	UserEmail      string     `json:"user_email"`
	DisplayName    string     `json:"display_name,omitempty"`
	CasesCompleted int        `json:"cases_completed"`
	TotalCases     int        `json:"total_cases"`
	IsComplete     bool       `json:"is_complete"`
	LastResponseAt *time.Time `json:"last_response_at,omitempty"`
}
