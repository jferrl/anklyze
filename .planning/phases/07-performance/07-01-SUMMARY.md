---
phase: 07-performance
plan: 01
subsystem: service
tags: [cache, performance, reliability-metrics, ttl, concurrency]
dependency_graph:
  requires: []
  provides: [StudyStatsCache, NewTTLStatsCache, stats-cache-integration]
  affects: [internal/service/study.go, cmd/anklyze-apiserver/main.go]
tech_stack:
  added: [sync.RWMutex TTL cache, in-memory stats caching]
  patterns: [pluggable-cache-interface, noOp-default, lazy-eviction, double-check-locking]
key_files:
  created:
    - internal/service/stats_cache.go
    - internal/service/stats_cache_test.go
  modified:
    - internal/service/study.go
    - internal/service/study_test.go
    - cmd/anklyze-apiserver/main.go
decisions:
  - "StudyStatsCache.Get takes uuid.UUID not context.Context — cache access is in-memory and instantaneous; no cancellation needed"
  - "Lazy eviction on Get with double-check pattern under write lock prevents TOCTOU race between RLock check and Lock eviction"
  - "noOpStatsCache as default in tests — all existing tests pass unchanged with zero behavioral difference"
  - "Cache invalidated at start of UpdateProgressAfterResponse (not end) — conservative approach ensures next read always recalculates"
  - "NewTTLStatsCache(5 * time.Minute) in main.go — 5-minute TTL bounds stale data without excessive recalculation"
metrics:
  duration: 160s
  completed: "2026-02-27"
  tasks: 2
  files: 5
---

# Phase 7 Plan 1: In-Memory TTL Stats Cache Summary

**One-liner:** In-memory TTL cache for study reliability metrics using sync.RWMutex with lazy eviction, injected into StudyService via pluggable interface.

## What Was Built

Implemented a thread-safe in-memory TTL cache for study-level reliability metrics to avoid recalculating kappa coefficients on every page load. The cache is pluggable via the `StudyStatsCache` interface, with a production `ttlStatsCache` (5-minute TTL) and a `noOpStatsCache` for tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create StudyStatsCache interface and TTL implementation with tests | c706618 | internal/service/stats_cache.go, internal/service/stats_cache_test.go |
| 2 | Integrate stats cache into StudyService and wire in main.go | eb4fced | internal/service/study.go, internal/service/study_test.go, cmd/anklyze-apiserver/main.go |

## Decisions Made

1. **No context.Context in StudyStatsCache.Get** — Cache access is purely in-memory and instantaneous. Adding context would be premature complexity with no benefit. Follows same rationale used for noOpCache in ClassificationCache.

2. **Lazy eviction with double-check pattern** — Expired entries are deleted only when accessed, not by a background sweeper. Double-check under write lock prevents TOCTOU race: after acquiring RLock and finding expired, we acquire Lock and re-check before deleting, since another goroutine may have refreshed or evicted in between.

3. **noOpStatsCache as test default** — All existing `newStudyService` calls in tests pass `noOpStatsCache{}`. The no-op always misses, preserving identical behavior to pre-cache code. Real cache behavior is tested separately in `TestGetReliabilityMetrics_CacheHit` and `_CacheMissPopulates`.

4. **Invalidate before DB work in UpdateProgressAfterResponse** — Conservative approach: invalidate first, then update rater progress. If the DB update fails, the cache is still cleared, ensuring the next stats read always recalculates. Avoids serving stale data after a response is submitted.

5. **5-minute TTL** — Bounds stale data lifetime even if invalidation is missed. Studies with many raters will see cached kappa values that are at most 5 minutes old.

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- [x] Repeated requests for the same study's reliability metrics return cached results without hitting the database — `TestGetReliabilityMetrics_CacheHit` verifies DB repos return errors but call succeeds from cache
- [x] When a rater submits a new classification response, the stats cache for that study is invalidated before the next read — `statsCache.Invalidate(studyID)` is the first statement in `UpdateProgressAfterResponse`
- [x] Cache entries expire after 5 minutes — `TestTTLStatsCache_Expiry` with 50ms TTL and 60ms sleep
- [x] Thread-safe — sync.RWMutex with double-check pattern on eviction
- [x] All existing tests pass with noOpStatsCache injection

## Self-Check

Files created/modified:

- [x] internal/service/stats_cache.go — FOUND
- [x] internal/service/stats_cache_test.go — FOUND
- [x] internal/service/study.go — FOUND (modified)
- [x] internal/service/study_test.go — FOUND (modified)
- [x] cmd/anklyze-apiserver/main.go — FOUND (modified)

Commits:

- [x] c706618 — feat(07-01): add StudyStatsCache interface and TTL implementation
- [x] eb4fced — feat(07-01): integrate StudyStatsCache into StudyService and wire TTL cache in main.go
