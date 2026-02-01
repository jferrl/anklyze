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
	"github.com/jferrl/anklyze/internal/service"
)

// CohortHandler handles cohort-related HTTP requests.
type CohortHandler struct {
	cohortRepo         repository.CohortRepository
	cohortResponseRepo repository.CohortResponseRepository
	studyRepo          repository.StudyRepository
	userRepo           auth.UserService
	statsService       *service.StatisticsService
}

// NewCohortHandler creates a new cohort handler.
func NewCohortHandler(
	cohortRepo repository.CohortRepository,
	cohortResponseRepo repository.CohortResponseRepository,
	studyRepo repository.StudyRepository,
	userRepo auth.UserService,
	statsService *service.StatisticsService,
) *CohortHandler {
	return &CohortHandler{
		cohortRepo:         cohortRepo,
		cohortResponseRepo: cohortResponseRepo,
		studyRepo:          studyRepo,
		userRepo:           userRepo,
		statsService:       statsService,
	}
}

// --- Request/Response Types ---

// CreateCohortRequest is the request body for creating a cohort.
type CreateCohortRequest struct {
	Title       string `json:"title" binding:"required,max=255"`
	Description string `json:"description"`
}

// UpdateCohortRequest is the request body for updating a cohort.
type UpdateCohortRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
}

// AddCaseRequest is the request body for adding a case to a cohort.
type AddCaseRequest struct {
	StudyID   string `json:"study_id" binding:"required,uuid"`
	CaseOrder *int   `json:"case_order,omitempty"`
}

// ReorderCasesRequest is the request body for reordering cases in a cohort.
type ReorderCasesRequest struct {
	StudyIDs []string `json:"study_ids" binding:"required"`
}

// AddCohortUserRequest is the request body for adding a user to a cohort.
type AddCohortUserRequest struct {
	UserID string `json:"user_id" binding:"required,uuid"`
	Email  string `json:"email" binding:"required,email"`
}

// CohortListResponse is the response for listing cohorts.
type CohortListResponse struct {
	Cohorts []domain.StudyCohort `json:"cohorts"`
	Total   int64                `json:"total"`
	Page    int                  `json:"page"`
	Limit   int                  `json:"limit"`
}

// CohortDetailResponse is the response for getting a cohort with its cases.
type CohortDetailResponse struct {
	domain.CohortWithCases
}

// RaterProgressResponse is the response for getting rater progress.
type RaterProgressResponse struct {
	Raters []domain.RaterProgress `json:"raters"`
	Total  int                    `json:"total"`
}

// CohortReliabilityResponse is the response for getting cohort reliability metrics.
type CohortReliabilityResponse struct {
	*domain.CohortReliabilityMetrics
	CalculatedAt time.Time `json:"calculated_at"`
}

// --- Handlers ---

// CreateCohort creates a new study cohort.
// @Summary Create a new study cohort
// @Tags Admin Cohorts
// @Accept json
// @Produce json
// @Param request body CreateCohortRequest true "Cohort details"
// @Success 201 {object} domain.StudyCohort
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts [post]
func (h *CohortHandler) CreateCohort(c *gin.Context) {
	var req CreateCohortRequest
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

	cohort := domain.NewStudyCohort(userID, req.Title, req.Description)

	if err := h.cohortRepo.Create(c.Request.Context(), cohort); err != nil {
		slog.Error("failed to create cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cohort"})
		return
	}

	c.JSON(http.StatusCreated, cohort)
}

