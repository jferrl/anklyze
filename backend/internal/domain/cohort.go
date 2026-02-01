package domain

import (
	"time"

	"github.com/google/uuid"
)

// CohortStatus represents the lifecycle state of a study cohort.
type CohortStatus string

const (
	// CohortStatusDraft indicates the cohort is being prepared.
	CohortStatusDraft CohortStatus = "draft"
	// CohortStatusActive indicates the cohort is open for responses.
	CohortStatusActive CohortStatus = "active"
	// CohortStatusClosed indicates the cohort is no longer accepting responses.
	CohortStatusClosed CohortStatus = "closed"
)

// StudyCohort groups multiple studies (cases) for multi-case reliability analysis.
// This enables proper Fleiss' Kappa calculation which requires multiple subjects.
type StudyCohort struct {
	ID        uuid.UUID    `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time    `gorm:"index" json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
	CreatedBy uuid.UUID    `gorm:"type:uuid;not null;index" json:"created_by"`

	Title       string       `gorm:"size:255;not null" json:"title"`
	Description string       `gorm:"type:text" json:"description,omitempty"`
	Status      CohortStatus `gorm:"size:20;not null;default:'draft';index" json:"status"`

	// Denormalized counters for efficient queries
	CaseCount      int `gorm:"default:0" json:"case_count"`
	TotalResponses int `gorm:"default:0" json:"total_responses"`
	UniqueRaters   int `gorm:"default:0" json:"unique_raters"`
	CompleteRaters int `gorm:"default:0" json:"complete_raters"`
}

// TableName returns the table name for GORM.
func (StudyCohort) TableName() string {
	return "study_cohorts"
}

// NewStudyCohort creates a new study cohort with the given parameters.
func NewStudyCohort(createdBy uuid.UUID, title, description string) *StudyCohort {
	return &StudyCohort{
		ID:          uuid.New(),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedBy:   createdBy,
		Title:       title,
		Description: description,
		Status:      CohortStatusDraft,
	}
}

// IsActive returns true if the cohort is accepting responses.
func (c *StudyCohort) IsActive() bool {
	return c.Status == CohortStatusActive
}

// IsDraft returns true if the cohort is in draft state.
func (c *StudyCohort) IsDraft() bool {
	return c.Status == CohortStatusDraft
}

// IsClosed returns true if the cohort is closed.
func (c *StudyCohort) IsClosed() bool {
	return c.Status == CohortStatusClosed
}

// Note: CohortCase join table removed - cohort membership is now directly on Study
// via CohortID and CaseOrder fields.

// CohortUser tracks user participation in a cohort.
// Only users in this table can respond to cases in the cohort (pre-assigned raters).
type CohortUser struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	CohortID       uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_cohort_user" json:"cohort_id"`
	UserID         uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_cohort_user" json:"user_id"`
	UserEmail      string     `gorm:"size:255" json:"user_email"`
	CasesCompleted int        `gorm:"default:0" json:"cases_completed"`
	LastResponseAt *time.Time `json:"last_response_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// TableName returns the table name for GORM.
func (CohortUser) TableName() string {
	return "cohort_users"
}

// NewCohortUser creates a new cohort user assignment.
func NewCohortUser(cohortID, userID uuid.UUID, email string) *CohortUser {
	return &CohortUser{
		ID:        uuid.New(),
		CohortID:  cohortID,
		UserID:    userID,
		UserEmail: email,
		CreatedAt: time.Now(),
	}
}

// IsComplete returns true if the user has completed all cases in the cohort.
func (cu *CohortUser) IsComplete(totalCases int) bool {
	return cu.CasesCompleted >= totalCases
}

// CohortWithCases represents a cohort with its associated cases (studies).
type CohortWithCases struct {
	StudyCohort
	Cases []Study `json:"cases"`
}

// CohortListItem represents a cohort in list views.
type CohortListItem struct {
	ID             uuid.UUID    `json:"id"`
	Title          string       `json:"title"`
	Description    string       `json:"description,omitempty"`
	Status         CohortStatus `json:"status"`
	CaseCount      int          `json:"case_count"`
	TotalResponses int          `json:"total_responses"`
	UniqueRaters   int          `json:"unique_raters"`
	CompleteRaters int          `json:"complete_raters"`
	CreatedAt      time.Time    `json:"created_at"`
	CreatedBy      uuid.UUID    `json:"created_by"`
}

// RaterProgress tracks a rater's completion status across a cohort.
type RaterProgress struct {
	UserID         uuid.UUID  `json:"user_id"`
	UserEmail      string     `json:"user_email"`
	DisplayName    string     `json:"display_name,omitempty"`
	CasesCompleted int        `json:"cases_completed"`
	TotalCases     int        `json:"total_cases"`
	IsComplete     bool       `json:"is_complete"`
	LastResponseAt *time.Time `json:"last_response_at,omitempty"`
}
