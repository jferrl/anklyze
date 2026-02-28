package service

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// StudyStatsCache defines the pluggable cache interface for study reliability metrics.
// The default implementation is a no-op; the TTL implementation is used in production.
type StudyStatsCache interface {
	Get(studyID uuid.UUID) (*domain.StudyReliabilityMetrics, bool)
	Set(studyID uuid.UUID, metrics *domain.StudyReliabilityMetrics)
	Invalidate(studyID uuid.UUID)
}

// ttlStatsCache is an in-memory cache with per-entry TTL expiry.
// Uses sync.RWMutex for thread-safe concurrent reads with exclusive writes.
// Expired entries are lazily evicted on Get — no background goroutine needed.
type ttlStatsCache struct {
	mu      sync.RWMutex
	entries map[uuid.UUID]statsCacheEntry
	ttl     time.Duration
}

type statsCacheEntry struct {
	metrics   *domain.StudyReliabilityMetrics
	expiresAt time.Time
}

// NewTTLStatsCache creates a new in-memory stats cache with the given TTL.
func NewTTLStatsCache(ttl time.Duration) StudyStatsCache {
	return &ttlStatsCache{
		entries: make(map[uuid.UUID]statsCacheEntry),
		ttl:     ttl,
	}
}

// Get returns the cached metrics for the given study ID and whether the entry exists and is valid.
// Expired entries are lazily evicted under write lock.
func (c *ttlStatsCache) Get(studyID uuid.UUID) (*domain.StudyReliabilityMetrics, bool) {
	c.mu.RLock()
	entry, ok := c.entries[studyID]
	c.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		// Lazy eviction: delete expired entry under write lock.
		if ok {
			c.mu.Lock()
			// Re-check under write lock — another goroutine may have already evicted or refreshed.
			if e, stillThere := c.entries[studyID]; stillThere && time.Now().After(e.expiresAt) {
				delete(c.entries, studyID)
			}
			c.mu.Unlock()
		}
		return nil, false
	}
	return entry.metrics, true
}

// Set stores the metrics for the given study ID with a TTL-based expiry.
func (c *ttlStatsCache) Set(studyID uuid.UUID, metrics *domain.StudyReliabilityMetrics) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[studyID] = statsCacheEntry{
		metrics:   metrics,
		expiresAt: time.Now().Add(c.ttl),
	}
}

// Invalidate removes the cache entry for the given study ID.
func (c *ttlStatsCache) Invalidate(studyID uuid.UUID) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.entries, studyID)
}