// ListCohorts lists all cohorts with optional status filter.
// @Summary List cohorts
// @Tags Admin Cohorts
// @Produce json
// @Param status query string false "Filter by status (draft, active, closed)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} CohortListResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts [get]
func (h *CohortHandler) ListCohorts(c *gin.Context) {
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
	var status *domain.CohortStatus
	if statusStr := c.Query("status"); statusStr != "" {
		s := domain.CohortStatus(statusStr)
		status = &s
	}

	cohorts, total, err := h.cohortRepo.List(c.Request.Context(), status, limit, offset)
	if err != nil {
		slog.Error("failed to list cohorts", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list cohorts"})
		return
	}

	c.JSON(http.StatusOK, CohortListResponse{
		Cohorts: cohorts,
		Total:   total,
		Page:    page,
		Limit:   limit,
	})
}

// GetCohort retrieves a cohort by ID with its cases.
// @Summary Get cohort details
// @Tags Admin Cohorts
// @Produce json
// @Param id path string true "Cohort ID"
// @Success 200 {object} CohortDetailResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id} [get]
func (h *CohortHandler) GetCohort(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	cohort, err := h.cohortRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort"})
		return
	}
	if cohort == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cohort not found"})
		return
	}

	// Get cases
	cases, err := h.cohortRepo.GetCases(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cohort cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort cases"})
		return
	}

	c.JSON(http.StatusOK, CohortDetailResponse{
		CohortWithCases: domain.CohortWithCases{
			StudyCohort: *cohort,
			Cases:       cases,
		},
	})
}

// UpdateCohort updates a cohort.
// @Summary Update a cohort
// @Tags Admin Cohorts
// @Accept json
// @Produce json
// @Param id path string true "Cohort ID"
// @Param request body UpdateCohortRequest true "Update data"
// @Success 200 {object} domain.StudyCohort
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id} [put]
func (h *CohortHandler) UpdateCohort(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	var req UpdateCohortRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	cohort, err := h.cohortRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort"})
		return
	}
	if cohort == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cohort not found"})
		return
	}

	// Update fields
	if req.Title != nil {
		cohort.Title = *req.Title
	}
	if req.Description != nil {
		cohort.Description = *req.Description
	}

	if err := h.cohortRepo.Update(c.Request.Context(), cohort); err != nil {
		slog.Error("failed to update cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cohort"})
		return
	}

	c.JSON(http.StatusOK, cohort)
}

// DeleteCohort deletes a cohort.
// @Summary Delete a cohort
// @Tags Admin Cohorts
// @Param id path string true "Cohort ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id} [delete]
func (h *CohortHandler) DeleteCohort(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	cohort, err := h.cohortRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort"})
		return
	}
	if cohort == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cohort not found"})
		return
	}

	if err := h.cohortRepo.Delete(c.Request.Context(), id); err != nil {
		slog.Error("failed to delete cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete cohort"})
		return
	}

	c.Status(http.StatusNoContent)
}

// --- Case Management ---

// AddCase adds a study as a case to a cohort.
// @Summary Add a case to a cohort
// @Tags Admin Cohorts
// @Accept json
// @Produce json
// @Param id path string true "Cohort ID"
// @Param request body AddCaseRequest true "Case details"
// @Success 201 {object} domain.Study
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/cases [post]
func (h *CohortHandler) AddCase(c *gin.Context) {
	cohortID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	var req AddCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	studyID, err := uuid.Parse(req.StudyID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	// Verify cohort exists
	cohort, err := h.cohortRepo.GetByID(c.Request.Context(), cohortID)
	if err != nil {
		slog.Error("failed to get cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort"})
		return
	}
	if cohort == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cohort not found"})
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

	// Check if study is already in a cohort
	if study.BelongsToCohort() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Study is already assigned to a cohort"})
		return
	}

	// Get case order
	caseOrder := 0
	if req.CaseOrder != nil {
		caseOrder = *req.CaseOrder
	} else {
		// Auto-assign next order
		nextOrder, err := h.cohortRepo.GetNextCaseOrder(c.Request.Context(), cohortID)
		if err != nil {
			slog.Error("failed to get next case order", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to determine case order"})
			return
		}
		caseOrder = nextOrder
	}

	if err := h.cohortRepo.AddCase(c.Request.Context(), cohortID, studyID, caseOrder); err != nil {
		slog.Error("failed to add case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add case to cohort"})
		return
	}

	// Update counters
	if err := h.cohortRepo.UpdateCounters(c.Request.Context(), cohortID); err != nil {
		slog.Error("failed to update counters", "error", err)
	}

	// Return the updated study
	study.SetCohort(cohortID, caseOrder)
	c.JSON(http.StatusCreated, study)
}

