package api

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/timeutil"
)

// AuditRepository defines the audit persistence interface needed by the handler.
type AuditRepository interface {
	Save(ctx context.Context, entry *domain.AuditEntry) error
	Close() error
}

// AnalyticsRepository defines the analytics query interface needed by the handler.
type AnalyticsRepository interface {
	GetSummary(from, to time.Time) (*domain.AnalyticsSummary, error)
	GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.TrendData, error)
	GetDistribution(system string, from, to time.Time) (*domain.ClassificationDistribution, error)
}

// ChatAuditRepository defines the chat audit persistence interface.
type ChatAuditRepository interface {
	CreateSession(ctx context.Context, session *domain.ChatSession) error
	UpdateSession(ctx context.Context, session *domain.ChatSession) error
	GetSession(ctx context.Context, sessionID uuid.UUID) (*domain.ChatSession, error)
	SaveMessage(ctx context.Context, message *domain.ChatMessage) error
	SaveFeedback(ctx context.Context, feedback *domain.ChatFeedback) error
	GetFeedbackBySession(ctx context.Context, sessionID uuid.UUID) (*domain.ChatFeedback, error)
	GetLastAssistantMessage(ctx context.Context, sessionID uuid.UUID) (*domain.ChatMessage, error)
	Close() error
}

// ChatAnalyticsRepository defines the chat analytics query interface.
type ChatAnalyticsRepository interface {
	GetSummary(from, to time.Time) (*domain.ChatAnalyticsSummary, error)
	GetFeedbackSummary(from, to time.Time) (*domain.ChatFeedbackSummary, error)
	GetConfidenceDistribution(from, to time.Time) (*domain.ConfidenceDistribution, error)
	GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.ChatTrendData, error)
}

// Handler handles HTTP requests
type Handler struct {
	classifier          service.ClassifierService
	chatService         service.ChatService
	auditRepo           AuditRepository
	analyticsRepo       AnalyticsRepository
	chatAuditRepo       ChatAuditRepository
	chatAnalyticsRepo   ChatAnalyticsRepository
	sessionMessageLimit int
	inputValidator      *InputValidator
}

// NewHandler creates a new Handler
func NewHandler(
	classifier service.ClassifierService,
	chatService service.ChatService,
	auditRepo AuditRepository,
	analyticsRepo AnalyticsRepository,
	chatAuditRepo ChatAuditRepository,
	chatAnalyticsRepo ChatAnalyticsRepository,
) *Handler {
	return &Handler{
		classifier:          classifier,
		chatService:         chatService,
		auditRepo:           auditRepo,
		analyticsRepo:       analyticsRepo,
		chatAuditRepo:       chatAuditRepo,
		chatAnalyticsRepo:   chatAnalyticsRepo,
		sessionMessageLimit: 20, // Default limit
		inputValidator:      NewInputValidator(),
	}
}

// WithSessionMessageLimit sets the session message limit
func (h *Handler) WithSessionMessageLimit(limit int) *Handler {
	h.sessionMessageLimit = limit
	return h
}

// getLanguage extracts the language from the Accept-Language header
func getLanguage(c *gin.Context) i18n.Language {
	return i18n.ParseAcceptLanguage(c.GetHeader("Accept-Language"))
}

// ClassifyFracture handles POST /api/classify
// @Summary Classify an ankle fracture
// @Description Classifies an ankle fracture according to Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek systems. Language is determined from the Accept-Language header.
// @Tags Classification
// @Accept json
// @Produce json
// @Param input body domain.FractureInput true "Fracture input parameters"
// @Success 200 {object} domain.ClassificationResult "Classification result"
// @Failure 400 {object} map[string]string "Invalid input"
// @Failure 500 {object} map[string]string "Classification error"
// @Router /api/classify [post]
func (h *Handler) ClassifyFracture(c *gin.Context) {
	startTime := time.Now()
	lang := getLanguage(c)

	var input domain.FractureInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   i18n.T(lang, i18n.KeyErrorInvalidInput),
			"details": err.Error(),
		})
		return
	}

	result, err := h.classifier.Classify(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   i18n.T(lang, i18n.KeyErrorClassification),
			"details": err.Error(),
		})
		return
	}

	// Non-blocking audit logging
	durationMS := time.Since(startTime).Milliseconds()
	auditEntry, err := domain.NewAuditEntry(
		c.ClientIP(),
		c.GetHeader("User-Agent"),
		string(lang),
		input,
		*result,
		durationMS,
	)
	if err != nil {
		slog.Warn("failed to create audit entry", "error", err)
	} else {
		// Use request context for audit save - non-blocking due to buffered channel
		if err := h.auditRepo.Save(c.Request.Context(), auditEntry); err != nil {
			slog.Warn("failed to save audit entry", "error", err)
		}
	}

	c.JSON(http.StatusOK, result)
}

// HealthCheck handles GET /health
// @Summary Health check
// @Description Returns the health status of the API
// @Tags System
// @Produce json
// @Success 200 {object} map[string]string "Health status"
// @Router /health [get]
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// parseDateRange parses from/to query parameters with defaults.
func parseDateRange(c *gin.Context) (time.Time, time.Time) {
	dr := timeutil.ParseDateRange(c.Query("from"), c.Query("to"))
	return dr.From, dr.To
}

