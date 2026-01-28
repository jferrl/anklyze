package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserRepository implements user persistence with PostgreSQL.
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new PostgreSQL user repository.
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// UpsertFromAuth creates or updates a user from authentication claims.
// On first login, creates a new user with default role.
// On subsequent logins, updates last_login_at timestamp.
func (r *UserRepository) UpsertFromAuth(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error) {
	now := time.Now()
	user := &domain.User{
		ID:          userID,
		Email:       email,
		Role:        domain.UserRoleUser,
		Provider:    provider,
		LastLoginAt: &now,
	}

	// Upsert: insert if not exists, update last_login_at if exists
	result := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"last_login_at", "email", "provider"}),
	}).Create(user)

	if result.Error != nil {
		return nil, result.Error
	}

	// Fetch the user to get the actual role (might have been set to admin previously)
	var savedUser domain.User
	if err := r.db.WithContext(ctx).First(&savedUser, "id = ?", userID).Error; err != nil {
		return nil, err
	}

	return &savedUser, nil
}

// GetByID retrieves a user by their ID.
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var user domain.User
	result := r.db.WithContext(ctx).First(&user, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &user, nil
}

// UpdateRole updates a user's role.
func (r *UserRepository) UpdateRole(ctx context.Context, id uuid.UUID, role domain.UserRole) error {
	return r.db.WithContext(ctx).Model(&domain.User{}).Where("id = ?", id).Update("role", role).Error
}
