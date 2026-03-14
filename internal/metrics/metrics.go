// Package metrics provides Prometheus instrumentation for the Gin HTTP server.
package metrics

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds the Prometheus collectors used across the application.
type Metrics struct {
	requestsTotal    *prometheus.CounterVec
	requestDuration  *prometheus.HistogramVec
	requestsInFlight prometheus.Gauge
}

// New creates and registers the application metrics with the given Prometheus
// registerer. Pass prometheus.DefaultRegisterer in production; use a fresh
// registry in tests to avoid conflicts between test cases.
func New(reg prometheus.Registerer) *Metrics {
	m := &Metrics{
		requestsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests partitioned by method, path, and status code.",
		}, []string{"method", "path", "status"}),

		requestDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds partitioned by method and path.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "path"}),

		requestsInFlight: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "Current number of HTTP requests being processed.",
		}),
	}

	reg.MustRegister(
		m.requestsTotal,
		m.requestDuration,
		m.requestsInFlight,
	)

	return m
}

// Middleware returns a Gin middleware that records per-request metrics.
// It uses c.FullPath() to obtain the parameterised route template (e.g.
// "/api/cases/:id") which keeps label cardinality bounded even when UUIDs
// appear in URLs.
func (m *Metrics) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		m.requestsInFlight.Inc()
		defer m.requestsInFlight.Dec()

		timer := prometheus.NewTimer(prometheus.ObserverFunc(func(dur float64) {
			// FullPath is populated after the router matches the route, so we
			// read it inside the deferred observer rather than before c.Next().
			path := c.FullPath()
			if path == "" {
				// No route matched (404). Use a static label to avoid creating
				// one counter entry per unique unmatched URL.
				path = "unmatched"
			}
			m.requestDuration.WithLabelValues(c.Request.Method, path).Observe(dur)
			m.requestsTotal.WithLabelValues(
				c.Request.Method,
				path,
				strconv.Itoa(c.Writer.Status()),
			).Inc()
		}))
		defer timer.ObserveDuration()

		c.Next()
	}
}

// RegisterMetricsEndpoint adds the GET /metrics route to the router using the
// given gatherer (typically prometheus.DefaultGatherer in production). The
// endpoint is deliberately not protected by auth — scrapers must be able to
// reach it from inside the cluster without a JWT.
func RegisterMetricsEndpoint(router *gin.Engine, gatherer prometheus.Gatherer) {
	h := promhttp.HandlerFor(gatherer, promhttp.HandlerOpts{
		EnableOpenMetrics: true,
	})
	router.GET("/metrics", func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	})
}

// DefaultMetrics is a convenience constructor that uses the default Prometheus
// registry. Use this in main; use New with a custom registry in tests.
func DefaultMetrics() *Metrics {
	return New(prometheus.DefaultRegisterer)
}

// Handler returns an http.Handler for the /metrics endpoint backed by the
// default Prometheus gatherer. Useful when you need the raw handler outside of
// a Gin context (e.g. a dedicated metrics port).
func Handler() http.Handler {
	return promhttp.Handler()
}
