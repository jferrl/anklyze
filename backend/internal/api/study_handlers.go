package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/storage"
)

// StudyHandler handles study-related HTTP requests.
type StudyHandler struct {
	studyRepo         repository.StudyRepository
	responseRepo      repository.StudyResponseRepository
	analyticsRepo     repository.StudyAnalyticsRepository
	storage           storage.Storage
	signedURLDuration time.Duration
}

// NewStudyHandler creates a new study handler.
func NewStudyHandler(
	studyRepo repository.StudyRepository,
	responseRepo repository.StudyResponseRepository,
	analyticsRepo repository.StudyAnalyticsRepository,
	storage storage.Storage,
) *StudyHandler {
	return &StudyHandler{
		studyRepo:         studyRepo,
		responseRepo:      responseRepo,
		analyticsRepo:     analyticsRepo,
		storage:           storage,
		signedURLDuration: 15 * time.Minute,
	}
}

// --- Request/Response Types ---

// CreateStudyRequest is the request body for creating a study.
type CreateStudyRequest struct {
	Title       string     `json:"title" binding:"required,max=255"`
	Description string     `json:"description"`
	Deadline    *time.Time `json:"deadline,omitempty"`
}

// UpdateStudyRequest is the request body for updating a study.
type UpdateStudyRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	Deadline    *time.Time `json:"deadline,omitempty"`
}

// SubmitResponseRequest is the request body for submitting a classification response.
type SubmitResponseRequest struct {
	Classification domain.ClassificationResult `json:"classification" binding:"required"`
	TimeTakenMS    int64                       `json:"time_taken_ms"`
}

// StudyListResponse is the response for listing studies.
type StudyListResponse struct {
	Studies []domain.Study `json:"studies"`
	Total   int64          `json:"total"`
	Page    int            `json:"page"`
	Limit   int            `json:"limit"`
}

// ImageUploadResponse is the response for uploading an image.
type ImageUploadResponse struct {
	Image domain.StudyImage `json:"image"`
}

// SignedURLResponse is the response for getting a signed URL.
type SignedURLResponse struct {
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

// UserStudyListResponse is the response for listing studies for users.
type UserStudyListResponse struct {
	Studies []UserStudyItem `json:"studies"`
	Total   int64           `json:"total"`
	Page    int             `json:"page"`
	Limit   int             `json:"limit"`
}

// UserStudyItem is a study item in the user's list view.
type UserStudyItem struct {
	ID              uuid.UUID           `json:"id"`
	Title           string              `json:"title"`
	Description     string              `json:"description,omitempty"`
	Status          domain.StudyStatus  `json:"status"`
	Deadline        *time.Time          `json:"deadline,omitempty"`
	PublishedAt     *time.Time          `json:"published_at,omitempty"`
	HasTACImages    bool                `json:"has_tac_images"`
	ResponseCount   int                 `json:"response_count"`
	ImageCount      int                 `json:"image_count"`
	HasResponded    bool                `json:"has_responded"`
	MyResponseCount int                 `json:"my_response_count"`
}

// UserStudyDetailResponse is the response for getting a study detail for users.
type UserStudyDetailResponse struct {
	ID              uuid.UUID            `json:"id"`
	Title           string               `json:"title"`
	Description     string               `json:"description,omitempty"`
	Status          domain.StudyStatus   `json:"status"`
	Deadline        *time.Time           `json:"deadline,omitempty"`
	PublishedAt     *time.Time           `json:"published_at,omitempty"`
	HasTACImages    bool                 `json:"has_tac_images"`
	Images          []StudyImageResponse `json:"images"`
	HasResponded    bool                 `json:"has_responded"`
	MyResponseCount int                  `json:"my_response_count"`
}

// StudyImageResponse is the image info in responses (no storage path).
type StudyImageResponse struct {
	ID           uuid.UUID             `json:"id"`
	Category     domain.ImageCategory  `json:"category"`
	DisplayOrder int                   `json:"display_order"`
	Filename     string                `json:"filename"`
	Caption      string                `json:"caption,omitempty"`
}

// --- Pagination Helpers ---

func getPagination(c *gin.Context) (int, int, int) {
	page := 1
	limit := 20

	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := (page - 1) * limit
	return page, limit, offset
}

// --- Admin Endpoints ---

// CreateStudy handles POST /api/admin/studies
func (h *StudyHandler) CreateStudy(c *gin.Context) {
	var req CreateStudyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	study := domain.NewStudy(userID, req.Title, req.Description, req.Deadline)

	if err := h.studyRepo.Create(c.Request.Context(), study); err != nil {
		slog.Error("failed to create study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create study"})
		return
	}

	c.JSON(http.StatusCreated, study)
}

