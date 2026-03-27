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
)

// StudyHandler handles study-related HTTP requests.
type StudyHandler struct {
	studyRepo         repository.StudyRepository
	studyResponseRepo repository.StudyResponseRepository
	caseRepo          repository.CaseRepository
	studyService      StudyService
}

// NewStudyHandler creates a new study handler.
func NewStudyHandler(
	studyRepo repository.StudyRepository,
	studyResponseRepo repository.StudyResponseRepository,
	caseRepo repository.CaseRepository,
	studyService StudyService,
) *StudyHandler {
	return &StudyHandler{
		studyRepo:         studyRepo,
		studyResponseRepo: studyResponseRepo,
		caseRepo:          caseRepo,
		studyService:      studyService,
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

// AddAllCasesResponse is the response for adding all published cases to a study.
type AddAllCasesResponse struct {
	Added int `json:"added"`
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

// StudyReliabilityResponse is the response for getting study reliability metrics.
type StudyReliabilityResponse struct {
	*domain.StudyReliabilityMetrics
	CalculatedAt time.Time `json:"calculated_at"`
}

// --- Handlers ---

// CreateStudy creates a new study.
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
func (h *StudyHandler) ListStudies(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > MaxPageSize {
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

// AddAllPublishedCases adds all published cases (not already in any study) to a study.
func (h *StudyHandler) AddAllPublishedCases(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

	// Verify study exists and is draft
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
	if study.Status != domain.StudyStatusDraft {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only draft studies can be modified"})
		return
	}

	// Get all published cases not in any study
	published, _, err := h.caseRepo.List(c.Request.Context(), statusPtr(domain.CaseStatusPublished), 1000, 0)
	if err != nil {
		slog.Error("failed to list published cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list published cases"})
		return
	}

	// Get next case order
	nextOrder, err := h.studyRepo.GetNextCaseOrder(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get next case order", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to determine case order"})
		return
	}

	added := 0
	for _, cs := range published {
		if cs.StudyID != nil {
			continue // already in a study
		}
		if err := h.studyService.AddCase(c.Request.Context(), studyID, cs.ID, nextOrder); err != nil {
			slog.Error("failed to add case", "error", err, "case_id", cs.ID)
			continue
		}
		nextOrder++
		added++
	}

	c.JSON(http.StatusOK, AddAllCasesResponse{Added: added})
}

// AddCase adds a case to a study.
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

// --- Status Transitions ---

// ActivateStudy activates a study (draft -> active).
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

	if err := h.studyRepo.Activate(c.Request.Context(), id); err != nil {
		slog.Error("failed to activate study", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate study"})
		return
	}

	study.Status = domain.StudyStatusActive
	c.JSON(http.StatusOK, study)
}

// CloseStudy closes a study.
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

// ExportStudyResponses exports all responses for a study as CSV.
func (h *StudyHandler) ExportStudyResponses(c *gin.Context) {
	studyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid study ID"})
		return
	}

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

	cases, err := h.studyRepo.GetCases(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get study cases", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get study cases"})
		return
	}

	responsesByCase, err := h.studyResponseRepo.GetAllByStudy(c.Request.Context(), studyID)
	if err != nil {
		slog.Error("failed to get study responses", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to export study responses"})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"study_%s_responses.csv\"", studyID.String()[:8]))

	if _, err := c.Writer.WriteString("case_id,case_title,response_id,user_id,created_at,time_taken_ms,danis_weber,lauge_hansen,ao_ota,bartonicek\n"); err != nil {
		return
	}

	for _, cs := range cases {
		responses := responsesByCase[cs.ID]
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

			line := fmt.Sprintf("%s,%s,%s,%s,%s,%d,%s,%s,%s,%s\n",
				cs.ID.String(),
				cs.Title,
				r.ID.String(),
				r.UserID.String(),
				r.CreatedAt.Format(time.RFC3339),
				r.TimeTakenMS,
				dw, lh, ao, bt,
			)
			if _, err := c.Writer.WriteString(line); err != nil {
				return
			}
		}
	}
}

func statusPtr(s domain.CaseStatus) *domain.CaseStatus {
	return &s
}
