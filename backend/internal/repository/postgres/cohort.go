package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
)

// CohortRepository implements cohort persistence with PostgreSQL.
type CohortRepository struct {
	db *gorm.DB
}

// NewCohortRepository creates a new PostgreSQL cohort repository.
func NewCohortRepository(db *gorm.DB) *CohortRepository {
	return &CohortRepository{db: db}
}

// Create creates a new study cohort.
func (r *CohortRepository) Create(ctx context.Context, cohort *domain.StudyCohort) error {
	return r.db.WithContext(ctx).Create(cohort).Error
}

// GetByID retrieves a cohort by its ID.
func (r *CohortRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.StudyCohort, error) {
	var cohort domain.StudyCohort
	result := r.db.WithContext(ctx).First(&cohort, "id = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}
	return &cohort, nil
}

// Update updates a cohort.
func (r *CohortRepository) Update(ctx context.Context, cohort *domain.StudyCohort) error {
	cohort.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(cohort).Error
}

// Delete deletes a cohort and removes all associated data.
func (r *CohortRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete all cohort users first
		if err := tx.Delete(&domain.CohortUser{}, "cohort_id = ?", id).Error; err != nil {
			return err
		}

		// Clear cohort_id from all studies in this cohort
		if err := tx.Model(&domain.Study{}).
			Where("cohort_id = ?", id).
			Updates(map[string]interface{}{
				"cohort_id":  nil,
				"case_order": 0,
			}).Error; err != nil {
			return err
		}

		// Delete the cohort
		return tx.Delete(&domain.StudyCohort{}, "id = ?", id).Error
	})
}

// List retrieves cohorts with optional status filter and pagination.
func (r *CohortRepository) List(ctx context.Context, status *domain.CohortStatus, limit, offset int) ([]domain.StudyCohort, int64, error) {
	var cohorts []domain.StudyCohort
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.StudyCohort{})
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&cohorts).Error; err != nil {
		return nil, 0, err
	}

	return cohorts, total, nil
}

// ============================================================================
// Case Management (via Study.CohortID)
// ============================================================================

// AddCase assigns a study to a cohort with the given case order.
func (r *CohortRepository) AddCase(ctx context.Context, cohortID, studyID uuid.UUID, caseOrder int) error {
	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ?", studyID).
		Updates(map[string]interface{}{
			"cohort_id":  cohortID,
			"case_order": caseOrder,
			"updated_at": time.Now(),
		}).Error
}

// RemoveCase removes a study from a cohort (clears cohort_id).
func (r *CohortRepository) RemoveCase(ctx context.Context, cohortID, studyID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ? AND cohort_id = ?", studyID, cohortID).
		Updates(map[string]interface{}{
			"cohort_id":  nil,
			"case_order": 0,
			"updated_at": time.Now(),
		}).Error
}

// GetCases retrieves all studies in a cohort, ordered by case_order.
func (r *CohortRepository) GetCases(ctx context.Context, cohortID uuid.UUID) ([]domain.Study, error) {
	var studies []domain.Study
	err := r.db.WithContext(ctx).
		Where("cohort_id = ?", cohortID).
		Order("case_order ASC").
		Find(&studies).Error
	return studies, err
}

