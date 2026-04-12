package postgres

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
)

// CaseRepository implements case persistence with PostgreSQL.
type CaseRepository struct {
	db *gorm.DB
}

// NewCaseRepository creates a new PostgreSQL case repository.
func NewCaseRepository(db *gorm.DB) *CaseRepository {
	return &CaseRepository{db: db}
}

// Create creates a new case.
func (r *CaseRepository) Create(ctx context.Context, cs *domain.Case) error {
	if err := r.db.WithContext(ctx).Create(cs).Error; err != nil {
		return fmt.Errorf("create: %w", err)
	}
	return nil
}

// GetByID retrieves a case by its ID.
func (r *CaseRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Case, error) {
	var cs domain.Case
	result := r.db.WithContext(ctx).First(&cs, "id = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("get by id: %w", result.Error)
	}
	return &cs, nil
}

// Update updates a case.
func (r *CaseRepository) Update(ctx context.Context, cs *domain.Case) error {
	cs.UpdatedAt = time.Now()
	if err := r.db.WithContext(ctx).Save(cs).Error; err != nil {
		return fmt.Errorf("update: %w", err)
	}
	return nil
}

// Delete deletes a case and all associated data (images, responses, users) by its ID.
func (r *CaseRepository) Delete(ctx context.Context, id uuid.UUID) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete all responses
		if err := tx.Delete(&domain.CaseResponse{}, "case_id = ?", id).Error; err != nil {
			return fmt.Errorf("delete case responses: %w", err)
		}

		// Delete all images (storage files should be deleted separately)
		if err := tx.Delete(&domain.CaseImage{}, "case_id = ?", id).Error; err != nil {
			return fmt.Errorf("delete case images: %w", err)
		}

		// Delete the case
		if err := tx.Delete(&domain.Case{}, "id = ?", id).Error; err != nil {
			return fmt.Errorf("delete case: %w", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete: %w", err)
	}
	return nil
}

// List retrieves cases with optional status filter and pagination.
func (r *CaseRepository) List(ctx context.Context, status *domain.CaseStatus, limit, offset int) ([]domain.Case, int64, error) {
	var cases []domain.Case
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.Case{})
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("list count: %w", err)
	}

	q := query.Order("created_at ASC")
	if limit > 0 {
		q = q.Limit(limit).Offset(offset)
	}
	if err := q.Find(&cases).Error; err != nil {
		return nil, 0, fmt.Errorf("list find: %w", err)
	}

	return cases, total, nil
}

// ListPublished retrieves only published cases with pagination.
func (r *CaseRepository) ListPublished(ctx context.Context, limit, offset int) ([]domain.Case, int64, error) {
	status := domain.CaseStatusPublished
	return r.List(ctx, &status, limit, offset)
}

// AddImage adds an image to a case.
func (r *CaseRepository) AddImage(ctx context.Context, image *domain.CaseImage) error {
	if err := r.db.WithContext(ctx).Create(image).Error; err != nil {
		return fmt.Errorf("add image: %w", err)
	}
	return nil
}

// GetImages retrieves all images for a case ordered by category and display order.
func (r *CaseRepository) GetImages(ctx context.Context, caseID uuid.UUID) ([]domain.CaseImage, error) {
	var images []domain.CaseImage
	err := r.db.WithContext(ctx).
		Where("case_id = ?", caseID).
		Order("category ASC, display_order ASC").
		Find(&images).Error
	if err != nil {
		return nil, fmt.Errorf("get images: %w", err)
	}
	return images, nil
}

// GetImagesForCases batch loads images for multiple cases.
// Returns a map keyed by case ID for O(1) lookup.
func (r *CaseRepository) GetImagesForCases(ctx context.Context, caseIDs []uuid.UUID) (map[uuid.UUID][]domain.CaseImage, error) {
	if len(caseIDs) == 0 {
		return make(map[uuid.UUID][]domain.CaseImage), nil
	}

	var images []domain.CaseImage
	if err := r.db.WithContext(ctx).
		Where("case_id IN ?", caseIDs).
		Order("case_id, category ASC, display_order ASC").
		Find(&images).Error; err != nil {
		return nil, fmt.Errorf("batch load images for %d cases: %w", len(caseIDs), err)
	}

	// Pre-allocate map with known capacity
	result := make(map[uuid.UUID][]domain.CaseImage, len(caseIDs))
	for _, img := range images {
		result[img.CaseID] = append(result[img.CaseID], img)
	}
	return result, nil
}