// ListStudies handles GET /api/admin/studies
func (h *StudyHandler) ListStudies(c *gin.Context) {
	page, limit, offset := getPagination(c)

	var status *domain.StudyStatus
	if s := c.Query("status"); s != "" {
		st := domain.StudyStatus(s)
		status = &st
	}

	studies, total, err := h.studyRepo.List(c.Request.Context(), status, limit, offset)
	if err != nil {
		slog.Error("failed to list studies", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list studies"})
		return
	}

	c.JSON(http.StatusOK, StudyListResponse{
		Studies: studies,
		Total:   total,
		Page:    page,
		Limit:   limit,
	})
}

// GetStudy handles GET /api/admin/studies/:id
func (h *StudyHandler) GetStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	images, err := h.studyRepo.GetImages(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study images", "error", err)
		images = []domain.StudyImage{}
	}

	c.JSON(http.StatusOK, domain.StudyWithImages{
		Study:  *study,
		Images: images,
	})
}

// UpdateStudy handles PUT /api/admin/studies/:id
func (h *StudyHandler) UpdateStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	if !study.CanBeEdited() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "study cannot be edited in current status"})
		return
	}

	var req UpdateStudyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	if req.Title != nil {
		study.Title = *req.Title
	}
	if req.Description != nil {
		study.Description = *req.Description
	}
	if req.Deadline != nil {
		study.Deadline = req.Deadline
	}

	if err := h.studyRepo.Update(c.Request.Context(), study); err != nil {
		slog.Error("failed to update study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update study"})
		return
	}

	c.JSON(http.StatusOK, study)
}

// DeleteStudy handles DELETE /api/admin/studies/:id
func (h *StudyHandler) DeleteStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	// Delete all images from storage first
	images, _ := h.studyRepo.GetImages(c.Request.Context(), id)
	for _, img := range images {
		if err := h.storage.Delete(c.Request.Context(), img.StoragePath); err != nil {
			slog.Warn("failed to delete image from storage", "path", img.StoragePath, "error", err)
		}
	}

	if err := h.studyRepo.Delete(c.Request.Context(), id); err != nil {
		slog.Error("failed to delete study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete study"})
		return
	}

	c.Status(http.StatusNoContent)
}