// ReorderCases updates the case_order of studies in a cohort.
func (r *CohortRepository) ReorderCases(ctx context.Context, cohortID uuid.UUID, studyIDs []uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i, studyID := range studyIDs {
			if err := tx.Model(&domain.Study{}).
				Where("id = ? AND cohort_id = ?", studyID, cohortID).
				Updates(map[string]interface{}{
					"case_order": i,
					"updated_at": time.Now(),
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// GetCohortByStudyID retrieves the cohort that contains a study (if any).
func (r *CohortRepository) GetCohortByStudyID(ctx context.Context, studyID uuid.UUID) (*domain.StudyCohort, error) {
	var study domain.Study
	result := r.db.WithContext(ctx).Select("cohort_id").First(&study, "id = ?", studyID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}

	if study.CohortID == nil {
		return nil, nil
	}

	return r.GetByID(ctx, *study.CohortID)
}

// GetNextCaseOrder returns the next available case order for a cohort.
func (r *CohortRepository) GetNextCaseOrder(ctx context.Context, cohortID uuid.UUID) (int, error) {
	var maxOrder *int
	err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("cohort_id = ?", cohortID).
		Select("MAX(case_order)").
		Scan(&maxOrder).Error
	if err != nil {
		return 0, err
	}
	if maxOrder == nil {
		return 0, nil
	}
	return *maxOrder + 1, nil
}

// ============================================================================
// User/Rater Management
// ============================================================================

// AddUser assigns a user as a rater to a cohort.
func (r *CohortRepository) AddUser(ctx context.Context, cohortID, userID uuid.UUID, email string) error {
	cohortUser := domain.NewCohortUser(cohortID, userID, email)
	return r.db.WithContext(ctx).Create(cohortUser).Error
}

// RemoveUser removes a user from a cohort.
func (r *CohortRepository) RemoveUser(ctx context.Context, cohortID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Delete(&domain.CohortUser{}, "cohort_id = ? AND user_id = ?", cohortID, userID).Error
}

// GetUsers retrieves all users assigned to a cohort.
func (r *CohortRepository) GetUsers(ctx context.Context, cohortID uuid.UUID) ([]domain.CohortUser, error) {
	var users []domain.CohortUser
	err := r.db.WithContext(ctx).
		Where("cohort_id = ?", cohortID).
		Order("created_at ASC").
		Find(&users).Error
	return users, err
}

// HasAccess checks if a user is assigned to a cohort.
func (r *CohortRepository) HasAccess(ctx context.Context, cohortID, userID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CohortUser{}).
		Where("cohort_id = ? AND user_id = ?", cohortID, userID).
		Count(&count).Error
	return count > 0, err
}

// GetRaterProgress retrieves completion progress for all raters in a cohort.
func (r *CohortRepository) GetRaterProgress(ctx context.Context, cohortID uuid.UUID) ([]domain.RaterProgress, error) {
	// Get total cases count
	var totalCases int64
	if err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("cohort_id = ?", cohortID).
		Count(&totalCases).Error; err != nil {
		return nil, err
	}

	// Get all cohort users with their progress
	var cohortUsers []domain.CohortUser
	if err := r.db.WithContext(ctx).
		Where("cohort_id = ?", cohortID).
		Order("created_at ASC").
		Find(&cohortUsers).Error; err != nil {
		return nil, err
	}

	// Build progress list
	result := make([]domain.RaterProgress, 0, len(cohortUsers))
	for _, cu := range cohortUsers {
		// Get display name from users table
		var displayName string
		r.db.WithContext(ctx).
			Model(&domain.User{}).
			Select("display_name").
			Where("id = ?", cu.UserID).
			Scan(&displayName)

		result = append(result, domain.RaterProgress{
			UserID:         cu.UserID,
			UserEmail:      cu.UserEmail,
			DisplayName:    displayName,
			CasesCompleted: cu.CasesCompleted,
			TotalCases:     int(totalCases),
			IsComplete:     cu.CasesCompleted >= int(totalCases),
			LastResponseAt: cu.LastResponseAt,
		})
	}

	return result, nil
}

// UpdateUserProgress updates a user's progress in a cohort.
func (r *CohortRepository) UpdateUserProgress(ctx context.Context, cohortID, userID uuid.UUID, casesCompleted int) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&domain.CohortUser{}).
		Where("cohort_id = ? AND user_id = ?", cohortID, userID).
		Updates(map[string]interface{}{
			"cases_completed":  casesCompleted,
			"last_response_at": now,
		}).Error
}

// ============================================================================
// Status Transitions
// ============================================================================

// Activate changes a cohort from draft to active.
func (r *CohortRepository) Activate(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.StudyCohort{}).
		Where("id = ? AND status = ?", id, domain.CohortStatusDraft).
		Updates(map[string]interface{}{
			"status":     domain.CohortStatusActive,
			"updated_at": time.Now(),
		}).Error
}

// Close changes a cohort to closed status.
func (r *CohortRepository) Close(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.StudyCohort{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     domain.CohortStatusClosed,
			"updated_at": time.Now(),
		}).Error
}

// ============================================================================
// Counter Updates
// ============================================================================

