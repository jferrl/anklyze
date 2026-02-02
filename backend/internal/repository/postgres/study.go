package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
)

// StudyRepository implements study persistence with PostgreSQL.
type StudyRepository struct {
	db *gorm.DB
}

// NewStudyRepository creates a new PostgreSQL study repository.
func NewStudyRepository(db *gorm.DB) *StudyRepository {
	return &StudyRepository{db: db}
}

// Create creates a new study.
func (r *StudyRepository) Create(ctx context.Context, study *domain.Study) error {
	return r.db.WithContext(ctx).Create(study).Error
}

// GetByID retrieves a study by its ID.
func (r *StudyRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Study, error) {
	var study domain.Study
	result := r.db.WithContext(ctx).First(&study, "id = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}
	return &study, nil
}

// Update updates a study.
func (r *StudyRepository) Update(ctx context.Context, study *domain.Study) error {
	study.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(study).Error
}

// Delete deletes a study and removes all associated data.
func (r *StudyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete all study raters first
		if err := tx.Delete(&domain.StudyRater{}, "study_id = ?", id).Error; err != nil {
			return err
		}

		// Clear study_id from all cases in this study
		if err := tx.Model(&domain.Case{}).
			Where("study_id = ?", id).
			Updates(map[string]interface{}{
				"study_id":   nil,
				"case_order": 0,
			}).Error; err != nil {
			return err
		}

		// Delete the study
		return tx.Delete(&domain.Study{}, "id = ?", id).Error
	})
}

// List retrieves studies with optional status filter and pagination.
func (r *StudyRepository) List(ctx context.Context, status *domain.StudyStatus, limit, offset int) ([]domain.Study, int64, error) {
	var studies []domain.Study
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.Study{})
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&studies).Error; err != nil {
		return nil, 0, err
	}

	return studies, total, nil
}

// ============================================================================
// Case Management (via Case.StudyID)
// ============================================================================

// AddCase assigns a case to a study with the given case order.
func (r *StudyRepository) AddCase(ctx context.Context, studyID, caseID uuid.UUID, caseOrder int) error {
	return r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ?", caseID).
		Updates(map[string]interface{}{
			"study_id":   studyID,
			"case_order": caseOrder,
			"updated_at": time.Now(),
		}).Error
}

// RemoveCase removes a case from a study (clears study_id).
func (r *StudyRepository) RemoveCase(ctx context.Context, studyID, caseID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ? AND study_id = ?", caseID, studyID).
		Updates(map[string]interface{}{
			"study_id":   nil,
			"case_order": 0,
			"updated_at": time.Now(),
		}).Error
}

// GetCases retrieves all cases in a study, ordered by case_order.
func (r *StudyRepository) GetCases(ctx context.Context, studyID uuid.UUID) ([]domain.Case, error) {
	var cases []domain.Case
	err := r.db.WithContext(ctx).
		Where("study_id = ?", studyID).
		Order("case_order ASC").
		Find(&cases).Error
	return cases, err
}

// ReorderCases updates the case_order of cases in a study.
func (r *StudyRepository) ReorderCases(ctx context.Context, studyID uuid.UUID, caseIDs []uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i, caseID := range caseIDs {
			if err := tx.Model(&domain.Case{}).
				Where("id = ? AND study_id = ?", caseID, studyID).
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

// GetStudyByCaseID retrieves the study that contains a case (if any).
func (r *StudyRepository) GetStudyByCaseID(ctx context.Context, caseID uuid.UUID) (*domain.Study, error) {
	var cs domain.Case
	result := r.db.WithContext(ctx).Select("study_id").First(&cs, "id = ?", caseID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}

	if cs.StudyID == nil {
		return nil, nil
	}

	return r.GetByID(ctx, *cs.StudyID)
}

// GetNextCaseOrder returns the next available case order for a study.
func (r *StudyRepository) GetNextCaseOrder(ctx context.Context, studyID uuid.UUID) (int, error) {
	var maxOrder *int
	err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("study_id = ?", studyID).
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
// Rater Management
// ============================================================================

// AddRater assigns a user as a rater to a study.
func (r *StudyRepository) AddRater(ctx context.Context, studyID, userID uuid.UUID, email string) error {
	rater := domain.NewStudyRater(studyID, userID, email)
	return r.db.WithContext(ctx).Create(rater).Error
}

// RemoveRater removes a user from a study.
func (r *StudyRepository) RemoveRater(ctx context.Context, studyID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Delete(&domain.StudyRater{}, "study_id = ? AND user_id = ?", studyID, userID).Error
}

// GetRaters retrieves all raters assigned to a study.
func (r *StudyRepository) GetRaters(ctx context.Context, studyID uuid.UUID) ([]domain.StudyRater, error) {
	var raters []domain.StudyRater
	err := r.db.WithContext(ctx).
		Where("study_id = ?", studyID).
		Order("created_at ASC").
		Find(&raters).Error
	return raters, err
}

// HasAccess checks if a user is assigned to a study.
func (r *StudyRepository) HasAccess(ctx context.Context, studyID, userID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.StudyRater{}).
		Where("study_id = ? AND user_id = ?", studyID, userID).
		Count(&count).Error
	return count > 0, err
}

// GetRaterProgress retrieves completion progress for all raters in a study.
func (r *StudyRepository) GetRaterProgress(ctx context.Context, studyID uuid.UUID) ([]domain.RaterProgress, error) {
	// Get total cases count
	var totalCases int64
	if err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("study_id = ?", studyID).
		Count(&totalCases).Error; err != nil {
		return nil, err
	}

	// Get all study raters with their progress
	var raters []domain.StudyRater
	if err := r.db.WithContext(ctx).
		Where("study_id = ?", studyID).
		Order("created_at ASC").
		Find(&raters).Error; err != nil {
		return nil, err
	}

	// Build progress list
	result := make([]domain.RaterProgress, 0, len(raters))
	for _, rater := range raters {
		// Get display name from users table
		var displayName string
		r.db.WithContext(ctx).
			Model(&domain.User{}).
			Select("display_name").
			Where("id = ?", rater.UserID).
			Scan(&displayName)

		result = append(result, domain.RaterProgress{
			UserID:         rater.UserID,
			UserEmail:      rater.UserEmail,
			DisplayName:    displayName,
			CasesCompleted: rater.CasesCompleted,
			TotalCases:     int(totalCases),
			IsComplete:     rater.CasesCompleted >= int(totalCases),
			LastResponseAt: rater.LastResponseAt,
		})
	}

	return result, nil
}

// UpdateRaterProgress updates a rater's progress in a study.
func (r *StudyRepository) UpdateRaterProgress(ctx context.Context, studyID, userID uuid.UUID, casesCompleted int) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&domain.StudyRater{}).
		Where("study_id = ? AND user_id = ?", studyID, userID).
		Updates(map[string]interface{}{
			"cases_completed":  casesCompleted,
			"last_response_at": now,
		}).Error
}

