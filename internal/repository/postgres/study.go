package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
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
	if err := r.db.WithContext(ctx).Create(study).Error; err != nil {
		return fmt.Errorf("create: %w", err)
	}
	return nil
}

// GetByID retrieves a study by its ID.
func (r *StudyRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Study, error) {
	var study domain.Study
	result := r.db.WithContext(ctx).First(&study, "id = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("get by id: %w", result.Error)
	}
	return &study, nil
}

// Update updates a study.
func (r *StudyRepository) Update(ctx context.Context, study *domain.Study) error {
	study.UpdatedAt = time.Now()
	if err := r.db.WithContext(ctx).Save(study).Error; err != nil {
		return fmt.Errorf("update: %w", err)
	}
	return nil
}

// Delete deletes a study and removes all associated data.
func (r *StudyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Clear study_id from all cases in this study
		if err := tx.Model(&domain.Case{}).
			Where("study_id = ?", id).
			Updates(map[string]any{
				"study_id":   nil,
				"case_order": 0,
			}).Error; err != nil {
			return fmt.Errorf("clear study cases: %w", err)
		}

		// Delete the study
		if err := tx.Delete(&domain.Study{}, "id = ?", id).Error; err != nil {
			return fmt.Errorf("delete study: %w", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete: %w", err)
	}
	return nil
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
		return nil, 0, fmt.Errorf("list count: %w", err)
	}

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&studies).Error; err != nil {
		return nil, 0, fmt.Errorf("list find: %w", err)
	}

	return studies, total, nil
}

// ============================================================================
// Case Management (via Case.StudyID)
// ============================================================================

// AddCase assigns a case to a study with the given case order.
func (r *StudyRepository) AddCase(ctx context.Context, studyID, caseID uuid.UUID, caseOrder int) error {
	err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ?", caseID).
		Updates(map[string]any{
			"study_id":   studyID,
			"case_order": caseOrder,
			"updated_at": time.Now(),
		}).Error
	if err != nil {
		return fmt.Errorf("add case: %w", err)
	}
	return nil
}

// RemoveCase removes a case from a study (clears study_id).
func (r *StudyRepository) RemoveCase(ctx context.Context, studyID, caseID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ? AND study_id = ?", caseID, studyID).
		Updates(map[string]any{
			"study_id":   nil,
			"case_order": 0,
			"updated_at": time.Now(),
		}).Error
	if err != nil {
		return fmt.Errorf("remove case: %w", err)
	}
	return nil
}

// GetCases retrieves all cases in a study, ordered by case_order.
func (r *StudyRepository) GetCases(ctx context.Context, studyID uuid.UUID) ([]domain.Case, error) {
	var cases []domain.Case
	err := r.db.WithContext(ctx).
		Where("study_id = ?", studyID).
		Order("case_order ASC").
		Find(&cases).Error
	if err != nil {
		return nil, fmt.Errorf("get cases: %w", err)
	}
	return cases, nil
}

// ReorderCases updates the case_order of cases in a study.
func (r *StudyRepository) ReorderCases(ctx context.Context, studyID uuid.UUID, caseIDs []uuid.UUID) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i, caseID := range caseIDs {
			if err := tx.Model(&domain.Case{}).
				Where("id = ? AND study_id = ?", caseID, studyID).
				Updates(map[string]any{
					"case_order": i,
					"updated_at": time.Now(),
				}).Error; err != nil {
				return fmt.Errorf("reorder case %s: %w", caseID, err)
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("reorder cases: %w", err)
	}
	return nil
}

// GetStudyByCaseID retrieves the study that contains a case (if any).
func (r *StudyRepository) GetStudyByCaseID(ctx context.Context, caseID uuid.UUID) (*domain.Study, error) {
	var cs domain.Case
	result := r.db.WithContext(ctx).Select("study_id").First(&cs, "id = ?", caseID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("get study by case id: %w", result.Error)
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
		return 0, fmt.Errorf("get next case order: %w", err)
	}
	if maxOrder == nil {
		return 0, nil
	}
	return *maxOrder + 1, nil
}

