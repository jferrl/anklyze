package api

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// StudyHandler handles study-related HTTP requests.
type StudyHandler struct {
	studyRepo    repository.StudyRepository
	caseRepo     repository.CaseRepository
	userRepo     auth.UserService
	studyService StudyService
}

// NewStudyHandler creates a new study handler.
func NewStudyHandler(
	studyRepo repository.StudyRepository,
	caseRepo repository.CaseRepository,
	userRepo auth.UserService,
	studyService StudyService,
) *StudyHandler {
	return &StudyHandler{
		studyRepo:    studyRepo,
		caseRepo:     caseRepo,
		userRepo:     userRepo,
		studyService: studyService,
	}
}

// --- Request/Response Types ---

// CreateStudyRequest is the request body for creating a study.
type CreateStudyRequest struct {
	Title       string `json:"title" binding:"required,max=255"`
	Description string `json:"description"`
}

// UpdateStudyRequest is the request body for updating a study.
type UpdateStudyRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
}

// AddCaseRequest is the request body for adding a case to a study.
type AddCaseRequest struct {
	CaseID    string `json:"case_id" binding:"required,uuid"`
	CaseOrder *int   `json:"case_order,omitempty"`
}

// ReorderCasesRequest is the request body for reordering cases in a study.
type ReorderCasesRequest struct {
	CaseIDs []string `json:"case_ids" binding:"required"`
}

// AddStudyRaterRequest is the request body for adding a user to a study.
type AddStudyRaterRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// StudyListResponse is the response for listing studies.
type StudyListResponse struct {
	Studies []domain.Study `json:"studies"`
	Total   int64          `json:"total"`
	Page    int            `json:"page"`
	Limit   int            `json:"limit"`
}

// StudyDetailResponse is the response for getting a study with its cases.
type StudyDetailResponse struct {
	domain.StudyWithCases
}

// RaterProgressResponse is the response for getting rater progress.
type RaterProgressResponse struct {
	Raters []domain.RaterProgress `json:"raters"`
	Total  int                    `json:"total"`
}

// StudyReliabilityResponse is the response for getting study reliability metrics.
type StudyReliabilityResponse struct {
	*domain.StudyReliabilityMetrics
	CalculatedAt time.Time `json:"calculated_at"`
}

// --- Handlers ---

// CreateStudy creates a new study.
// @Summary Create a new study
// @Tags Admin Studies
// @Accept json
// @Produce json
// @Param request body CreateStudyRequest true "Study details"
// @Success 201 {object} domain.Study
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies [post]
func (h *StudyHandler) CreateStudy(c *gin.Context) {
	var req CreateStudyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Get current user from context
	userIDStr, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	study := domain.NewStudy(userID, req.Title, req.Description)

	if err := h.studyRepo.Create(c.Request.Context(), study); err != nil {
		slog.Error("failed to create study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create study"})
		return
	}

	c.JSON(http.StatusCreated, study)
}

// ListStudies lists all studies with optional status filter.
// @Summary List studies
// @Tags Admin Studies
// @Produce json
// @Param status query string false "Filter by status (draft, active, closed)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} StudyListResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies [get]
func (h *StudyHandler) ListStudies(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Parse status filter
	var status *domain.StudyStatus
	if statusStr := c.Query("status"); statusStr != "" {
		s := domain.StudyStatus(statusStr)
		status = &s
	}

	studies, total, err := h.studyRepo.List(c.Request.Context(), status, limit, offset)
	if err != nil {
		slog.Error("failed to list studies", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list studies"})
		return
	}

	c.JSON(http.StatusOK, StudyListResponse{
		Studies: studies,
		Total:   total,
		Page:    page,
		Limit:   limit,
	})
}

// GetStudy retrieves a study by ID with its cases.
// @Summary Get study details
// @Tags Admin Studies
// @Produce json
// @Param id path string true "Study ID"
// @Success 200 {object} StudyDetailResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id} [get]
func (h *StudyHandler) GetStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Study not found"})
		return
	}

	// Get cases
	cases, err := h.studyRepo.GetCases(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study cases"})
		return
	}

	c.JSON(http.StatusOK, StudyDetailResponse{
		StudyWithCases: domain.StudyWithCases{
			Study: *study,
			Cases: cases,
		},
	})
}

// UpdateStudy updates a study.
// @Summary Update a study
// @Tags Admin Studies
// @Accept json
// @Produce json
// @Param id path string true "Study ID"
// @Param request body UpdateStudyRequest true "Update data"
// @Success 200 {object} domain.Study
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id} [put]
func (h *StudyHandler) UpdateStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	var req UpdateStudyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Study not found"})
		return
	}

	// Update fields
	if req.Title != nil {
		study.Title = *req.Title
	}
	if req.Description != nil {
		study.Description = *req.Description
	}

	if err := h.studyRepo.Update(c.Request.Context(), study); err != nil {
		slog.Error("failed to update study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update study"})
		return
	}

	c.JSON(http.StatusOK, study)
}

