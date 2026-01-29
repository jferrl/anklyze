package postgres

import (
	"context"
	"errors"
	"log/slog"
	"sync"
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

// Delete deletes a study and all associated data (images, responses) by its ID.
func (r *StudyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete all responses first
		if err := tx.Delete(&domain.StudyResponse{}, "study_id = ?", id).Error; err != nil {
			return err
		}

		// Delete all images (storage files should be deleted separately)
		if err := tx.Delete(&domain.StudyImage{}, "study_id = ?", id).Error; err != nil {
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

// ListPublished retrieves only published studies with pagination.
func (r *StudyRepository) ListPublished(ctx context.Context, limit, offset int) ([]domain.Study, int64, error) {
	status := domain.StudyStatusPublished
	return r.List(ctx, &status, limit, offset)
}

// AddImage adds an image to a study.
func (r *StudyRepository) AddImage(ctx context.Context, image *domain.StudyImage) error {
	return r.db.WithContext(ctx).Create(image).Error
}

// GetImages retrieves all images for a study ordered by category and display order.
func (r *StudyRepository) GetImages(ctx context.Context, studyID uuid.UUID) ([]domain.StudyImage, error) {
	var images []domain.StudyImage
	err := r.db.WithContext(ctx).
		Where("study_id = ?", studyID).
		Order("category ASC, display_order ASC").
		Find(&images).Error
	return images, err
}

// GetImageByID retrieves an image by its ID.
func (r *StudyRepository) GetImageByID(ctx context.Context, imageID uuid.UUID) (*domain.StudyImage, error) {
	var image domain.StudyImage
	result := r.db.WithContext(ctx).First(&image, "id = ?", imageID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}
	return &image, nil
}

// DeleteImage deletes an image by its ID.
func (r *StudyRepository) DeleteImage(ctx context.Context, imageID uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.StudyImage{}, "id = ?", imageID).Error
}

// UpdateHasTACImages recalculates and updates the has_tac_images flag for a study.
func (r *StudyRepository) UpdateHasTACImages(ctx context.Context, studyID uuid.UUID) error {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&domain.StudyImage{}).
		Where("study_id = ? AND category = ?", studyID, domain.ImageCategoryTAC).
		Count(&count).Error; err != nil {
		return err
	}

	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ?", studyID).
		Update("has_tac_images", count > 0).Error
}

// Publish changes a study status from draft to published.
func (r *StudyRepository) Publish(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ? AND status = ?", id, domain.StudyStatusDraft).
		Updates(map[string]interface{}{
			"status":       domain.StudyStatusPublished,
			"published_at": now,
			"updated_at":   now,
		}).Error
}

// Close changes a study status to closed.
func (r *StudyRepository) Close(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ? AND status = ?", id, domain.StudyStatusPublished).
		Updates(map[string]interface{}{
			"status":     domain.StudyStatusClosed,
			"closed_at":  now,
			"updated_at": now,
		}).Error
}

// IncrementResponseCount increments the response count for a study.
func (r *StudyRepository) IncrementResponseCount(ctx context.Context, studyID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ?", studyID).
		UpdateColumn("response_count", gorm.Expr("response_count + 1")).Error
}

// UpdateUniqueUsers updates the unique users count for a study.
func (r *StudyRepository) UpdateUniqueUsers(ctx context.Context, studyID uuid.UUID, count int) error {
	return r.db.WithContext(ctx).
		Model(&domain.Study{}).
		Where("id = ?", studyID).
		Update("unique_users", count).Error
}

// StudyResponseRepository implements study response persistence with async writes.
type StudyResponseRepository struct {
	db      *gorm.DB
	writeCh chan *domain.StudyResponse
	done    chan struct{}
	wg      sync.WaitGroup
	closed  bool
	mu      sync.RWMutex
}

// NewStudyResponseRepository creates a new study response repository with async writes.
func NewStudyResponseRepository(db *gorm.DB, bufferSize int) *StudyResponseRepository {
	r := &StudyResponseRepository{
		db:      db,
		writeCh: make(chan *domain.StudyResponse, bufferSize),
		done:    make(chan struct{}),
	}

	r.wg.Add(1)
	go r.backgroundWriter()

	return r
}

// Save queues a study response for async persistence.
func (r *StudyResponseRepository) Save(ctx context.Context, response *domain.StudyResponse) error {
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
		slog.Warn("study response buffer full, dropping entry", "response_id", response.ID)
		return ErrBufferFull
	}
}

// GetByStudy retrieves all responses for a study with pagination.
func (r *StudyResponseRepository) GetByStudy(ctx context.Context, studyID uuid.UUID, limit, offset int) ([]domain.StudyResponse, int64, error) {
	var responses []domain.StudyResponse
	var total int64

	query := r.db.WithContext(ctx).Model(&domain.StudyResponse{}).Where("study_id = ?", studyID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&responses).Error; err != nil {
		return nil, 0, err
	}

	return responses, total, nil
}

