package api

import (
	"context"
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
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/storage"
)

// DivergenceService handles divergence analysis calculations.
type DivergenceService interface {
	AnalyzeDivergence(ctx context.Context, caseID uuid.UUID) (*service.DivergenceReport, error)
}

// CaseHandler handles case-related HTTP requests.
type CaseHandler struct {
	caseRepo           repository.CaseRepository
	responseRepo       repository.CaseResponseRepository
	analyticsRepo      repository.CaseAnalyticsRepository
	studyRepo          repository.StudyRepository
	studyResponseRepo  repository.StudyResponseRepository
	userRepo           auth.UserService
	storage            storage.Storage
	signedURLDuration  time.Duration
	statsService       *StatisticsService
	divergenceService  DivergenceService
}

// StatisticsService is imported from service package
type StatisticsService interface {
	CalculateReliabilityMetrics(responses []domain.CaseResponse, cs *domain.Case) (*domain.ReliabilityMetrics, error)
}

// NewCaseHandler creates a new case handler.
func NewCaseHandler(
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	analyticsRepo repository.CaseAnalyticsRepository,
	studyRepo repository.StudyRepository,
	studyResponseRepo repository.StudyResponseRepository,
	userRepo auth.UserService,
	storage storage.Storage,
	statsService *StatisticsService,
) *CaseHandler {
	return &CaseHandler{
		caseRepo:          caseRepo,
		responseRepo:      responseRepo,
		analyticsRepo:     analyticsRepo,
		studyRepo:         studyRepo,
		studyResponseRepo: studyResponseRepo,
		userRepo:          userRepo,
		storage:           storage,
		signedURLDuration: 15 * time.Minute,
		statsService:      statsService,
	}
}

// WithDivergenceService sets the divergence service for divergence analysis.
func (h *CaseHandler) WithDivergenceService(ds DivergenceService) *CaseHandler {
	h.divergenceService = ds
	return h
}

// --- Request/Response Types ---

// CreateCaseRequest is the request body for creating a case.
type CreateCaseRequest struct {
	Title                    string                       `json:"title" binding:"required,max=255"`
	Description              string                       `json:"description"`
	Deadline                 *time.Time                   `json:"deadline,omitempty"`
	ReferenceClassification  *domain.ClassificationResult `json:"reference_classification,omitempty"`
	ReferenceInput           *domain.FractureInput        `json:"reference_input,omitempty"` // For divergence analysis
	ShowReferenceAfterSubmit bool                         `json:"show_reference_after_submit"`
	AllowMultipleResponses   *bool                        `json:"allow_multiple_responses,omitempty"`
}

// UpdateCaseRequest is the request body for updating a case.
type UpdateCaseRequest struct {
	Title                    *string                      `json:"title,omitempty"`
	Description              *string                      `json:"description,omitempty"`
	Deadline                 *time.Time                   `json:"deadline,omitempty"`
	ReferenceClassification  *domain.ClassificationResult `json:"reference_classification,omitempty"`
	ReferenceInput           *domain.FractureInput        `json:"reference_input,omitempty"` // For divergence analysis
	ShowReferenceAfterSubmit *bool                        `json:"show_reference_after_submit,omitempty"`
	AllowMultipleResponses   *bool                        `json:"allow_multiple_responses,omitempty"`
}

// SubmitResponseRequest is the request body for submitting a classification response.
type SubmitResponseRequest struct {
	Classification domain.ClassificationResult `json:"classification" binding:"required"`
	TimeTakenMS    int64                       `json:"time_taken_ms"`

	// Answer tracking fields for divergence analysis
	AnswerPath      []domain.QuestionAnswer `json:"answer_path,omitempty"`
	DecisionPath    string                  `json:"decision_path,omitempty"`
	TimePerQuestion map[string]int64        `json:"time_per_question,omitempty"`
	BackClicks      int                     `json:"back_clicks,omitempty"`
}

// CaseListResponse is the response for listing cases.
type CaseListResponse struct {
	Cases []domain.Case `json:"cases"`
	Total int64         `json:"total"`
	Page  int           `json:"page"`
	Limit int           `json:"limit"`
}

// ImageUploadResponse is the response for uploading an image.
type ImageUploadResponse struct {
	Image domain.CaseImage `json:"image"`
}

