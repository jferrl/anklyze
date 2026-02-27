package service

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

func TestTTLStatsCache_GetMiss(t *testing.T) {
	t.Parallel()
	c := NewTTLStatsCache(5 * time.Minute)
	result, ok := c.Get(uuid.New())
	if ok {
		t.Error("expected cache miss on empty cache, got hit")
	}
	if result != nil {
		t.Errorf("expected nil result, got %v", result)
	}
}

func TestTTLStatsCache_SetAndGet(t *testing.T) {
	t.Parallel()
	c := NewTTLStatsCache(5 * time.Minute)
	studyID := uuid.New()
	metrics := &domain.StudyReliabilityMetrics{}

	c.Set(studyID, metrics)

	result, ok := c.Get(studyID)
	if !ok {
		t.Error("expected cache hit after Set, got miss")
	}
	if result != metrics {
		t.Errorf("expected same metrics pointer, got different")
	}
}

func TestTTLStatsCache_Invalidate(t *testing.T) {
	t.Parallel()
	c := NewTTLStatsCache(5 * time.Minute)
	studyID := uuid.New()
	metrics := &domain.StudyReliabilityMetrics{}

	c.Set(studyID, metrics)
	c.Invalidate(studyID)

	result, ok := c.Get(studyID)
	if ok {
		t.Error("expected cache miss after Invalidate, got hit")
	}
	if result != nil {
		t.Errorf("expected nil result after Invalidate, got %v", result)
	}
}

func TestTTLStatsCache_Expiry(t *testing.T) {
	t.Parallel()
	c := NewTTLStatsCache(50 * time.Millisecond)
	studyID := uuid.New()
	metrics := &domain.StudyReliabilityMetrics{}

	c.Set(studyID, metrics)

	// Immediately after Set — should be a hit.
	result, ok := c.Get(studyID)
	if !ok {
		t.Error("expected cache hit immediately after Set, got miss")
	}
	if result != metrics {
		t.Errorf("expected same metrics pointer, got different")
	}

	// After TTL expires — should be a miss.
	time.Sleep(60 * time.Millisecond)

	result, ok = c.Get(studyID)
	if ok {
		t.Error("expected cache miss after TTL expiry, got hit")
	}
	if result != nil {
		t.Errorf("expected nil result after TTL expiry, got %v", result)
	}
}

func TestTTLStatsCache_DifferentStudies(t *testing.T) {
	t.Parallel()
	c := NewTTLStatsCache(5 * time.Minute)
	studyA := uuid.New()
	studyB := uuid.New()
	metrics := &domain.StudyReliabilityMetrics{}

	c.Set(studyA, metrics)

	// studyB should miss.
	result, ok := c.Get(studyB)
	if ok {
		t.Error("expected cache miss for different study ID, got hit")
	}
	if result != nil {
		t.Errorf("expected nil for different study ID, got %v", result)
	}

	// studyA should hit.
	result, ok = c.Get(studyA)
	if !ok {
		t.Error("expected cache hit for studyA, got miss")
	}
	if result != metrics {
		t.Errorf("expected same metrics pointer for studyA, got different")
	}
}

func TestNoOpStatsCache(t *testing.T) {
	t.Parallel()
	var c StudyStatsCache = noOpStatsCache{}

	studyID := uuid.New()

	result, ok := c.Get(studyID)
	if ok {
		t.Error("expected noOpStatsCache.Get to always return false")
	}
	if result != nil {
		t.Errorf("expected nil from noOpStatsCache.Get, got %v", result)
	}

	// Set and Invalidate must not panic.
	c.Set(studyID, &domain.StudyReliabilityMetrics{})
	c.Invalidate(studyID)

	// Get still returns miss after Set on no-op.
	result, ok = c.Get(studyID)
	if ok {
		t.Error("expected noOpStatsCache.Get to always return false after Set")
	}
	if result != nil {
		t.Errorf("expected nil from noOpStatsCache.Get after Set, got %v", result)
	}
}
