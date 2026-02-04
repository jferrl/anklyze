package api

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// CreateChatSessionResponse represents the response for session creation.
type CreateChatSessionResponse struct {
	SessionID string `json:"session_id"`
}

// CreateChatSession handles POST /api/chat/session
// @Summary Create a new chat session
// @Description Creates a new chat session for tracking conversations
// @Tags Chat
// @Produce json
// @Param lang query string false "Language (en, es)" default(en)
// @Success 200 {object} CreateChatSessionResponse "Session created"
// @Router /api/chat/session [post]
func (h *Handler) CreateChatSession(c *gin.Context) {
	lang := getLanguage(c)

	session := domain.NewChatSession(
		c.ClientIP(),
		c.GetHeader("User-Agent"),
		string(lang),
	)

	if err := h.chatAuditRepo.CreateSession(c.Request.Context(), session); err != nil {
		slog.Warn("failed to create chat session", "error", err)
	}

	c.JSON(http.StatusOK, CreateChatSessionResponse{
		SessionID: session.ID.String(),
	})
}

// CompleteChatSession handles PUT /api/chat/session/:id/complete
// @Summary Mark a chat session as complete
// @Description Marks a chat session as successfully completed
// @Tags Chat
// @Param id path string true "Session ID (UUID)"
// @Success 200 {object} map[string]string "Session completed"
// @Failure 400 {object} map[string]string "Invalid session ID"
// @Failure 404 {object} map[string]string "Session not found"
// @Router /api/chat/session/{id}/complete [put]
func (h *Handler) CompleteChatSession(c *gin.Context) {
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID"})
		return
	}

	session, err := h.chatAuditRepo.GetSession(c.Request.Context(), sessionID)
	if err != nil || session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	// Only update if not already complete (chat handler may have already completed it)
	if session.Status != domain.ChatSessionStatusComplete {
		// Use Complete with nil result if we don't have classification data
		// This will still set status, duration, and timestamp correctly
		session.Complete(0, nil)

		if err := h.chatAuditRepo.UpdateSession(c.Request.Context(), session); err != nil {
			slog.Warn("failed to update chat session", "error", err, "session_id", sessionID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update session"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "completed"})
}

// AbandonChatSession handles PUT /api/chat/session/:id/abandon
// @Summary Mark a chat session as abandoned
// @Description Marks a chat session as abandoned (user left before completion)
// @Tags Chat
// @Param id path string true "Session ID (UUID)"
// @Success 200 {object} map[string]string "Session abandoned"
// @Failure 400 {object} map[string]string "Invalid session ID"
// @Failure 404 {object} map[string]string "Session not found"
// @Router /api/chat/session/{id}/abandon [put]
func (h *Handler) AbandonChatSession(c *gin.Context) {
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID"})
		return
	}

	session, err := h.chatAuditRepo.GetSession(c.Request.Context(), sessionID)
	if err != nil || session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	session.Abandon()

	if err := h.chatAuditRepo.UpdateSession(c.Request.Context(), session); err != nil {
		slog.Warn("failed to update chat session", "error", err, "session_id", sessionID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "abandoned"})
}

// FeedbackRequest represents a feedback submission.
type FeedbackRequest struct {
	Rating  string  `json:"rating" binding:"required,oneof=positive negative"`
	Comment *string `json:"comment"`
}

// SubmitFeedback handles POST /api/chat/session/:id/feedback
// @Summary Submit feedback for a chat session
// @Description Allows users to rate the chat classification accuracy
// @Tags Chat
// @Accept json
// @Produce json
// @Param id path string true "Session ID (UUID)"
// @Param input body FeedbackRequest true "Feedback data"
// @Success 200 {object} map[string]string "Feedback submitted"
// @Failure 400 {object} map[string]string "Invalid input"
// @Failure 409 {object} map[string]string "Feedback already submitted"
// @Router /api/chat/session/{id}/feedback [post]
func (h *Handler) SubmitFeedback(c *gin.Context) {
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error_code": domain.ErrCodeInvalidInput})
		return
	}

	var req FeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error_code": domain.ErrCodeInvalidInput,
			"details":    err.Error(),
		})
		return
	}

	// Check if feedback already exists
	existing, _ := h.chatAuditRepo.GetFeedbackBySession(c.Request.Context(), sessionID)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "feedback already submitted"})
		return
	}

	feedback := domain.NewChatFeedback(
		sessionID,
		domain.FeedbackRating(req.Rating),
		req.Comment,
		c.ClientIP(),
	)

	if err := h.chatAuditRepo.SaveFeedback(c.Request.Context(), feedback); err != nil {
		slog.Warn("failed to save feedback", "error", err, "session_id", sessionID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save feedback"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "submitted"})
}

// GetFeedback handles GET /api/chat/session/:id/feedback
// @Summary Get feedback for a chat session
// @Description Retrieves the feedback submitted for a session
// @Tags Chat
// @Produce json
// @Param id path string true "Session ID (UUID)"
// @Success 200 {object} domain.ChatFeedback "Feedback data"
// @Failure 400 {object} map[string]string "Invalid session ID"
// @Failure 404 {object} map[string]string "Feedback not found"
// @Router /api/chat/session/{id}/feedback [get]
func (h *Handler) GetFeedback(c *gin.Context) {
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session ID"})
		return
	}

	feedback, err := h.chatAuditRepo.GetFeedbackBySession(c.Request.Context(), sessionID)
	if err != nil || feedback == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "feedback not found"})
		return
	}

	c.JSON(http.StatusOK, feedback)
}