// SignedURLResponse is the response for getting a signed URL.
type SignedURLResponse struct {
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

// UserCaseListResponse is the response for listing cases for users.
type UserCaseListResponse struct {
	Cases []UserCaseItem `json:"cases"`
	Total int64          `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
}

// UserCaseItem is a case item in the user's list view.
type UserCaseItem struct {
	ID              uuid.UUID          `json:"id"`
	Title           string             `json:"title"`
	Description     string             `json:"description,omitempty"`
	Status          domain.CaseStatus  `json:"status"`
	Deadline        *time.Time         `json:"deadline,omitempty"`
	PublishedAt     *time.Time         `json:"published_at,omitempty"`
	HasTACImages    bool               `json:"has_tac_images"`
	ResponseCount   int                `json:"response_count"`
	ImageCount      int                `json:"image_count"`
	HasResponded    bool               `json:"has_responded"`
	MyResponseCount int                `json:"my_response_count"`
}

// UserCaseDetailResponse is the response for getting a case detail for users.
type UserCaseDetailResponse struct {
	ID                     uuid.UUID           `json:"id"`
	Title                  string              `json:"title"`
	Description            string              `json:"description,omitempty"`
	Status                 domain.CaseStatus   `json:"status"`
	Deadline               *time.Time          `json:"deadline,omitempty"`
	PublishedAt            *time.Time          `json:"published_at,omitempty"`
	HasTACImages           bool                `json:"has_tac_images"`
	Images                 []CaseImageResponse `json:"images"`
	HasResponded           bool                `json:"has_responded"`
	MyResponseCount        int                 `json:"my_response_count"`
	AllowMultipleResponses bool                `json:"allow_multiple_responses"`
	IsExpired              bool                `json:"is_expired"`
}

// SubmitResponseResult is the response for submitting a classification, including reference comparison.
type SubmitResponseResult struct {
	Response                *domain.CaseResponse         `json:"response"`
	ReferenceClassification *domain.ClassificationResult `json:"reference_classification,omitempty"`
	MatchesDanisWeber       *bool                        `json:"matches_danis_weber,omitempty"`
	MatchesLaugeHansen      *bool                        `json:"matches_lauge_hansen,omitempty"`
	MatchesAOOTA            *bool                        `json:"matches_ao_ota,omitempty"`
	MatchesBartonicek       *bool                        `json:"matches_bartonicek,omitempty"`
}

// ReliabilityMetricsResponse is the response for reliability metrics endpoint.
type ReliabilityMetricsResponse struct {
	*domain.ReliabilityMetrics
	CalculatedAt time.Time `json:"calculated_at"`
}

// CaseImageResponse is the image info in responses (no storage path).
type CaseImageResponse struct {
	ID           uuid.UUID            `json:"id"`
	Category     domain.ImageCategory `json:"category"`
	DisplayOrder int                  `json:"display_order"`
	Filename     string               `json:"filename"`
}

// AddCaseUserRequest is the request body for adding a user to a case.
type AddCaseUserRequest struct {
	UserEmail string `json:"user_email" binding:"required,email"`
}

// CaseUserResponse represents a user in a case's access list.
type CaseUserResponse struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	UserEmail string    `json:"user_email"`
	CreatedAt time.Time `json:"created_at"`
}

// CaseUsersListResponse is the response for listing case users.
type CaseUsersListResponse struct {
	Users []CaseUserResponse `json:"users"`
	Total int                `json:"total"`
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

// CreateCase handles POST /api/admin/cases
func (h *CaseHandler) CreateCase(c *gin.Context) {
	var req CreateCaseRequest
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

	cs := domain.NewCase(userID, req.Title, req.Description, req.Deadline)

	// Set validation case options
	if req.ReferenceClassification != nil {
		if err := cs.SetReferenceClassification(req.ReferenceClassification); err != nil {
			slog.Error("failed to set reference classification", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reference classification"})
			return
		}
	}
	if req.ReferenceInput != nil {
		if err := cs.SetReferenceInput(req.ReferenceInput); err != nil {
			slog.Error("failed to set reference input", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reference input"})
			return
		}
	}
	cs.ShowReferenceAfterSubmit = req.ShowReferenceAfterSubmit
	if req.AllowMultipleResponses != nil {
		cs.AllowMultipleResponses = *req.AllowMultipleResponses
	}

	if err := h.caseRepo.Create(c.Request.Context(), cs); err != nil {
		slog.Error("failed to create case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create case"})
		return
	}

	c.JSON(http.StatusCreated, cs)
}

// ListCases handles GET /api/admin/cases
func (h *CaseHandler) ListCases(c *gin.Context) {
	page, limit, offset := getPagination(c)

	var status *domain.CaseStatus
	if s := c.Query("status"); s != "" {
		st := domain.CaseStatus(s)
		status = &st
	}

	cases, total, err := h.caseRepo.List(c.Request.Context(), status, limit, offset)
	if err != nil {
		slog.Error("failed to list cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list cases"})
		return
	}

	c.JSON(http.StatusOK, CaseListResponse{
		Cases: cases,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// GetCase handles GET /api/admin/cases/:id
func (h *CaseHandler) GetCase(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	images, err := h.caseRepo.GetImages(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case images", "error", err)
		images = []domain.CaseImage{}
	}

	c.JSON(http.StatusOK, domain.CaseWithImages{
		Case:   *cs,
		Images: images,
	})
}

// UpdateCase handles PUT /api/admin/cases/:id
// Draft cases: all fields can be edited
// Published/Closed cases: only description and deadline can be edited
func (h *CaseHandler) UpdateCase(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	var req UpdateCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	// For draft cases, allow all fields to be edited
	if cs.CanBeEdited() {
		if req.Title != nil {
			cs.Title = *req.Title
		}
		if req.ReferenceClassification != nil {
			if err := cs.SetReferenceClassification(req.ReferenceClassification); err != nil {
				slog.Error("failed to set reference classification", "error", err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reference classification"})
				return
			}
		}
		if req.ReferenceInput != nil {
			if err := cs.SetReferenceInput(req.ReferenceInput); err != nil {
				slog.Error("failed to set reference input", "error", err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reference input"})
				return
			}
		}
		if req.ShowReferenceAfterSubmit != nil {
			cs.ShowReferenceAfterSubmit = *req.ShowReferenceAfterSubmit
		}
		if req.AllowMultipleResponses != nil {
			cs.AllowMultipleResponses = *req.AllowMultipleResponses
		}
	}

	// Description and deadline can always be edited (draft, published, or closed)
	if req.Description != nil {
		cs.Description = *req.Description
	}
	if req.Deadline != nil {
		cs.Deadline = req.Deadline
	}

	if err := h.caseRepo.Update(c.Request.Context(), cs); err != nil {
		slog.Error("failed to update case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update case"})
		return
	}

	c.JSON(http.StatusOK, cs)
}

// DeleteCase handles DELETE /api/admin/cases/:id
func (h *CaseHandler) DeleteCase(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Delete all images from storage first
	images, _ := h.caseRepo.GetImages(c.Request.Context(), id)
	for _, img := range images {
		if err := h.storage.Delete(c.Request.Context(), img.StoragePath); err != nil {
			slog.Warn("failed to delete image from storage", "path", img.StoragePath, "error", err)
		}
	}

	if err := h.caseRepo.Delete(c.Request.Context(), id); err != nil {
		slog.Error("failed to delete case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete case"})
		return
	}

	c.Status(http.StatusNoContent)
}

// UploadImage handles POST /api/admin/cases/:id/images
func (h *CaseHandler) UploadImage(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	if !cs.CanBeEdited() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot add images to non-draft case"})
		return
	}

	// Get category from form
	category := domain.ImageCategory(c.PostForm("category"))
	if category != domain.ImageCategoryXRay && category != domain.ImageCategoryTAC {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category, must be 'xray' or 'tac'"})
		return
	}

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
	storagePath := storage.BuildStoragePath(caseID.String(), imageID.String(), string(category), header.Filename)

	// Upload to storage
	if err := h.storage.Upload(c.Request.Context(), storagePath, file, contentType, header.Size); err != nil {
		slog.Error("failed to upload image", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload image"})
		return
	}

	// Create image record
	image := domain.NewCaseImage(
		caseID,
		category,
		displayOrder,
		header.Filename,
		contentType,
		header.Size,
		storagePath,
	)
	image.ID = imageID // Use the same ID we used for the path

	if err := h.caseRepo.AddImage(c.Request.Context(), image); err != nil {
		slog.Error("failed to save image record", "error", err)
		// Try to clean up the uploaded file
		_ = h.storage.Delete(c.Request.Context(), storagePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save image"})
		return
	}

	// Update the has_tac_images flag
	if err := h.caseRepo.UpdateHasTACImages(c.Request.Context(), caseID); err != nil {
		slog.Warn("failed to update has_tac_images", "error", err)
	}

	c.JSON(http.StatusCreated, ImageUploadResponse{Image: *image})
}

// DeleteImage handles DELETE /api/admin/cases/:id/images/:imageId
func (h *CaseHandler) DeleteImage(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	if !cs.CanBeEdited() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot remove images from non-draft case"})
		return
	}

	image, err := h.caseRepo.GetImageByID(c.Request.Context(), imageID)
	if err != nil {
		slog.Error("failed to get image", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get image"})
		return
	}
	if image == nil || image.CaseID != caseID {
		c.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}

	// Delete from storage
	if err := h.storage.Delete(c.Request.Context(), image.StoragePath); err != nil {
		slog.Warn("failed to delete image from storage", "path", image.StoragePath, "error", err)
	}

	// Delete from database
	if err := h.caseRepo.DeleteImage(c.Request.Context(), imageID); err != nil {
		slog.Error("failed to delete image record", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete image"})
		return
	}

	// Update the has_tac_images flag
	if err := h.caseRepo.UpdateHasTACImages(c.Request.Context(), caseID); err != nil {
		slog.Warn("failed to update has_tac_images", "error", err)
	}

	c.Status(http.StatusNoContent)
}

// UpdateImageRequest is the request body for updating an image.
type UpdateImageRequest struct {
	DisplayOrder *int `json:"display_order,omitempty"`
}

// UpdateImage handles PATCH /api/admin/cases/:id/images/:imageId
func (h *CaseHandler) UpdateImage(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	if !cs.CanBeEdited() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot update images of non-draft case"})
		return
	}

	image, err := h.caseRepo.GetImageByID(c.Request.Context(), imageID)
	if err != nil {
		slog.Error("failed to get image", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get image"})
		return
	}
	if image == nil || image.CaseID != caseID {
		c.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}

	var req UpdateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	// Apply updates
	if req.DisplayOrder != nil {
		image.DisplayOrder = *req.DisplayOrder
	}

	if err := h.caseRepo.UpdateImage(c.Request.Context(), image); err != nil {
		slog.Error("failed to update image", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update image"})
		return
	}

	c.JSON(http.StatusOK, image)
}

// PublishCase handles PUT /api/admin/cases/:id/publish
func (h *CaseHandler) PublishCase(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	if cs.Status != domain.CaseStatusDraft {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only draft cases can be published"})
		return
	}

	// Check if case has at least one image
	images, _ := h.caseRepo.GetImages(c.Request.Context(), id)
	if len(images) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "case must have at least one image before publishing"})
		return
	}

	if err := h.caseRepo.Publish(c.Request.Context(), id); err != nil {
		slog.Error("failed to publish case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to publish case"})
		return
	}

	// Refresh case data
	cs, _ = h.caseRepo.GetByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, cs)
}

// CloseCase handles PUT /api/admin/cases/:id/close
func (h *CaseHandler) CloseCase(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	if cs.Status != domain.CaseStatusPublished {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only published cases can be closed"})
		return
	}

	if err := h.caseRepo.Close(c.Request.Context(), id); err != nil {
		slog.Error("failed to close case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close case"})
		return
	}

	// Refresh case data
	cs, _ = h.caseRepo.GetByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, cs)
}

// GetCaseAnalytics handles GET /api/admin/cases/:id/analytics
func (h *CaseHandler) GetCaseAnalytics(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	summary, err := h.analyticsRepo.GetSummary(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case analytics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// ListCaseResponses handles GET /api/admin/cases/:id/responses
func (h *CaseHandler) ListCaseResponses(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	page, limit, offset := getPagination(c)

	responses, total, err := h.responseRepo.GetByCase(c.Request.Context(), id, limit, offset)
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

// ListPublishedCases handles GET /api/cases
// Returns cases the user has been granted access to, or all published cases for admins.
func (h *CaseHandler) ListPublishedCases(c *gin.Context) {
	page, limit, offset := getPagination(c)

	userIDStr, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	uid, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	var cases []domain.Case
	var total int64

	// Admins can see all published cases
	if auth.IsAdmin(c) {
		cases, total, err = h.caseRepo.ListPublished(c.Request.Context(), limit, offset)
	} else {
		// Regular users only see cases they have access to
		cases, total, err = h.caseRepo.ListForUser(c.Request.Context(), uid, limit, offset)
	}
	if err != nil {
		slog.Error("failed to list cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list cases"})
		return
	}

	// Build response with user-specific info
	items := make([]UserCaseItem, len(cases))
	for i, cs := range cases {
		// Get image count
		images, _ := h.caseRepo.GetImages(c.Request.Context(), cs.ID)

		// Get user's responses
		responses, _ := h.responseRepo.GetByUserAndCase(c.Request.Context(), uid, cs.ID)
		hasResponded := len(responses) > 0
		myResponseCount := len(responses)

		items[i] = UserCaseItem{
			ID:              cs.ID,
			Title:           cs.Title,
			Description:     cs.Description,
			Status:          cs.Status,
			Deadline:        cs.Deadline,
			PublishedAt:     cs.PublishedAt,
			HasTACImages:    cs.HasTACImages,
			ResponseCount:   cs.ResponseCount,
			ImageCount:      len(images),
			HasResponded:    hasResponded,
			MyResponseCount: myResponseCount,
		}
	}

	c.JSON(http.StatusOK, UserCaseListResponse{
		Cases: items,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// GetPublishedCase handles GET /api/cases/:id
// Requires user to have access to the case, or be an admin.
func (h *CaseHandler) GetPublishedCase(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	// Get user ID
	userIDStr, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	uid, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	// Check access (admins bypass this check)
	if !auth.IsAdmin(c) {
		hasAccess, err := h.caseRepo.HasAccess(c.Request.Context(), id, uid)
		if err != nil {
			slog.Error("failed to check access", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check access"})
			return
		}
		if !hasAccess {
			c.JSON(http.StatusForbidden, gin.H{"error": "you do not have access to this case"})
			return
		}
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil || cs.Status != domain.CaseStatusPublished {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	images, _ := h.caseRepo.GetImages(c.Request.Context(), id)

	// Get user's responses
	responses, _ := h.responseRepo.GetByUserAndCase(c.Request.Context(), uid, id)
	hasResponded := len(responses) > 0
	myResponseCount := len(responses)

	// Build image responses (without storage path)
	imageResponses := make([]CaseImageResponse, len(images))
	for i, img := range images {
		imageResponses[i] = CaseImageResponse{
			ID:           img.ID,
			Category:     img.Category,
			DisplayOrder: img.DisplayOrder,
			Filename:     img.Filename,
		}
	}

	c.JSON(http.StatusOK, UserCaseDetailResponse{
		ID:                     cs.ID,
		Title:                  cs.Title,
		Description:            cs.Description,
		Status:                 cs.Status,
		Deadline:               cs.Deadline,
		PublishedAt:            cs.PublishedAt,
		HasTACImages:           cs.HasTACImages,
		Images:                 imageResponses,
		HasResponded:           hasResponded,
		MyResponseCount:        myResponseCount,
		AllowMultipleResponses: cs.AllowMultipleResponses,
		IsExpired:              cs.IsExpired(),
	})
}

// GetImageSignedURL handles GET /api/cases/:id/images/:imageId/url
// Requires user to have access to the case, or be an admin.
func (h *CaseHandler) GetImageSignedURL(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image id"})
		return
	}

	// Get user ID and check access (admins bypass this check)
	userIDStr, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	uid, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
		return
	}

	if !auth.IsAdmin(c) {
		hasAccess, _ := h.caseRepo.HasAccess(c.Request.Context(), caseID, uid)
		if !hasAccess {
			c.JSON(http.StatusForbidden, gin.H{"error": "you do not have access to this case"})
			return
		}
	}

	// Verify case is published
	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil || cs.Status != domain.CaseStatusPublished {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Get image
	image, err := h.caseRepo.GetImageByID(c.Request.Context(), imageID)
	if err != nil || image == nil || image.CaseID != caseID {
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

// GetAdminImageSignedURL handles GET /api/admin/cases/:id/images/:imageId/url
// Admin version that works for any case status (draft, published, closed)
func (h *CaseHandler) GetAdminImageSignedURL(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid image id"})
		return
	}

	// Verify case exists (any status is fine for admin)
	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Get image
	image, err := h.caseRepo.GetImageByID(c.Request.Context(), imageID)
	if err != nil || image == nil || image.CaseID != caseID {
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

// SubmitResponse handles POST /api/cases/:id/responses
// Requires user to have access to the case.
func (h *CaseHandler) SubmitResponse(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
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

	// Check access (admins bypass this check)
	if !auth.IsAdmin(c) {
		hasAccess, _ := h.caseRepo.HasAccess(c.Request.Context(), caseID, userID)
		if !hasAccess {
			c.JSON(http.StatusForbidden, gin.H{"error": "you do not have access to this case"})
			return
		}
	}

	// Verify case can accept responses
	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	if !cs.CanAcceptResponses() {
		if cs.IsExpired() {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "case deadline has passed",
				"code":  "DEADLINE_PASSED",
			})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "case is not accepting responses"})
		}
		return
	}

	// Check study access - if case belongs to a study, verify user is assigned
	if cs.BelongsToStudy() {
		hasStudyAccess, err := h.studyRepo.HasAccess(c.Request.Context(), *cs.StudyID, userID)
		if err != nil {
			slog.Error("failed to check study access", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify study access"})
			return
		}
		if !hasStudyAccess {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you are not assigned to this study",
				"code":  "NOT_STUDY_MEMBER",
			})
			return
		}
	}

	// Check if single response mode and user already responded
	if !cs.AllowMultipleResponses {
		hasResponded, err := h.responseRepo.HasUserResponded(c.Request.Context(), userID, caseID)
		if err != nil {
			slog.Error("failed to check existing response", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check response status"})
			return
		}
		if hasResponded {
			c.JSON(http.StatusConflict, gin.H{
				"error": "you have already submitted a response to this case",
				"code":  "ALREADY_RESPONDED",
			})
			return
		}
	}

	var req SubmitResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	// Build answer tracking if provided
	var tracking *domain.AnswerTracking
	if len(req.AnswerPath) > 0 || req.DecisionPath != "" || len(req.TimePerQuestion) > 0 || req.BackClicks > 0 {
		tracking = &domain.AnswerTracking{
			AnswerPath:      req.AnswerPath,
			DecisionPath:    req.DecisionPath,
			TimePerQuestion: req.TimePerQuestion,
			BackClicks:      req.BackClicks,
		}
	}

	// Create response with tracking
	response, err := domain.NewCaseResponseWithTracking(caseID, userID, req.Classification, req.TimeTakenMS, tracking)
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

	// Update case counters (non-blocking)
	go func() {
		_ = h.caseRepo.IncrementResponseCount(c.Request.Context(), caseID)
		count, _ := h.responseRepo.CountUniqueUsersByCase(c.Request.Context(), caseID)
		_ = h.caseRepo.UpdateUniqueUsers(c.Request.Context(), caseID, int(count))

		// Update study user progress if case belongs to a study
		if cs.BelongsToStudy() {
			casesCompleted, err := h.studyResponseRepo.CountUserCasesCompleted(c.Request.Context(), *cs.StudyID, userID)
			if err != nil {
				slog.Warn("failed to count user cases completed", "error", err, "studyID", cs.StudyID, "userID", userID)
			} else {
				if err := h.studyRepo.UpdateRaterProgress(c.Request.Context(), *cs.StudyID, userID, casesCompleted); err != nil {
					slog.Warn("failed to update study rater progress", "error", err, "studyID", cs.StudyID, "userID", userID)
				}
			}
		}
	}()

	// Build result with reference comparison if enabled
	result := SubmitResponseResult{
		Response: response,
	}

	if cs.ShowReferenceAfterSubmit && cs.HasReferenceClassification() {
		refClass, err := cs.GetReferenceClassification()
		if err == nil && refClass != nil {
			result.ReferenceClassification = refClass

			// Compare Danis-Weber
			if req.Classification.DanisWeber != nil && refClass.DanisWeber != nil {
				match := req.Classification.DanisWeber.Type == refClass.DanisWeber.Type
				result.MatchesDanisWeber = &match
			}
			// Compare Lauge-Hansen
			if req.Classification.LaugeHansen != nil && refClass.LaugeHansen != nil {
				match := req.Classification.LaugeHansen.Type == refClass.LaugeHansen.Type
				result.MatchesLaugeHansen = &match
			}
			// Compare AO/OTA
			if req.Classification.AOOTA != nil && refClass.AOOTA != nil {
				match := req.Classification.AOOTA.Code == refClass.AOOTA.Code
				result.MatchesAOOTA = &match
			}
			// Compare Bartonicek
			if req.Classification.Bartonicek != nil && refClass.Bartonicek != nil {
				match := req.Classification.Bartonicek.Type == refClass.Bartonicek.Type
				result.MatchesBartonicek = &match
			}
		}
	}

	c.JSON(http.StatusCreated, result)
}

// GetMyResponses handles GET /api/cases/:id/my-responses
// Requires user to have access to the case.
func (h *CaseHandler) GetMyResponses(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
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

	// Check access (admins bypass this check)
	if !auth.IsAdmin(c) {
		hasAccess, _ := h.caseRepo.HasAccess(c.Request.Context(), caseID, userID)
		if !hasAccess {
			c.JSON(http.StatusForbidden, gin.H{"error": "you do not have access to this case"})
			return
		}
	}

	responses, err := h.responseRepo.GetByUserAndCase(c.Request.Context(), userID, caseID)
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
	domain.CaseImage
	SignedURL string `json:"signed_url,omitempty"`
}

// GetAdminCaseImages handles GET /api/admin/cases/:id/images
// Returns images with signed URLs for admin preview.
func (h *CaseHandler) GetAdminCaseImages(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	images, err := h.caseRepo.GetImages(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get images", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get images"})
		return
	}

	// Add signed URLs for preview
	response := make([]AdminImageResponse, len(images))
	for i, img := range images {
		response[i] = AdminImageResponse{
			CaseImage: img,
		}
		if url, err := h.storage.GetSignedURL(c.Request.Context(), img.StoragePath, h.signedURLDuration); err == nil {
			response[i].SignedURL = url
		}
	}

	c.JSON(http.StatusOK, gin.H{"images": response})
}

// ReorderImages handles PUT /api/admin/cases/:id/images/reorder
func (h *CaseHandler) ReorderImages(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	if !cs.CanBeEdited() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot reorder images for non-draft case"})
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
		img, err := h.caseRepo.GetImageByID(c.Request.Context(), item.ID)
		if err == nil && img != nil && img.CaseID == caseID {
			img.DisplayOrder = item.DisplayOrder
			// Note: This would require adding an UpdateImage method to the repository
			// For now, we'll skip this as it's not critical for MVP
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "images reordered"})
}

// ExportResponses handles GET /api/admin/cases/:id/export
func (h *CaseHandler) ExportResponses(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Get all responses (no pagination for export)
	responses, _, err := h.responseRepo.GetByCase(c.Request.Context(), caseID, 10000, 0)
	if err != nil {
		slog.Error("failed to get responses for export", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export responses"})
		return
	}

	// Generate CSV
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"case_%s_responses.csv\"", caseID.String()[:8]))

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

// --- Case User Management (Admin) ---

// ListCaseUsers handles GET /api/admin/cases/:id/users
func (h *CaseHandler) ListCaseUsers(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	users, err := h.caseRepo.GetUsers(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to list case users", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
		return
	}

	response := make([]CaseUserResponse, len(users))
	for i, u := range users {
		response[i] = CaseUserResponse{
			ID:        u.ID,
			UserID:    u.UserID,
			UserEmail: u.UserEmail,
			CreatedAt: u.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, CaseUsersListResponse{
		Users: response,
		Total: len(response),
	})
}

// AddCaseUser handles POST /api/admin/cases/:id/users
func (h *CaseHandler) AddCaseUser(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	var req AddCaseUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	// Verify case exists
	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Lookup user by email
	user, err := h.userRepo.GetByEmail(c.Request.Context(), req.UserEmail)
	if err != nil {
		slog.Error("failed to lookup user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to lookup user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Check if user is already added
	hasAccess, _ := h.caseRepo.HasAccess(c.Request.Context(), caseID, user.ID)
	if hasAccess {
		c.JSON(http.StatusConflict, gin.H{"error": "user already has access"})
		return
	}

	if err := h.caseRepo.AddUser(c.Request.Context(), caseID, user.ID, user.Email); err != nil {
		slog.Error("failed to add user to case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "user added successfully"})
}

// RemoveCaseUser handles DELETE /api/admin/cases/:id/users/:userId
func (h *CaseHandler) RemoveCaseUser(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	if err := h.caseRepo.RemoveUser(c.Request.Context(), caseID, userID); err != nil {
		slog.Error("failed to remove user from case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove user"})
		return
	}

	c.Status(http.StatusNoContent)
}

// --- Reliability Metrics ---

// GetReliabilityMetrics handles GET /api/admin/cases/:id/reliability
func (h *CaseHandler) GetReliabilityMetrics(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Get all responses for calculation
	responses, err := h.responseRepo.GetAllByCase(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get responses", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get responses"})
		return
	}

	if len(responses) < 2 {
		c.JSON(http.StatusOK, gin.H{
			"message":          "insufficient responses for reliability calculation",
			"response_count":   len(responses),
			"minimum_required": 2,
		})
		return
	}

	// Calculate metrics using statistics service
	if h.statsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "statistics service not available"})
		return
	}

	metrics, err := (*h.statsService).CalculateReliabilityMetrics(responses, cs)
	if err != nil {
		slog.Error("failed to calculate reliability metrics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to calculate metrics"})
		return
	}

	c.JSON(http.StatusOK, ReliabilityMetricsResponse{
		ReliabilityMetrics: metrics,
		CalculatedAt:       time.Now(),
	})
}

// GetDivergenceAnalysis handles GET /api/admin/cases/:id/divergence
// Returns divergence analysis showing where users deviate from the gold standard path.
func (h *CaseHandler) GetDivergenceAnalysis(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	if h.divergenceService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "divergence analysis not available"})
		return
	}

	report, err := h.divergenceService.AnalyzeDivergence(c.Request.Context(), caseID)
	if err != nil {
		if err.Error() == "case has no gold standard input stored" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "divergence analysis requires gold standard input",
				"hint":  "set the reference input (FractureInput) when creating or updating the case",
			})
			return
		}
		if err.Error() == "case not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
			return
		}
		slog.Error("failed to analyze divergence", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to analyze divergence"})
		return
	}

	c.JSON(http.StatusOK, report)
}

// ExportDetailedResponses handles GET /api/admin/cases/:id/export/detailed
// Exports responses with user expertise and gold standard comparison.
func (h *CaseHandler) ExportDetailedResponses(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Get responses with user expertise
	responses, err := h.responseRepo.GetResponsesWithUserExpertise(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get responses for export", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export responses"})
		return
	}

	// Parse reference classification if exists
	var refClass *domain.ClassificationResult
	if cs.HasReferenceClassification() {
		refClass, _ = cs.GetReferenceClassification()
	}

	// Generate CSV
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"case_%s_detailed.csv\"", caseID.String()[:8]))

	// Write header
	header := "response_id,user_email,years_experience,specialty,training_level,institution,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek"
	if refClass != nil {
		header += ",dw_correct,lh_correct,ao_correct,bt_correct"
	}
	c.Writer.WriteString(header + "\n")

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

		yearsExp := ""
		if r.YearsExperience != nil {
			yearsExp = strconv.Itoa(*r.YearsExperience)
		}
		specialty := ""
		if r.Specialty != nil {
			specialty = *r.Specialty
		}
		trainingLevel := ""
		if r.TrainingLevel != nil {
			trainingLevel = *r.TrainingLevel
		}
		institution := ""
		if r.Institution != nil {
			institution = *r.Institution
		}

		line := fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s,%d,%s,%s,%s,%s",
			r.ID.String(),
			r.UserEmail,
			yearsExp,
			specialty,
			trainingLevel,
			institution,
			r.CreatedAt.Format(time.RFC3339),
			r.TimeTakenMS,
			dw, lh, ao, bt,
		)

		// Add gold standard comparison if reference exists
		if refClass != nil {
			dwCorrect, lhCorrect, aoCorrect, btCorrect := "", "", "", ""

			if r.DanisWeberType != nil && refClass.DanisWeber != nil {
				if *r.DanisWeberType == string(refClass.DanisWeber.Type) {
					dwCorrect = "1"
				} else {
					dwCorrect = "0"
				}
			}
			if r.LaugeHansenType != nil && refClass.LaugeHansen != nil {
				if *r.LaugeHansenType == string(refClass.LaugeHansen.Type) {
					lhCorrect = "1"
				} else {
					lhCorrect = "0"
				}
			}
			if r.AOOTACode != nil && refClass.AOOTA != nil {
				if *r.AOOTACode == string(refClass.AOOTA.Code) {
					aoCorrect = "1"
				} else {
					aoCorrect = "0"
				}
			}
			if r.BartonicekType != nil && refClass.Bartonicek != nil {
				if *r.BartonicekType == string(refClass.Bartonicek.Type) {
					btCorrect = "1"
				} else {
					btCorrect = "0"
				}
			}

			line += fmt.Sprintf(",%s,%s,%s,%s", dwCorrect, lhCorrect, aoCorrect, btCorrect)
		}

		c.Writer.WriteString(line + "\n")
	}
}
