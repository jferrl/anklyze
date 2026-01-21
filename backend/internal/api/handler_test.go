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

// setupTestHandler creates a handler with real implementations for integration testing.
func setupTestHandler() *Handler {
	ruleEngine := rules.NewEngine()
	classifier := service.NewClassifierService(ruleEngine)
	auditRepo := repository.NewNoOpAuditRepository()
	analyticsRepo := repository.NewNoOpAnalyticsRepository()
	// chatService is nil for tests - chat endpoint will return 503
	return NewHandler(classifier, nil, auditRepo, analyticsRepo)
}

// setupTestRouter creates a gin router in test mode with the handler configured.
func setupTestRouter(h *Handler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.GET("/health", h.HealthCheck)
	router.POST("/api/classify", h.ClassifyFracture)
	router.GET("/api/options", h.GetOptions)
	router.GET("/api/analytics/summary", h.GetAnalyticsSummary)
	router.GET("/api/analytics/trends", h.GetAnalyticsTrends)
	router.GET("/api/analytics/distribution/:system", h.GetAnalyticsDistribution)

	return router
}

func TestHandler_HealthCheck(t *testing.T) {
	t.Parallel()

	h := setupTestHandler()
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
}

func TestHandler_ClassifyFracture_PosteriorOnly(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                string
		posteriorType       domain.PosteriorFractureType
		lang                string
		expectedBartonicek  domain.BartonicekType
		expectedAOOTA       domain.AOOTACode
		expectedLaugeHansen domain.LaugeHansenType
	}{
		{
			name:                "extraincisural posterior fracture",
			posteriorType:       domain.PosteriorExtraincisural,
			lang:                "en",
			expectedBartonicek:  domain.BartonicekType1,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "posterolateral posterior fracture",
			posteriorType:       domain.PosteriorPosterolateral,
			lang:                "en",
			expectedBartonicek:  domain.BartonicekType2,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "posteromedial and posterolateral posterior fracture",
			posteriorType:       domain.PosteriorPosteromedialPosterolateral,
			lang:                "en",
			expectedBartonicek:  domain.BartonicekType3,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "large posterolateral posterior fracture",
			posteriorType:       domain.PosteriorLargePosterolateral,
			lang:                "en",
			expectedBartonicek:  domain.BartonicekType4,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                "posterior only in Spanish",
			posteriorType:       domain.PosteriorExtraincisural,
			lang:                "es",
			expectedBartonicek:  domain.BartonicekType1,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			input := domain.FractureInput{
				InvolvedMalleoli:      domain.InvolvedPosteriorOnly,
				PosteriorFractureType: tt.posteriorType,
			}

			body, err := json.Marshal(input)
			if err != nil {
				t.Fatalf("failed to marshal input: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/classify?lang="+tt.lang, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
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

func TestHandler_ClassifyFracture_MedialOnly(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                string
		medialMorphology    domain.MedialMorphology
		expectedAOOTA       domain.AOOTACode
		expectedLaugeHansen domain.LaugeHansenType
		expectedAmbiguous   bool
	}{
		{
			name:                "oblique medial morphology",
			medialMorphology:    domain.MedialMorphologyOblique,
			expectedAOOTA:       domain.AOOTAA1,
			expectedLaugeHansen: domain.LaugeHansenSA,
			expectedAmbiguous:   false,
		},
		{
			name:                "transverse medial morphology - ambiguous",
			medialMorphology:    domain.MedialMorphologyTransverse,
			expectedAOOTA:       domain.AOOTAA1,
			expectedLaugeHansen: domain.LaugeHansenPA,
			expectedAmbiguous:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			input := domain.FractureInput{
				InvolvedMalleoli: domain.InvolvedMedialOnly,
				MedialMorphology: tt.medialMorphology,
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
			if result.LaugeHansen.Ambiguous != tt.expectedAmbiguous {
				t.Errorf("LaugeHansen.Ambiguous = %v, want %v", result.LaugeHansen.Ambiguous, tt.expectedAmbiguous)
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
			expectedAOOTA:       domain.AOOTAC1,
			expectedLaugeHansen: domain.LaugeHansenPER,
		},
		{
			name:                "low spiral trimaleolar",
			lateralMorphology:   domain.LateralMorphologySpiral,
			expectedDanisWeber:  domain.DanisWeberB,
			expectedAOOTA:       domain.AOOTAB3,
			expectedLaugeHansen: domain.LaugeHansenSER,
		},
		{
			name:                      "low transverse infrasindesmal trimaleolar - impossible",
			lateralMorphology:         domain.LateralMorphologyTransverse,
			fibularLevelForTransverse: domain.FibularLevelInfrasindesmal,
			expectedImpossible:        true,
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
				if result.ImpossibleReason == "" {
					t.Error("ImpossibleReason should not be empty for impossible cases")
				}
				return
			}

			if result.Impossible {
				t.Errorf("unexpected Impossible = true with reason: %s", result.ImpossibleReason)
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

	var errResp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("failed to unmarshal error response: %v", err)
	}

	if _, ok := errResp["error"]; !ok {
		t.Error("expected error field in response")
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
	expectedDesc := i18n.T(i18n.English, i18n.KeyNoFractureSelected)
	if result.FractureDescription != expectedDesc {
		t.Errorf("FractureDescription = %q, want %q", result.FractureDescription, expectedDesc)
	}
}

func TestHandler_ClassifyFracture_LanguageSupport(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name             string
		langParam        string
		acceptLangHeader string
		expectedLang     i18n.Language
	}{
		{
			name:         "English via query param",
			langParam:    "en",
			expectedLang: i18n.English,
		},
		{
			name:         "Spanish via query param",
			langParam:    "es",
			expectedLang: i18n.Spanish,
		},
		{
			name:             "Spanish via Accept-Language header",
			acceptLangHeader: "es-ES,es;q=0.9",
			expectedLang:     i18n.Spanish,
		},
		{
			name:             "query param takes precedence over header",
			langParam:        "en",
			acceptLangHeader: "es-ES",
			expectedLang:     i18n.English,
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
				MedialMorphology: domain.MedialMorphologyOblique,
			}
			body, _ := json.Marshal(input)

			url := "/api/classify"
			if tt.langParam != "" {
				url += "?lang=" + tt.langParam
			}

			req := httptest.NewRequest(http.MethodPost, url, bytes.NewReader(body))
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
			expectedDesc := i18n.T(tt.expectedLang, i18n.KeyFractureUnimaleolarMedial)
			if result.FractureDescription != expectedDesc {
				t.Errorf("FractureDescription = %q, want %q (lang=%v)", result.FractureDescription, expectedDesc, tt.expectedLang)
			}
		})
	}
}

func TestHandler_GetOptions(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		queryParams string
		checkLabels func(t *testing.T, labels map[string]string)
	}{
		{
			name:        "default language (English)",
			queryParams: "",
			checkLabels: func(t *testing.T, labels map[string]string) {
				if labels["yes"] != i18n.T(i18n.English, i18n.KeyLabelYes) {
					t.Errorf("yes label = %q, want English version", labels["yes"])
				}
			},
		},
		{
			name:        "Spanish language",
			queryParams: "?lang=es",
			checkLabels: func(t *testing.T, labels map[string]string) {
				if labels["yes"] != i18n.T(i18n.Spanish, i18n.KeyLabelYes) {
					t.Errorf("yes label = %q, want Spanish version", labels["yes"])
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			h := setupTestHandler()
			router := setupTestRouter(h)

			req := httptest.NewRequest(http.MethodGet, "/api/options"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("GetOptions() status = %d, want %d", w.Code, http.StatusOK)
			}

			var response FormOptions
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if tt.checkLabels != nil {
				tt.checkLabels(t, response.Labels)
			}
		})
	}
}

func TestHandler_GetOptions_ResponseStructure(t *testing.T) {
	t.Parallel()

	h := setupTestHandler()
	router := setupTestRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/api/options", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GetOptions() status = %d, want %d", w.Code, http.StatusOK)
	}

	var response FormOptions
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	// Verify questions structure
	requiredQuestions := []string{
		"involved_malleoli",
		"posterior_fracture_type",
		"medial_morphology",
		"fibular_level",
		"lateral_morphology",
		"suprasindesmal_type",
	}
	for _, qID := range requiredQuestions {
		if q, ok := response.Questions[qID]; !ok {
			t.Errorf("missing required question %q", qID)
		} else if q.ID != qID {
			t.Errorf("Question ID = %q, want %q", q.ID, qID)
		} else if q.Title == "" {
			t.Errorf("Question %q has empty title", qID)
		}
	}

	// Verify labels structure
	requiredLabels := []string{"yes", "no", "high", "low"}
	for _, label := range requiredLabels {
		if response.Labels[label] == "" {
			t.Errorf("missing or empty label %q", label)
		}
	}

	// Verify select options have correct structure
	if len(response.InvolvedMalleoli) != 7 {
		t.Errorf("InvolvedMalleoli has %d options, want 7", len(response.InvolvedMalleoli))
	}
	for _, opt := range response.InvolvedMalleoli {
		if opt.Value == "" {
			t.Error("InvolvedMalleoli option has empty value")
		}
		if opt.Label == "" {
			t.Error("InvolvedMalleoli option has empty label")
		}
	}

	if len(response.PosteriorFractureTypes) != 4 {
		t.Errorf("PosteriorFractureTypes has %d options, want 4", len(response.PosteriorFractureTypes))
	}

	if len(response.FibularLevels) != 3 {
		t.Errorf("FibularLevels has %d options, want 3", len(response.FibularLevels))
	}

	if len(response.MedialMorphology) != 2 {
		t.Errorf("MedialMorphology has %d options, want 2", len(response.MedialMorphology))
	}

	if len(response.LateralMorphology) != 3 {
		t.Errorf("LateralMorphology has %d options, want 3", len(response.LateralMorphology))
	}

	if len(response.SuprasindesmalTypes) != 3 {
		t.Errorf("SuprasindesmalTypes has %d options, want 3", len(response.SuprasindesmalTypes))
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
		queryLang    string
		acceptHeader string
		wantLang     i18n.Language
	}{
		{
			name:         "query param takes precedence over header",
			queryLang:    "es",
			acceptHeader: "en-US",
			wantLang:     i18n.Spanish,
		},
		{
			name:         "falls back to Accept-Language header",
			queryLang:    "",
			acceptHeader: "es-ES,es;q=0.9",
			wantLang:     i18n.Spanish,
		},
		{
			name:         "defaults to English when no language specified",
			queryLang:    "",
			acceptHeader: "",
			wantLang:     i18n.English,
		},
		{
			name:         "English from query param",
			queryLang:    "en",
			acceptHeader: "",
			wantLang:     i18n.English,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			url := "/test"
			if tt.queryLang != "" {
				url += "?lang=" + tt.queryLang
			}
			c.Request = httptest.NewRequest(http.MethodGet, url, nil)
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

func BenchmarkHandler_GetOptions(b *testing.B) {
	gin.SetMode(gin.TestMode)

	h := setupTestHandler()
	router := setupTestRouter(h)

	b.ResetTimer()
	for b.Loop() {
		req := httptest.NewRequest(http.MethodGet, "/api/options", nil)
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