// DeleteStudy deletes a study.
// @Summary Delete a study
// @Tags Admin Studies
// @Param id path string true "Study ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id} [delete]
func (h *StudyHandler) DeleteStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Study not found"})
		return
	}

	if err := h.studyRepo.Delete(c.Request.Context(), id); err != nil {
		slog.Error("failed to delete study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete study"})
		return
	}

	c.Status(http.StatusNoContent)
}

// --- Case Management ---

// AddCase adds a case to a study.
// @Summary Add a case to a study
// @Tags Admin Studies
// @Accept json
// @Produce json
// @Param id path string true "Study ID"
// @Param request body AddCaseRequest true "Case details"
// @Success 201 {object} domain.Case
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/cases [post]
func (h *StudyHandler) AddCase(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	var req AddCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	caseID, err := uuid.Parse(req.CaseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid case ID"})
		return
	}

	// Verify study exists
	study, err := h.studyRepo.GetByID(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Study not found"})
		return
	}

	// Verify case exists
	cs, err := h.caseRepo.GetByID(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to get case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get case"})
		return
	}
	if cs == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Case not found"})
		return
	}

	// Check if case is already in a study via StudyService
	inStudy, _, err := h.studyService.IsCaseInStudy(c.Request.Context(), caseID)
	if err != nil {
		slog.Error("failed to check study membership", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check case study membership"})
		return
	}
	if inStudy {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Case is already assigned to a study"})
		return
	}

	// Get case order
	caseOrder := 0
	if req.CaseOrder != nil {
		caseOrder = *req.CaseOrder
	} else {
		// Auto-assign next order
		nextOrder, err := h.studyRepo.GetNextCaseOrder(c.Request.Context(), studyID)
		if err != nil {
			slog.Error("failed to get next case order", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to determine case order"})
			return
		}
		caseOrder = nextOrder
	}

	// Delegate AddCase + UpdateCounters to StudyService
	if err := h.studyService.AddCase(c.Request.Context(), studyID, caseID, caseOrder); err != nil {
		slog.Error("failed to add case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add case to study"})
		return
	}

	// Return the updated case
	cs.SetStudy(studyID, caseOrder)
	c.JSON(http.StatusCreated, cs)
}

// RemoveCase removes a case from a study.
// @Summary Remove a case from a study
// @Tags Admin Studies
// @Param id path string true "Study ID"
// @Param caseId path string true "Case ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/cases/{caseId} [delete]
func (h *StudyHandler) RemoveCase(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	caseID, err := uuid.Parse(c.Param("caseId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid case ID"})
		return
	}

	if err := h.studyService.RemoveCase(c.Request.Context(), studyID, caseID); err != nil {
		slog.Error("failed to remove case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove case from study"})
		return
	}

	c.Status(http.StatusNoContent)
}

// ReorderCases reorders cases in a study.
// @Summary Reorder cases in a study
// @Tags Admin Studies
// @Accept json
// @Param id path string true "Study ID"
// @Param request body ReorderCasesRequest true "Ordered list of case IDs"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/cases/reorder [put]
func (h *StudyHandler) ReorderCases(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	var req ReorderCasesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Parse case IDs
	caseIDs := make([]uuid.UUID, len(req.CaseIDs))
	for i, idStr := range req.CaseIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid case ID: " + idStr})
			return
		}
		caseIDs[i] = id
	}

	if err := h.studyRepo.ReorderCases(c.Request.Context(), studyID, caseIDs); err != nil {
		slog.Error("failed to reorder cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reorder cases"})
		return
	}

	c.Status(http.StatusNoContent)
}

// --- User/Rater Management ---

// StudyRatersResponse is the response for listing study raters.
type StudyRatersResponse struct {
	Raters []domain.StudyRater `json:"raters"`
	Total  int                 `json:"total"`
}

// ListStudyRaters lists all users assigned to a study.
// @Summary List study raters
// @Tags Admin Studies
// @Produce json
// @Param id path string true "Study ID"
// @Success 200 {object} StudyRatersResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/raters [get]
func (h *StudyHandler) ListStudyRaters(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	raters, err := h.studyRepo.GetRaters(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to list study raters", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list study raters"})
		return
	}

	c.JSON(http.StatusOK, StudyRatersResponse{
		Raters: raters,
		Total:  len(raters),
	})
}