// GetChatAnalyticsSummary handles GET /api/analytics/chat/summary
// @Summary Get chat analytics summary
// @Description Returns aggregated chat session statistics for a time period
// @Tags Analytics
// @Produce json
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Success 200 {object} domain.ChatAnalyticsSummary "Chat analytics summary"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/chat/summary [get]
func (h *Handler) GetChatAnalyticsSummary(c *gin.Context) {
	from, to := parseDateRange(c)

	summary, err := h.chatAnalyticsRepo.GetSummary(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get chat analytics summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetChatFeedbackSummary handles GET /api/analytics/chat/feedback
// @Summary Get feedback summary
// @Description Returns feedback statistics for a time period
// @Tags Analytics
// @Produce json
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Success 200 {object} domain.ChatFeedbackSummary "Feedback summary"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/chat/feedback [get]
func (h *Handler) GetChatFeedbackSummary(c *gin.Context) {
	from, to := parseDateRange(c)

	summary, err := h.chatAnalyticsRepo.GetFeedbackSummary(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get feedback summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetChatConfidenceDistribution handles GET /api/analytics/chat/confidence
// @Summary Get confidence distribution
// @Description Returns distribution of extraction confidence levels
// @Tags Analytics
// @Produce json
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Success 200 {object} domain.ConfidenceDistribution "Confidence distribution"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/chat/confidence [get]
func (h *Handler) GetChatConfidenceDistribution(c *gin.Context) {
	from, to := parseDateRange(c)

	dist, err := h.chatAnalyticsRepo.GetConfidenceDistribution(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get confidence distribution"})
		return
	}

	c.JSON(http.StatusOK, dist)
}

// GetChatTrends handles GET /api/analytics/chat/trends
// @Summary Get chat trends
// @Description Returns time-series chat analytics data
// @Tags Analytics
// @Produce json
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Param granularity query string false "Time granularity (day, week, month)" default(day)
// @Success 200 {object} domain.ChatTrendData "Chat trend data"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/chat/trends [get]
func (h *Handler) GetChatTrends(c *gin.Context) {
	from, to := parseDateRange(c)
	granularity := domain.ParseGranularity(c.Query("granularity"))

	trends, err := h.chatAnalyticsRepo.GetTrends(from, to, granularity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get chat trends"})
		return
	}

	c.JSON(http.StatusOK, trends)
}