// GetAnalyticsSummary handles GET /api/analytics/summary
// @Summary Get analytics summary
// @Description Returns aggregated classification statistics for a time period
// @Tags Analytics
// @Produce json
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Success 200 {object} domain.AnalyticsSummary "Analytics summary"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/summary [get]
func (h *Handler) GetAnalyticsSummary(c *gin.Context) {
	from, to := parseDateRange(c)

	summary, err := h.analyticsRepo.GetSummary(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetAnalyticsTrends handles GET /api/analytics/trends
// @Summary Get classification trends
// @Description Returns time-series classification data with configurable granularity
// @Tags Analytics
// @Produce json
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Param granularity query string false "Time granularity (day, week, month)" default(day)
// @Success 200 {object} domain.TrendData "Trend data"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/trends [get]
func (h *Handler) GetAnalyticsTrends(c *gin.Context) {
	from, to := parseDateRange(c)
	granularity := domain.ParseGranularity(c.Query("granularity"))

	trends, err := h.analyticsRepo.GetTrends(from, to, granularity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics trends"})
		return
	}

	c.JSON(http.StatusOK, trends)
}

// GetAnalyticsDistribution handles GET /api/analytics/distribution/:system
// @Summary Get classification distribution
// @Description Returns detailed distribution for a specific classification system
// @Tags Analytics
// @Produce json
// @Param system path string true "Classification system (danis-weber, lauge-hansen, ao-ota)"
// @Param from query string false "Start date (YYYY-MM-DD)" default(30 days ago)
// @Param to query string false "End date (YYYY-MM-DD)" default(today)
// @Success 200 {object} domain.ClassificationDistribution "Distribution data"
// @Failure 500 {object} map[string]string "Server error"
// @Router /api/analytics/distribution/{system} [get]
func (h *Handler) GetAnalyticsDistribution(c *gin.Context) {
	system := c.Param("system")
	from, to := parseDateRange(c)

	distribution, err := h.analyticsRepo.GetDistribution(system, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get distribution"})
		return
	}

	c.JSON(http.StatusOK, distribution)
}

// ChatMessage handles POST /api/chat
// @Summary Chat-based fracture classification
// @Description Processes natural language fracture descriptions and returns classification
// @Tags Chat
// @Accept json
// @Produce json
// @Param input body service.ChatRequest true "Chat message"
// @Success 200 {object} service.ChatResponse "Chat response with classification"
// @Failure 400 {object} map[string]string "Invalid input"
// @Failure 503 {object} map[string]string "Chat service unavailable"
// @Router /api/chat [post]
func (h *Handler) ChatMessage(c *gin.Context) {
	if h.chatService == nil {
		lang := getLanguage(c)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": i18n.T(lang, i18n.KeyErrorChatUnavailable),
		})
		return
	}

	startTime := time.Now()

	var req service.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		lang := getLanguage(c)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   i18n.T(lang, i18n.KeyErrorInvalidInput),
			"details": err.Error(),
		})
		return
	}

	// Use query param language if not specified in body
	if req.Language == "" {
		req.Language = string(getLanguage(c))
	}

	// Validate input for gibberish/spam
	if h.inputValidator != nil {
		lang := i18n.ParseLanguage(req.Language)

		// Check for gibberish/invalid input
		validationResult := h.inputValidator.Validate(req.Message)
		if !validationResult.Valid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   validationResult.Code,
				"message": getValidationErrorMessage(lang, validationResult.Code),
			})
			return
		}

		// Check language is supported
		langResult := h.inputValidator.ValidateLanguage(req.Message)
		if !langResult.Valid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   langResult.Code,
				"message": getValidationErrorMessage(lang, langResult.Code),
			})
			return
		}
	}

	// Parse session ID if provided
	var sessionID *uuid.UUID
	if req.SessionID != "" {
		id, err := uuid.Parse(req.SessionID)
		if err == nil {
			sessionID = &id
		}
	}

	// Determine message type for user message and get previous context
	userMsgType := domain.ChatMessageTypeInitial
	if sessionID != nil {
		// Check if session has messages already (this would be a follow-up)
		session, err := h.chatAuditRepo.GetSession(c.Request.Context(), *sessionID)
		if err == nil && session != nil {
			// Check session message limit
			if h.sessionMessageLimit > 0 && session.TotalMessages >= h.sessionMessageLimit {
				lang := i18n.ParseLanguage(req.Language)
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error":   "session_limit_exceeded",
					"message": getSessionLimitMessage(lang),
				})
				return
			}

			if session.TotalMessages > 0 {
				userMsgType = domain.ChatMessageTypeClarificationAnswer

				// Get the last assistant message to retrieve previous extracted input
				lastMsg, err := h.chatAuditRepo.GetLastAssistantMessage(c.Request.Context(), *sessionID)
				if err == nil && lastMsg != nil {
					// Parse the extracted input from the last message
					previousInput, err := lastMsg.GetExtractedInput()
					if err == nil && previousInput != nil {
						req.PreviousInput = previousInput
					}
				}
			}
		}
	}

	// Save user message if session exists
	if sessionID != nil {
		userMsg := domain.NewUserMessage(*sessionID, req.Message, userMsgType)
		if err := h.chatAuditRepo.SaveMessage(c.Request.Context(), userMsg); err != nil {
			slog.Warn("failed to save user message", "error", err)
		}
	}

	resp, err := h.chatService.ProcessMessage(c.Request.Context(), req)
	if err != nil {
		lang := i18n.ParseLanguage(req.Language)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, i18n.KeyErrorClassification),
		})
		return
	}

	processingMS := time.Since(startTime).Milliseconds()

	// Save assistant message and update session if session exists
	if sessionID != nil {
		// Determine assistant message type
		assistantMsgType := domain.ChatMessageTypeClassification
		if resp.Status == service.ChatStatusNeedsClarification {
			assistantMsgType = domain.ChatMessageTypeClarificationRequest
		}

		// Create and save assistant message
		assistantMsg, err := domain.NewAssistantMessage(
			*sessionID,
			resp.Message,
			assistantMsgType,
			resp.ExtractedInput,
			&resp.Confidence,
			processingMS,
		)
		if err != nil {
			slog.Warn("failed to create assistant message", "error", err)
		} else {
			if err := h.chatAuditRepo.SaveMessage(c.Request.Context(), assistantMsg); err != nil {
				slog.Warn("failed to save assistant message", "error", err)
			}
		}

		// Update session counts and state
		session, err := h.chatAuditRepo.GetSession(c.Request.Context(), *sessionID)
		if err == nil && session != nil {
			// Increment message count (2 messages: user + assistant)
			session.IncrementMessages()
			session.IncrementMessages()

			// Increment clarification count if needed
			if resp.Status == service.ChatStatusNeedsClarification {
				session.IncrementClarifications()
			}

			// If classification is complete, update session with final results
			if resp.Status == service.ChatStatusComplete && resp.Classification != nil {
				session.Complete(resp.Confidence, resp.Classification)
			}

			if err := h.chatAuditRepo.UpdateSession(c.Request.Context(), session); err != nil {
				slog.Warn("failed to update session", "error", err, "session_id", sessionID)
			}
		}
	}

	c.JSON(http.StatusOK, resp)
}

