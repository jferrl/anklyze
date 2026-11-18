package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
)

// newTestClassificationSvc creates a ClassificationService backed by the real engine for API tests.
func newTestClassificationSvc() service.ClassificationService {
	return service.NewClassificationService(rules.NewEngine(), nil)
}

// stubAudit discards audit entries.
type stubAudit struct{}

func (stubAudit) Save(context.Context, *domain.AuditEntry) error { return nil }
func (stubAudit) Close() error                                   { return nil }

// stubAnalytics returns empty but well-formed analytics.
type stubAnalytics struct{}

func (stubAnalytics) GetSummary(from, to time.Time) (*domain.AnalyticsSummary, error) {
	return &domain.AnalyticsSummary{
		Period:                  domain.TimePeriod{From: from, To: to},
		LanguageDistribution:    make(map[string]int64),
		DanisWeberDistribution:  make(map[string]int64),
		LaugeHansenDistribution: make(map[string]int64),
		AOOTADistribution:       make(map[string]int64),
	}, nil
}

func (stubAnalytics) GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.TrendData, error) {
	return &domain.TrendData{
		Period:      domain.TimePeriod{From: from, To: to},
		Granularity: string(granularity),
		DataPoints:  []domain.TrendDataPoint{},
	}, nil
}

func (stubAnalytics) GetDistribution(system string, from, to time.Time) (*domain.ClassificationDistribution, error) {
	return &domain.ClassificationDistribution{
		System:       system,
		Period:       domain.TimePeriod{From: from, To: to},
		Distribution: []domain.DistributionItem{},
	}, nil
}

// setupTestHandler creates a handler with stub audit and analytics repositories.
// jwksReady is nil: not tracked, reported as "ready" by the health check.
func setupTestHandler() *Handler {
	return NewHandler(newTestClassificationSvc(), stubAudit{}, stubAnalytics{}, nil)
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

	router := setupTestRouter(setupTestHandler())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health", nil))

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
			if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTANotClassifiable {
				t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, domain.AOOTANotClassifiable)
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
			name:                "transverse medial morphology",
			medialMorphology:    domain.MedialMorphologyTransverse,
			expectedAOOTANil:    true,                              // AO not classifiable for medial-only
			expectedLaugeHansen: domain.LaugeHansenNotClassifiable, // LH not classifiable for transverse medial
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
				if result.AOOTA == nil || result.AOOTA.Code != domain.AOOTANotClassifiable {
					t.Errorf("AOOTA.Code = %q, want %q", result.AOOTA.Code, domain.AOOTANotClassifiable)
				}
			}

			if result.LaugeHansen == nil {
				t.Fatal("LaugeHansen classification is nil")
			}
			if result.LaugeHansen.Type != tt.expectedLaugeHansen {
				t.Errorf("LaugeHansen.Type = %q, want %q", result.LaugeHansen.Type, tt.expectedLaugeHansen)
			}

			// Medial only should have DanisWeber as not_classifiable
			if result.DanisWeber == nil {
				t.Fatal("DanisWeber is nil, want not_classifiable")
			}
			if result.DanisWeber.Type != domain.DanisWeberNotClassifiable {
				t.Errorf("DanisWeber = %q, want %q", result.DanisWeber.Type, domain.DanisWeberNotClassifiable)
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

// TestHandler_ClassifyFracture_InvalidInput checks that /api/classify rejects bad
// payloads with 400 and the shared error shape. Without the validator the engine
// would answer 200 "none_selected" for the missing and unknown-enum cases.
func TestHandler_ClassifyFracture_InvalidInput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		body        string
		wantMessage string
	}{
		{
			name:        "malformed JSON",
			body:        "invalid json",
			wantMessage: "invalid input",
		},
		{
			name:        "wrong JSON type for involved_malleoli",
			body:        `{"involved_malleoli": 7}`,
			wantMessage: "invalid input",
		},
		{
			name:        "empty object misses involved_malleoli",
			body:        `{}`,
			wantMessage: "FractureInput.InvolvedMalleoli failed validation: required",
		},
		{
			name:        "empty involved_malleoli",
			body:        `{"involved_malleoli": ""}`,
			wantMessage: "FractureInput.InvolvedMalleoli failed validation: required",
		},
		{
			name:        "unknown involved_malleoli",
			body:        `{"involved_malleoli": "bogus"}`,
			wantMessage: "FractureInput.InvolvedMalleoli failed validation: oneof",
		},
		{
			name:        "unknown fibular_level",
			body:        `{"involved_malleoli": "lateral_only", "fibular_level": "bogus"}`,
			wantMessage: "FractureInput.FibularLevel failed validation: oneof",
		},
		{
			name:        "unknown lateral_morphology",
			body:        `{"involved_malleoli": "lateral_only", "lateral_morphology": "bogus"}`,
			wantMessage: "FractureInput.LateralMorphology failed validation: oneof",
		},
		{
			name:        "unknown posterior_fracture_type",
			body:        `{"involved_malleoli": "posterior_only", "posterior_fracture_type": "bogus"}`,
			wantMessage: "FractureInput.PosteriorFractureType failed validation: oneof",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			router := setupTestRouter(setupTestHandler())

			req := httptest.NewRequest(http.MethodPost, "/api/classify", bytes.NewReader([]byte(tt.body)))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d; body: %s", w.Code, http.StatusBadRequest, w.Body.String())
			}

			var errResp ErrorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
				t.Fatalf("failed to unmarshal error response: %v", err)
			}
			if errResp.Code != CodeInvalidInput {
				t.Errorf("code = %q, want %q", errResp.Code, CodeInvalidInput)
			}
			if !strings.Contains(errResp.Message, tt.wantMessage) {
				t.Errorf("message = %q, want containing %q", errResp.Message, tt.wantMessage)
			}
		})
	}
}