// GetImageByID retrieves an image by its ID.
func (r *CaseRepository) GetImageByID(ctx context.Context, imageID uuid.UUID) (*domain.CaseImage, error) {
	var image domain.CaseImage
	result := r.db.WithContext(ctx).First(&image, "id = ?", imageID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("get image by id: %w", result.Error)
	}
	return &image, nil
}

// UpdateImage updates an image's mutable fields (display_order).
func (r *CaseRepository) UpdateImage(ctx context.Context, image *domain.CaseImage) error {
	err := r.db.WithContext(ctx).
		Model(&domain.CaseImage{}).
		Where("id = ?", image.ID).
		Updates(map[string]any{
			"display_order": image.DisplayOrder,
		}).Error
	if err != nil {
		return fmt.Errorf("update image: %w", err)
	}
	return nil
}

// ReorderImages updates display_order for multiple images in a single transaction.
func (r *CaseRepository) ReorderImages(ctx context.Context, caseID uuid.UUID, orders map[uuid.UUID]int) error {
	if len(orders) == 0 {
		return nil
	}
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for imageID, order := range orders {
			if err := tx.Model(&domain.CaseImage{}).
				Where("id = ? AND case_id = ?", imageID, caseID).
				Update("display_order", order).Error; err != nil {
				return fmt.Errorf("reorder image %s: %w", imageID, err)
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("reorder images: %w", err)
	}
	return nil
}

// DeleteImage deletes an image by its ID.
func (r *CaseRepository) DeleteImage(ctx context.Context, imageID uuid.UUID) error {
	if err := r.db.WithContext(ctx).Delete(&domain.CaseImage{}, "id = ?", imageID).Error; err != nil {
		return fmt.Errorf("delete image: %w", err)
	}
	return nil
}

// UpdateHasTACImages recalculates and updates the has_tac_images flag for a case.
func (r *CaseRepository) UpdateHasTACImages(ctx context.Context, caseID uuid.UUID) error {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&domain.CaseImage{}).
		Where("case_id = ? AND category = ?", caseID, domain.ImageCategoryTAC).
		Count(&count).Error; err != nil {
		return fmt.Errorf("update has tac images count: %w", err)
	}

	if err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ?", caseID).
		Update("has_tac_images", count > 0).Error; err != nil {
		return fmt.Errorf("update has tac images: %w", err)
	}
	return nil
}

// Publish changes a case status from draft to published.
func (r *CaseRepository) Publish(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ? AND status = ?", id, domain.CaseStatusDraft).
		Updates(map[string]any{
			"status":       domain.CaseStatusPublished,
			"published_at": now,
			"updated_at":   now,
		}).Error
	if err != nil {
		return fmt.Errorf("publish: %w", err)
	}
	return nil
}

// Close changes a case status to closed.
func (r *CaseRepository) Close(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ? AND status = ?", id, domain.CaseStatusPublished).
		Updates(map[string]any{
			"status":     domain.CaseStatusClosed,
			"closed_at":  now,
			"updated_at": now,
		}).Error
	if err != nil {
		return fmt.Errorf("close: %w", err)
	}
	return nil
}

// IncrementResponseCount increments the response count for a case.
func (r *CaseRepository) IncrementResponseCount(ctx context.Context, caseID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ?", caseID).
		UpdateColumn("response_count", gorm.Expr("response_count + 1")).Error
	if err != nil {
		return fmt.Errorf("increment response count: %w", err)
	}
	return nil
}

// UpdateUniqueUsers updates the unique users count for a case.
func (r *CaseRepository) UpdateUniqueUsers(ctx context.Context, caseID uuid.UUID, count int) error {
	err := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ?", caseID).
		Update("unique_users", count).Error
	if err != nil {
		return fmt.Errorf("update unique users: %w", err)
	}
	return nil
}

// GetByIDs batch loads cases by their IDs.
// Returns results in unordered fashion (caller should sort if needed).
func (r *CaseRepository) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]domain.Case, error) {
	if len(ids) == 0 {
		return []domain.Case{}, nil
	}
	var cases []domain.Case
	if err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&cases).Error; err != nil {
		return nil, fmt.Errorf("get by ids: %w", err)
	}
	return cases, nil
}

// GetDashboardStats retrieves aggregated dashboard statistics.
func (r *CaseRepository) GetDashboardStats(ctx context.Context) (*domain.DashboardStats, error) {
	var stats domain.DashboardStats

	err := r.db.WithContext(ctx).Model(&domain.Case{}).Select(
		"COUNT(*) as total_cases",
		"COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_cases",
		"COUNT(CASE WHEN status = 'published' THEN 1 END) as published_cases",
		"COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_cases",
		"COALESCE(SUM(response_count), 0) as total_responses",
		"(SELECT COUNT(DISTINCT user_id) FROM case_responses) as total_unique_users",
		"CASE WHEN COUNT(*) > 0 THEN ROUND(CAST(COALESCE(SUM(response_count), 0) AS REAL) / COUNT(*)) ELSE 0 END as avg_responses_per_case",
	).Scan(&stats).Error

	if err != nil {
		return nil, fmt.Errorf("get dashboard stats: %w", err)
	}

	return &stats, nil
}