// UpdateCounters recalculates and updates all denormalized counters.
func (r *CohortRepository) UpdateCounters(ctx context.Context, cohortID uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Count cases (studies in cohort)
		var caseCount int64
		if err := tx.Model(&domain.Study{}).
			Where("cohort_id = ?", cohortID).
			Count(&caseCount).Error; err != nil {
			return err
		}

		// Get all study IDs in this cohort
		var studyIDs []uuid.UUID
		if err := tx.Model(&domain.Study{}).
			Where("cohort_id = ?", cohortID).
			Pluck("id", &studyIDs).Error; err != nil {
			return err
		}

		var totalResponses int64
		var uniqueRaters int64
		var completeRaters int64

		if len(studyIDs) > 0 {
			// Count total responses across all cases
			if err := tx.Model(&domain.StudyResponse{}).
				Where("study_id IN ?", studyIDs).
				Count(&totalResponses).Error; err != nil {
				return err
			}

			// Count unique raters (users who responded to any case)
			if err := tx.Model(&domain.StudyResponse{}).
				Where("study_id IN ?", studyIDs).
				Distinct("user_id").
				Count(&uniqueRaters).Error; err != nil {
				return err
			}

			// Count complete raters (users who responded to ALL cases)
			if caseCount > 0 {
				subquery := tx.Model(&domain.StudyResponse{}).
					Select("user_id, COUNT(DISTINCT study_id) as case_count").
					Where("study_id IN ?", studyIDs).
					Group("user_id").
					Having("COUNT(DISTINCT study_id) = ?", caseCount)

				var completeUsers []struct {
					UserID    uuid.UUID
					CaseCount int64
				}
				if err := subquery.Find(&completeUsers).Error; err != nil {
					return err
				}
				completeRaters = int64(len(completeUsers))
			}
		}

		// Update counters
		return tx.Model(&domain.StudyCohort{}).
			Where("id = ?", cohortID).
			Updates(map[string]interface{}{
				"case_count":      caseCount,
				"total_responses": totalResponses,
				"unique_raters":   uniqueRaters,
				"complete_raters": completeRaters,
				"updated_at":      time.Now(),
			}).Error
	})
}

// ============================================================================
// CohortResponseRepository Implementation
// ============================================================================

// CohortResponseRepository handles response queries across cohorts.
type CohortResponseRepository struct {
	db *gorm.DB
}

// NewCohortResponseRepository creates a new cohort response repository.
func NewCohortResponseRepository(db *gorm.DB) *CohortResponseRepository {
	return &CohortResponseRepository{db: db}
}

// GetAllByCohort retrieves all responses for all cases in a cohort.
// Returns a map of studyID -> responses.
func (r *CohortResponseRepository) GetAllByCohort(ctx context.Context, cohortID uuid.UUID) (map[uuid.UUID][]domain.StudyResponse, error) {
	// Get all study IDs in this cohort
	var studyIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("cohort_id = ?", cohortID).
		Pluck("id", &studyIDs).Error; err != nil {
		return nil, err
	}

	if len(studyIDs) == 0 {
		return make(map[uuid.UUID][]domain.StudyResponse), nil
	}

	// Get all responses for these studies
	var responses []domain.StudyResponse
	if err := r.db.WithContext(ctx).
		Where("study_id IN ?", studyIDs).
		Order("created_at ASC").
		Find(&responses).Error; err != nil {
		return nil, err
	}

	// Group by study ID
	result := make(map[uuid.UUID][]domain.StudyResponse)
	for _, studyID := range studyIDs {
		result[studyID] = []domain.StudyResponse{}
	}
	for _, resp := range responses {
		result[resp.StudyID] = append(result[resp.StudyID], resp)
	}

	return result, nil
}

// GetCompleteRaterResponses retrieves responses only from raters who completed all cases.
func (r *CohortResponseRepository) GetCompleteRaterResponses(ctx context.Context, cohortID uuid.UUID) (map[uuid.UUID][]domain.StudyResponse, error) {
	// Get all responses first
	allResponses, err := r.GetAllByCohort(ctx, cohortID)
	if err != nil {
		return nil, err
	}

	// Get complete raters
	completeRaters, err := r.getCompleteRaterIDs(ctx, cohortID)
	if err != nil {
		return nil, err
	}

	// Filter to only complete raters
	result := make(map[uuid.UUID][]domain.StudyResponse)
	for studyID, responses := range allResponses {
		filtered := make([]domain.StudyResponse, 0)
		for _, resp := range responses {
			if completeRaters[resp.UserID] {
				filtered = append(filtered, resp)
			}
		}
		result[studyID] = filtered
	}

	return result, nil
}

