package api

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/storage"
)

// CaseResponseHandler handles response submission and retrieval.
type CaseResponseHandler struct {
	caseRepo          repository.CaseRepository
	responseRepo      repository.CaseResponseRepository
	studyService      StudyService
	storage           storage.Storage
	signedURLDuration time.Duration
}

// NewCaseResponseHandler creates a new case response handler.
func NewCaseResponseHandler(
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	studyService StudyService,
	storage storage.Storage,
	signedURLDuration time.Duration,
) *CaseResponseHandler {
	return &CaseResponseHandler{
		caseRepo:          caseRepo,
		responseRepo:      responseRepo,
		studyService:      studyService,
		storage:           storage,
		signedURLDuration: signedURLDuration,
	}
}

// SubmitResponse handles POST /api/cases/:id/responses
// Requires user to have access to the case.
func (h *CaseResponseHandler) SubmitResponse(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	userID, err := auth.ParseUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
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

	// Check if user has already responded
	hasResponded, err := h.responseRepo.HasUserResponded(c.Request.Context(), userID, caseID)
	if err != nil {
		slog.Error("failed to check existing response", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check response status"})
		return
	}

	// Validate response submission using domain logic
	if err := cs.ValidateResponseSubmission(hasResponded); err != nil {
		HandleError(c, err, "Cannot submit response")
		return
	}

	var req SubmitResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	// Validate JSONB classification field
	if err := validate.Struct(req.Classification); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":  "invalid classification data",
			"fields": validationFieldErrors(err),
		})
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

	if err := h.responseRepo.Save(c.Request.Context(), response); err != nil {
		slog.Error("failed to save response", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save response"})
		return
	}

	// Update study user progress if case belongs to a study
	if cs.StudyID != nil && h.studyService != nil {
		h.studyService.UpdateAfterResponse(c.Request.Context(), *cs.StudyID)
	}

	c.JSON(http.StatusCreated, SubmitResponseResult{Response: response})
}

// GetMyResponses handles GET /api/cases/:id/my-responses
// Requires user to have access to the case.
func (h *CaseResponseHandler) GetMyResponses(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	userID, err := auth.ParseUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	responses, err := h.responseRepo.GetByUserAndCase(c.Request.Context(), userID, caseID)
	if err != nil {
		slog.Error("failed to get responses", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get responses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"responses": responses})
}

// ListCaseResponses handles GET /api/admin/cases/:id/responses
func (h *CaseResponseHandler) ListCaseResponses(c *gin.Context) {
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

// GetBatchImageSignedURLs handles GET /api/cases/:id/images/urls
// Returns signed URLs for all images of a published case in a single request.
func (h *CaseResponseHandler) GetBatchImageSignedURLs(c *gin.Context) {
	caseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	// Verify case is published
	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil || !cs.IsPublished() {
		c.JSON(http.StatusNotFound, gin.H{"error": "case not found"})
		return
	}

	// Get all images for the case
	images, err := h.caseRepo.GetImages(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get images", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get images"})
		return
	}

	// Generate signed URLs for all images
	urls := make(map[string]SignedURLResponse, len(images))
	for _, img := range images {
		url, err := h.storage.GetSignedURL(c.Request.Context(), img.StoragePath, h.signedURLDuration)
		if err != nil {
			slog.Error("failed to generate signed URL", "error", err, "image_id", img.ID)
			continue
		}
		urls[img.ID.String()] = SignedURLResponse{
			URL:       url,
			ExpiresAt: time.Now().Add(h.signedURLDuration),
		}
	}

	c.JSON(http.StatusOK, gin.H{"urls": urls})
}

// GetImageSignedURL handles GET /api/cases/:id/images/:imageId/url
// Requires user to have access to the case, or be an admin.
func (h *CaseResponseHandler) GetImageSignedURL(c *gin.Context) {
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

	// Verify case is published
	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil || cs == nil || !cs.IsPublished() {
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
