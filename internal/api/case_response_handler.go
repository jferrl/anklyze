package api

import (
	"context"
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

	// Check study access - if case belongs to a study, verify user is assigned to it.
	// StudyService.ValidateResponseSubmission is a no-op when the case is not in a study.
	if h.studyService != nil {
		if err := h.studyService.ValidateResponseSubmission(c.Request.Context(), caseID, userID); err != nil {
			HandleError(c, err, "Cannot submit response")
			return
		}
	}

	// Check if user has already responded (needed for single-response check)
	hasResponded := false
	if !cs.AllowMultipleResponses {
		var err error
		hasResponded, err = h.responseRepo.HasUserResponded(c.Request.Context(), userID, caseID)
		if err != nil {
			slog.Error("failed to check existing response", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check response status"})
			return
		}
	}

	// Validate response submission using domain logic
	if err := cs.ValidateResponseSubmission(auth.IsAdmin(c), hasResponded); err != nil {
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

	// Save response (async)
	if err := h.responseRepo.Save(c.Request.Context(), response); err != nil {
		slog.Error("failed to save response", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save response"})
		return
	}

	// Update case counters in background with detached context
	// Use context.Background() since these operations must complete after response is sent
	// (request context gets cancelled when the HTTP response is sent)
	go func() {
		// Create background context with timeout to prevent infinite hangs
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Log errors instead of ignoring them (Uber Go Style: handle errors once)
		if err := h.caseRepo.IncrementResponseCount(bgCtx, caseID); err != nil {
			slog.Error("failed to increment response count",
				"error", err,
				"case_id", caseID,
			)
		}

		count, err := h.responseRepo.CountUniqueUsersByCase(bgCtx, caseID)
		if err != nil {
			slog.Error("failed to count unique users",
				"error", err,
				"case_id", caseID,
			)
			return // Don't continue if count failed
		}

		if err := h.caseRepo.UpdateUniqueUsers(bgCtx, caseID, int(count)); err != nil {
			slog.Error("failed to update unique users",
				"error", err,
				"case_id", caseID,
				"count", count,
			)
		}

		// Update study user progress if case belongs to a study.
		if cs.StudyID != nil && h.studyService != nil {
			h.studyService.UpdateProgressAfterResponse(bgCtx, *cs.StudyID, caseID, userID)
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

			if comparison := cs.CompareWithReference(&req.Classification); comparison != nil {
				result.MatchesDanisWeber = &comparison.DanisWeberMatch
				result.MatchesLaugeHansen = &comparison.LaugeHansenMatch
				result.MatchesAOOTA = &comparison.AOOTAMatch
				result.MatchesBartonicek = &comparison.BartonicekMatch
			}
		}
	}

	c.JSON(http.StatusCreated, result)
}

// GetMyResponses handles GET /api/cases/:id/my-responses
// Requires user to have access to the case.
func (h *CaseResponseHandler) GetMyResponses(c *gin.Context) {
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
