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
)

// StudyHandler handles study-related HTTP requests.
type StudyHandler struct {
	studyRepo         repository.StudyRepository
	studyResponseRepo repository.StudyResponseRepository
	caseRepo          repository.CaseRepository
	userRepo          repository.UserRepository
	studyService      StudyService
}

// NewStudyHandler creates a new study handler.
func NewStudyHandler(
	studyRepo repository.StudyRepository,
	studyResponseRepo repository.StudyResponseRepository,
	caseRepo repository.CaseRepository,
	userRepo repository.UserRepository,
	studyService StudyService,
) *StudyHandler {
	return &StudyHandler{
		studyRepo:         studyRepo,
		studyResponseRepo: studyResponseRepo,
		caseRepo:          caseRepo,
		userRepo:          userRepo,
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
	Title       *string `json:"title,omitempty" binding:"omitempty,min=1,max=255"`
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

// StudyGoldStandardResponse is the response for getting study gold standard accuracy.
type StudyGoldStandardResponse struct {
	*domain.StudyGoldStandardMetrics
	CalculatedAt time.Time `json:"calculated_at"`
}

// --- Handlers ---

// CreateStudy creates a new study.
func (h *StudyHandler) CreateStudy(c *gin.Context) {
	var req CreateStudyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "Invalid request body", err)
		return
	}

	userID, err := auth.ParseUserID(c)
	if err != nil {
		unauthorized(c)
		return
	}

	study := domain.NewStudy(userID, req.Title, req.Description)

	if err := h.studyRepo.Create(c.Request.Context(), study); err != nil {
		HandleError(c, err, "Failed to create study")
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
		HandleError(c, err, "Failed to list studies")
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
	id, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	study, ok := loadStudy(c, h.studyRepo, id)
	if !ok {
		return
	}

	// Get cases
	cases, err := h.studyRepo.GetCases(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "Failed to get study cases")
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
	id, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	var req UpdateStudyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "Invalid request body", err)
		return
	}

	study, ok := loadStudy(c, h.studyRepo, id)
	if !ok {
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
		HandleError(c, err, "Failed to update study")
		return
	}
	h.studyService.InvalidateStats(id) // cached metrics embed the study title

	c.JSON(http.StatusOK, study)
}

// DeleteStudy deletes a study.
func (h *StudyHandler) DeleteStudy(c *gin.Context) {
	id, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	if _, ok := loadStudy(c, h.studyRepo, id); !ok {
		return
	}

	if err := h.studyRepo.Delete(c.Request.Context(), id); err != nil {
		HandleError(c, err, "Failed to delete study")
		return
	}
	h.studyService.InvalidateStats(id)

	c.Status(http.StatusNoContent)
}

// --- Case Management ---

// AddAllPublishedCases adds all published cases (not already in any study) to a study.
func (h *StudyHandler) AddAllPublishedCases(c *gin.Context) {
	studyID, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	// Verify study exists and is draft
	study, ok := loadStudy(c, h.studyRepo, studyID)
	if !ok {
		return
	}
	if study.Status != domain.StudyStatusDraft {
		respond(c, http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, "Only draft studies can be modified")
		return
	}

	// Get all published cases not in any study
	published, _, err := h.caseRepo.List(c.Request.Context(), statusPtr(domain.CaseStatusPublished), 1000, 0)
	if err != nil {
		HandleError(c, err, "Failed to list published cases")
		return
	}

	// Get next case order
	nextOrder, err := h.studyRepo.GetNextCaseOrder(c.Request.Context(), studyID)
	if err != nil {
		HandleError(c, err, "Failed to determine case order")
		return
	}

	// Collect eligible cases for batch insert
	var assignments []repository.CaseAssignment
	for _, cs := range published {
		if cs.StudyID != nil {
			continue // already in a study
		}
		assignments = append(assignments, repository.CaseAssignment{
			CaseID:    cs.ID,
			CaseOrder: nextOrder,
		})
		nextOrder++
	}

	if len(assignments) > 0 {
		if err := h.studyService.AddCases(c.Request.Context(), studyID, assignments); err != nil {
			HandleError(c, err, "Failed to add cases to study")
			return
		}
	}

	c.JSON(http.StatusOK, AddAllCasesResponse{Added: len(assignments)})
}