// RemoveCase removes a case from a cohort.
// @Summary Remove a case from a cohort
// @Tags Admin Cohorts
// @Param id path string true "Cohort ID"
// @Param studyId path string true "Study ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/cases/{studyId} [delete]
func (h *CohortHandler) RemoveCase(c *gin.Context) {
	cohortID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	studyID, err := uuid.Parse(c.Param("studyId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	if err := h.cohortRepo.RemoveCase(c.Request.Context(), cohortID, studyID); err != nil {
		slog.Error("failed to remove case", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove case from cohort"})
		return
	}

	// Update counters
	if err := h.cohortRepo.UpdateCounters(c.Request.Context(), cohortID); err != nil {
		slog.Error("failed to update counters", "error", err)
	}

	c.Status(http.StatusNoContent)
}

// ReorderCases reorders cases in a cohort.
// @Summary Reorder cases in a cohort
// @Tags Admin Cohorts
// @Accept json
// @Param id path string true "Cohort ID"
// @Param request body ReorderCasesRequest true "Ordered list of study IDs"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/cases/reorder [put]
func (h *CohortHandler) ReorderCases(c *gin.Context) {
	cohortID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	var req ReorderCasesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Parse study IDs
	studyIDs := make([]uuid.UUID, len(req.StudyIDs))
	for i, idStr := range req.StudyIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID: " + idStr})
			return
		}
		studyIDs[i] = id
	}

	if err := h.cohortRepo.ReorderCases(c.Request.Context(), cohortID, studyIDs); err != nil {
		slog.Error("failed to reorder cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reorder cases"})
		return
	}

	c.Status(http.StatusNoContent)
}

// --- User/Rater Management ---

// ListCohortUsers lists all users assigned to a cohort.
// @Summary List cohort users
// @Tags Admin Cohorts
// @Produce json
// @Param id path string true "Cohort ID"
// @Success 200 {object} []domain.CohortUser
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/users [get]
func (h *CohortHandler) ListCohortUsers(c *gin.Context) {
	cohortID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	users, err := h.cohortRepo.GetUsers(c.Request.Context(), cohortID)
	if err != nil {
		slog.Error("failed to list cohort users", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list cohort users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

// AddCohortUser assigns a user as a rater to a cohort.
// @Summary Add user to cohort
// @Tags Admin Cohorts
// @Accept json
// @Produce json
// @Param id path string true "Cohort ID"
// @Param request body AddCohortUserRequest true "User details"
// @Success 201 {object} domain.CohortUser
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/users [post]
func (h *CohortHandler) AddCohortUser(c *gin.Context) {
	cohortID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	var req AddCohortUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user is already in cohort
	hasAccess, err := h.cohortRepo.HasAccess(c.Request.Context(), cohortID, userID)
	if err != nil {
		slog.Error("failed to check access", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check user access"})
		return
	}
	if hasAccess {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is already assigned to this cohort"})
		return
	}

	if err := h.cohortRepo.AddUser(c.Request.Context(), cohortID, userID, req.Email); err != nil {
		slog.Error("failed to add cohort user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add user to cohort"})
		return
	}

	// Update counters
	if err := h.cohortRepo.UpdateCounters(c.Request.Context(), cohortID); err != nil {
		slog.Error("failed to update counters", "error", err)
	}

	cohortUser := domain.NewCohortUser(cohortID, userID, req.Email)
	c.JSON(http.StatusCreated, cohortUser)
}

// RemoveCohortUser removes a user from a cohort.
// @Summary Remove user from cohort
// @Tags Admin Cohorts
// @Param id path string true "Cohort ID"
// @Param userId path string true "User ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/users/{userId} [delete]
func (h *CohortHandler) RemoveCohortUser(c *gin.Context) {
	cohortID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.cohortRepo.RemoveUser(c.Request.Context(), cohortID, userID); err != nil {
		slog.Error("failed to remove cohort user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user from cohort"})
		return
	}

	// Update counters
	if err := h.cohortRepo.UpdateCounters(c.Request.Context(), cohortID); err != nil {
		slog.Error("failed to update counters", "error", err)
	}

	c.Status(http.StatusNoContent)
}

// GetRaterProgress gets completion progress for all raters in a cohort.
// @Summary Get rater progress
// @Tags Admin Cohorts
// @Produce json
// @Param id path string true "Cohort ID"
// @Success 200 {object} RaterProgressResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/progress [get]
func (h *CohortHandler) GetRaterProgress(c *gin.Context) {
	cohortID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	progress, err := h.cohortRepo.GetRaterProgress(c.Request.Context(), cohortID)
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

// ActivateCohort activates a cohort (draft -> active).
// @Summary Activate a cohort
// @Tags Admin Cohorts
// @Param id path string true "Cohort ID"
// @Success 200 {object} domain.StudyCohort
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/activate [put]
func (h *CohortHandler) ActivateCohort(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	cohort, err := h.cohortRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort"})
		return
	}
	if cohort == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cohort not found"})
		return
	}

	if cohort.Status != domain.CohortStatusDraft {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only draft cohorts can be activated"})
		return
	}

	// Validate cohort has at least one case and one user
	cases, err := h.cohortRepo.GetCases(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate cohort"})
		return
	}
	if len(cases) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cohort must have at least one case"})
		return
	}

	users, err := h.cohortRepo.GetUsers(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get users", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate cohort"})
		return
	}
	if len(users) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cohort must have at least one assigned rater"})
		return
	}

	if err := h.cohortRepo.Activate(c.Request.Context(), id); err != nil {
		slog.Error("failed to activate cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate cohort"})
		return
	}

	cohort.Status = domain.CohortStatusActive
	c.JSON(http.StatusOK, cohort)
}

