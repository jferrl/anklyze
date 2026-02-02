package domain

import (
	"time"

	"github.com/google/uuid"
)

// CaseUser represents the many-to-many relationship between cases and users.
// It controls which users have access to which cases.
type CaseUser struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CaseID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_case_user" json:"case_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_case_user" json:"user_id"`
	UserEmail string    `gorm:"size:255" json:"user_email"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// TableName returns the table name for GORM.
func (CaseUser) TableName() string {
	return "case_users"
}

// NewCaseUser creates a new CaseUser entry.
func NewCaseUser(caseID, userID uuid.UUID, email string) *CaseUser {
	return &CaseUser{
		ID:        uuid.New(),
		CaseID:    caseID,
		UserID:    userID,
		UserEmail: email,
		CreatedAt: time.Now(),
	}
}
