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
	// UpdateRole updates a user's role.
	UpdateRole(ctx context.Context, id uuid.UUID, role domain.UserRole) error
}

// NoOpUserRepository is a no-op implementation for when DB is not configured.
type NoOpUserRepository struct{}

// SyncOnLogin does nothing and returns a temporary user.
func (r *NoOpUserRepository) SyncOnLogin(_ context.Context, userID uuid.UUID, email, provider string) (*domain.User, error) {
	return &domain.User{
		ID:       userID,
		Email:    email,
		Role:     domain.UserRoleUser,
		Provider: provider,
	}, nil
}

// GetByID returns nil (not found).
func (r *NoOpUserRepository) GetByID(_ context.Context, _ uuid.UUID) (*domain.User, error) {
	return nil, nil
}

// UpdateRole does nothing and returns nil.
func (r *NoOpUserRepository) UpdateRole(_ context.Context, _ uuid.UUID, _ domain.UserRole) error {
	return nil
}

// GetByEmail returns nil (not found).
func (r *NoOpUserRepository) GetByEmail(_ context.Context, _ string) (*domain.User, error) {
	return nil, nil
}

// NewNoOpUserRepository creates a no-op user repository.
func NewNoOpUserRepository() *NoOpUserRepository {
	return &NoOpUserRepository{}
}