// CloseCohort closes a cohort.
// @Summary Close a cohort
// @Tags Admin Cohorts
// @Param id path string true "Cohort ID"
// @Success 200 {object} domain.StudyCohort
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/close [put]
func (h *CohortHandler) CloseCohort(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	cohort, err := h.cohortRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort"})
		return
	}
	if cohort == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cohort not found"})
		return
	}

	if err := h.cohortRepo.Close(c.Request.Context(), id); err != nil {
		slog.Error("failed to close cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to close cohort"})
		return
	}

	cohort.Status = domain.CohortStatusClosed
	c.JSON(http.StatusOK, cohort)
}

// --- Analytics ---

// GetCohortReliabilityMetrics calculates and returns reliability metrics for a cohort.
// @Summary Get cohort reliability metrics
// @Tags Admin Cohorts
// @Produce json
// @Param id path string true "Cohort ID"
// @Success 200 {object} CohortReliabilityResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/admin/cohorts/{id}/reliability [get]
func (h *CohortHandler) GetCohortReliabilityMetrics(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cohort ID"})
		return
	}

	cohort, err := h.cohortRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cohort", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort"})
		return
	}
	if cohort == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cohort not found"})
		return
	}

	// Get cases
	cases, err := h.cohortRepo.GetCases(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort cases"})
		return
	}

	if len(cases) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cohort has no cases"})
		return
	}

	// Get responses for all cases
	responsesByCase, err := h.cohortResponseRepo.GetAllByCohort(c.Request.Context(), id)
	if err != nil {
		slog.Error("failed to get responses", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cohort responses"})
		return
	}

	// Calculate metrics
	metrics, err := h.statsService.CalculateCohortReliabilityMetrics(cohort, cases, responsesByCase)
	if err != nil {
		slog.Error("failed to calculate metrics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate reliability metrics"})
		return
	}

	c.JSON(http.StatusOK, CohortReliabilityResponse{
		CohortReliabilityMetrics: metrics,
		CalculatedAt:             time.Now(),
	})
}
