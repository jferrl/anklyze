package domain

import (
	"testing"

	"github.com/google/uuid"
)

func TestUser_IsAdmin(t *testing.T) {
	tests := []struct {
		name     string
		user     User
		expected bool
	}{
		{
			name: "admin role returns true",
			user: User{
				ID:   uuid.New(),
				Role: UserRoleAdmin,
			},
			expected: true,
		},
		{
			name: "user role returns false",
			user: User{
				ID:   uuid.New(),
				Role: UserRoleUser,
			},
			expected: false,
		},
		{
			name: "empty role returns false",
			user: User{
				ID:   uuid.New(),
				Role: "",
			},
			expected: false,
		},
		{
			name: "unknown role returns false",
			user: User{
				ID:   uuid.New(),
				Role: UserRole("unknown"),
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.user.IsAdmin()
			if got != tt.expected {
				t.Errorf("IsAdmin() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestUser_TableName(t *testing.T) {
	u := User{}
	expected := "users"

	got := u.TableName()
	if got != expected {
		t.Errorf("TableName() = %q, want %q", got, expected)
	}
}

func TestIsValidRole(t *testing.T) {
	tests := []struct {
		name     string
		role     string
		expected bool
	}{
		{
			name:     "user role is valid",
			role:     "user",
			expected: true,
		},
		{
			name:     "admin role is valid",
			role:     "admin",
			expected: true,
		},
		{
			name:     "empty role is invalid",
			role:     "",
			expected: false,
		},
		{
			name:     "unknown role is invalid",
			role:     "superuser",
			expected: false,
		},
		{
			name:     "case sensitive - User is invalid",
			role:     "User",
			expected: false,
		},
		{
			name:     "case sensitive - Admin is invalid",
			role:     "Admin",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsValidRole(tt.role)
			if got != tt.expected {
				t.Errorf("IsValidRole(%q) = %v, want %v", tt.role, got, tt.expected)
			}
		})
	}
}
