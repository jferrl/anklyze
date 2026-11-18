package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// UserRepository defines the interface for user persistence operations.
type UserRepository interface {
	// SyncOnLogin creates or updates a user from authentication claims.
	// Should only be called on actual login events, not on every request.
	// On first login, creates a new user. On subsequent logins, updates last_login_at.
	SyncOnLogin(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error)
	// GetByID retrieves a user by their ID.
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	// GetByIDs retrieves multiple users by their IDs.
	GetByIDs(ctx context.Context, ids []uuid.UUID) ([]domain.User, error)
	// UpdateRole updates a user's role.
	UpdateRole(ctx context.Context, id uuid.UUID, role domain.UserRole) error
	// GetByEmail retrieves a user by their email.
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	// UpdateProfile updates a user's expertise profile fields.
	UpdateProfile(ctx context.Context, id uuid.UUID, profile domain.UserProfileUpdate) error
}