// GetRecentActiveCases retrieves the most recently updated cases that have responses.
func (r *CaseRepository) GetRecentActiveCases(ctx context.Context, limit int) ([]domain.DashboardRecentCase, error) {
	var cases []domain.DashboardRecentCase

	err := r.db.WithContext(ctx).Model(&domain.Case{}).
		Select("id, title, status, response_count, updated_at").
		Where("response_count > 0").
		Order("updated_at DESC").
		Limit(limit).
		Scan(&cases).Error

	if err != nil {
		return nil, fmt.Errorf("get recent active cases: %w", err)
	}

	return cases, nil
}

// GetCasesNeedingAttention retrieves published cases with no responses or past deadline.
func (r *CaseRepository) GetCasesNeedingAttention(ctx context.Context, limit int) ([]domain.DashboardAttentionCase, error) {
	var cases []domain.DashboardAttentionCase

	err := r.db.WithContext(ctx).Model(&domain.Case{}).
		Select("id, title, deadline").
		Where("status = ? AND (response_count = 0 OR (deadline IS NOT NULL AND deadline < NOW()))", domain.CaseStatusPublished).
		Limit(limit).
		Scan(&cases).Error

	if err != nil {
		return nil, fmt.Errorf("get cases needing attention: %w", err)
	}

	return cases, nil
}

// CaseResponseRepository implements case response persistence with synchronous writes.
type CaseResponseRepository struct {
	db *gorm.DB
}

// NewCaseResponseRepository creates a new case response repository.
func NewCaseResponseRepository(db *gorm.DB) *CaseResponseRepository {
	return &CaseResponseRepository{db: db}
}

// Save persists a case response and updates case counters.
func (r *CaseResponseRepository) Save(ctx context.Context, response *domain.CaseResponse) error {
	if err := r.db.WithContext(ctx).Create(response).Error; err != nil {
		return fmt.Errorf("save case response: %w", err)
	}

	r.updateCaseCounters(ctx, response.CaseID)
	return nil
}

// GetByCase retrieves all responses for a case with pagination.
func (r *CaseResponseRepository) GetByCase(ctx context.Context, caseID uuid.UUID, limit, offset int) ([]domain.CaseResponse, int64, error) {
	var responses []domain.CaseResponse
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.CaseResponse{}).Where("case_id = ?", caseID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("get by case count: %w", err)
	}

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&responses).Error; err != nil {
		return nil, 0, fmt.Errorf("get by case find: %w", err)
	}

	return responses, total, nil
}

// GetByUserAndCase retrieves all responses by a user for a case.
func (r *CaseResponseRepository) GetByUserAndCase(ctx context.Context, userID, caseID uuid.UUID) ([]domain.CaseResponse, error) {
	var responses []domain.CaseResponse
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND case_id = ?", userID, caseID).
		Order("created_at DESC").
		Find(&responses).Error
	if err != nil {
		return nil, fmt.Errorf("get by user and case: %w", err)
	}
	return responses, nil
}

// GetByUserAndCases batch loads responses for a user across multiple cases.
// Returns a map keyed by case ID for O(1) lookup.
func (r *CaseResponseRepository) GetByUserAndCases(ctx context.Context, userID uuid.UUID, caseIDs []uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error) {
	if len(caseIDs) == 0 {
		return make(map[uuid.UUID][]domain.CaseResponse), nil
	}

	var responses []domain.CaseResponse
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND case_id IN ?", userID, caseIDs).
		Order("case_id, created_at DESC").
		Find(&responses).Error; err != nil {
		return nil, fmt.Errorf("batch load user responses for %d cases: %w", len(caseIDs), err)
	}

	// Pre-allocate map with known capacity
	result := make(map[uuid.UUID][]domain.CaseResponse, len(caseIDs))
	for _, resp := range responses {
		result[resp.CaseID] = append(result[resp.CaseID], resp)
	}
	return result, nil
}

// CountByCase counts the total responses for a case.
func (r *CaseResponseRepository) CountByCase(ctx context.Context, caseID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("case_id = ?", caseID).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("count by case: %w", err)
	}
	return count, nil
}