// AddCases assigns multiple cases to a study in a single transaction.
func (r *StudyRepository) AddCases(ctx context.Context, studyID uuid.UUID, assignments []repository.CaseAssignment) error {
	if len(assignments) == 0 {
		return nil
	}
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		for _, a := range assignments {
			if err := tx.Model(&domain.Case{}).
				Where("id = ?", a.CaseID).
				Updates(map[string]any{
					"study_id":   studyID,
					"case_order": a.CaseOrder,
					"updated_at": now,
				}).Error; err != nil {
				return fmt.Errorf("add case %s: %w", a.CaseID, err)
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("add cases: %w", err)
	}
	return nil
}

// ============================================================================
// Status Transitions
// ============================================================================

// Activate changes a study from draft to active.
func (r *StudyRepository) Activate(ctx context.Context, id uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ? AND status = ?", id, domain.StudyStatusDraft).
		Updates(map[string]any{
			"status":     domain.StudyStatusActive,
			"updated_at": time.Now(),
		}).Error
	if err != nil {
		return fmt.Errorf("activate: %w", err)
	}
	return nil
}

// Close changes a study to closed status.
func (r *StudyRepository) Close(ctx context.Context, id uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":     domain.StudyStatusClosed,
			"updated_at": time.Now(),
		}).Error
	if err != nil {
		return fmt.Errorf("close: %w", err)
	}
	return nil
}

// ============================================================================
// Counter Updates
// ============================================================================

// UpdateCounters recalculates and updates all denormalized counters.
func (r *StudyRepository) UpdateCounters(ctx context.Context, studyID uuid.UUID) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Count cases in study
		var caseCount int64
		if err := tx.Model(&domain.Case{}).
			Where("study_id = ?", studyID).
			Count(&caseCount).Error; err != nil {
			return fmt.Errorf("count cases: %w", err)
		}

		// Get all case IDs in this study
		var caseIDs []uuid.UUID
		if err := tx.Model(&domain.Case{}).
			Where("study_id = ?", studyID).
			Pluck("id", &caseIDs).Error; err != nil {
			return fmt.Errorf("pluck case ids: %w", err)
		}

		var totalResponses int64
		var uniqueRaters int64
		var completeRaters int64

		if len(caseIDs) > 0 {
			// Count total responses across all cases
			if err := tx.Model(&domain.CaseResponse{}).
				Where("case_id IN ?", caseIDs).
				Count(&totalResponses).Error; err != nil {
				return fmt.Errorf("count total responses: %w", err)
			}

			// Count unique raters (users who responded to any case)
			if err := tx.Model(&domain.CaseResponse{}).
				Where("case_id IN ?", caseIDs).
				Distinct("user_id").
				Count(&uniqueRaters).Error; err != nil {
				return fmt.Errorf("count unique raters: %w", err)
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
					return fmt.Errorf("find complete raters: %w", err)
				}
				completeRaters = int64(len(completeUsers))
			}
		}

		// Update counters
		if err := tx.Model(&domain.Study{}).
			Where("id = ?", studyID).
			Updates(map[string]any{
				"case_count":      caseCount,
				"total_responses": totalResponses,
				"unique_raters":   uniqueRaters,
				"complete_raters": completeRaters,
				"updated_at":      time.Now(),
			}).Error; err != nil {
			return fmt.Errorf("update study counters: %w", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("update counters: %w", err)
	}
	return nil
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
		return nil, fmt.Errorf("get all by study pluck case ids: %w", err)
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
		return nil, fmt.Errorf("get all by study find responses: %w", err)
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
		return 0, fmt.Errorf("count unique raters pluck case ids: %w", err)
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
	if err != nil {
		return 0, fmt.Errorf("count unique raters: %w", err)
	}
	return count, nil
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
		return nil, fmt.Errorf("get rater case completion pluck case ids: %w", err)
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
		return nil, fmt.Errorf("get rater case completion find: %w", err)
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
		return nil, fmt.Errorf("get complete rater ids total cases: %w", err)
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
		return nil, fmt.Errorf("get complete rater ids pluck case ids: %w", err)
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
		return nil, fmt.Errorf("get complete rater ids find: %w", err)
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
		return 0, fmt.Errorf("count user cases completed pluck case ids: %w", err)
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
	if err != nil {
		return 0, fmt.Errorf("count user cases completed: %w", err)
	}

	return int(count), nil
}
