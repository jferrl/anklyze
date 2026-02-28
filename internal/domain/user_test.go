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