// CountUniqueUsersByCase counts unique users who responded to a case.
func (r *CaseResponseRepository) CountUniqueUsersByCase(ctx context.Context, caseID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("case_id = ?", caseID).
		Distinct("user_id").
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("count unique users by case: %w", err)
	}
	return count, nil
}

// updateCaseCounters updates the response_count and unique_users for a case.
func (r *CaseResponseRepository) updateCaseCounters(ctx context.Context, caseID uuid.UUID) {
	// Increment response count
	if err := r.db.WithContext(ctx).Model(&domain.Case{}).
		Where("id = ?", caseID).
		UpdateColumn("response_count", gorm.Expr("response_count + 1")).Error; err != nil {
		slog.Error("failed to increment response count", "case_id", caseID, "error", err)
	}

	// Count and update unique users
	var uniqueCount int64
	if err := r.db.WithContext(ctx).Model(&domain.CaseResponse{}).
		Where("case_id = ?", caseID).
		Distinct("user_id").
		Count(&uniqueCount).Error; err != nil {
		slog.Error("failed to count unique users", "case_id", caseID, "error", err)
		return
	}

	if err := r.db.WithContext(ctx).Model(&domain.Case{}).
		Where("id = ?", caseID).
		Update("unique_users", uniqueCount).Error; err != nil {
		slog.Error("failed to update unique users", "case_id", caseID, "error", err)
	}
}

// HasUserResponded checks if a user has already submitted a response to a case.
func (r *CaseResponseRepository) HasUserResponded(ctx context.Context, userID, caseID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.WithContext(ctx).
		Raw("SELECT EXISTS(SELECT 1 FROM case_responses WHERE user_id = ? AND case_id = ? LIMIT 1)", userID, caseID).
		Scan(&exists).Error
	if err != nil {
		return false, fmt.Errorf("has user responded: %w", err)
	}
	return exists, nil
}

// GetAllByCase retrieves all responses for a case without pagination (for Kappa calculation).
func (r *CaseResponseRepository) GetAllByCase(ctx context.Context, caseID uuid.UUID) ([]domain.CaseResponse, error) {
	var responses []domain.CaseResponse
	err := r.db.WithContext(ctx).
		Where("case_id = ?", caseID).
		Order("created_at ASC").
		Find(&responses).Error
	if err != nil {
		return nil, fmt.Errorf("get all by case: %w", err)
	}
	return responses, nil
}

// GetResponsesWithUserExpertise retrieves responses joined with user expertise data.
func (r *CaseResponseRepository) GetResponsesWithUserExpertise(ctx context.Context, caseID uuid.UUID) ([]domain.ResponseWithExpertise, error) {
	var results []domain.ResponseWithExpertise

	err := r.db.WithContext(ctx).
		Table("case_responses cr").
		Select(`
			cr.id, cr.case_id, cr.user_id, cr.created_at, cr.classification, cr.time_taken_ms,
			cr.danis_weber_type, cr.lauge_hansen_type, cr.ao_ota_code, cr.bartonicek_type,
			u.email as user_email, u.display_name as user_display_name,
			u.years_experience, u.specialty, u.training_level, u.institution
		`).
		Joins("JOIN users u ON cr.user_id = u.id").
		Where("cr.case_id = ?", caseID).
		Order("cr.created_at ASC").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("get responses with user expertise: %w", err)
	}
	return results, nil
}

// CountRespondedPublishedCases counts how many published cases a user has responded to.
func (r *CaseResponseRepository) CountRespondedPublishedCases(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Joins("JOIN cases ON cases.id = case_responses.case_id AND cases.status = ?", domain.CaseStatusPublished).
		Where("case_responses.user_id = ?", userID).
		Distinct("case_responses.case_id").
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("count responded published cases: %w", err)
	}
	return count, nil
}

// CaseAnalyticsRepository implements case analytics queries.
type CaseAnalyticsRepository struct {
	db *gorm.DB
}

// NewCaseAnalyticsRepository creates a new case analytics repository.
func NewCaseAnalyticsRepository(db *gorm.DB) *CaseAnalyticsRepository {
	return &CaseAnalyticsRepository{db: db}
}

