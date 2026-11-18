package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// mockUserRepository is a mock implementation of UserRepository for testing.
type mockUserRepository struct {
	getByIDFunc     func(ctx context.Context, id uuid.UUID) (*domain.User, error)
	syncOnLoginFunc func(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error)
}

func (m *mockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, errors.New("not implemented")
}

func (m *mockUserRepository) SyncOnLogin(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error) {
	if m.syncOnLoginFunc != nil {
		return m.syncOnLoginFunc(ctx, userID, email, provider)
	}
	return nil, errors.New("not implemented")
}

func TestUserService_GetByID(t *testing.T) {
	t.Parallel()

	testUserID := uuid.New()
	testUser := &domain.User{
		ID:    testUserID,
		Email: "test@example.com",
		Role:  domain.UserRoleUser,
	}

	tests := []struct {
		name      string
		userID    uuid.UUID
		setupRepo func() *mockUserRepository
		wantUser  *domain.User
		wantErr   bool
	}{
		{
			name:   "success - user found",
			userID: testUserID,
			setupRepo: func() *mockUserRepository {
				return &mockUserRepository{
					getByIDFunc: func(_ context.Context, id uuid.UUID) (*domain.User, error) {
						if id == testUserID {
							return testUser, nil
						}
						return nil, errors.New("user not found")
					},
				}
			},
			wantUser: testUser,
			wantErr:  false,
		},
		{
			name:   "error - user not found",
			userID: uuid.New(),
			setupRepo: func() *mockUserRepository {
				return &mockUserRepository{
					getByIDFunc: func(_ context.Context, _ uuid.UUID) (*domain.User, error) {
						return nil, errors.New("user not found")
					},
				}
			},
			wantUser: nil,
			wantErr:  true,
		},
		{
			name:   "error - repository error",
			userID: testUserID,
			setupRepo: func() *mockUserRepository {
				return &mockUserRepository{
					getByIDFunc: func(_ context.Context, _ uuid.UUID) (*domain.User, error) {
						return nil, errors.New("database connection failed")
					},
				}
			},
			wantUser: nil,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := tt.setupRepo()
			svc := NewUserService(repo, nil) // authAdmin is nil, not needed for GetByID

			got, err := svc.GetByID(context.Background(), tt.userID)

			if (err != nil) != tt.wantErr {
				t.Errorf("GetByID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantUser != nil && got == nil {
				t.Errorf("GetByID() got nil, want %v", tt.wantUser)
				return
			}

			if tt.wantUser != nil && got.ID != tt.wantUser.ID {
				t.Errorf("GetByID() got ID = %v, want %v", got.ID, tt.wantUser.ID)
			}
		})
	}
}