// AddStudyRater assigns a user as a rater to a study.
// @Summary Add rater to study
// @Tags Admin Studies
// @Accept json
// @Produce json
// @Param id path string true "Study ID"
// @Param request body AddStudyRaterRequest true "User details"
// @Success 201 {object} domain.StudyRater
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/raters [post]
func (h *StudyHandler) AddStudyRater(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	var req AddStudyRaterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Look up user by email
	user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		slog.Error("failed to look up user by email", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to look up user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found. The user must have logged in at least once before being added as a rater."})
		return
	}

	userID := user.ID

	// Check if user is already in study
	hasAccess, err := h.studyRepo.HasAccess(c.Request.Context(), studyID, userID)
	if err != nil {
		slog.Error("failed to check access", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check user access"})
		return
	}
	if hasAccess {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is already assigned to this study"})
		return
	}

	if err := h.studyRepo.AddRater(c.Request.Context(), studyID, userID, req.Email); err != nil {
		slog.Error("failed to add study rater", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add rater to study"})
		return
	}

	// Update counters
	if err := h.studyRepo.UpdateCounters(c.Request.Context(), studyID); err != nil {
		slog.Error("failed to update counters", "error", err)
	}

	studyRater := domain.NewStudyRater(studyID, userID, req.Email)
	c.JSON(http.StatusCreated, studyRater)
}

// RemoveStudyRater removes a rater from a study.
// @Summary Remove rater from study
// @Tags Admin Studies
// @Param id path string true "Study ID"
// @Param userId path string true "User ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/raters/{userId} [delete]
func (h *StudyHandler) RemoveStudyRater(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.studyRepo.RemoveRater(c.Request.Context(), studyID, userID); err != nil {
		slog.Error("failed to remove study rater", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove rater from study"})
		return
	}

	// Update counters
	if err := h.studyRepo.UpdateCounters(c.Request.Context(), studyID); err != nil {
		slog.Error("failed to update counters", "error", err)
	}

	c.Status(http.StatusNoContent)
}

// GetRaterProgress gets completion progress for all raters in a study.
// @Summary Get rater progress
// @Tags Admin Studies
// @Produce json
// @Param id path string true "Study ID"
// @Success 200 {object} RaterProgressResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/progress [get]
func (h *StudyHandler) GetRaterProgress(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	progress, err := h.studyRepo.GetRaterProgress(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get rater progress", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rater progress"})
		return
	}

	c.JSON(http.StatusOK, RaterProgressResponse{
		Raters: progress,
		Total:  len(progress),
	})
}

// --- Status Transitions ---

// ActivateStudy activates a study (draft -> active).
// @Summary Activate a study
// @Tags Admin Studies
// @Param id path string true "Study ID"
// @Success 200 {object} domain.Study
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/activate [put]
func (h *StudyHandler) ActivateStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Study not found"})
		return
	}

	if study.Status != domain.StudyStatusDraft {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only draft studies can be activated"})
		return
	}

	// Validate study has at least one case and one user
	cases, err := h.studyRepo.GetCases(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate study"})
		return
	}
	if len(cases) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Study must have at least one case"})
		return
	}

	raters, err := h.studyRepo.GetRaters(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get raters", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate study"})
		return
	}
	if len(raters) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Study must have at least one assigned rater"})
		return
	}

	if err := h.studyRepo.Activate(c.Request.Context(), id); err != nil {
		slog.Error("failed to activate study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate study"})
		return
	}

	study.Status = domain.StudyStatusActive
	c.JSON(http.StatusOK, study)
}

// CloseStudy closes a study.
// @Summary Close a study
// @Tags Admin Studies
// @Param id path string true "Study ID"
// @Success 200 {object} domain.Study
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/close [put]
func (h *StudyHandler) CloseStudy(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Study not found"})
		return
	}

	if err := h.studyRepo.Close(c.Request.Context(), id); err != nil {
		slog.Error("failed to close study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to close study"})
		return
	}

	study.Status = domain.StudyStatusClosed
	c.JSON(http.StatusOK, study)
}

// --- Analytics ---

// GetStudyReliabilityMetrics calculates and returns reliability metrics for a study.
// @Summary Get study reliability metrics
// @Tags Admin Studies
// @Produce json
// @Param id path string true "Study ID"
// @Success 200 {object} StudyReliabilityResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/studies/{id}/reliability [get]
func (h *StudyHandler) GetStudyReliabilityMetrics(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	// Verify study exists first for proper 404 handling
	study, err := h.studyRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study"})
		return
	}
	if study == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Study not found"})
		return
	}

	// Delegate data fetching + metric calculation to StudyService
	metrics, err := h.studyService.GetReliabilityMetrics(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to calculate metrics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate reliability metrics"})
		return
	}

	c.JSON(http.StatusOK, StudyReliabilityResponse{
		StudyReliabilityMetrics: metrics,
		CalculatedAt:            time.Now(),
	})
}
