package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
)

// newTestClassificationSvc creates a ClassificationService backed by the real engine for API tests.
func newTestClassificationSvc() service.ClassificationService {
	return service.NewClassificationService(rules.NewEngine(), repository.NewNoOpCaseResponseRepository())
}

// setupTestHandlerWithDB creates a handler with the specified dbHealthy flag.
func setupTestHandlerWithDB(dbHealthy bool) *Handler {
	classificationService := newTestClassificationSvc()
	auditRepo := repository.NewNoOpAuditRepository()
	analyticsRepo := repository.NewNoOpAnalyticsRepository()
	chatAuditRepo := repository.NewNoOpChatAuditRepository()
	chatAnalyticsRepo := repository.NewNoOpChatAnalyticsRepository()
	return NewHandler(classificationService, nil, auditRepo, analyticsRepo, chatAuditRepo, chatAnalyticsRepo, dbHealthy, nil)
}

// setupTestHandler creates a handler with real implementations for integration testing.
// dbHealthy defaults to true — tests not specifically checking health degraded mode
// should assume a healthy database state.
func setupTestHandler() *Handler {
	classificationService := newTestClassificationSvc()
	auditRepo := repository.NewNoOpAuditRepository()
	analyticsRepo := repository.NewNoOpAnalyticsRepository()
	chatAuditRepo := repository.NewNoOpChatAuditRepository()
	chatAnalyticsRepo := repository.NewNoOpChatAnalyticsRepository()
	// chatService is nil for tests - chat endpoint will return 503
	// jwksReady is nil for tests - nil means not tracked, defaults to "ready" in health check
	return NewHandler(classificationService, nil, auditRepo, analyticsRepo, chatAuditRepo, chatAnalyticsRepo, true, nil)
}

// setupTestRouter creates a gin router in test mode with the handler configured.
func setupTestRouter(h *Handler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.GET("/health", h.HealthCheck)
	router.POST("/api/classify", h.ClassifyFracture)
	router.GET("/api/analytics/summary", h.GetAnalyticsSummary)
	router.GET("/api/analytics/trends", h.GetAnalyticsTrends)
	router.GET("/api/analytics/distribution/:system", h.GetAnalyticsDistribution)

	return router
}

func TestHandler_HealthCheck(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		dbHealthy bool
		wantDB    string
	}{
		{
			name:      "healthy database returns db healthy",
			dbHealthy: true,
			wantDB:    "healthy",
		},
		{
			name:      "degraded database returns db degraded",
			dbHealthy: false,
			wantDB:    "degraded",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandlerWithDB(tt.dbHealthy)
			router := setupTestRouter(h)

			req := httptest.NewRequest(http.MethodGet, "/health", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("HealthCheck() status = %d, want %d", w.Code, http.StatusOK)
			}

			var response map[string]string
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if response["status"] != "ok" {
				t.Errorf("HealthCheck() status = %q, want %q", response["status"], "ok")
			}

			if response["db"] != tt.wantDB {
				t.Errorf("HealthCheck() db = %q, want %q", response["db"], tt.wantDB)
			}
		})
	}
}

// boolPtr returns a pointer to a bool value for test inputs
func boolPtr(b bool) *bool {
	return &b
}