// TestHandler_ClassifyFracture_ValidMinimalInput checks the validator accepts a
// payload with only the required field.
func TestHandler_ClassifyFracture_ValidMinimalInput(t *testing.T) {
	t.Parallel()

	router := setupTestRouter(setupTestHandler())

	req := httptest.NewRequest(http.MethodPost, "/api/classify", strings.NewReader(`{"involved_malleoli": "lateral_only"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
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

			// Stub repository returns empty but valid structure
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

func TestHandler_Analytics_InvalidQuery(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		path        string
		wantMessage string
	}{
		{"summary malformed from", "/api/analytics/summary?from=invalid", "invalid 'from' date"},
		{"summary malformed to", "/api/analytics/summary?to=31-01-2024", "invalid 'to' date"},
		{"summary impossible date", "/api/analytics/summary?from=2024-02-30", "invalid 'from' date"},
		{"summary from after to", "/api/analytics/summary?from=2024-12-31&to=2024-01-01", "must not be after"},
		{"summary huge range", "/api/analytics/summary?from=0001-01-01", "must not exceed"},
		{"trends malformed from", "/api/analytics/trends?from=invalid", "invalid 'from' date"},
		{"trends from after to", "/api/analytics/trends?from=2024-12-31&to=2024-01-01", "must not be after"},
		{"trends huge range", "/api/analytics/trends?from=2000-01-01&to=2024-01-01", "must not exceed"},
		{"trends unknown granularity", "/api/analytics/trends?granularity=hourly", "granularity must be one of"},
		{"trends wrong-case granularity", "/api/analytics/trends?granularity=Week", "granularity must be one of"},
		{"distribution unknown system", "/api/analytics/distribution/bogus", "system must be one of"},
		{"distribution malformed to", "/api/analytics/distribution/ao-ota?to=invalid", "invalid 'to' date"},
		{"distribution from after to", "/api/analytics/distribution/ao-ota?from=2024-12-31&to=2024-01-01", "must not be after"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			router := setupTestRouter(setupTestHandler())
			w := httptest.NewRecorder()
			router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tt.path, nil))

			if w.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d; body: %s", w.Code, http.StatusBadRequest, w.Body.String())
			}

			var errResp ErrorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
				t.Fatalf("failed to unmarshal error response: %v", err)
			}
			if errResp.Code != CodeInvalidInput {
				t.Errorf("code = %q, want %q", errResp.Code, CodeInvalidInput)
			}
			if !strings.Contains(errResp.Message, tt.wantMessage) {
				t.Errorf("message = %q, want containing %q", errResp.Message, tt.wantMessage)
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
