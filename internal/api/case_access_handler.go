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

// CaseAccessHandler handles user access management and case browsing.
type CaseAccessHandler struct {
	caseRepo     repository.CaseRepository
	responseRepo repository.CaseResponseRepository
	userRepo     auth.UserService
}

// NewCaseAccessHandler creates a new case access handler.
func NewCaseAccessHandler(
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	userRepo auth.UserService,
) *CaseAccessHandler {
	return &CaseAccessHandler{
		caseRepo:     caseRepo,
		responseRepo: responseRepo,
		userRepo:     userRepo,
	}
}

// ListPublishedCases handles GET /api/cases
// Returns cases the user has been granted access to, or all published cases for admins.
// Uses batch loading to avoid N+1 query issues.
func (h *CaseAccessHandler) ListPublishedCases(c *gin.Context) {
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
		Cases: items,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// GetPublishedCase handles GET /api/cases/:id
// Requires user to have access to the case, or be an admin.
func (h *CaseAccessHandler) GetPublishedCase(c *gin.Context) {
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

// ListCaseUsers handles GET /api/admin/cases/:id/users
func (h *CaseAccessHandler) ListCaseUsers(c *gin.Context) {
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
func (h *CaseAccessHandler) AddCaseUser(c *gin.Context) {
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
func (h *CaseAccessHandler) RemoveCaseUser(c *gin.Context) {
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
