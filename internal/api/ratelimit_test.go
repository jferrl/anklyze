package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func TestIPRateLimiter_AllowsBurst(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := RateLimiterConfig{
		Rate:            rate.Limit(1), // 1 request per second
		Burst:           3,             // Allow burst of 3
		CleanupInterval: time.Hour,
		MaxAge:          time.Hour,
	}

	rl := NewIPRateLimiter(config)
	defer rl.Stop()

	router := gin.New()
	router.GET("/test", rl.Middleware(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// First 3 requests should succeed (burst)
	for i := range 3 {
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Request %d: expected status 200, got %d", i+1, w.Code)
		}
	}

	// 4th request should be rate limited
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("Request 4: expected status 429, got %d", w.Code)
	}
}

func TestIPRateLimiter_DifferentIPsHaveSeparateLimits(t *testing.T) {
	gin.SetMode(gin.TestMode)

	config := RateLimiterConfig{
		Rate:            rate.Limit(1),
		Burst:           1,
		CleanupInterval: time.Hour,
		MaxAge:          time.Hour,
	}

	rl := NewIPRateLimiter(config)
	defer rl.Stop()

	router := gin.New()
	router.GET("/test", rl.Middleware(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Request from IP 1 should succeed
	req1 := httptest.NewRequest("GET", "/test", nil)
	req1.RemoteAddr = "192.168.1.1:12345"
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Errorf("IP1 request 1: expected status 200, got %d", w1.Code)
	}

	// Request from IP 2 should also succeed (different limiter)
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.RemoteAddr = "192.168.1.2:12345"
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("IP2 request 1: expected status 200, got %d", w2.Code)
	}

	// Second request from IP 1 should be rate limited
	req3 := httptest.NewRequest("GET", "/test", nil)
	req3.RemoteAddr = "192.168.1.1:12345"
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)

	if w3.Code != http.StatusTooManyRequests {
		t.Errorf("IP1 request 2: expected status 429, got %d", w3.Code)
	}
}

func TestIPRateLimiter_Cleanup(t *testing.T) {
	config := RateLimiterConfig{
		Rate:            rate.Limit(1),
		Burst:           1,
		CleanupInterval: 10 * time.Millisecond,
		MaxAge:          20 * time.Millisecond,
	}

	rl := NewIPRateLimiter(config)
	defer rl.Stop()

	// Create a limiter for an IP
	_ = rl.getLimiter("192.168.1.1")

	rl.mu.RLock()
	initialCount := len(rl.clients)
	rl.mu.RUnlock()

	if initialCount != 1 {
		t.Errorf("Expected 1 client, got %d", initialCount)
	}

	// Wait for cleanup
	time.Sleep(50 * time.Millisecond)

	rl.mu.RLock()
	afterCount := len(rl.clients)
	rl.mu.RUnlock()

	if afterCount != 0 {
		t.Errorf("Expected 0 clients after cleanup, got %d", afterCount)
	}
}