func TestHandler_ClassifyFracture_PosteriorOnly(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name               string
		posteriorType      domain.PosteriorFractureType
		acceptLanguage     string
		expectedBartonicek domain.BartonicekType
	}{
		{
			name:               "extraincisural posterior fracture",
			posteriorType:      domain.PosteriorExtraincisural,
			acceptLanguage:     "en",
			expectedBartonicek: domain.BartonicekType1,
		},
		{
			name:               "posterolateral posterior fracture",
			posteriorType:      domain.PosteriorPosterolateral,
			acceptLanguage:     "en",
			expectedBartonicek: domain.BartonicekType2,
		},
		{
			name:               "posteromedial and posterolateral posterior fracture",
			posteriorType:      domain.PosteriorPosteromedialPosterolateral,
			acceptLanguage:     "en",
			expectedBartonicek: domain.BartonicekType3,
		},
		{
			name:               "large posterolateral posterior fracture",
			posteriorType:      domain.PosteriorLargePosterolateral,
			acceptLanguage:     "en",
			expectedBartonicek: domain.BartonicekType4,
		},
		{
			name:               "posterior only in Spanish",
			posteriorType:      domain.PosteriorExtraincisural,
			acceptLanguage:     "es",
			expectedBartonicek: domain.BartonicekType1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			input := domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedPosteriorOnly,
				ArticularInvolvement:  domain.ArticularSmallWithoutExtension,
				PosteriorFractureType: tt.posteriorType,
				HasCTScan:             boolPtr(true),
			}

			body, err := json.Marshal(input)
			if err != nil {
				t.Fatalf("failed to marshal input: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			if tt.acceptLanguage != "" {
				req.Header.Set("Accept-Language", tt.acceptLanguage)
			}
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("ClassifyFracture() status = %d, want %d, body: %s", w.Code, http.StatusOK, w.Body.String())
			}

			var result domain.ClassificationResult
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if result.Bartonicek == nil {
				t.Fatal("Bartonicek classification is nil")
			}
			if result.Bartonicek.Type != tt.expectedBartonicek {
				t.Errorf("Bartonicek.Type = %q, want %q", result.Bartonicek.Type, tt.expectedBartonicek)
			}

			// small_without_extension: AO is unclassifiable (nil)
			if result.AOOTA != nil {
				t.Errorf("AOOTA should be nil (unclassifiable), got %q", result.AOOTA.Code)
			}

			// small_without_extension: LH is PA
			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != domain.LaugeHansenPA {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, domain.LaugeHansenPA)
			}
		})
	}
}

func TestHandler_ClassifyFracture_MedialOnly(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                string
		medialMorphology    domain.MedialMorphology
		expectedAOOTANil    bool
		expectedLaugeHansen domain.LaugeHansenType
	}{
		{
			name:                "oblique medial morphology",
			medialMorphology:    domain.MedialMorphologyVertical,
			expectedAOOTANil:    true, // AO not classifiable for medial-only
			expectedLaugeHansen: domain.LaugeHansenSA,
		},
		{
			name:             "transverse medial morphology",
			medialMorphology:    domain.MedialMorphologyTransverse,
			expectedAOOTANil:    true,                               // AO not classifiable for medial-only
			expectedLaugeHansen: domain.LaugeHansenNotClassifiable,  // LH not classifiable for transverse medial
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			input := domain.FractureInput{
				InvolvedMalleoli:     domain.InvolvedMedialOnly,
				ArticularInvolvement: domain.ArticularSmallWithoutExtension,
				MedialMorphology:     tt.medialMorphology,
			}

			body, err := json.Marshal(input)
			if err != nil {
				t.Fatalf("failed to marshal input: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("ClassifyFracture() status = %d, want %d", w.Code, http.StatusOK)
			}

			var result domain.ClassificationResult
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if tt.expectedAOOTANil {
				if result.AOOTA != nil {
					t.Errorf("AOOTA should be nil for medial-only, got %q", result.AOOTA.Code)
				}
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
			}

			// Medial only should not have DanisWeber
			if result.DanisWeber != nil {
				t.Error("DanisWeber should be nil for medial only fractures")
			}
		})
	}
}

