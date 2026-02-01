package domain

import (
	"time"

	"github.com/google/uuid"
)

// UserRole represents the authorization level of a user.
type UserRole string

const (
	// UserRoleUser is the default role for regular users.
	UserRoleUser UserRole = "user"
	// UserRoleAdmin is the role for administrators.
	UserRoleAdmin UserRole = "admin"
)

// Specialty represents the medical specialty of a user.
type Specialty string

const (
	SpecialtyTraumatology Specialty = "traumatology"
	SpecialtyOrthopedics  Specialty = "orthopedics"
	SpecialtyEmergency    Specialty = "emergency"
	SpecialtyRadiology    Specialty = "radiology"
	SpecialtyGeneral      Specialty = "general"
	SpecialtyOther        Specialty = "other"
)

// ValidSpecialties returns all valid specialty values.
func ValidSpecialties() []Specialty {
	return []Specialty{
		SpecialtyTraumatology,
		SpecialtyOrthopedics,
		SpecialtyEmergency,
		SpecialtyRadiology,
		SpecialtyGeneral,
		SpecialtyOther,
	}
}

// IsValidSpecialty checks if a specialty string is valid.
func IsValidSpecialty(s string) bool {
	for _, v := range ValidSpecialties() {
		if string(v) == s {
			return true
		}
	}
	return false
}

// TrainingLevel represents the training level of a medical professional.
type TrainingLevel string

const (
	TrainingLevelResident  TrainingLevel = "resident"
	TrainingLevelFellow    TrainingLevel = "fellow"
	TrainingLevelAttending TrainingLevel = "attending"
	TrainingLevelOther     TrainingLevel = "other"
)

// ValidTrainingLevels returns all valid training level values.
func ValidTrainingLevels() []TrainingLevel {
	return []TrainingLevel{
		TrainingLevelResident,
		TrainingLevelFellow,
		TrainingLevelAttending,
		TrainingLevelOther,
	}
}

// IsValidTrainingLevel checks if a training level string is valid.
func IsValidTrainingLevel(t string) bool {
	for _, v := range ValidTrainingLevels() {
		if string(v) == t {
			return true
		}
	}
	return false
}

// User represents an application user.
// This model mirrors Supabase auth.users for local queries and role management.
type User struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Email       string     `gorm:"uniqueIndex;not null;size:255" json:"email"`
	Role        UserRole   `gorm:"type:varchar(20);default:'user'" json:"role"`
	DisplayName string     `gorm:"size:255" json:"display_name,omitempty"`
	AvatarURL   string     `gorm:"size:500" json:"avatar_url,omitempty"`
	Provider    string     `gorm:"size:50" json:"provider,omitempty"` // google, azure, email
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Expertise Profiling (optional) - for validation study stratification
	YearsExperience *int    `gorm:"column:years_experience" json:"years_experience,omitempty"`
	Specialty       *string `gorm:"size:50;column:specialty" json:"specialty,omitempty"`
	TrainingLevel   *string `gorm:"size:50;column:training_level" json:"training_level,omitempty"`
	Institution     *string `gorm:"size:255;column:institution" json:"institution,omitempty"`
}

// TableName returns the table name for GORM.
func (User) TableName() string {
	return "users"
}

// IsAdmin returns true if the user has the admin role.
func (u *User) IsAdmin() bool {
	return u.Role == UserRoleAdmin
}

// HasExpertiseProfile returns true if the user has completed their expertise profile.
func (u *User) HasExpertiseProfile() bool {
	return u.Specialty != nil && u.TrainingLevel != nil
}

// UserProfileUpdate contains fields that can be updated in a user's profile.
type UserProfileUpdate struct {
	DisplayName     *string `json:"display_name,omitempty"`
	YearsExperience *int    `json:"years_experience,omitempty"`
	Specialty       *string `json:"specialty,omitempty"`
	TrainingLevel   *string `json:"training_level,omitempty"`
	Institution     *string `json:"institution,omitempty"`
}

// IsValidRole checks if a role string is valid.
func IsValidRole(role string) bool {
	switch UserRole(role) {
	case UserRoleUser, UserRoleAdmin:
		return true
	default:
		return false
	}
}
