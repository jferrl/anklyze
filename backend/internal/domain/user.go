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
}

// TableName returns the table name for GORM.
func (User) TableName() string {
	return "users"
}

// IsAdmin returns true if the user has the admin role.
func (u *User) IsAdmin() bool {
	return u.Role == UserRoleAdmin
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
