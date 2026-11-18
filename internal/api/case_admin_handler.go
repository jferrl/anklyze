package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/storage"
)

// CaseAdminHandler handles admin CRUD operations for cases.
type CaseAdminHandler struct {
	caseRepo     repository.CaseRepository
	storage      storage.Storage
	statsService StatisticsService
	studyService StudyService
}

// NewCaseAdminHandler creates a new case admin handler.
func NewCaseAdminHandler(
	caseRepo repository.CaseRepository,
	storage storage.Storage,
	statsService StatisticsService,
	studyService StudyService,
) *CaseAdminHandler {
	return &CaseAdminHandler{
		caseRepo:     caseRepo,
		storage:      storage,
		statsService: statsService,
		studyService: studyService,
	}
}

// GetDashboard handles GET /api/admin/cases/dashboard
func (h *CaseAdminHandler) GetDashboard(c *gin.Context) {
	ctx := c.Request.Context()

	stats, err := h.caseRepo.GetDashboardStats(ctx)
	if err != nil {
		HandleError(c, err, "failed to get dashboard stats")
		return
	}

	recentCases, err := h.caseRepo.GetRecentActiveCases(ctx, 5)
	if err != nil {
		HandleError(c, err, "failed to get recent cases")
		return
	}

	attentionCases, err := h.caseRepo.GetCasesNeedingAttention(ctx, 5)
	if err != nil {
		HandleError(c, err, "failed to get attention cases")
		return
	}

	c.JSON(http.StatusOK, domain.DashboardResponse{
		Stats:                 *stats,
		RecentActiveCases:     recentCases,
		CasesNeedingAttention: attentionCases,
	})
}

// CreateCase handles POST /api/admin/cases
func (h *CaseAdminHandler) CreateCase(c *gin.Context) {
	var req CreateCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "invalid request", err)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, err := auth.ParseUserID(c)
	if err != nil {
		unauthorized(c)
		return
	}

	cs := domain.NewCase(userID, req.Title, req.Description, req.Deadline)

	if err := h.caseRepo.Create(c.Request.Context(), cs); err != nil {
		HandleError(c, err, "failed to create case")
		return
	}

	c.JSON(http.StatusCreated, cs)
}

// ListCases handles GET /api/admin/cases
func (h *CaseAdminHandler) ListCases(c *gin.Context) {
	page, limit, offset := getPagination(c)

	var status *domain.CaseStatus
	if s := c.Query("status"); s != "" {
		st := domain.CaseStatus(s)
		status = &st
	}

	cases, total, err := h.caseRepo.List(c.Request.Context(), status, limit, offset)
	if err != nil {
		HandleError(c, err, "failed to list cases")
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
func (h *CaseAdminHandler) GetCase(c *gin.Context) {
	id, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
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
// Draft: title, description and deadline. Published: description and deadline.
// Closed: nothing. A field the status does not allow is rejected, not ignored,
// so raters never see a silently different case. A null deadline clears it.
func (h *CaseAdminHandler) UpdateCase(c *gin.Context) {
	_, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	var req UpdateCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "invalid request", err)
		return
	}

	if req.Title != nil && !cs.CanBeEdited() {
		HandleError(c, fmt.Errorf("%w: title can only be edited on draft cases", domain.ErrInvalidStateTransition), "Cannot update case")
		return
	}
	if (req.Description != nil || req.Deadline.Set) && cs.Status == domain.CaseStatusClosed {
		HandleError(c, fmt.Errorf("%w: closed cases cannot be edited", domain.ErrInvalidStateTransition), "Cannot update case")
		return
	}

	if req.Title != nil {
		cs.Title = *req.Title
	}
	if req.Description != nil {
		cs.Description = *req.Description
	}
	if req.Deadline.Set {
		cs.Deadline = req.Deadline.Value
	}

	if err := h.caseRepo.Update(c.Request.Context(), cs); err != nil {
		HandleError(c, err, "failed to update case")
		return
	}

	c.JSON(http.StatusOK, cs)
}

// DeleteCase handles DELETE /api/admin/cases/:id
func (h *CaseAdminHandler) DeleteCase(c *gin.Context) {
	id, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
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
		HandleError(c, err, "failed to delete case")
		return
	}

	// The case's responses went with it; recount and drop cached stats for its study.
	if cs.StudyID != nil {
		h.studyService.RefreshStudy(c.Request.Context(), *cs.StudyID)
	}

	c.Status(http.StatusNoContent)
}