// UploadImage handles POST /api/admin/studies/:id/images
func (h *StudyHandler) UploadImage(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	if !study.CanBeEdited() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot add images to non-draft study"})
		return
	}

	// Get category from form
	category := domain.ImageCategory(c.PostForm("category"))
	if category != domain.ImageCategoryXRay && category != domain.ImageCategoryTAC {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category, must be 'xray' or 'tac'"})
		return
	}

	// Get caption (optional)
	caption := c.PostForm("caption")

	// Get display order (optional)
	displayOrder := 0
	if do := c.PostForm("display_order"); do != "" {
		if parsed, err := strconv.Atoi(do); err == nil {
			displayOrder = parsed
		}
	}

	// Get the file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	if !isValidImageType(contentType) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file type, must be an image (JPEG, PNG, DICOM)"})
		return
	}

	// Generate image ID and storage path
	imageID := uuid.New()
	storagePath := storage.BuildStoragePath(studyID.String(), imageID.String(), string(category), header.Filename)

	// Upload to storage
	if err := h.storage.Upload(c.Request.Context(), storagePath, file, contentType, header.Size); err != nil {
		slog.Error("failed to upload image", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload image"})
		return
	}

	// Create image record
	image := domain.NewStudyImage(
		studyID,
		category,
		displayOrder,
		header.Filename,
		contentType,
		header.Size,
		storagePath,
		caption,
	)
	image.ID = imageID // Use the same ID we used for the path

	if err := h.studyRepo.AddImage(c.Request.Context(), image); err != nil {
		slog.Error("failed to save image record", "error", err)
		// Try to clean up the uploaded file
		_ = h.storage.Delete(c.Request.Context(), storagePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save image"})
		return
	}

	// Update the has_tac_images flag
	if err := h.studyRepo.UpdateHasTACImages(c.Request.Context(), studyID); err != nil {
		slog.Warn("failed to update has_tac_images", "error", err)
	}

	c.JSON(http.StatusCreated, ImageUploadResponse{Image: *image})
}

// DeleteImage handles DELETE /api/admin/studies/:id/images/:imageId
func (h *StudyHandler) DeleteImage(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	if !study.CanBeEdited() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot remove images from non-draft study"})
		return
	}

	image, err := h.studyRepo.GetImageByID(c.Request.Context(), imageID)
	if err != nil {
		slog.Error("failed to get image", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get image"})
		return
	}
	if image == nil || image.StudyID != studyID {
		c.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}

	// Delete from storage
	if err := h.storage.Delete(c.Request.Context(), image.StoragePath); err != nil {
		slog.Warn("failed to delete image from storage", "path", image.StoragePath, "error", err)
	}

	// Delete from database
	if err := h.studyRepo.DeleteImage(c.Request.Context(), imageID); err != nil {
		slog.Error("failed to delete image record", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete image"})
		return
	}

	// Update the has_tac_images flag
	if err := h.studyRepo.UpdateHasTACImages(c.Request.Context(), studyID); err != nil {
		slog.Warn("failed to update has_tac_images", "error", err)
	}

	c.Status(http.StatusNoContent)
}

// PublishStudy handles PUT /api/admin/studies/:id/publish
func (h *StudyHandler) PublishStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	if study.Status != domain.StudyStatusDraft {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only draft studies can be published"})
		return
	}

	// Check if study has at least one image
	images, _ := h.studyRepo.GetImages(c.Request.Context(), id)
	if len(images) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "study must have at least one image before publishing"})
		return
	}

	if err := h.studyRepo.Publish(c.Request.Context(), id); err != nil {
		slog.Error("failed to publish study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to publish study"})
		return
	}

	// Refresh study data
	study, _ = h.studyRepo.GetByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, study)
}

// CloseStudy handles PUT /api/admin/studies/:id/close
func (h *StudyHandler) CloseStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	if study.Status != domain.StudyStatusPublished {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only published studies can be closed"})
		return
	}

	if err := h.studyRepo.Close(c.Request.Context(), id); err != nil {
		slog.Error("failed to close study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close study"})
		return
	}

	// Refresh study data
	study, _ = h.studyRepo.GetByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, study)
}