// ============================================================================
// Status Transitions
// ============================================================================

// Activate changes a study from draft to active.
func (r *StudyRepository) Activate(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ? AND status = ?", id, domain.StudyStatusDraft).
		Updates(map[string]interface{}{
			"status":     domain.StudyStatusActive,
			"updated_at": time.Now(),
		}).Error
}

// Close changes a study to closed status.
func (r *StudyRepository) Close(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     domain.StudyStatusClosed,
			"updated_at": time.Now(),
		}).Error
}

// ============================================================================
// Counter Updates
// ============================================================================

// UpdateCounters recalculates and updates all denormalized counters.
func (r *StudyRepository) UpdateCounters(ctx context.Context, studyID uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Count cases in study
		var caseCount int64
		if err := tx.Model(&domain.Case{}).
			Where("study_id = ?", studyID).
			Count(&caseCount).Error; err != nil {
			return err
		}

		// Get all case IDs in this study
		var caseIDs []uuid.UUID
		if err := tx.Model(&domain.Case{}).
			Where("study_id = ?", studyID).
			Pluck("id", &caseIDs).Error; err != nil {
			return err
		}

		var totalResponses int64
		var uniqueRaters int64
		var completeRaters int64

		if len(caseIDs) > 0 {
			// Count total responses across all cases
			if err := tx.Model(&domain.CaseResponse{}).
				Where("case_id IN ?", caseIDs).
				Count(&totalResponses).Error; err != nil {
				return err
			}

			// Count unique raters (users who responded to any case)
			if err := tx.Model(&domain.CaseResponse{}).
				Where("case_id IN ?", caseIDs).
				Distinct("user_id").
				Count(&uniqueRaters).Error; err != nil {
				return err
			}

			// Count complete raters (users who responded to ALL cases)
			if caseCount > 0 {
				subquery := tx.Model(&domain.CaseResponse{}).
					Select("user_id, COUNT(DISTINCT case_id) as case_count").
					Where("case_id IN ?", caseIDs).
					Group("user_id").
					Having("COUNT(DISTINCT case_id) = ?", caseCount)

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
		return tx.Model(&domain.Study{}).
			Where("id = ?", studyID).
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
// StudyResponseRepository Implementation
// ============================================================================

// StudyResponseRepository handles response queries across studies.
type StudyResponseRepository struct {
	db *gorm.DB
}

// NewStudyResponseRepository creates a new study response repository.
func NewStudyResponseRepository(db *gorm.DB) *StudyResponseRepository {
	return &StudyResponseRepository{db: db}
}

// GetAllByStudy retrieves all responses for all cases in a study.
// Returns a map of caseID -> responses.
func (r *StudyResponseRepository) GetAllByStudy(ctx context.Context, studyID uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	// Get all case IDs in this study
	var caseIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("study_id = ?", studyID).
		Pluck("id", &caseIDs).Error; err != nil {
		return nil, err
	}

	if len(caseIDs) == 0 {
		return make(map[uuid.UUID][]domain.CaseResponse), nil
	}

	// Get all responses for these cases
	var responses []domain.CaseResponse
	if err := r.db.WithContext(ctx).
		Where("case_id IN ?", caseIDs).
		Order("created_at ASC").
		Find(&responses).Error; err != nil {
		return nil, err
	}

	// Group by case ID
	result := make(map[uuid.UUID][]domain.CaseResponse)
	for _, caseID := range caseIDs {
		result[caseID] = []domain.CaseResponse{}
	}
	for _, resp := range responses {
		result[resp.CaseID] = append(result[resp.CaseID], resp)
	}

	return result, nil
}

// GetCompleteRaterResponses retrieves responses only from raters who completed all cases.
func (r *StudyResponseRepository) GetCompleteRaterResponses(ctx context.Context, studyID uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	// Get all responses first
	allResponses, err := r.GetAllByStudy(ctx, studyID)
	if err != nil {
		return nil, err
	}

	// Get complete raters
	completeRaters, err := r.getCompleteRaterIDs(ctx, studyID)
	if err != nil {
		return nil, err
	}

	// Filter to only complete raters
	result := make(map[uuid.UUID][]domain.CaseResponse)
	for caseID, responses := range allResponses {
		filtered := make([]domain.CaseResponse, 0)
		for _, resp := range responses {
			if completeRaters[resp.UserID] {
				filtered = append(filtered, resp)
			}
		}
		result[caseID] = filtered
	}

	return result, nil
}

// CountUniqueRaters counts unique users who responded to any case in the study.
func (r *StudyResponseRepository) CountUniqueRaters(ctx context.Context, studyID uuid.UUID) (int64, error) {
	var caseIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("study_id = ?", studyID).
		Pluck("id", &caseIDs).Error; err != nil {
		return 0, err
	}

	if len(caseIDs) == 0 {
		return 0, nil
	}

	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("case_id IN ?", caseIDs).
		Distinct("user_id").
		Count(&count).Error
	return count, err
}

// CountCompleteRaters counts users who responded to ALL cases in the study.
func (r *StudyResponseRepository) CountCompleteRaters(ctx context.Context, studyID uuid.UUID) (int64, error) {
	completeRaters, err := r.getCompleteRaterIDs(ctx, studyID)
	if err != nil {
		return 0, err
	}
	return int64(len(completeRaters)), nil
}

// GetRaterCaseCompletion returns a map of userID -> list of caseIDs they completed.
func (r *StudyResponseRepository) GetRaterCaseCompletion(ctx context.Context, studyID uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	var caseIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("study_id = ?", studyID).
		Pluck("id", &caseIDs).Error; err != nil {
		return nil, err
	}

	if len(caseIDs) == 0 {
		return make(map[uuid.UUID][]uuid.UUID), nil
	}

	// Get distinct user-case combinations
	type UserCase struct {
		UserID uuid.UUID
		CaseID uuid.UUID
	}
	var userCases []UserCase
	if err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Select("DISTINCT user_id, case_id").
		Where("case_id IN ?", caseIDs).
		Find(&userCases).Error; err != nil {
		return nil, err
	}

	// Group by user
	result := make(map[uuid.UUID][]uuid.UUID)
	for _, uc := range userCases {
		result[uc.UserID] = append(result[uc.UserID], uc.CaseID)
	}

	return result, nil
}

// getCompleteRaterIDs returns a set of user IDs who completed all cases in the study.
func (r *StudyResponseRepository) getCompleteRaterIDs(ctx context.Context, studyID uuid.UUID) (map[uuid.UUID]bool, error) {
	// Get total case count
	var totalCases int64
	if err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("study_id = ?", studyID).
		Count(&totalCases).Error; err != nil {
		return nil, err
	}

	if totalCases == 0 {
		return make(map[uuid.UUID]bool), nil
	}

	// Get case IDs
	var caseIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("study_id = ?", studyID).
		Pluck("id", &caseIDs).Error; err != nil {
		return nil, err
	}

	// Find users who responded to all cases
	type UserCaseCount struct {
		UserID    uuid.UUID
		CaseCount int64
	}
	var userCounts []UserCaseCount
	if err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Select("user_id, COUNT(DISTINCT case_id) as case_count").
		Where("case_id IN ?", caseIDs).
		Group("user_id").
		Having("COUNT(DISTINCT case_id) = ?", totalCases).
		Find(&userCounts).Error; err != nil {
		return nil, err
	}

	result := make(map[uuid.UUID]bool)
	for _, uc := range userCounts {
		result[uc.UserID] = true
	}

	return result, nil
}

// CountUserCasesCompleted counts how many cases a specific user has completed in a study.
func (r *StudyResponseRepository) CountUserCasesCompleted(ctx context.Context, studyID, userID uuid.UUID) (int, error) {
	// Get case IDs in this study
	var caseIDs []uuid.UUID
	if err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("study_id = ?", studyID).
		Pluck("id", &caseIDs).Error; err != nil {
		return 0, err
	}

	if len(caseIDs) == 0 {
		return 0, nil
	}

	// Count distinct cases the user has responded to within this study
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("case_id IN ? AND user_id = ?", caseIDs, userID).
		Distinct("case_id").
		Count(&count).Error

	return int(count), err
}
