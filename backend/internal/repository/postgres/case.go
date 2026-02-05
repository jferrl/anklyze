package postgres

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
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
	return r.db.WithContext(ctx).Create(cs).Error
}

// GetByID retrieves a case by its ID.
func (r *CaseRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Case, error) {
	var cs domain.Case
	result := r.db.WithContext(ctx).First(&cs, "id = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}
	return &cs, nil
}

// Update updates a case.
func (r *CaseRepository) Update(ctx context.Context, cs *domain.Case) error {
	cs.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(cs).Error
}

// Delete deletes a case and all associated data (images, responses, users) by its ID.
func (r *CaseRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete all case users first
		if err := tx.Delete(&domain.CaseUser{}, "case_id = ?", id).Error; err != nil {
			return err
		}

		// Delete all responses
		if err := tx.Delete(&domain.CaseResponse{}, "case_id = ?", id).Error; err != nil {
			return err
		}

		// Delete all images (storage files should be deleted separately)
		if err := tx.Delete(&domain.CaseImage{}, "case_id = ?", id).Error; err != nil {
			return err
		}

		// Delete the case
		return tx.Delete(&domain.Case{}, "id = ?", id).Error
	})
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
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&cases).Error; err != nil {
		return nil, 0, err
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
	return r.db.WithContext(ctx).Create(image).Error
}

// GetImages retrieves all images for a case ordered by category and display order.
func (r *CaseRepository) GetImages(ctx context.Context, caseID uuid.UUID) ([]domain.CaseImage, error) {
	var images []domain.CaseImage
	err := r.db.WithContext(ctx).
		Where("case_id = ?", caseID).
		Order("category ASC, display_order ASC").
		Find(&images).Error
	return images, err
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
		return nil, result.Error
	}
	return &image, nil
}

// UpdateImage updates an image's mutable fields (display_order).
func (r *CaseRepository) UpdateImage(ctx context.Context, image *domain.CaseImage) error {
	return r.db.WithContext(ctx).
		Model(&domain.CaseImage{}).
		Where("id = ?", image.ID).
		Updates(map[string]interface{}{
			"display_order": image.DisplayOrder,
		}).Error
}

// DeleteImage deletes an image by its ID.
func (r *CaseRepository) DeleteImage(ctx context.Context, imageID uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.CaseImage{}, "id = ?", imageID).Error
}

// UpdateHasTACImages recalculates and updates the has_tac_images flag for a case.
func (r *CaseRepository) UpdateHasTACImages(ctx context.Context, caseID uuid.UUID) error {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&domain.CaseImage{}).
		Where("case_id = ? AND category = ?", caseID, domain.ImageCategoryTAC).
		Count(&count).Error; err != nil {
		return err
	}

	return r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ?", caseID).
		Update("has_tac_images", count > 0).Error
}

// Publish changes a case status from draft to published.
func (r *CaseRepository) Publish(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ? AND status = ?", id, domain.CaseStatusDraft).
		Updates(map[string]interface{}{
			"status":       domain.CaseStatusPublished,
			"published_at": now,
			"updated_at":   now,
		}).Error
}

// Close changes a case status to closed.
func (r *CaseRepository) Close(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ? AND status = ?", id, domain.CaseStatusPublished).
		Updates(map[string]interface{}{
			"status":     domain.CaseStatusClosed,
			"closed_at":  now,
			"updated_at": now,
		}).Error
}

// IncrementResponseCount increments the response count for a case.
func (r *CaseRepository) IncrementResponseCount(ctx context.Context, caseID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ?", caseID).
		UpdateColumn("response_count", gorm.Expr("response_count + 1")).Error
}

// UpdateUniqueUsers updates the unique users count for a case.
func (r *CaseRepository) UpdateUniqueUsers(ctx context.Context, caseID uuid.UUID, count int) error {
	return r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Where("id = ?", caseID).
		Update("unique_users", count).Error
}

