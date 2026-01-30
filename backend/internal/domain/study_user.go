package domain

import (
	"time"

	"github.com/google/uuid"
)

// StudyUser represents the many-to-many relationship between studies and users.
// It controls which users have access to which studies.
type StudyUser struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	StudyID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_study_user" json:"study_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_study_user" json:"user_id"`
	UserEmail string    `gorm:"size:255" json:"user_email"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// TableName returns the table name for GORM.
func (StudyUser) TableName() string {
	return "study_users"
}

// NewStudyUser creates a new StudyUser entry.
func NewStudyUser(studyID, userID uuid.UUID, email string) *StudyUser {
	return &StudyUser{
		ID:        uuid.New(),
		StudyID:   studyID,
		UserID:    userID,
		UserEmail: email,
		CreatedAt: time.Now(),
	}
}
