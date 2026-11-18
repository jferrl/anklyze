package api

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/storage"
)

// CaseResponseHandler handles response submission and retrieval.
type CaseResponseHandler struct {
	caseRepo          repository.CaseRepository
	responseRepo      repository.CaseResponseRepository
	studyService      StudyService
	classifier        service.ClassificationService
	storage           storage.Storage
	signedURLDuration time.Duration
}

// NewCaseResponseHandler creates a new case response handler.
func NewCaseResponseHandler(
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	studyService StudyService,
	classifier service.ClassificationService,
	storage storage.Storage,
	signedURLDuration time.Duration,
) *CaseResponseHandler {
	return &CaseResponseHandler{
		caseRepo:          caseRepo,
		responseRepo:      responseRepo,
		studyService:      studyService,
		classifier:        classifier,
		storage:           storage,
		signedURLDuration: signedURLDuration,
	}
}

// SubmitResponse handles POST /api/cases/:id/responses
// Requires user to have access to the case.
func (h *CaseResponseHandler) SubmitResponse(c *gin.Context) {
	caseID, ok := parseID(c, "id", "invalid case id")
	if !ok {
		return
	}

	userID, err := auth.ParseUserID(c)
	if err != nil {
		unauthorized(c)
		return
	}

	cs, ok := loadCase(c, h.caseRepo, caseID)
	if !ok {
		return
	}

	hasResponded, err := h.responseRepo.HasUserResponded(c.Request.Context(), userID, caseID)
	if err != nil {
		HandleError(c, err, "failed to check response status")
		return
	}

	// Validate response submission using domain logic
	if err := cs.ValidateResponseSubmission(hasResponded); err != nil {
		HandleError(c, err, "Cannot submit response")
		return
	}

	// A case belongs to at most one study (Case.StudyID); closing it ends responses.
	if cs.StudyID != nil && h.studyService != nil {
		if err := h.studyService.ValidateAcceptingResponses(c.Request.Context(), *cs.StudyID); err != nil {
			HandleError(c, err, "Cannot submit response")
			return
		}
	}

	var req SubmitResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "invalid request", err)
		return
	}

	// Validate JSONB classification field
	if err := validate.Struct(req.Classification); err != nil {
		unprocessable(c, "invalid classification data", validationFieldErrors(err))
		return
	}

	// The server is the authority: classify the form's final state and store the
	// engine's result, rejecting a client copy that differs. answer_path is analytics only.
	if err := validate.Struct(req.Input); err != nil {
		unprocessable(c, "invalid input", validationFieldErrors(err))
		return
	}
	expected, err := h.classifier.Classify(c.Request.Context(), req.Input)
	if err != nil {
		HandleError(c, err, "failed to classify input")
		return
	}
	if !expected.SameClassification(req.Classification) {
		unprocessable(c, "classification does not match the submitted input", nil)
		return
	}
	req.Classification = *expected

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
		HandleError(c, err, "failed to create response")
		return
	}

	if err := h.responseRepo.Save(c.Request.Context(), response); err != nil {
		HandleError(c, err, "failed to save response")
		return
	}

	// Update study user progress if case belongs to a study
	if cs.StudyID != nil && h.studyService != nil {
		h.studyService.RefreshStudy(c.Request.Context(), *cs.StudyID)
	}

	c.JSON(http.StatusCreated, SubmitResponseResult{Response: response})
}

// GetMyResponses handles GET /api/cases/:id/my-responses
// Requires user to have access to the case.
func (h *CaseResponseHandler) GetMyResponses(c *gin.Context) {
	caseID, ok := parseID(c, "id", "invalid case id")
	if !ok {
		return
	}

	userID, err := auth.ParseUserID(c)
	if err != nil {
		unauthorized(c)
		return
	}
	if _, ok := loadCase(c, h.caseRepo, caseID); !ok {
		return
	}

	responses, err := h.responseRepo.GetByUserAndCase(c.Request.Context(), userID, caseID)
	if err != nil {
		HandleError(c, err, "failed to get responses")
		return
	}

	c.JSON(http.StatusOK, gin.H{"responses": responses})
}

// ListCaseResponses handles GET /api/admin/cases/:id/responses
func (h *CaseResponseHandler) ListCaseResponses(c *gin.Context) {
	id, ok := parseID(c, "id", "invalid case id")
	if !ok {
		return
	}
	if _, ok := loadCase(c, h.caseRepo, id); !ok {
		return
	}

	page, limit, offset := getPagination(c)

	responses, total, err := h.responseRepo.GetByCase(c.Request.Context(), id, limit, offset)
	if err != nil {
		HandleError(c, err, "failed to list responses")
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
	caseID, ok := parseID(c, "id", "invalid case id")
	if !ok {
		return
	}

	// Verify case is published
	cs, ok := loadCase(c, h.caseRepo, caseID)
	if !ok {
		return
	}
	if !cs.IsPublished() {
		notFound(c, "case not found")
		return
	}

	// Get all images for the case
	images, err := h.caseRepo.GetImages(c.Request.Context(), caseID)
	if err != nil {
		HandleError(c, err, "failed to get images")
		return
	}

	// Generate signed URLs for all images
	urls := make(map[string]SignedURLResponse, len(images))
	for _, img := range images {
		url, err := h.storage.GetSignedURL(c.Request.Context(), img.StoragePath, h.signedURLDuration)
		if errors.Is(err, domain.ErrStorageNotConfigured) {
			HandleError(c, fmt.Errorf("generate signed URLs: %w", err), "Failed to generate image URLs")
			return
		}
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
	caseID, ok := parseID(c, "id", "invalid case id")
	if !ok {
		return
	}

	imageID, ok := parseID(c, "imageId", "invalid image id")
	if !ok {
		return
	}

	// Verify case is published
	cs, ok := loadCase(c, h.caseRepo, caseID)
	if !ok {
		return
	}
	if !cs.IsPublished() {
		notFound(c, "case not found")
		return
	}

	// Get image
	image, err := h.caseRepo.GetImageByID(c.Request.Context(), imageID)
	if err != nil {
		HandleError(c, err, "failed to get image")
		return
	}
	if image == nil || image.CaseID != caseID {
		notFound(c, "image not found")
		return
	}

	// Generate signed URL
	url, err := h.storage.GetSignedURL(c.Request.Context(), image.StoragePath, h.signedURLDuration)
	if err != nil {
		HandleError(c, fmt.Errorf("generate signed URL: %w", err), "Failed to generate image URL")
		return
	}

	c.JSON(http.StatusOK, SignedURLResponse{
		URL:       url,
		ExpiresAt: time.Now().Add(h.signedURLDuration),
	})
}
