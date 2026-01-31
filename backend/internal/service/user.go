package service

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/supabase"
)

// UserRepository defines database operations for users.
type UserRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	SyncOnLogin(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error)
	UpdateRole(ctx context.Context, id uuid.UUID, role domain.UserRole) error
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
}

// UserService orchestrates user operations across database and external services.
type UserService struct {
	repo      UserRepository
	authAdmin *supabase.AuthAdmin
}

// NewUserService creates a new user service.
func NewUserService(repo UserRepository, authAdmin *supabase.AuthAdmin) *UserService {
	return &UserService{
		repo:      repo,
		authAdmin: authAdmin,
	}
}

// GetByID retrieves a user by ID.
func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return s.repo.GetByID(ctx, id)
}

// SyncOnLogin creates or updates a user and syncs role to Supabase.
func (s *UserService) SyncOnLogin(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error) {
	user, err := s.repo.SyncOnLogin(ctx, userID, email, provider)
	if err != nil {
		return nil, err
	}

	// Sync role to Supabase app_metadata
	s.syncRoleToSupabase(ctx, userID, user.Role)

	return user, nil
}

// UpdateRole updates a user's role and syncs to Supabase.
func (s *UserService) UpdateRole(ctx context.Context, id uuid.UUID, role domain.UserRole) error {
	if err := s.repo.UpdateRole(ctx, id, role); err != nil {
		return err
	}

	// Sync role to Supabase app_metadata
	s.syncRoleToSupabase(ctx, id, role)

	return nil
}

// GetByEmail retrieves a user by email.
func (s *UserService) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	return s.repo.GetByEmail(ctx, email)
}

// SyncRoleToSupabase syncs the user's role to Supabase app_metadata.
func (s *UserService) SyncRoleToSupabase(ctx context.Context, userID uuid.UUID, role domain.UserRole) {
	s.syncRoleToSupabase(ctx, userID, role)
}

func (s *UserService) syncRoleToSupabase(ctx context.Context, userID uuid.UUID, role domain.UserRole) {
	if s.authAdmin == nil {
		return
	}

	if err := s.authAdmin.UpdateUserRole(ctx, userID.String(), string(role)); err != nil {
		slog.Warn("failed to sync role to Supabase", "user_id", userID, "role", role, "error", err)
	}
}