func TestHandler_ClassifyFracture_LateralOnly(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                string
		fibularLevel        domain.FibularLevel
		lateralMorphology   domain.LateralMorphology
		suprasindesmalType  domain.SuprasindesmalType
		expectedDanisWeber  domain.DanisWeberType
		expectedAOOTA       domain.AOOTACode
		expectedLaugeHansen domain.LaugeHansenType
	}{
		{
			name:                "infrasindesmal lateral",
			fibularLevel:        domain.FibularLevelInfrasindesmal,
			expectedDanisWeber:  domain.DanisWeberA,
			expectedAOOTA:       domain.AOOTAA1,
			expectedLaugeHansen: domain.LaugeHansenSA,
		},
		{
			name:                "transindesmal spiral lateral",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB1,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "transindesmal oblique lateral",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologyOblique,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB1,
			expectedLaugeHansen: domain.LaugeHansenPA,
		},
		{
			name:                "suprasindesmal simple diaphyseal",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal multifragmentary",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalMultifragmentary,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC2,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "suprasindesmal proximal (Maisonneuve)",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalProximal,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			input := domain.FractureInput{
				InvolvedMalleoli:   domain.InvolvedLateralOnly,
				FibularLevel:       tt.fibularLevel,
				LateralMorphology:  tt.lateralMorphology,
				SuprasindesmalType: tt.suprasindesmalType,
			}

			body, err := json.Marshal(input)
			if err != nil {
				t.Fatalf("failed to marshal input: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("ClassifyFracture() status = %d, want %d", w.Code, http.StatusOK)
			}

			var result domain.ClassificationResult
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if result.DanisWeber == nil {
				t.Fatal("DanisWeber classification is nil")
			}
			if result.DanisWeber.Type != tt.expectedDanisWeber {
				t.Errorf("DanisWeber.Type = %q, want %q", result.DanisWeber.Type, tt.expectedDanisWeber)
			}

			if result.AOOTA == nil {
				t.Fatal("AOOTA classification is nil")
			}
			if result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
			}
		})
	}
}

func TestHandler_ClassifyFracture_Trimaleolar(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                      string
		fibularLevel              domain.FibularLevel
		fibularLevelForTransverse domain.FibularLevel
		lateralMorphology         domain.LateralMorphology
		suprasindesmalType        domain.SuprasindesmalType
		expectedImpossible        bool
		expectedDanisWeber        domain.DanisWeberType
		expectedAOOTA             domain.AOOTACode
		expectedLaugeHansen       domain.LaugeHansenType
	}{
		{
			name:                "suprasindesmal simple diaphyseal trimaleolar",
			fibularLevel:        domain.FibularLevelSuprasindesmal,
			suprasindesmalType:  domain.SuprasindesmalSimpleDiaphyseal,
			expectedDanisWeber:  domain.DanisWeberC,
			expectedAOOTA:       domain.AOOTAC1_3,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "transindesmal spiral trimaleolar",
			fibularLevel:        domain.FibularLevelTransindesmal,
			lateralMorphology:   domain.LateralMorphologySpiral,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:               "infrasindesmal trimaleolar",
			fibularLevel:       domain.FibularLevelInfrasindesmal,
			expectedDanisWeber: domain.DanisWeberA,
			expectedAOOTA:      domain.AOOTAA3_3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			input := domain.FractureInput{
				InvolvedMalleoli:          domain.InvolvedTrimaleolar,
				FibularLevel:              tt.fibularLevel,
				FibularLevelForTransverse: tt.fibularLevelForTransverse,
				LateralMorphology:         tt.lateralMorphology,
				SuprasindesmalType:        tt.suprasindesmalType,
			}

			body, err := json.Marshal(input)
			if err != nil {
				t.Fatalf("failed to marshal input: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("ClassifyFracture() status = %d, want %d", w.Code, http.StatusOK)
			}

			var result domain.ClassificationResult
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if tt.expectedImpossible {
				if !result.Impossible {
					t.Error("expected Impossible = true, got false")
				}
				if result.ImpossibleKey == "" {
					t.Error("ImpossibleReason should not be empty for impossible cases")
				}
				return
			}

			if result.Impossible {
				t.Errorf("unexpected Impossible = true with reason: %s", result.ImpossibleKey)
			}

			if result.DanisWeber == nil {
				t.Fatal("DanisWeber classification is nil")
			}
			if result.DanisWeber.Type != tt.expectedDanisWeber {
				t.Errorf("DanisWeber.Type = %q, want %q", result.DanisWeber.Type, tt.expectedDanisWeber)
			}

			if result.AOOTA == nil {
				t.Fatal("AOOTA classification is nil")
			}
			if result.AOOTA.Code != tt.expectedAOOTA {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, tt.expectedAOOTA)
			}

			if tt.expectedLaugeHansen != "" {
				if result.LaugeHansen == nil {
					t.Fatal("LaugeHansen classification is nil")
				}
				if result.LaugeHansen.Type != tt.expectedLaugeHansen {
					t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
				}
			}
		})
	}
}