// CountUniqueRaters counts unique users who responded to any case in the cohort.
func (r *CohortResponseRepository) CountUniqueRaters(ctx context.Context, cohortID uuid.UUID) (int64, error) {
	var studyIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("cohort_id = ?", cohortID).
		Pluck("id", &studyIDs).Error; err != nil {
		return 0, err
	}

	if len(studyIDs) == 0 {
		return 0, nil
	}

	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Where("study_id IN ?", studyIDs).
		Distinct("user_id").
		Count(&count).Error
	return count, err
}

// CountCompleteRaters counts users who responded to ALL cases in the cohort.
func (r *CohortResponseRepository) CountCompleteRaters(ctx context.Context, cohortID uuid.UUID) (int64, error) {
	completeRaters, err := r.getCompleteRaterIDs(ctx, cohortID)
	if err != nil {
		return 0, err
	}
	return int64(len(completeRaters)), nil
}

// GetRaterCaseCompletion returns a map of userID -> list of studyIDs they completed.
func (r *CohortResponseRepository) GetRaterCaseCompletion(ctx context.Context, cohortID uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	var studyIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("cohort_id = ?", cohortID).
		Pluck("id", &studyIDs).Error; err != nil {
		return nil, err
	}

	if len(studyIDs) == 0 {
		return make(map[uuid.UUID][]uuid.UUID), nil
	}

	// Get distinct user-study combinations
	type UserStudy struct {
		UserID  uuid.UUID
		StudyID uuid.UUID
	}
	var userStudies []UserStudy
	if err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Select("DISTINCT user_id, study_id").
		Where("study_id IN ?", studyIDs).
		Find(&userStudies).Error; err != nil {
		return nil, err
	}

	// Group by user
	result := make(map[uuid.UUID][]uuid.UUID)
	for _, us := range userStudies {
		result[us.UserID] = append(result[us.UserID], us.StudyID)
	}

	return result, nil
}

// getCompleteRaterIDs returns a set of user IDs who completed all cases in the cohort.
func (r *CohortResponseRepository) getCompleteRaterIDs(ctx context.Context, cohortID uuid.UUID) (map[uuid.UUID]bool, error) {
	// Get total case count
	var totalCases int64
	if err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("cohort_id = ?", cohortID).
		Count(&totalCases).Error; err != nil {
		return nil, err
	}

	if totalCases == 0 {
		return make(map[uuid.UUID]bool), nil
	}

	// Get study IDs
	var studyIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("cohort_id = ?", cohortID).
		Pluck("id", &studyIDs).Error; err != nil {
		return nil, err
	}

	// Find users who responded to all cases
	type UserCaseCount struct {
		UserID    uuid.UUID
		CaseCount int64
	}
	var userCounts []UserCaseCount
	if err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Select("user_id, COUNT(DISTINCT study_id) as case_count").
		Where("study_id IN ?", studyIDs).
		Group("user_id").
		Having("COUNT(DISTINCT study_id) = ?", totalCases).
		Find(&userCounts).Error; err != nil {
		return nil, err
	}

	result := make(map[uuid.UUID]bool)
	for _, uc := range userCounts {
		result[uc.UserID] = true
	}

	return result, nil
}

// CountUserCasesCompleted counts how many cases a specific user has completed in a cohort.
func (r *CohortResponseRepository) CountUserCasesCompleted(ctx context.Context, cohortID, userID uuid.UUID) (int, error) {
	// Get study IDs in this cohort
	var studyIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("cohort_id = ?", cohortID).
		Pluck("id", &studyIDs).Error; err != nil {
		return 0, err
	}

	if len(studyIDs) == 0 {
		return 0, nil
	}

	// Count distinct studies the user has responded to within this cohort
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Where("study_id IN ? AND user_id = ?", studyIDs, userID).
		Distinct("study_id").
		Count(&count).Error

	return int(count), err
}
