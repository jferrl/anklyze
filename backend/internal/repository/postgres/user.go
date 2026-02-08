package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
)

// UserRepository implements user persistence with PostgreSQL.
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new PostgreSQL user repository.
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// SyncOnLogin creates or updates a user from authentication claims.
// Should only be called on actual login events, not on every request.
// On first login, creates a new user with default role.
// On subsequent logins, updates last_login_at timestamp.
func (r *UserRepository) SyncOnLogin(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error) {
	now := time.Now()

	// Use raw SQL with RETURNING to do upsert + fetch in a single query
	var user domain.User
	err := r.db.WithContext(ctx).Raw(`
		INSERT INTO users (id, email, role, provider, last_login_at, created_at, updated_at)
		VALUES (?, ?, 'user', ?, ?, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET
			last_login_at = EXCLUDED.last_login_at,
			email = EXCLUDED.email,
			provider = EXCLUDED.provider,
			updated_at = NOW()
		RETURNING id, email, role, display_name, avatar_url, provider, last_login_at, created_at, updated_at,
			years_experience, specialty, training_level, institution
	`, userID, email, provider, now).Scan(&user).Error

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetByID retrieves a user by their ID.
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var user domain.User
	result := r.db.WithContext(ctx).Take(&user, "id = ?", id)
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

// GetByEmail retrieves a user by their email address.
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	result := r.db.WithContext(ctx).Take(&user, "email = ?", email)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}
	return &user, nil
}

// UpdateProfile updates a user's expertise profile fields.
func (r *UserRepository) UpdateProfile(ctx context.Context, id uuid.UUID, profile domain.UserProfileUpdate) error {
	updates := make(map[string]any)

	if profile.DisplayName != nil {
		updates["display_name"] = *profile.DisplayName
	}
	if profile.YearsExperience != nil {
		updates["years_experience"] = *profile.YearsExperience
	}
	if profile.Specialty != nil {
		updates["specialty"] = *profile.Specialty
	}
	if profile.TrainingLevel != nil {
		updates["training_level"] = *profile.TrainingLevel
	}
	if profile.Institution != nil {
		updates["institution"] = *profile.Institution
	}

	if len(updates) == 0 {
		return nil // Nothing to update
	}

	updates["updated_at"] = time.Now()

	return r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("id = ?", id).
		Updates(updates).Error
}