func TestHandler_ClassifyFracture_InvalidInput(t *testing.T) {
	t.Parallel()

	h := setupTestHandler()
	router := setupTestRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("ClassifyFracture() with invalid JSON: status = %d, want %d", w.Code, http.StatusBadRequest)
	}

	var errResp ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("failed to unmarshal error response: %v", err)
	}

	if errResp.Code != CodeInvalidInput {
		t.Errorf("expected code %q, got %q", CodeInvalidInput, errResp.Code)
	}
}

func TestHandler_ClassifyFracture_EmptyInput(t *testing.T) {
	t.Parallel()

	h := setupTestHandler()
	router := setupTestRouter(h)

	input := domain.FractureInput{}
	body, _ := json.Marshal(input)

	req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ClassifyFracture() status = %d, want %d", w.Code, http.StatusOK)
	}

	var result domain.ClassificationResult
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	// Empty input should return "no fracture selected" description
	expectedType := "none_selected"
	if result.FractureType != expectedType {
		t.Errorf("FractureType = %q, want %q", result.FractureType, expectedType)
	}
}

func TestHandler_ClassifyFracture_LanguageSupport(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name             string
		acceptLangHeader string
		expectedLang     i18n.Language
	}{
		{
			name:             "English via Accept-Language header",
			acceptLangHeader: "en",
			expectedLang:     i18n.English,
		},
		{
			name:             "Spanish via Accept-Language header",
			acceptLangHeader: "es-ES,es;q=0.9",
			expectedLang:     i18n.Spanish,
		},
		{
			name:             "simple Spanish header",
			acceptLangHeader: "es",
			expectedLang:     i18n.Spanish,
		},
		{
			name:         "defaults to English",
			expectedLang: i18n.English,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			input := domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialOnly,
				MedialMorphology: domain.MedialMorphologyVertical,
			}
			body, _ := json.Marshal(input)

			req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			if tt.acceptLangHeader != "" {
				req.Header.Set("Accept-Language", tt.acceptLangHeader)
			}
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("ClassifyFracture() status = %d, want %d", w.Code, http.StatusOK)
			}

			var result domain.ClassificationResult
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			// Verify the response contains localized text
			expectedType := "unimaleolar_medial"
			if result.FractureType != expectedType {
				t.Errorf("FractureType = %q, want %q (lang-independent)", result.FractureType, expectedType)
			}
		})
	}
}

func TestHandler_GetAnalyticsSummary(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		queryParams string
	}{
		{
			name:        "default date range",
			queryParams: "",
		},
		{
			name:        "custom date range",
			queryParams: "?from=2024-01-01&to=2024-01-31",
		},
		{
			name:        "invalid from date uses default",
			queryParams: "?from=invalid&to=2024-01-31",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			req := httptest.NewRequest(http.MethodGet, "/api/analytics/summary"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("GetAnalyticsSummary() status = %d, want %d", w.Code, http.StatusOK)
			}

			var result domain.AnalyticsSummary
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			// NoOp repository returns empty but valid structure
			if result.LanguageDistribution == nil {
				t.Error("LanguageDistribution should not be nil")
			}
			if result.DanisWeberDistribution == nil {
				t.Error("DanisWeberDistribution should not be nil")
			}
		})
	}
}

func TestHandler_GetAnalyticsTrends(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                string
		queryParams         string
		expectedGranularity string
	}{
		{
			name:                "default granularity (day)",
			queryParams:         "",
			expectedGranularity: "day",
		},
		{
			name:                "week granularity",
			queryParams:         "?granularity=week",
			expectedGranularity: "week",
		},
		{
			name:                "month granularity with date range",
			queryParams:         "?from=2024-01-01&to=2024-12-31&granularity=month",
			expectedGranularity: "month",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			req := httptest.NewRequest(http.MethodGet, "/api/analytics/trends"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("GetAnalyticsTrends() status = %d, want %d", w.Code, http.StatusOK)
			}

			var result domain.TrendData
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if result.Granularity != tt.expectedGranularity {
				t.Errorf("Granularity = %q, want %q", result.Granularity, tt.expectedGranularity)
			}

			if result.DataPoints == nil {
				t.Error("DataPoints should not be nil")
			}
		})
	}
}