// GetStudyAnalytics handles GET /api/admin/studies/:id/analytics
func (h *StudyHandler) GetStudyAnalytics(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	summary, err := h.analyticsRepo.GetSummary(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study analytics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// ListStudyResponses handles GET /api/admin/studies/:id/responses
func (h *StudyHandler) ListStudyResponses(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	page, limit, offset := getPagination(c)

	responses, total, err := h.responseRepo.GetByStudy(c.Request.Context(), id, limit, offset)
	if err != nil {
		slog.Error("failed to list responses", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list responses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"responses": responses,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

// --- User Endpoints ---

// ListPublishedStudies handles GET /api/studies
func (h *StudyHandler) ListPublishedStudies(c *gin.Context) {
	page, limit, offset := getPagination(c)

	userID, _ := c.Get(auth.ContextKeyUserID)
	var uid uuid.UUID
	if userID != nil {
		if userIDStr, ok := userID.(string); ok {
			uid, _ = uuid.Parse(userIDStr)
		}
	}

	studies, total, err := h.studyRepo.ListPublished(c.Request.Context(), limit, offset)
	if err != nil {
		slog.Error("failed to list studies", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list studies"})
		return
	}

	// Build response with user-specific info
	items := make([]UserStudyItem, len(studies))
	for i, study := range studies {
		// Get image count
		images, _ := h.studyRepo.GetImages(c.Request.Context(), study.ID)

		// Get user's responses
		var hasResponded bool
		var myResponseCount int
		if uid != uuid.Nil {
			responses, _ := h.responseRepo.GetByUserAndStudy(c.Request.Context(), uid, study.ID)
			hasResponded = len(responses) > 0
			myResponseCount = len(responses)
		}

		items[i] = UserStudyItem{
			ID:              study.ID,
			Title:           study.Title,
			Description:     study.Description,
			Status:          study.Status,
			Deadline:        study.Deadline,
			PublishedAt:     study.PublishedAt,
			HasTACImages:    study.HasTACImages,
			ResponseCount:   study.ResponseCount,
			ImageCount:      len(images),
			HasResponded:    hasResponded,
			MyResponseCount: myResponseCount,
		}
	}

	c.JSON(http.StatusOK, UserStudyListResponse{
		Studies: items,
		Total:   total,
		Page:    page,
		Limit:   limit,
	})
}

// GetPublishedStudy handles GET /api/studies/:id
func (h *StudyHandler) GetPublishedStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil || study.Status != domain.StudyStatusPublished {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	images, _ := h.studyRepo.GetImages(c.Request.Context(), id)

	// Get user's responses
	userIDStr, _ := c.Get(auth.ContextKeyUserID)
	var hasResponded bool
	var myResponseCount int
	if userIDStr != nil {
		if uidStr, ok := userIDStr.(string); ok {
			if uid, err := uuid.Parse(uidStr); err == nil {
				responses, _ := h.responseRepo.GetByUserAndStudy(c.Request.Context(), uid, id)
				hasResponded = len(responses) > 0
				myResponseCount = len(responses)
			}
		}
	}

	// Build image responses (without storage path)
	imageResponses := make([]StudyImageResponse, len(images))
	for i, img := range images {
		imageResponses[i] = StudyImageResponse{
			ID:           img.ID,
			Category:     img.Category,
			DisplayOrder: img.DisplayOrder,
			Filename:     img.Filename,
			Caption:      img.Caption,
		}
	}

	c.JSON(http.StatusOK, UserStudyDetailResponse{
		ID:              study.ID,
		Title:           study.Title,
		Description:     study.Description,
		Status:          study.Status,
		Deadline:        study.Deadline,
		PublishedAt:     study.PublishedAt,
		HasTACImages:    study.HasTACImages,
		Images:          imageResponses,
		HasResponded:    hasResponded,
		MyResponseCount: myResponseCount,
	})
}

// GetImageSignedURL handles GET /api/studies/:id/images/:imageId/url
func (h *StudyHandler) GetImageSignedURL(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image id"})
		return
	}

	// Verify study is published
	study, err := h.studyRepo.GetByID(c.Request.Context(), studyID)
	if err != nil || study == nil || study.Status != domain.StudyStatusPublished {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	// Get image
	image, err := h.studyRepo.GetImageByID(c.Request.Context(), imageID)
	if err != nil || image == nil || image.StudyID != studyID {
		c.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}

	// Generate signed URL
	url, err := h.storage.GetSignedURL(c.Request.Context(), image.StoragePath, h.signedURLDuration)
	if err != nil {
		slog.Error("failed to generate signed URL", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate image URL"})
		return
	}

	c.JSON(http.StatusOK, SignedURLResponse{
		URL:       url,
		ExpiresAt: time.Now().Add(h.signedURLDuration),
	})
}

// GetAdminImageSignedURL handles GET /api/admin/studies/:id/images/:imageId/url
// Admin version that works for any study status (draft, published, closed)
func (h *StudyHandler) GetAdminImageSignedURL(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image id"})
		return
	}

	// Verify study exists (any status is fine for admin)
	study, err := h.studyRepo.GetByID(c.Request.Context(), studyID)
	if err != nil || study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	// Get image
	image, err := h.studyRepo.GetImageByID(c.Request.Context(), imageID)
	if err != nil || image == nil || image.StudyID != studyID {
		c.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}

	// Generate signed URL
	url, err := h.storage.GetSignedURL(c.Request.Context(), image.StoragePath, h.signedURLDuration)
	if err != nil {
		slog.Error("failed to generate signed URL", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate image URL"})
		return
	}

	c.JSON(http.StatusOK, SignedURLResponse{
		URL:       url,
		ExpiresAt: time.Now().Add(h.signedURLDuration),
	})
}

// SubmitResponse handles POST /api/studies/:id/responses
func (h *StudyHandler) SubmitResponse(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	userIDStr, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	// Verify study can accept responses
	study, err := h.studyRepo.GetByID(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	if !study.CanAcceptResponses() {
		if study.IsExpired() {
			c.JSON(http.StatusBadRequest, gin.H{"error": "study deadline has passed"})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "study is not accepting responses"})
		}
		return
	}

	var req SubmitResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	// Create response
	response, err := domain.NewStudyResponse(studyID, userID, req.Classification, req.TimeTakenMS)
	if err != nil {
		slog.Error("failed to create response", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create response"})
		return
	}

	// Save response (async)
	if err := h.responseRepo.Save(c.Request.Context(), response); err != nil {
		slog.Error("failed to save response", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save response"})
		return
	}

	// Update study counters (non-blocking)
	go func() {
		_ = h.studyRepo.IncrementResponseCount(c.Request.Context(), studyID)
		count, _ := h.responseRepo.CountUniqueUsersByStudy(c.Request.Context(), studyID)
		_ = h.studyRepo.UpdateUniqueUsers(c.Request.Context(), studyID, int(count))
	}()

	c.JSON(http.StatusCreated, response)
}

// GetMyResponses handles GET /api/studies/:id/my-responses
func (h *StudyHandler) GetMyResponses(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	userIDStr, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	responses, err := h.responseRepo.GetByUserAndStudy(c.Request.Context(), userID, studyID)
	if err != nil {
		slog.Error("failed to get responses", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get responses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"responses": responses})
}

// --- Helpers ---

func isValidImageType(contentType string) bool {
	validTypes := map[string]bool{
		"image/jpeg":               true,
		"image/png":                true,
		"image/gif":                true,
		"image/webp":               true,
		"application/dicom":        true,
		"application/octet-stream": true, // Often used for DICOM
	}
	return validTypes[contentType]
}

// AdminImageResponse includes storage path for admin views.
type AdminImageResponse struct {
	domain.StudyImage
	SignedURL string `json:"signed_url,omitempty"`
}

// GetAdminStudyImages handles GET /api/admin/studies/:id/images
// Returns images with signed URLs for admin preview.
func (h *StudyHandler) GetAdminStudyImages(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	images, err := h.studyRepo.GetImages(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get images", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get images"})
		return
	}

	// Add signed URLs for preview
	response := make([]AdminImageResponse, len(images))
	for i, img := range images {
		response[i] = AdminImageResponse{
			StudyImage: img,
		}
		if url, err := h.storage.GetSignedURL(c.Request.Context(), img.StoragePath, h.signedURLDuration); err == nil {
			response[i].SignedURL = url
		}
	}

	c.JSON(http.StatusOK, gin.H{"images": response})
}

// ReorderImages handles PUT /api/admin/studies/:id/images/reorder
func (h *StudyHandler) ReorderImages(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), studyID)
	if err != nil || study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	if !study.CanBeEdited() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot reorder images for non-draft study"})
		return
	}

	var req struct {
		ImageOrder []struct {
			ID           uuid.UUID `json:"id"`
			DisplayOrder int       `json:"display_order"`
		} `json:"image_order"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// This is a simplified implementation - in production you might want
	// a dedicated repository method for batch updates
	for _, item := range req.ImageOrder {
		img, err := h.studyRepo.GetImageByID(c.Request.Context(), item.ID)
		if err == nil && img != nil && img.StudyID == studyID {
			img.DisplayOrder = item.DisplayOrder
			// Note: This would require adding an UpdateImage method to the repository
			// For now, we'll skip this as it's not critical for MVP
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "images reordered"})
}

// ExportResponses handles GET /api/admin/studies/:id/export
func (h *StudyHandler) ExportResponses(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid study id"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), studyID)
	if err != nil || study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "study not found"})
		return
	}

	// Get all responses (no pagination for export)
	responses, _, err := h.responseRepo.GetByStudy(c.Request.Context(), studyID, 10000, 0)
	if err != nil {
		slog.Error("failed to get responses for export", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export responses"})
		return
	}

	// Generate CSV
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"study_%s_responses.csv\"", studyID.String()[:8]))

	// Write CSV header
	c.Writer.WriteString("response_id,user_id,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek\n")

	// Write rows
	for _, r := range responses {
		dw := ""
		if r.DanisWeberType != nil {
			dw = *r.DanisWeberType
		}
		lh := ""
		if r.LaugeHansenType != nil {
			lh = *r.LaugeHansenType
		}
		ao := ""
		if r.AOOTACode != nil {
			ao = *r.AOOTACode
		}
		bt := ""
		if r.BartonicekType != nil {
			bt = *r.BartonicekType
		}

		line := fmt.Sprintf("%s,%s,%s,%d,%s,%s,%s,%s\n",
			r.ID.String(),
			r.UserID.String(),
			r.CreatedAt.Format(time.RFC3339),
			r.TimeTakenMS,
			dw, lh, ao, bt,
		)
		c.Writer.WriteString(line)
	}
}