// AddCase adds a case to a study.
func (h *StudyHandler) AddCase(c *gin.Context) {
	studyID, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	var req AddCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "Invalid request body", err)
		return
	}

	caseID, err := uuid.Parse(req.CaseID)
	if err != nil {
		badRequest(c, "Invalid case ID")
		return
	}

	if _, ok := loadStudy(c, h.studyRepo, studyID); !ok {
		return
	}

	// Verify case exists
	cs, ok := loadCase(c, h.caseRepo, caseID)
	if !ok {
		return
	}

	// Check if case is already in a study via StudyService
	inStudy, _, err := h.studyService.IsCaseInStudy(c.Request.Context(), caseID)
	if err != nil {
		HandleError(c, err, "Failed to check case study membership")
		return
	}
	if inStudy {
		respond(c, http.StatusConflict, CodeConflict, "Case is already assigned to a study")
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
			HandleError(c, err, "Failed to determine case order")
			return
		}
		caseOrder = nextOrder
	}

	// Delegate AddCase + UpdateCounters to StudyService
	if err := h.studyService.AddCase(c.Request.Context(), studyID, caseID, caseOrder); err != nil {
		HandleError(c, err, "Failed to add case to study")
		return
	}

	// Return the updated case
	cs.SetStudy(studyID, caseOrder)
	c.JSON(http.StatusCreated, cs)
}

// RemoveCase removes a case from a study.
func (h *StudyHandler) RemoveCase(c *gin.Context) {
	studyID, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	caseID, ok := parseID(c, "caseId", "Invalid case ID")
	if !ok {
		return
	}

	if _, ok := loadStudy(c, h.studyRepo, studyID); !ok {
		return
	}

	if err := h.studyService.RemoveCase(c.Request.Context(), studyID, caseID); err != nil {
		HandleError(c, err, "Failed to remove case from study")
		return
	}

	c.Status(http.StatusNoContent)
}

// ReorderCases reorders cases in a study.
func (h *StudyHandler) ReorderCases(c *gin.Context) {
	studyID, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	var req ReorderCasesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "Invalid request body", err)
		return
	}

	// Parse case IDs
	caseIDs := make([]uuid.UUID, len(req.CaseIDs))
	for i, idStr := range req.CaseIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			badRequest(c, "Invalid case ID: "+idStr)
			return
		}
		caseIDs[i] = id
	}

	if _, ok := loadStudy(c, h.studyRepo, studyID); !ok {
		return
	}

	if err := h.studyRepo.ReorderCases(c.Request.Context(), studyID, caseIDs); err != nil {
		HandleError(c, err, "Failed to reorder cases")
		return
	}

	c.Status(http.StatusNoContent)
}

// --- Status Transitions ---

// ActivateStudy activates a study (draft -> active).
func (h *StudyHandler) ActivateStudy(c *gin.Context) {
	id, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	study, ok := loadStudy(c, h.studyRepo, id)
	if !ok {
		return
	}

	if study.Status != domain.StudyStatusDraft {
		respond(c, http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, "Only draft studies can be activated")
		return
	}

	// Validate study has at least one case and one user
	cases, err := h.studyRepo.GetCases(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "Failed to validate study")
		return
	}
	if len(cases) == 0 {
		respond(c, http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, "Study must have at least one case")
		return
	}

	if err := h.studyRepo.Activate(c.Request.Context(), id); err != nil {
		HandleError(c, err, "Failed to activate study")
		return
	}

	study.Status = domain.StudyStatusActive
	c.JSON(http.StatusOK, study)
}

// CloseStudy closes a study.
func (h *StudyHandler) CloseStudy(c *gin.Context) {
	id, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	study, ok := loadStudy(c, h.studyRepo, id)
	if !ok {
		return
	}

	if err := h.studyRepo.Close(c.Request.Context(), id); err != nil {
		HandleError(c, err, "Failed to close study")
		return
	}

	study.Status = domain.StudyStatusClosed
	c.JSON(http.StatusOK, study)
}

// --- Analytics ---