func TestHandler_GetAnalyticsDistribution(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		system      string
		queryParams string
	}{
		{
			name:   "danis-weber distribution",
			system: "danis-weber",
		},
		{
			name:   "lauge-hansen distribution",
			system: "lauge-hansen",
		},
		{
			name:        "ao-ota distribution with date range",
			system:      "ao-ota",
			queryParams: "?from=2024-01-01&to=2024-06-30",
		},
		{
			name:   "unknown system returns empty distribution",
			system: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			req := httptest.NewRequest(http.MethodGet, "/api/analytics/distribution/"+tt.system+tt.queryParams, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("GetAnalyticsDistribution() status = %d, want %d", w.Code, http.StatusOK)
			}

			var result domain.ClassificationDistribution
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if result.System != tt.system {
				t.Errorf("System = %q, want %q", result.System, tt.system)
			}

			if result.Distribution == nil {
				t.Error("Distribution should not be nil")
			}
		})
	}
}

func TestGetLanguage(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		acceptHeader string
		wantLang     i18n.Language
	}{
		{
			name:         "Spanish from Accept-Language header",
			acceptHeader: "es-ES,es;q=0.9",
			wantLang:     i18n.Spanish,
		},
		{
			name:         "English from Accept-Language header",
			acceptHeader: "en-US",
			wantLang:     i18n.English,
		},
		{
			name:         "defaults to English when no language specified",
			acceptHeader: "",
			wantLang:     i18n.English,
		},
		{
			name:         "simple Spanish header",
			acceptHeader: "es",
			wantLang:     i18n.Spanish,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			c.Request = httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.acceptHeader != "" {
				c.Request.Header.Set("Accept-Language", tt.acceptHeader)
			}

			got := getLanguage(c)
			if got != tt.wantLang {
				t.Errorf("getLanguage() = %v, want %v", got, tt.wantLang)
			}
		})
	}
}

func TestParseDateRange(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)

	tests := []struct {
		name    string
		fromStr string
		toStr   string
	}{
		{
			name:    "custom date range parses correctly",
			fromStr: "2024-01-15",
			toStr:   "2024-02-15",
		},
		{
			name:    "invalid dates use defaults",
			fromStr: "invalid",
			toStr:   "not-a-date",
		},
		{
			name:    "empty dates use defaults",
			fromStr: "",
			toStr:   "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			url := "/test?"
			if tt.fromStr != "" {
				url += "from=" + tt.fromStr + "&"
			}
			if tt.toStr != "" {
				url += "to=" + tt.toStr
			}
			c.Request = httptest.NewRequest(http.MethodGet, url, nil)

			from, to := parseDateRange(c)

			// Basic sanity checks
			if from.IsZero() {
				t.Error("from should not be zero time")
			}
			if to.IsZero() {
				t.Error("to should not be zero time")
			}
			if from.After(to) {
				t.Error("from should be before or equal to to")
			}
		})
	}
}

// Benchmark tests using real implementations
func BenchmarkHandler_ClassifyFracture(b *testing.B) {
	gin.SetMode(gin.TestMode)

	h := setupTestHandler()
	router := setupTestRouter(h)

	body, _ := json.Marshal(domain.FractureInput{
		InvolvedMalleoli:  domain.InvolvedLateralOnly,
		FibularLevel:      domain.FibularLevelTransindesmal,
		LateralMorphology: domain.LateralMorphologySpiral,
	})

	b.ResetTimer()
	for b.Loop() {
		req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}

func BenchmarkHandler_HealthCheck(b *testing.B) {
	gin.SetMode(gin.TestMode)

	h := setupTestHandler()
	router := setupTestRouter(h)

	b.ResetTimer()
	for b.Loop() {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}
