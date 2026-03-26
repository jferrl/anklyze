package api

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// CaseAccessHandler handles case browsing for authenticated users.
type CaseAccessHandler struct {
	caseRepo     repository.CaseRepository
	responseRepo repository.CaseResponseRepository
}

// NewCaseAccessHandler creates a new case access handler.
func NewCaseAccessHandler(
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
) *CaseAccessHandler {
	return &CaseAccessHandler{
		caseRepo:     caseRepo,
		responseRepo: responseRepo,
	}
}

// ListPublishedCases handles GET /api/cases
// Returns all published cases for any authenticated user.
// Uses batch loading to avoid N+1 query issues.
func (h *CaseAccessHandler) ListPublishedCases(c *gin.Context) {
	page, limit, offset := getPagination(c)

	uid, err := auth.ParseUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	cases, total, err := h.caseRepo.ListPublished(c.Request.Context(), limit, offset)
	if err != nil {
		slog.Error("failed to list cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list cases"})
		return
	}

	// Collect all case IDs for batch loading
	caseIDs := make([]uuid.UUID, len(cases))
	for i, cs := range cases {
		caseIDs[i] = cs.ID
	}

	// Batch load images (1 query instead of N)
	imagesMap, err := h.caseRepo.GetImagesForCases(c.Request.Context(), caseIDs)
	if err != nil {
		slog.Warn("failed to batch load images", "error", err)
		imagesMap = make(map[uuid.UUID][]domain.CaseImage)
	}

	// Batch load user responses (1 query instead of N)
	responsesMap, err := h.responseRepo.GetByUserAndCases(c.Request.Context(), uid, caseIDs)
	if err != nil {
		slog.Warn("failed to batch load responses", "error", err)
		responsesMap = make(map[uuid.UUID][]domain.CaseResponse)
	}

	// Count total published cases the user has responded to (across all pages)
	totalCompleted, err := h.responseRepo.CountRespondedPublishedCases(c.Request.Context(), uid)
	if err != nil {
		slog.Warn("failed to count responded cases", "error", err)
		totalCompleted = 0
	}

	// Build response using maps (O(1) lookup)
	items := make([]UserCaseItem, len(cases))
	for i, cs := range cases {
		images := imagesMap[cs.ID]
		responses := responsesMap[cs.ID]
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
		Cases:          items,
		Total:          total,
		TotalCompleted: totalCompleted,
		Page:           page,
		Limit:          limit,
	})
}

// GetPublishedCase handles GET /api/cases/:id
// Any authenticated user can view a published case.
func (h *CaseAccessHandler) GetPublishedCase(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid case id"})
		return
	}

	// Get user ID
	uid, err := auth.ParseUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
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

	images, err := h.caseRepo.GetImages(c.Request.Context(), id)
	if err != nil {
		slog.Warn("failed to get case images", "case_id", id, "error", err)
		images = []domain.CaseImage{}
	}

	// Get user's responses
	responses, err := h.responseRepo.GetByUserAndCase(c.Request.Context(), uid, id)
	if err != nil {
		slog.Warn("failed to get user responses", "case_id", id, "user_id", uid, "error", err)
		responses = []domain.CaseResponse{}
	}
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
		ID:              cs.ID,
		Title:           cs.Title,
		Description:     cs.Description,
		Status:          cs.Status,
		Deadline:        cs.Deadline,
		PublishedAt:     cs.PublishedAt,
		HasTACImages:    cs.HasTACImages,
		Images:          imageResponses,
		HasResponded:    hasResponded,
		MyResponseCount: myResponseCount,
		IsExpired:       cs.IsExpired(),
	})
}