// GetSummary retrieves aggregated analytics for a case.
func (r *CaseAnalyticsRepository) GetSummary(ctx context.Context, caseID uuid.UUID) (*domain.CaseAnalyticsSummary, error) {
	// Single query for all basic counts (was 3 separate queries)
	var counts struct {
		ResponseCount int64
		UniqueUsers   int64
		AvgTimeTaken  float64
	}
	if err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Select("COUNT(*) as response_count, COUNT(DISTINCT user_id) as unique_users, COALESCE(AVG(time_taken_ms), 0) as avg_time_taken").
		Where("case_id = ?", caseID).
		Scan(&counts).Error; err != nil {
		return nil, fmt.Errorf("get summary counts: %w", err)
	}

	// Get case info
	var cs domain.Case
	if err := r.db.WithContext(ctx).First(&cs, "id = ?", caseID).Error; err != nil {
		return nil, fmt.Errorf("get summary case info: %w", err)
	}

	// Single query for all distributions (was 4 separate queries)
	dwDist, lhDist, aoDist, btDist, err := r.getAllDistributions(ctx, caseID)
	if err != nil {
		slog.Warn("failed to get distributions", "case_id", caseID, "error", err)
	}

	return &domain.CaseAnalyticsSummary{
		CaseID:            caseID,
		Title:             cs.Title,
		Status:            cs.Status,
		ResponseCount:     counts.ResponseCount,
		UniqueRespondents: counts.UniqueUsers,
		AvgTimeTakenMS:    counts.AvgTimeTaken,
		DanisWeberDist:    dwDist,
		LaugeHansenDist:   lhDist,
		AOOTADist:         aoDist,
		BartonicekDist:    btDist,
	}, nil
}

// getAllDistributions fetches all classification distributions in a single query using UNION ALL.
func (r *CaseAnalyticsRepository) getAllDistributions(ctx context.Context, caseID uuid.UUID) (dw, lh, ao, bt map[string]int64, err error) {
	var rows []struct {
		System string
		Value  string
		Count  int64
	}

	query := `
		SELECT 'danis_weber' as system, danis_weber_type as value, COUNT(*) as count
		FROM case_responses WHERE case_id = ? AND danis_weber_type IS NOT NULL GROUP BY danis_weber_type
		UNION ALL
		SELECT 'lauge_hansen', lauge_hansen_type, COUNT(*)
		FROM case_responses WHERE case_id = ? AND lauge_hansen_type IS NOT NULL GROUP BY lauge_hansen_type
		UNION ALL
		SELECT 'ao_ota', ao_ota_code, COUNT(*)
		FROM case_responses WHERE case_id = ? AND ao_ota_code IS NOT NULL GROUP BY ao_ota_code
		UNION ALL
		SELECT 'bartonicek', bartonicek_type, COUNT(*)
		FROM case_responses WHERE case_id = ? AND bartonicek_type IS NOT NULL GROUP BY bartonicek_type
	`
	if err := r.db.WithContext(ctx).Raw(query, caseID, caseID, caseID, caseID).Scan(&rows).Error; err != nil {
		return nil, nil, nil, nil, fmt.Errorf("get all distributions: %w", err)
	}

	dw = make(map[string]int64)
	lh = make(map[string]int64)
	ao = make(map[string]int64)
	bt = make(map[string]int64)
	for _, row := range rows {
		switch row.System {
		case "danis_weber":
			dw[row.Value] = row.Count
		case "lauge_hansen":
			lh[row.Value] = row.Count
		case "ao_ota":
			ao[row.Value] = row.Count
		case "bartonicek":
			bt[row.Value] = row.Count
		}
	}
	return dw, lh, ao, bt, nil
}

// GetClassificationDistribution retrieves distribution for a specific classification system.
func (r *CaseAnalyticsRepository) GetClassificationDistribution(ctx context.Context, caseID uuid.UUID, system string) (map[string]int64, error) {
	columnName := ""
	switch system {
	case "danis-weber", "danis_weber":
		columnName = "danis_weber_type"
	case "lauge-hansen", "lauge_hansen":
		columnName = "lauge_hansen_type"
	case "ao-ota", "ao_ota":
		columnName = "ao_ota_code"
	case "bartonicek":
		columnName = "bartonicek_type"
	default:
		return nil, errors.New("unknown classification system")
	}

	return r.getDistribution(ctx, caseID, columnName)
}

// getDistribution is a helper to get distribution for a column.
func (r *CaseAnalyticsRepository) getDistribution(ctx context.Context, caseID uuid.UUID, columnName string) (map[string]int64, error) {
	var rows []struct {
		Value string
		Count int64
	}

	err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Select(columnName+" as value, COUNT(*) as count").
		Where("case_id = ? AND "+columnName+" IS NOT NULL", caseID).
		Group(columnName).
		Scan(&rows).Error

	if err != nil {
		return nil, fmt.Errorf("get distribution for %s: %w", columnName, err)
	}

	result := make(map[string]int64)
	for _, row := range rows {
		result[row.Value] = row.Count
	}

	return result, nil
}
