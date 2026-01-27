package api

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// DailyQuota tracks request counts per IP with daily reset
type DailyQuota struct {
	counts  map[string]*ipCount
	mu      sync.RWMutex
	limit   int
	stopCh  chan struct{}
}

type ipCount struct {
	count    int
	resetAt  time.Time
}

// NewDailyQuota creates a new daily quota tracker
func NewDailyQuota(limit int) *DailyQuota {
	dq := &DailyQuota{
		counts: make(map[string]*ipCount),
		limit:  limit,
		stopCh: make(chan struct{}),
	}

	// Start cleanup goroutine
	go dq.cleanupLoop()

	return dq
}

// Check returns true if the IP is within quota, false if exceeded
func (dq *DailyQuota) Check(ip string) bool {
	dq.mu.Lock()
	defer dq.mu.Unlock()

	now := time.Now()

	ic, exists := dq.counts[ip]
	if !exists {
		// First request from this IP today
		dq.counts[ip] = &ipCount{
			count:   1,
			resetAt: nextMidnight(),
		}
		return true
	}

	// Check if we need to reset (new day)
	if now.After(ic.resetAt) {
		ic.count = 1
		ic.resetAt = nextMidnight()
		return true
	}

	// Check if within limit
	if ic.count >= dq.limit {
		return false
	}

	ic.count++
	return true
}

// GetRemaining returns the remaining quota for an IP
func (dq *DailyQuota) GetRemaining(ip string) int {
	dq.mu.RLock()
	defer dq.mu.RUnlock()

	ic, exists := dq.counts[ip]
	if !exists {
		return dq.limit
	}

	// Check if reset time has passed
	if time.Now().After(ic.resetAt) {
		return dq.limit
	}

	remaining := dq.limit - ic.count
	if remaining < 0 {
		return 0
	}
	return remaining
}

// cleanupLoop removes expired entries daily
func (dq *DailyQuota) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			dq.cleanup()
		case <-dq.stopCh:
			return
		}
	}
}

// cleanup removes entries that have been reset
func (dq *DailyQuota) cleanup() {
	dq.mu.Lock()
	defer dq.mu.Unlock()

	now := time.Now()
	for ip, ic := range dq.counts {
		if now.After(ic.resetAt) {
			delete(dq.counts, ip)
		}
	}
}

// Stop stops the cleanup goroutine
func (dq *DailyQuota) Stop() {
	close(dq.stopCh)
}

// nextMidnight returns the next midnight time
func nextMidnight() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
}

// DailyQuotaMiddleware creates a middleware that enforces daily request quotas per IP
func DailyQuotaMiddleware(limit int) (*DailyQuota, gin.HandlerFunc) {
	dq := NewDailyQuota(limit)

	middleware := func(c *gin.Context) {
		ip := c.ClientIP()

		if !dq.Check(ip) {
			remaining := dq.GetRemaining(ip)
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":     "daily quota exceeded",
				"message":   "You have reached your daily limit. Please try again tomorrow.",
				"remaining": remaining,
			})
			c.Abort()
			return
		}

		// Add remaining quota to response headers
		c.Header("X-Quota-Remaining", fmt.Sprintf("%d", dq.GetRemaining(ip)))
		c.Next()
	}

	return dq, middleware
}