// GetByUserAndStudy retrieves all responses by a user for a study.
func (r *StudyResponseRepository) GetByUserAndStudy(ctx context.Context, userID, studyID uuid.UUID) ([]domain.StudyResponse, error) {
	var responses []domain.StudyResponse
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND study_id = ?", userID, studyID).
		Order("created_at DESC").
		Find(&responses).Error
	return responses, err
}

// CountByStudy counts the total responses for a study.
func (r *StudyResponseRepository) CountByStudy(ctx context.Context, studyID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Where("study_id = ?", studyID).
		Count(&count).Error
	return count, err
}

// CountUniqueUsersByStudy counts unique users who responded to a study.
func (r *StudyResponseRepository) CountUniqueUsersByStudy(ctx context.Context, studyID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Where("study_id = ?", studyID).
		Distinct("user_id").
		Count(&count).Error
	return count, err
}

// Close gracefully shuts down the background writer.
func (r *StudyResponseRepository) Close() error {
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
func (r *StudyResponseRepository) backgroundWriter() {
	defer r.wg.Done()
	for response := range r.writeCh {
		if err := r.db.Create(response).Error; err != nil {
			slog.Error("failed to save study response", "response_id", response.ID, "error", err)
			continue
		}

		// Update study counters after successful save
		r.updateStudyCounters(response.StudyID)
	}
}

// updateStudyCounters updates the response_count and unique_users for a study.
func (r *StudyResponseRepository) updateStudyCounters(studyID uuid.UUID) {
	// Increment response count
	if err := r.db.Model(&domain.Study{}).
		Where("id = ?", studyID).
		UpdateColumn("response_count", gorm.Expr("response_count + 1")).Error; err != nil {
		slog.Error("failed to increment response count", "study_id", studyID, "error", err)
	}

	// Count and update unique users
	var uniqueCount int64
	if err := r.db.Model(&domain.StudyResponse{}).
		Where("study_id = ?", studyID).
		Distinct("user_id").
		Count(&uniqueCount).Error; err != nil {
		slog.Error("failed to count unique users", "study_id", studyID, "error", err)
		return
	}

	if err := r.db.Model(&domain.Study{}).
		Where("id = ?", studyID).
		Update("unique_users", uniqueCount).Error; err != nil {
		slog.Error("failed to update unique users", "study_id", studyID, "error", err)
	}
}

// StudyAnalyticsRepository implements study analytics queries.
type StudyAnalyticsRepository struct {
	db *gorm.DB
}

// NewStudyAnalyticsRepository creates a new study analytics repository.
func NewStudyAnalyticsRepository(db *gorm.DB) *StudyAnalyticsRepository {
	return &StudyAnalyticsRepository{db: db}
}

// GetSummary retrieves aggregated analytics for a study.
func (r *StudyAnalyticsRepository) GetSummary(ctx context.Context, studyID uuid.UUID) (*domain.StudyAnalyticsSummary, error) {
	// Get basic counts
	var responseCount int64
	if err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Where("study_id = ?", studyID).
		Count(&responseCount).Error; err != nil {
		return nil, err
	}

	var uniqueUsers int64
	if err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Where("study_id = ?", studyID).
		Distinct("user_id").
		Count(&uniqueUsers).Error; err != nil {
		return nil, err
	}

	// Get average time taken
	var avgTimeTaken float64
	r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Where("study_id = ?", studyID).
		Select("COALESCE(AVG(time_taken_ms), 0)").
		Scan(&avgTimeTaken)

	// Get study info
	var study domain.Study
	if err := r.db.WithContext(ctx).First(&study, "id = ?", studyID).Error; err != nil {
		return nil, err
	}

	// Get distributions
	dwDist, _ := r.getDistribution(ctx, studyID, "danis_weber_type")
	lhDist, _ := r.getDistribution(ctx, studyID, "lauge_hansen_type")
	aoDist, _ := r.getDistribution(ctx, studyID, "ao_ota_code")
	btDist, _ := r.getDistribution(ctx, studyID, "bartonicek_type")

	return &domain.StudyAnalyticsSummary{
		StudyID:           studyID,
		Title:             study.Title,
		Status:            study.Status,
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
func (r *StudyAnalyticsRepository) GetClassificationDistribution(ctx context.Context, studyID uuid.UUID, system string) (map[string]int64, error) {
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

	return r.getDistribution(ctx, studyID, columnName)
}

// getDistribution is a helper to get distribution for a column.
func (r *StudyAnalyticsRepository) getDistribution(ctx context.Context, studyID uuid.UUID, columnName string) (map[string]int64, error) {
	var rows []struct {
		Value string
		Count int64
	}

	err := r.db.WithContext(ctx).
		Model(&domain.StudyResponse{}).
		Select(columnName+" as value, COUNT(*) as count").
		Where("study_id = ? AND "+columnName+" IS NOT NULL", studyID).
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
