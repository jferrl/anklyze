package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestDailyQuota_Check(t *testing.T) {
	tests := []struct {
		name          string
		limit         int
		ip            string
		requestCount  int
		wantAllowed   []bool
		description   string
	}{
		{
			name:         "allows requests within limit",
			limit:        3,
			ip:           "192.168.1.1",
			requestCount: 3,
			wantAllowed:  []bool{true, true, true},
			description:  "All requests should be allowed when under limit",
		},
		{
			name:         "blocks requests exceeding limit",
			limit:        2,
			ip:           "192.168.1.2",
			requestCount: 4,
			wantAllowed:  []bool{true, true, false, false},
			description:  "Requests beyond limit should be blocked",
		},
		{
			name:         "single request allowed",
			limit:        1,
			ip:           "192.168.1.3",
			requestCount: 2,
			wantAllowed:  []bool{true, false},
			description:  "Only one request allowed with limit of 1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dq := NewDailyQuota(tt.limit)
			defer dq.Stop()

			for i := 0; i < tt.requestCount; i++ {
				got := dq.Check(tt.ip)
				if got != tt.wantAllowed[i] {
					t.Errorf("Request %d: got %v, want %v - %s",
						i+1, got, tt.wantAllowed[i], tt.description)
				}
			}
		})
	}
}

func TestDailyQuota_DifferentIPs(t *testing.T) {
	tests := []struct {
		name        string
		limit       int
		requests    []struct{ ip string; want bool }
		description string
	}{
		{
			name:  "different IPs have separate quotas",
			limit: 1,
			requests: []struct{ ip string; want bool }{
				{"192.168.1.1", true},
				{"192.168.1.2", true},
				{"192.168.1.1", false}, // IP1 exhausted
				{"192.168.1.2", false}, // IP2 exhausted
				{"192.168.1.3", true},  // New IP
			},
			description: "Each IP should have its own independent quota",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dq := NewDailyQuota(tt.limit)
			defer dq.Stop()

			for i, req := range tt.requests {
				got := dq.Check(req.ip)
				if got != req.want {
					t.Errorf("Request %d (IP=%s): got %v, want %v - %s",
						i+1, req.ip, got, req.want, tt.description)
				}
			}
		})
	}
}

func TestDailyQuota_GetRemaining(t *testing.T) {
	tests := []struct {
		name         string
		limit        int
		ip           string
		checkCount   int
		wantRemaining int
	}{
		{
			name:         "full quota for new IP",
			limit:        10,
			ip:           "192.168.1.1",
			checkCount:   0,
			wantRemaining: 10,
		},
		{
			name:         "remaining after some usage",
			limit:        10,
			ip:           "192.168.1.2",
			checkCount:   3,
			wantRemaining: 7,
		},
		{
			name:         "zero remaining when exhausted",
			limit:        5,
			ip:           "192.168.1.3",
			checkCount:   5,
			wantRemaining: 0,
		},
		{
			name:         "zero remaining when over limit",
			limit:        3,
			ip:           "192.168.1.4",
			checkCount:   10, // Attempt more than limit
			wantRemaining: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dq := NewDailyQuota(tt.limit)
			defer dq.Stop()

			// Use up some quota
			for i := 0; i < tt.checkCount; i++ {
				dq.Check(tt.ip)
			}

			got := dq.GetRemaining(tt.ip)
			if got != tt.wantRemaining {
				t.Errorf("got remaining=%d, want %d", got, tt.wantRemaining)
			}
		})
	}
}

func TestDailyQuotaMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		limit          int
		requestCount   int
		wantStatuses   []int
		description    string
	}{
		{
			name:         "allows requests within quota",
			limit:        3,
			requestCount: 3,
			wantStatuses: []int{http.StatusOK, http.StatusOK, http.StatusOK},
			description:  "All requests within quota should succeed",
		},
		{
			name:         "blocks requests exceeding quota",
			limit:        2,
			requestCount: 4,
			wantStatuses: []int{http.StatusOK, http.StatusOK, http.StatusTooManyRequests, http.StatusTooManyRequests},
			description:  "Requests exceeding quota should return 429",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dq, middleware := DailyQuotaMiddleware(tt.limit)
			defer dq.Stop()

			router := gin.New()
			router.GET("/test", middleware, func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			for i := 0; i < tt.requestCount; i++ {
				req := httptest.NewRequest("GET", "/test", nil)
				req.RemoteAddr = "192.168.1.1:12345"
				w := httptest.NewRecorder()
				router.ServeHTTP(w, req)

				if w.Code != tt.wantStatuses[i] {
					t.Errorf("Request %d: got status %d, want %d - %s",
						i+1, w.Code, tt.wantStatuses[i], tt.description)
				}
			}
		})
	}
}

func TestNextMidnight(t *testing.T) {
	now := time.Now()
	midnight := nextMidnight()

	// Verify midnight is after now
	if !midnight.After(now) {
		t.Error("nextMidnight should return a time after now")
	}

	// Verify it's at midnight (00:00:00)
	if midnight.Hour() != 0 || midnight.Minute() != 0 || midnight.Second() != 0 {
		t.Errorf("nextMidnight should be at 00:00:00, got %v", midnight)
	}

	// Verify it's tomorrow
	expectedDate := now.AddDate(0, 0, 1)
	if midnight.Year() != expectedDate.Year() ||
		midnight.Month() != expectedDate.Month() ||
		midnight.Day() != expectedDate.Day() {
		t.Errorf("nextMidnight should be tomorrow, got %v", midnight)
	}
}

func TestDailyQuota_Cleanup(t *testing.T) {
	// Create a quota with a short cleanup that we can test
	dq := &DailyQuota{
		counts: make(map[string]*ipCount),
		limit:  10,
		stopCh: make(chan struct{}),
	}
	defer dq.Stop()

	// Add an entry that should be cleaned up (reset time in the past)
	dq.counts["old-ip"] = &ipCount{
		count:   5,
		resetAt: time.Now().Add(-1 * time.Hour), // Already expired
	}

	// Add an entry that should NOT be cleaned up
	dq.counts["new-ip"] = &ipCount{
		count:   3,
		resetAt: time.Now().Add(1 * time.Hour), // Still valid
	}

	// Run cleanup
	dq.cleanup()

	// Verify old entry was removed
	if _, exists := dq.counts["old-ip"]; exists {
		t.Error("expired entry should have been cleaned up")
	}

	// Verify new entry was kept
	if _, exists := dq.counts["new-ip"]; !exists {
		t.Error("valid entry should not have been cleaned up")
	}
}