func TestUserService_SyncOnLogin(t *testing.T) {
	t.Parallel()

	testUserID := uuid.New()

	tests := []struct {
		name      string
		userID    uuid.UUID
		email     string
		provider  string
		setupRepo func() *mockUserRepository
		wantUser  *domain.User
		wantErr   bool
	}{
		{
			name:     "success - new user created",
			userID:   testUserID,
			email:    "newuser@example.com",
			provider: "google",
			setupRepo: func() *mockUserRepository {
				return &mockUserRepository{
					syncOnLoginFunc: func(_ context.Context, userID uuid.UUID, email, provider string) (*domain.User, error) {
						return &domain.User{
							ID:       userID,
							Email:    email,
							Provider: provider,
							Role:     domain.UserRoleUser,
						}, nil
					},
				}
			},
			wantUser: &domain.User{
				ID:       testUserID,
				Email:    "newuser@example.com",
				Provider: "google",
				Role:     domain.UserRoleUser,
			},
			wantErr: false,
		},
		{
			name:     "success - existing user updated",
			userID:   testUserID,
			email:    "existing@example.com",
			provider: "azure",
			setupRepo: func() *mockUserRepository {
				return &mockUserRepository{
					syncOnLoginFunc: func(_ context.Context, userID uuid.UUID, email, provider string) (*domain.User, error) {
						return &domain.User{
							ID:       userID,
							Email:    email,
							Provider: provider,
							Role:     domain.UserRoleAdmin, // Existing admin
						}, nil
					},
				}
			},
			wantUser: &domain.User{
				ID:       testUserID,
				Email:    "existing@example.com",
				Provider: "azure",
				Role:     domain.UserRoleAdmin,
			},
			wantErr: false,
		},
		{
			name:     "error - repository sync failed",
			userID:   testUserID,
			email:    "error@example.com",
			provider: "email",
			setupRepo: func() *mockUserRepository {
				return &mockUserRepository{
					syncOnLoginFunc: func(_ context.Context, _ uuid.UUID, _ string, _ string) (*domain.User, error) {
						return nil, errors.New("database constraint violation")
					},
				}
			},
			wantUser: nil,
			wantErr:  true,
		},
		{
			name:     "success - empty provider",
			userID:   testUserID,
			email:    "user@example.com",
			provider: "",
			setupRepo: func() *mockUserRepository {
				return &mockUserRepository{
					syncOnLoginFunc: func(_ context.Context, userID uuid.UUID, email, provider string) (*domain.User, error) {
						return &domain.User{
							ID:       userID,
							Email:    email,
							Provider: provider,
							Role:     domain.UserRoleUser,
						}, nil
					},
				}
			},
			wantUser: &domain.User{
				ID:       testUserID,
				Email:    "user@example.com",
				Provider: "",
				Role:     domain.UserRoleUser,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := tt.setupRepo()
			// AuthAdmin is nil - role sync to Supabase will be skipped
			svc := NewUserService(repo, nil)

			got, err := svc.SyncOnLogin(context.Background(), tt.userID, tt.email, tt.provider)

			if (err != nil) != tt.wantErr {
				t.Errorf("SyncOnLogin() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantUser != nil {
				if got == nil {
					t.Errorf("SyncOnLogin() got nil, want %v", tt.wantUser)
					return
				}
				if got.ID != tt.wantUser.ID {
					t.Errorf("SyncOnLogin() got ID = %v, want %v", got.ID, tt.wantUser.ID)
				}
				if got.Email != tt.wantUser.Email {
					t.Errorf("SyncOnLogin() got Email = %v, want %v", got.Email, tt.wantUser.Email)
				}
				if got.Provider != tt.wantUser.Provider {
					t.Errorf("SyncOnLogin() got Provider = %v, want %v", got.Provider, tt.wantUser.Provider)
				}
				if got.Role != tt.wantUser.Role {
					t.Errorf("SyncOnLogin() got Role = %v, want %v", got.Role, tt.wantUser.Role)
				}
			}
		})
	}
}

func TestUserService_SyncRoleToSupabase(t *testing.T) {
	t.Parallel()

	testUserID := uuid.New()

	tests := []struct {
		name       string
		userID     uuid.UUID
		role       domain.UserRole
		authAdmin  bool // whether to provide a (nil) authAdmin
		shouldSkip bool // whether sync should be skipped
	}{
		{
			name:       "skips when authAdmin is nil",
			userID:     testUserID,
			role:       domain.UserRoleAdmin,
			authAdmin:  false,
			shouldSkip: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockUserRepository{}
			svc := NewUserService(repo, nil)

			// This should not panic even with nil authAdmin
			svc.SyncRoleToSupabase(context.Background(), tt.userID, tt.role)
			// If we reach here without panic, the test passes
		})
	}
}

func TestNewUserService(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		repo      UserRepository
		authAdmin bool
	}{
		{
			name:      "creates service with repo and nil authAdmin",
			repo:      &mockUserRepository{},
			authAdmin: false,
		},
		{
			name:      "creates service with nil repo",
			repo:      nil,
			authAdmin: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc := NewUserService(tt.repo, nil)
			if svc == nil {
				t.Error("NewUserService() returned nil")
			}
		})
	}
}
