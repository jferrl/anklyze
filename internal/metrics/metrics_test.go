package metrics

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// newTestMetrics creates a Metrics instance backed by a fresh registry so that
// parallel tests never share state or trigger duplicate-registration panics.
func newTestMetrics(t *testing.T) (*Metrics, *prometheus.Registry) {
	t.Helper()
	reg := prometheus.NewRegistry()
	m := New(reg)
	return m, reg
}

// counterValue returns the float64 value of the first matching counter family
// with the given name from the registry. Returns 0 if not found.
func counterValue(t *testing.T, reg *prometheus.Registry, name string, labels map[string]string) float64 {
	t.Helper()
	mfs, err := reg.Gather()
	if err != nil {
		t.Fatalf("gather metrics: %v", err)
	}
	for _, mf := range mfs {
		if mf.GetName() != name {
			continue
		}
		for _, m := range mf.GetMetric() {
			if labelsMatch(m.GetLabel(), labels) {
				return m.GetCounter().GetValue()
			}
		}
	}
	return 0
}

func gaugeValue(t *testing.T, reg *prometheus.Registry, name string) float64 {
	t.Helper()
	mfs, err := reg.Gather()
	if err != nil {
		t.Fatalf("gather metrics: %v", err)
	}
	for _, mf := range mfs {
		if mf.GetName() == name {
			if len(mf.GetMetric()) > 0 {
				return mf.GetMetric()[0].GetGauge().GetValue()
			}
		}
	}
	return 0
}

func histogramCount(t *testing.T, reg *prometheus.Registry, name string, labels map[string]string) uint64 {
	t.Helper()
	mfs, err := reg.Gather()
	if err != nil {
		t.Fatalf("gather metrics: %v", err)
	}
	for _, mf := range mfs {
		if mf.GetName() != name {
			continue
		}
		for _, m := range mf.GetMetric() {
			if labelsMatch(m.GetLabel(), labels) {
				return m.GetHistogram().GetSampleCount()
			}
		}
	}
	return 0
}

func labelsMatch(pairs []*dto.LabelPair, want map[string]string) bool {
	got := make(map[string]string, len(pairs))
	for _, p := range pairs {
		got[p.GetName()] = p.GetValue()
	}
	for k, v := range want {
		if got[k] != v {
			return false
		}
	}
	return true
}

// setupRouter builds a test Gin engine with the metrics middleware and a
// couple of dummy routes.
func setupRouter(m *Metrics) *gin.Engine {
	r := gin.New()
	r.Use(m.Middleware())
	r.GET("/health", func(c *gin.Context) { c.Status(http.StatusOK) })
	r.GET("/api/cases/:id", func(c *gin.Context) { c.Status(http.StatusOK) })
	r.POST("/api/classify", func(c *gin.Context) { c.Status(http.StatusCreated) })
	return r
}

func TestMiddleware_CountsRequests(t *testing.T) {
	m, reg := newTestMetrics(t)
	r := setupRouter(m)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.ServeHTTP(httptest.NewRecorder(), req)

	got := counterValue(t, reg, "http_requests_total", map[string]string{
		"method": "GET",
		"path":   "/health",
		"status": "200",
	})
	if got != 1 {
		t.Errorf("http_requests_total = %v, want 1", got)
	}
}

func TestMiddleware_NormalisesPathParams(t *testing.T) {
	m, reg := newTestMetrics(t)
	r := setupRouter(m)

	// Two requests with different UUIDs should collapse to the same label.
	for _, id := range []string{"abc-123", "def-456"} {
		req := httptest.NewRequest(http.MethodGet, "/api/cases/"+id, nil)
		r.ServeHTTP(httptest.NewRecorder(), req)
	}

	got := counterValue(t, reg, "http_requests_total", map[string]string{
		"method": "GET",
		"path":   "/api/cases/:id",
		"status": "200",
	})
	if got != 2 {
		t.Errorf("http_requests_total for parameterised route = %v, want 2", got)
	}
}

func TestMiddleware_RecordsHistogram(t *testing.T) {
	m, reg := newTestMetrics(t)
	r := setupRouter(m)

	req := httptest.NewRequest(http.MethodPost, "/api/classify", nil)
	r.ServeHTTP(httptest.NewRecorder(), req)

	count := histogramCount(t, reg, "http_request_duration_seconds", map[string]string{
		"method": "POST",
		"path":   "/api/classify",
	})
	if count != 1 {
		t.Errorf("http_request_duration_seconds sample count = %d, want 1", count)
	}
}

func TestMiddleware_UnmatchedRouteLabel(t *testing.T) {
	m, reg := newTestMetrics(t)
	r := setupRouter(m)

	req := httptest.NewRequest(http.MethodGet, "/does-not-exist", nil)
	r.ServeHTTP(httptest.NewRecorder(), req)

	got := counterValue(t, reg, "http_requests_total", map[string]string{
		"method": "GET",
		"path":   "unmatched",
		"status": "404",
	})
	if got != 1 {
		t.Errorf("unmatched route counter = %v, want 1", got)
	}
}

func TestMiddleware_InFlightGaugeReturnsToZero(t *testing.T) {
	m, reg := newTestMetrics(t)
	r := setupRouter(m)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.ServeHTTP(httptest.NewRecorder(), req)

	// After the request completes the gauge must be back at 0.
	got := gaugeValue(t, reg, "http_requests_in_flight")
	if got != 0 {
		t.Errorf("http_requests_in_flight after request = %v, want 0", got)
	}
}

func TestRegisterMetricsEndpoint(t *testing.T) {
	reg := prometheus.NewRegistry()
	gatherer := prometheus.Gatherer(reg)

	r := gin.New()
	RegisterMetricsEndpoint(r, gatherer)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET /metrics status = %d, want 200", w.Code)
	}
}

func TestNew_PanicsOnDuplicateRegistration(t *testing.T) {
	reg := prometheus.NewRegistry()
	New(reg) // first registration is fine

	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic on duplicate registration, but got none")
		}
	}()
	New(reg) // second registration must panic
}