// AddUser adds a user to a case (grants access).
func (r *CaseRepository) AddUser(ctx context.Context, caseID, userID uuid.UUID, email string) error {
	caseUser := domain.NewCaseUser(caseID, userID, email)
	return r.db.WithContext(ctx).Create(caseUser).Error
}

// RemoveUser removes a user from a case (revokes access).
func (r *CaseRepository) RemoveUser(ctx context.Context, caseID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Delete(&domain.CaseUser{}, "case_id = ? AND user_id = ?", caseID, userID).Error
}

// GetUsers retrieves all users who have access to a case.
func (r *CaseRepository) GetUsers(ctx context.Context, caseID uuid.UUID) ([]domain.CaseUser, error) {
	var users []domain.CaseUser
	err := r.db.WithContext(ctx).
		Where("case_id = ?", caseID).
		Order("created_at ASC").
		Find(&users).Error
	return users, err
}

// HasAccess checks if a user has access to a case.
func (r *CaseRepository) HasAccess(ctx context.Context, caseID, userID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CaseUser{}).
		Where("case_id = ? AND user_id = ?", caseID, userID).
		Count(&count).Error
	return count > 0, err
}

// ListForUser retrieves published cases accessible to a specific user with pagination.
func (r *CaseRepository) ListForUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.Case, int64, error) {
	var cases []domain.Case
	var total int64

	query := r.db.WithContext(ctx).
		Model(&domain.Case{}).
		Joins("INNER JOIN case_users ON case_users.case_id = cases.id").
		Where("case_users.user_id = ? AND cases.status = ?", userID, domain.CaseStatusPublished)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("cases.published_at DESC").
		Limit(limit).Offset(offset).Find(&cases).Error; err != nil {
		return nil, 0, err
	}

	return cases, total, nil
}

// CaseResponseRepository implements case response persistence with async writes.
type CaseResponseRepository struct {
	db      *gorm.DB
	writeCh chan *domain.CaseResponse
	done    chan struct{}
	wg      sync.WaitGroup
	closed  bool
	mu      sync.RWMutex
}

// NewCaseResponseRepository creates a new case response repository with async writes.
func NewCaseResponseRepository(db *gorm.DB, bufferSize int) *CaseResponseRepository {
	r := &CaseResponseRepository{
		db:      db,
		writeCh: make(chan *domain.CaseResponse, bufferSize),
		done:    make(chan struct{}),
	}

	r.wg.Add(1)
	go r.backgroundWriter()

	return r
}

// Save queues a case response for async persistence.
func (r *CaseResponseRepository) Save(ctx context.Context, response *domain.CaseResponse) error {
	r.mu.RLock()
	if r.closed {
		r.mu.RUnlock()
		return ErrRepositoryClosed
	}
	r.mu.RUnlock()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case r.writeCh <- response:
		return nil
	default:
		slog.Warn("case response buffer full, dropping entry", "response_id", response.ID)
		return ErrBufferFull
	}
}

// GetByCase retrieves all responses for a case with pagination.
func (r *CaseResponseRepository) GetByCase(ctx context.Context, caseID uuid.UUID, limit, offset int) ([]domain.CaseResponse, int64, error) {
	var responses []domain.CaseResponse
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.CaseResponse{}).Where("case_id = ?", caseID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&responses).Error; err != nil {
		return nil, 0, err
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
	return responses, err
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
	return count, err
}

// CountUniqueUsersByCase counts unique users who responded to a case.
func (r *CaseResponseRepository) CountUniqueUsersByCase(ctx context.Context, caseID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("case_id = ?", caseID).
		Distinct("user_id").
		Count(&count).Error
	return count, err
}

// Close gracefully shuts down the background writer.
func (r *CaseResponseRepository) Close() error {
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	r.mu.Unlock()

	close(r.writeCh)
	r.wg.Wait()
	return nil
}