// PublishCase handles PUT /api/admin/cases/:id/publish
func (h *CaseAdminHandler) PublishCase(c *gin.Context) {
	id, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	// Check if case has images and validate publish preconditions
	images, _ := h.caseRepo.GetImages(c.Request.Context(), id)
	if err := cs.CanPublish(len(images) > 0); err != nil {
		HandleError(c, err, "Cannot publish case")
		return
	}

	if err := h.caseRepo.Publish(c.Request.Context(), id); err != nil {
		HandleError(c, err, "failed to publish case")
		return
	}

	// Refresh case data
	cs, ok = loadCase(c, h.caseRepo, id)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, cs)
}

// CloseCase handles PUT /api/admin/cases/:id/close
func (h *CaseAdminHandler) CloseCase(c *gin.Context) {
	id, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	if err := cs.CanClose(); err != nil {
		HandleError(c, err, "Cannot close case")
		return
	}

	if err := h.caseRepo.Close(c.Request.Context(), id); err != nil {
		HandleError(c, err, "failed to close case")
		return
	}

	// Refresh case data
	cs, ok = loadCase(c, h.caseRepo, id)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, cs)
}

// SetGoldStandard handles PUT /api/admin/cases/:id/gold-standard
// Sets or clears the gold standard classification for a case.
// Only allowed on draft or published cases.
func (h *CaseAdminHandler) SetGoldStandard(c *gin.Context) {
	_, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	if cs.Status == domain.CaseStatusClosed {
		respond(c, http.StatusConflict, CodeConflict, "cannot set gold standard on a closed case")
		return
	}

	var req SetGoldStandardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "invalid request", err)
		return
	}

	// Build ClassificationResult from request
	result := buildGoldStandardResult(req)

	if err := cs.SetGoldStandard(result); err != nil {
		HandleError(c, err, "failed to set gold standard")
		return
	}

	if err := h.caseRepo.Update(c.Request.Context(), cs); err != nil {
		HandleError(c, err, "failed to update case")
		return
	}

	c.JSON(http.StatusOK, cs)
}

// DeleteGoldStandard handles DELETE /api/admin/cases/:id/gold-standard
// Clears the gold standard classification for a case.
// Only allowed on draft or published cases.
func (h *CaseAdminHandler) DeleteGoldStandard(c *gin.Context) {
	_, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	if cs.Status == domain.CaseStatusClosed {
		respond(c, http.StatusConflict, CodeConflict, "cannot modify gold standard on a closed case")
		return
	}

	if err := cs.SetGoldStandard(nil); err != nil {
		HandleError(c, err, "failed to clear gold standard")
		return
	}

	if err := h.caseRepo.Update(c.Request.Context(), cs); err != nil {
		HandleError(c, err, "failed to update case")
		return
	}

	c.Status(http.StatusNoContent)
}

// buildGoldStandardResult converts a SetGoldStandardRequest to a ClassificationResult.
// Returns nil if all fields are empty (clears gold standard).
func buildGoldStandardResult(req SetGoldStandardRequest) *domain.ClassificationResult {
	if req.DanisWeber == nil && req.LaugeHansen == nil && req.AOOTA == nil && req.Bartonicek == nil && !req.Impossible {
		return nil
	}

	result := &domain.ClassificationResult{
		Impossible: req.Impossible,
	}

	if req.DanisWeber != nil {
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberType(*req.DanisWeber),
		}
	}
	if req.LaugeHansen != nil {
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenType(*req.LaugeHansen),
		}
	}
	if req.AOOTA != nil {
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTACode(*req.AOOTA),
		}
	}
	if req.Bartonicek != nil {
		result.Bartonicek = &domain.BartonicekClassification{
			Type: domain.BartonicekType(*req.Bartonicek),
		}
	}

	return result
}