// GetStudyReliabilityMetrics calculates and returns reliability metrics for a study.
func (h *StudyHandler) GetStudyReliabilityMetrics(c *gin.Context) {
	id, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	// Verify study exists first for proper 404 handling
	_, ok = loadStudy(c, h.studyRepo, id)
	if !ok {
		return
	}

	// Delegate data fetching + metric calculation to StudyService
	metrics, err := h.studyService.GetReliabilityMetrics(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "Failed to calculate reliability metrics")
		return
	}

	c.JSON(http.StatusOK, StudyReliabilityResponse{
		StudyReliabilityMetrics: metrics,
		CalculatedAt:            time.Now(),
	})
}

// GetStudyGoldStandardAccuracy calculates and returns gold standard accuracy for a study.
func (h *StudyHandler) GetStudyGoldStandardAccuracy(c *gin.Context) {
	id, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	// Verify study exists first for proper 404 handling
	_, ok = loadStudy(c, h.studyRepo, id)
	if !ok {
		return
	}

	metrics, err := h.studyService.GetGoldStandardMetrics(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "Failed to calculate gold standard accuracy")
		return
	}

	// Enrich per-rater accuracy with user display names
	if metrics != nil && len(metrics.PerRaterAccuracy) > 0 {
		h.enrichRaterNames(c.Request.Context(), metrics)
	}

	c.JSON(http.StatusOK, StudyGoldStandardResponse{
		StudyGoldStandardMetrics: metrics,
		CalculatedAt:             time.Now(),
	})
}

// enrichRaterNames populates user email and display name on per-rater accuracy entries.
func (h *StudyHandler) enrichRaterNames(ctx context.Context, metrics *domain.StudyGoldStandardMetrics) {
	userIDs := make([]uuid.UUID, len(metrics.PerRaterAccuracy))
	for i, pra := range metrics.PerRaterAccuracy {
		userIDs[i] = pra.UserID
	}

	users, err := h.userRepo.GetByIDs(ctx, userIDs)
	if err != nil {
		slog.Warn("failed to load user names for gold standard raters", "error", err)
		return
	}

	userMap := make(map[uuid.UUID]domain.User, len(users))
	for _, u := range users {
		userMap[u.ID] = u
	}

	for i := range metrics.PerRaterAccuracy {
		if u, ok := userMap[metrics.PerRaterAccuracy[i].UserID]; ok {
			metrics.PerRaterAccuracy[i].UserEmail = u.Email
			metrics.PerRaterAccuracy[i].UserDisplayName = u.DisplayName
		}
	}
}

// ExportStudyResponses exports all responses for a study as CSV.
func (h *StudyHandler) ExportStudyResponses(c *gin.Context) {
	studyID, ok := parseID(c, "id", "Invalid study ID")
	if !ok {
		return
	}

	_, ok = loadStudy(c, h.studyRepo, studyID)
	if !ok {
		return
	}

	cases, err := h.studyRepo.GetCases(c.Request.Context(), studyID)
	if err != nil {
		HandleError(c, err, "Failed to get study cases")
		return
	}

	responsesByCase, err := h.studyResponseRepo.GetAllByStudy(c.Request.Context(), studyID)
	if err != nil {
		HandleError(c, err, "Failed to export study responses")
		return
	}

	w := newCSVWriter(c, fmt.Sprintf("study_%s_responses.csv", studyID.String()[:8]))
	defer w.Flush()

	if err := w.Write([]string{"case_id", "case_title", "response_id", "user_id", "created_at", "time_taken_ms", "danis_weber", "lauge_hansen", "ao_ota", "bartonicek"}); err != nil {
		return
	}

	for _, cs := range cases {
		for _, r := range responsesByCase[cs.ID] {
			if err := w.Write([]string{
				cs.ID.String(),
				csvText(cs.Title),
				r.ID.String(),
				r.UserID.String(),
				r.CreatedAt.Format(time.RFC3339),
				strconv.FormatInt(r.TimeTakenMS, 10),
				csvTextPtr(r.DanisWeberType),
				csvTextPtr(r.LaugeHansenType),
				csvTextPtr(r.AOOTACode),
				csvTextPtr(r.BartonicekType),
			}); err != nil {
				return
			}
		}
	}
}

func statusPtr(s domain.CaseStatus) *domain.CaseStatus {
	return &s
}