// backgroundWriter processes the write queue.
func (r *CaseResponseRepository) backgroundWriter() {
	defer r.wg.Done()
	for response := range r.writeCh {
		if err := r.db.Create(response).Error; err != nil {
			slog.Error("failed to save case response", "response_id", response.ID, "error", err)
			continue
		}

		// Update case counters after successful save
		r.updateCaseCounters(response.CaseID)
	}
}

// updateCaseCounters updates the response_count and unique_users for a case.
func (r *CaseResponseRepository) updateCaseCounters(caseID uuid.UUID) {
	// Increment response count
	if err := r.db.Model(&domain.Case{}).
		Where("id = ?", caseID).
		UpdateColumn("response_count", gorm.Expr("response_count + 1")).Error; err != nil {
		slog.Error("failed to increment response count", "case_id", caseID, "error", err)
	}

	// Count and update unique users
	var uniqueCount int64
	if err := r.db.Model(&domain.CaseResponse{}).
		Where("case_id = ?", caseID).
		Distinct("user_id").
		Count(&uniqueCount).Error; err != nil {
		slog.Error("failed to count unique users", "case_id", caseID, "error", err)
		return
	}

	if err := r.db.Model(&domain.Case{}).
		Where("id = ?", caseID).
		Update("unique_users", uniqueCount).Error; err != nil {
		slog.Error("failed to update unique users", "case_id", caseID, "error", err)
	}
}

// HasUserResponded checks if a user has already submitted a response to a case.
func (r *CaseResponseRepository) HasUserResponded(ctx context.Context, userID, caseID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("user_id = ? AND case_id = ?", userID, caseID).
		Count(&count).Error
	return count > 0, err
}

// GetAllByCase retrieves all responses for a case without pagination (for Kappa calculation).
func (r *CaseResponseRepository) GetAllByCase(ctx context.Context, caseID uuid.UUID) ([]domain.CaseResponse, error) {
	var responses []domain.CaseResponse
	err := r.db.WithContext(ctx).
		Where("case_id = ?", caseID).
		Order("created_at ASC").
		Find(&responses).Error
	return responses, err
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

	return results, err
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
	// Get basic counts
	var responseCount int64
	if err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("case_id = ?", caseID).
		Count(&responseCount).Error; err != nil {
		return nil, err
	}

	var uniqueUsers int64
	if err := r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("case_id = ?", caseID).
		Distinct("user_id").
		Count(&uniqueUsers).Error; err != nil {
		return nil, err
	}

	// Get average time taken
	var avgTimeTaken float64
	r.db.WithContext(ctx).
		Model(&domain.CaseResponse{}).
		Where("case_id = ?", caseID).
		Select("COALESCE(AVG(time_taken_ms), 0)").
		Scan(&avgTimeTaken)

	// Get case info
	var cs domain.Case
	if err := r.db.WithContext(ctx).First(&cs, "id = ?", caseID).Error; err != nil {
		return nil, err
	}

	// Get distributions
	dwDist, _ := r.getDistribution(ctx, caseID, "danis_weber_type")
	lhDist, _ := r.getDistribution(ctx, caseID, "lauge_hansen_type")
	aoDist, _ := r.getDistribution(ctx, caseID, "ao_ota_code")
	btDist, _ := r.getDistribution(ctx, caseID, "bartonicek_type")

	return &domain.CaseAnalyticsSummary{
		CaseID:            caseID,
		Title:             cs.Title,
		Status:            cs.Status,
		ResponseCount:     responseCount,
		UniqueRespondents: uniqueUsers,
		AvgTimeTakenMS:    avgTimeTaken,
		DanisWeberDist:    dwDist,
		LaugeHansenDist:   lhDist,
		AOOTADist:         aoDist,
		BartonicekDist:    btDist,
	}, nil
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
		return nil, err
	}

	result := make(map[string]int64)
	for _, row := range rows {
		result[row.Value] = row.Count
	}

	return result, nil
}
