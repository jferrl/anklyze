package api

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiterConfig holds configuration for the rate limiter
type RateLimiterConfig struct {
	// Rate is the number of requests allowed per second
	Rate rate.Limit
	// Burst is the maximum number of requests allowed in a burst
	Burst int
	// CleanupInterval is how often to clean up old limiters
	CleanupInterval time.Duration
	// MaxAge is the maximum age of a limiter before it's cleaned up
	MaxAge time.Duration
}

type clientLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// IPRateLimiter manages rate limiters per client IP
type IPRateLimiter struct {
	clients map[string]*clientLimiter
	mu      sync.RWMutex
	config  RateLimiterConfig
	stopCh  chan struct{}
}

// NewIPRateLimiter creates a new IP-based rate limiter
func NewIPRateLimiter(config RateLimiterConfig) *IPRateLimiter {
	rl := &IPRateLimiter{
		clients: make(map[string]*clientLimiter),
		config:  config,
		stopCh:  make(chan struct{}),
	}

	go rl.cleanupLoop()

	return rl
}

// getLimiter returns the rate limiter for the given IP, creating one if needed
func (rl *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if client, exists := rl.clients[ip]; exists {
		client.lastSeen = time.Now()
		return client.limiter
	}

	limiter := rate.NewLimiter(rl.config.Rate, rl.config.Burst)
	rl.clients[ip] = &clientLimiter{
		limiter:  limiter,
		lastSeen: time.Now(),
	}

	return limiter
}

// cleanupLoop periodically removes old limiters to prevent memory leaks
func (rl *IPRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.config.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rl.cleanup()
		case <-rl.stopCh:
			return
		}
	}
}

// cleanup removes limiters that haven't been used recently
func (rl *IPRateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	cutoff := time.Now().Add(-rl.config.MaxAge)
	for ip, client := range rl.clients {
		if client.lastSeen.Before(cutoff) {
			delete(rl.clients, ip)
		}
	}
}

// Stop stops the cleanup goroutine
func (rl *IPRateLimiter) Stop() {
	close(rl.stopCh)
}

// Middleware returns a Gin middleware that rate limits requests by client IP
func (rl *IPRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := rl.getLimiter(ip)

		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "rate limit exceeded",
				"retry_after": "2s",
				"message":     "Too many requests. Please wait before sending another message.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitMiddlewareWithConfig creates a rate limiting middleware with custom rate and burst
func RateLimitMiddlewareWithConfig(ratePerSecond float64, burst int) (*IPRateLimiter, gin.HandlerFunc) {
	config := RateLimiterConfig{
		Rate:            rate.Limit(ratePerSecond),
		Burst:           burst,
		CleanupInterval: 5 * time.Minute,
		MaxAge:          10 * time.Minute,
	}
	rl := NewIPRateLimiter(config)
	return rl, rl.Middleware()
}