// getSessionLimitMessage returns the session limit exceeded message in the given language
func getSessionLimitMessage(lang i18n.Language) string {
	if lang == i18n.Spanish {
		return "Has alcanzado el límite de mensajes para esta sesión. Por favor, inicia una nueva conversación."
	}
	return "You have reached the message limit for this session. Please start a new conversation."
}

// getValidationErrorMessage returns validation error messages in the given language
func getValidationErrorMessage(lang i18n.Language, code string) string {
	messages := map[string]map[i18n.Language]string{
		"input_too_short": {
			i18n.English: "Please provide a more detailed description of the fracture.",
			i18n.Spanish: "Por favor proporciona una descripción más detallada de la fractura.",
		},
		"repeated_characters": {
			i18n.English: "Your message contains invalid repeated characters. Please describe the fracture clearly.",
			i18n.Spanish: "Tu mensaje contiene caracteres repetidos inválidos. Por favor describe la fractura claramente.",
		},
		"too_many_special_chars": {
			i18n.English: "Your message contains too many special characters. Please use normal text.",
			i18n.Spanish: "Tu mensaje contiene demasiados caracteres especiales. Por favor usa texto normal.",
		},
		"too_few_words": {
			i18n.English: "Please provide a more complete description of the fracture.",
			i18n.Spanish: "Por favor proporciona una descripción más completa de la fractura.",
		},
		"keyboard_smash": {
			i18n.English: "Your message appears to contain random characters. Please describe the fracture properly.",
			i18n.Spanish: "Tu mensaje parece contener caracteres aleatorios. Por favor describe la fractura correctamente.",
		},
		"no_medical_context": {
			i18n.English: "Your message doesn't appear to describe an ankle fracture. Please include relevant medical details.",
			i18n.Spanish: "Tu mensaje no parece describir una fractura de tobillo. Por favor incluye detalles médicos relevantes.",
		},
		"unsupported_language": {
			i18n.English: "Please use English or Spanish to describe the fracture.",
			i18n.Spanish: "Por favor usa inglés o español para describir la fractura.",
		},
		"no_words": {
			i18n.English: "Please enter a valid fracture description.",
			i18n.Spanish: "Por favor ingresa una descripción válida de la fractura.",
		},
	}

	if langMessages, ok := messages[code]; ok {
		if msg, ok := langMessages[lang]; ok {
			return msg
		}
		// Fallback to English
		if msg, ok := langMessages[i18n.English]; ok {
			return msg
		}
	}

	// Default message
	if lang == i18n.Spanish {
		return "Entrada inválida. Por favor intenta de nuevo."
	}
	return "Invalid input. Please try again."
}
