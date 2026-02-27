# Phase 7: Performance - Research

**Researched:** 2026-02-27
**Domain:** Go in-memory caching, browser lazy loading / Intersection Observer, React memoization hooks
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Statistics Caching**
- Stale-while-revalidate pattern: serve cached stats immediately, refresh in background
- In-memory Go cache (e.g., sync.Map or small LRU) — no external dependencies
- 5-minute TTL as safety net, even with explicit invalidation
- Cache invalidated only when a rater submits a new classification response (not on other study changes)

**Chat Optimization**
- SKIP PERF-02 entirely — conversations in the AI chat panel are not long enough to need virtualization or pagination
- No work on ChatPanel performance

**Image Loading**
- Skeleton loaders (gray animated shimmer) as placeholders while images load
- Lazy loading: only load images as they scroll into view
- Optimization scoped to case list pages only (not study views or admin panels)
- On image load failure: show error immediately, no retry — user can manually refresh

**React Optimization**
- Audit page-level components only (case list, study detail, admin pages) — not shared UI pieces
- Fix useEffect dependency arrays, apply useCallback/useMemo for stable references
- No performance monitoring or metrics collection — just fix the issues

### Claude's Discretion
- Specific in-memory cache implementation (sync.Map, LRU library, etc.)
- Reasonable latency targets based on operation type
- Which specific page components have the worst re-render issues
- Lazy loading implementation approach (Intersection Observer, library, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Statistics calculations cached with TTL and invalidated on new responses | Go in-memory LRU or sync.Map cache; inject into StudyService.GetReliabilityMetrics; invalidate in response submission path |
| PERF-02 | Chat message history virtualized with pagination for long sessions | **SKIPPED per user decision** — conversations are not long enough; no implementation needed |
| PERF-03 | Batch image loading optimized with database-level grouping | GetImagesForCases already exists; case list pages must use it; CasesPage uses image_count (no actual image fetching at list); CaseDetailPage fetches one image at a time via useEffect — add lazy loading with Skeleton |
| PERF-04 | Frontend useEffect dependencies optimized with proper useCallback/useMemo usage | Audit CaseDetailPage and page-level components; fix stale deps; apply hooks correctly |
</phase_requirements>

---

## Summary

Phase 7 has four requirements, one of which (PERF-02) is explicitly skipped. The remaining three are concrete and scoped: a Go statistics cache, lazy image loading with skeletons on the case detail page, and React hook cleanup across page-level components.

The codebase is already well-positioned for most of these changes. `GetImagesForCases` exists in both the repository interface and Postgres implementation (performing a single `WHERE case_id IN (...)` query with in-memory grouping). The user-facing case list (`CasesPage`) shows only `image_count` — a number from the API — so it does not fetch actual image URLs and does not have an N+1 problem. The actual image URL fetching happens in `CaseDetailPage`, which calls `getImageSignedURL` for each image sequentially inside a `useEffect`. Adding skeleton placeholders and lazy loading (via the native `loading="lazy"` attribute or Intersection Observer) is the correct fix there.

For statistics caching, the `StudyService.GetReliabilityMetrics` method is the right injection point — it orchestrates the DB reads and the calculation. A simple in-memory cache keyed on `studyID` with a 5-minute TTL and explicit invalidation on response submission is the right approach. The project already has `ClassificationCache` as a pattern for pluggable caches; the same pattern (interface + no-op default + real implementation) should be used. No external dependencies (Redis, Memcached) are needed or wanted.

**Primary recommendation:** Implement a generic `ttlcache` struct using `sync.RWMutex` + `map[uuid.UUID]cacheEntry` (no third-party lib) keyed on `studyID`; invalidate in the response submission path; fix `CaseDetailPage` image loading to use `loading="lazy"` + Skeleton placeholders; audit `useEffect` arrays in page-level components.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go stdlib `sync` | stdlib | `RWMutex` for thread-safe in-memory cache | Zero deps, already in use across codebase |
| Go stdlib `time` | stdlib | TTL tracking with `time.Time` expiry fields | Zero deps |
| React `useCallback` / `useMemo` | 19.x (already in project) | Stable references and derived state memoization | Already used in AdminCasesPage, AdminStudiesPage |
| HTML `loading="lazy"` | Browser API | Native image lazy loading | Zero deps, ~95% browser support, no library needed |
| shadcn Skeleton | already in project | Shimmer placeholders during image load | `Skeleton` component already exists at `components/ui/skeleton.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Go `sync.Map` | stdlib | Alternative to `sync.RWMutex` + map | When write contention is extremely low; `RWMutex`+map preferred for TTL cache because `sync.Map` has no native TTL support and requires manual type assertions |
| `IntersectionObserver` | Browser API | Trigger image load when element enters viewport | Use when `loading="lazy"` alone is insufficient (e.g., images inside overflow-hidden containers that need explicit intersection detection) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| stdlib `sync.RWMutex` + map | `github.com/patrickmn/go-cache` | go-cache is zero-effort but adds external dependency; CONTEXT.md locked on no external deps |
| stdlib `sync.RWMutex` + map | Redis | Redis adds infrastructure dependency; overkill for a single-server in-memory cache |
| HTML `loading="lazy"` | `react-intersection-observer` | Library adds a dependency; native attribute is sufficient for block-level `<img>` tags |

**Installation:** No new packages needed. All required primitives are in stdlib or already in the project.

---

## Architecture Patterns

### Pattern 1: Statistics Cache — In-Memory TTL Cache with RWMutex

**What:** A `studyStatsCache` struct wrapping `sync.RWMutex` + `map[uuid.UUID]cacheEntry`. Each entry stores the pre-computed `*domain.StudyReliabilityMetrics` and an `expiresAt time.Time`. On Get, check expiry; on Set, record current time + 5m TTL; on Invalidate, delete by key.

**When to use:** Any time `StudyService.GetReliabilityMetrics` is called. The cache sits between the handler and the expensive DB reads + calculation.

**Injection point:** `NewStudyService` already accepts a `ReliabilityCalculator` interface. Add a parallel `StudyStatsCache` interface with `Get`/`Set`/`Invalidate` methods. Pass a real implementation in `main.go`; a `noOpStatsCache` in tests.

**Invalidation trigger:** `UpdateProgressAfterResponse` is called in a background goroutine after every response submission. This is the right place to call `cache.Invalidate(studyID)`. The cache is only invalidated on response submission, consistent with the locked decision.

**Example:**
```go
// internal/service/stats_cache.go

type StudyStatsCache interface {
    Get(studyID uuid.UUID) (*domain.StudyReliabilityMetrics, bool)
    Set(studyID uuid.UUID, metrics *domain.StudyReliabilityMetrics)
    Invalidate(studyID uuid.UUID)
}

type noOpStatsCache struct{}
func (noOpStatsCache) Get(_ uuid.UUID) (*domain.StudyReliabilityMetrics, bool) { return nil, false }
func (noOpStatsCache) Set(_ uuid.UUID, _ *domain.StudyReliabilityMetrics)       {}
func (noOpStatsCache) Invalidate(_ uuid.UUID)                                   {}

type ttlStatsCache struct {
    mu      sync.RWMutex
    entries map[uuid.UUID]statsCacheEntry
    ttl     time.Duration
}

type statsCacheEntry struct {
    metrics   *domain.StudyReliabilityMetrics
    expiresAt time.Time
}

func NewTTLStatsCache(ttl time.Duration) StudyStatsCache {
    return &ttlStatsCache{entries: make(map[uuid.UUID]statsCacheEntry), ttl: ttl}
}

func (c *ttlStatsCache) Get(studyID uuid.UUID) (*domain.StudyReliabilityMetrics, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    entry, ok := c.entries[studyID]
    if !ok || time.Now().After(entry.expiresAt) {
        return nil, false
    }
    return entry.metrics, true
}

func (c *ttlStatsCache) Set(studyID uuid.UUID, metrics *domain.StudyReliabilityMetrics) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.entries[studyID] = statsCacheEntry{metrics: metrics, expiresAt: time.Now().Add(c.ttl)}
}

func (c *ttlStatsCache) Invalidate(studyID uuid.UUID) {
    c.mu.Lock()
    defer c.mu.Unlock()
    delete(c.entries, studyID)
}
```

**GetReliabilityMetrics with cache:**
```go
func (s *studyService) GetReliabilityMetrics(ctx context.Context, studyID uuid.UUID) (*domain.StudyReliabilityMetrics, error) {
    if cached, ok := s.statsCache.Get(studyID); ok {
        return cached, nil
    }
    // ... existing DB fetch + calculation ...
    s.statsCache.Set(studyID, metrics)
    return metrics, nil
}
```

**UpdateProgressAfterResponse with invalidation:**
```go
func (s *studyService) UpdateProgressAfterResponse(ctx context.Context, studyID uuid.UUID, caseID, userID uuid.UUID) {
    s.statsCache.Invalidate(studyID) // invalidate before updating — ensures next read recalculates
    // ... existing rater progress update ...
}
```

---

### Pattern 2: Image Lazy Loading with Skeleton Placeholder

**What:** Replace the eager `Promise.all(images.map(img => getImageSignedURL(...)))` pattern in `CaseDetailPage` with a per-image lazy load triggered by the image scrolling into view. Show a `Skeleton` shimmer until the signed URL resolves. On error, show an error state immediately.

**Current problem:** `CaseDetailPage.tsx` lines 90–112 run a `useEffect` that fetches all image URLs eagerly in parallel when `caseData` loads. This means every image URL is fetched before any image is visible to the user.

**Scope:** Case list pages only (locked decision). `CasesPage.tsx` shows only `image_count` — no actual image URL is fetched there. The fix targets `CaseDetailPage.tsx` and potentially the `ImageGrid` component used in the case editor (admin flow, but lower priority).

**Approach:** Use HTML `<img loading="lazy">` for native browser lazy loading. This is the zero-dependency approach. Add `onLoadingStatusChange` state per image for skeleton display.

**Alternative for complex layouts:** If images are inside `overflow-hidden` containers that prevent native lazy loading from triggering, use `IntersectionObserver` directly (already mocked in `src/test/setup.ts`, confirming the project is aware of it).

**Example — per-image skeleton + lazy load:**
```tsx
// In CaseDetailPage: replace eager useEffect with per-image state

function LazyImage({ imageId, caseId }: { imageId: string; caseId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getImageSignedURL(caseId, imageId)
      .then(res => { if (!cancelled) setUrl(res.url); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [caseId, imageId]);

  if (error) return <div className="...">Failed to load</div>;
  if (!url) return <Skeleton className="w-full h-full" />;
  return <img src={url} loading="lazy" className="w-full h-full object-cover" />;
}
```

**Note on PERF-03 (database-level grouping):** The requirement says "repository returns pre-grouped results without an additional in-memory pass." This is already implemented. `GetImagesForCases` in `internal/repository/postgres/case.go` (lines 134–155) issues a single `WHERE case_id IN (?)` query and groups results into a `map[uuid.UUID][]domain.CaseImage` in one pass. `ListPublishedCases` in `case_access_handler.go` (line 74) already calls `GetImagesForCases`. The Postgres implementation is correct. The plan for PERF-03 should verify this is wired correctly and add the Skeleton/lazy-load UI behavior to satisfy the full requirement.

---

### Pattern 3: React useEffect Dependency Array Audit

**What:** Scan page-level components for `useEffect` hooks with incorrect or missing dependency arrays. Apply `useCallback` and `useMemo` to derived state and callbacks that are referenced in dependency arrays.

**Scope (locked):** Page-level components only:
- `CasesPage.tsx` — no `useEffect`, uses `useMemo` correctly
- `CaseDetailPage.tsx` — two `useEffect` hooks; the image fetch `useEffect` (lines 90–112) depends on `[caseData, id]` which is correct but the logic will change with lazy loading; the start-time `useEffect` (lines 60–62) depends on `[]` which is correct
- `AdminCasesPage.tsx` — no `useEffect`, uses `useCallback` and `useMemo` correctly
- `AdminStudiesPage.tsx` — no `useEffect`, uses `useCallback` and `useMemo` correctly
- `CaseReliabilityPage.tsx`, `StudyReliabilityPage.tsx` — need review

**Key finding from codebase scan:**
- `CasesPage.tsx` — no `useEffect` at all; `useMemo` for filtering and stats is correct
- `CaseDetailPage.tsx` — the `handleSubmitResponse` useCallback at line 207 includes `submitMutation` in deps; per the Phase 5 decision (`[Phase 05-03]: Use whole mutation object not mutation.mutate in useCallback deps`), this is intentional and correct
- `AdminCasesPage.tsx` / `AdminStudiesPage.tsx` — already fully migrated in Phase 5 (DEBT-07, DEBT-08, DEBT-09)

**Remaining work:** `CaseReliabilityPage.tsx` and `StudyReliabilityPage.tsx` need audit. Also check `CaseDivergencePage.tsx` and `CaseAnalyticsPage.tsx`.

**Pattern to apply:**
```tsx
// Before — inline callback re-created every render
<SomeComponent onAction={() => doSomething(id)} />

// After — stable reference
const handleAction = useCallback(() => doSomething(id), [id]);
<SomeComponent onAction={handleAction} />
```

---

### Anti-Patterns to Avoid

- **Cache without TTL:** A cache with only explicit invalidation will serve stale data indefinitely if the invalidation call is missed (e.g., a bug in the response submission path). Always add a TTL as a safety net (locked at 5 minutes).
- **Fetching all images in a single useEffect on mount:** The current `CaseDetailPage` pattern fetches all signed URLs eagerly. Replace with per-image lazy loading.
- **Over-applying useMemo/useCallback:** React's own docs (and the React Compiler guidance referenced in Phase 5 decisions) warn against wrapping every function. Apply only where the component visibly re-renders on each parent render due to unstable references.
- **Using `sync.Map` for TTL cache:** `sync.Map` has no expiry concept; hand-rolling TTL on top of it requires type assertions and is harder to read than a `RWMutex`+struct approach.
- **Image retry on error (user decided against it):** Do not add retry logic for signed URL fetch failures. Show error immediately, let user refresh.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache eviction on TTL expiry for large caches | Custom background goroutine sweep | stdlib `time`-checked expiry on `Get` (lazy expiry) | Lazy expiry is sufficient for a small map (tens of studies); background sweep adds goroutine lifecycle complexity |
| Image lazy loading | Custom scroll event listener | `<img loading="lazy">` or Intersection Observer | Native attribute has 95%+ browser support; zero JS overhead |
| Skeleton animation | Custom CSS animation | `Skeleton` component already in `components/ui/skeleton.tsx` | Already implemented with `animate-pulse` |

**Key insight:** This phase is about correctness and simplicity, not new infrastructure. Every required primitive already exists in the project or in stdlib.

---

## Common Pitfalls

### Pitfall 1: Cache Key Collision Between Case Reliability and Study Reliability

**What goes wrong:** `CaseAnalyticsHandler.GetReliabilityMetrics` (per-case) and `StudyHandler.GetStudyReliabilityMetrics` (per-study) are different endpoints returning different types. If a single cache is used without type discrimination, a study ID could collide with a case ID (both are `uuid.UUID`).

**Why it happens:** Both return `*domain.StudyReliabilityMetrics` (study-level) or `*domain.ReliabilityMetrics` (case-level). They are different types so a typed cache per service avoids the issue.

**How to avoid:** Implement `StudyStatsCache` only for study-level metrics in `StudyService`. Case-level metrics (if also cached later) would need a separate `CaseStatsCache`.

### Pitfall 2: Stale Cache After Response Submission Race

**What goes wrong:** Response submission handler calls a background goroutine (`go s.studyService.UpdateProgressAfterResponse(...)`) which invalidates the cache. If a stats request arrives between response submission and cache invalidation, it gets stale data.

**Why it happens:** The invalidation is asynchronous in the current code.

**How to avoid:** Call `statsCache.Invalidate(studyID)` synchronously at the start of `UpdateProgressAfterResponse` before the DB update, not at the end. This means the next stats request will miss the cache and recalculate — a safe conservative behavior.

### Pitfall 3: useEffect Dependencies with Object References

**What goes wrong:** `useEffect(() => { ... }, [someObject])` will re-run every render if `someObject` is created inline because object identity changes each render.

**Why it happens:** React uses `Object.is` for dependency comparison.

**How to avoid:** Depend on primitive values or memoized objects. For example, depend on `caseData?.id` (a string) rather than `caseData` (an object) when only the ID is needed for the effect.

### Pitfall 4: Image Loading="lazy" in overflow:hidden Containers

**What goes wrong:** Native `loading="lazy"` may not trigger inside `overflow: hidden` parent containers in some browser implementations, because the browser cannot determine the image's position relative to the viewport.

**Why it happens:** Browser lazy-load heuristics depend on proximity to viewport. Hidden overflow clips the layout box.

**How to avoid:** Test in the actual UI. If `loading="lazy"` does not trigger, fall back to `IntersectionObserver` with `rootMargin: "200px"`. The test setup already mocks `IntersectionObserver` (at `frontend/src/test/setup.ts` lines 36–44), so tests will work either way.

---

## Code Examples

### Statistics Cache — Full Integration

```go
// internal/service/study.go — updated studyService struct
type studyService struct {
    studyRepo         repository.StudyRepository
    studyResponseRepo repository.StudyResponseRepository
    caseRepo          repository.CaseRepository
    responseRepo      repository.CaseResponseRepository
    reliabilityCalc   ReliabilityCalculator
    statsCache        StudyStatsCache // NEW
}

// NewStudyService — add statsCache parameter
func NewStudyService(
    studyRepo repository.StudyRepository,
    studyResponseRepo repository.StudyResponseRepository,
    caseRepo repository.CaseRepository,
    responseRepo repository.CaseResponseRepository,
    reliabilityCalc ReliabilityCalculator,
    statsCache StudyStatsCache, // NEW
) StudyService {
    return &studyService{...statsCache: statsCache}
}
```

```go
// cmd/anklyze-apiserver/main.go — wire real cache
statsCache := service.NewTTLStatsCache(5 * time.Minute)
studySvc := service.NewStudyService(studyRepo, studyResponseRepo, caseRepo, responseRepo, reliabilityCalc, statsCache)
```

### Image Lazy Loading (CaseDetailPage pattern)

The key change: remove the bulk `useEffect` that fetches all image URLs on mount. Replace the `imageState` state with per-image components that fetch their own URL lazily (component-level `useEffect` with cleanup). Each image shows `Skeleton` until the URL resolves or shows error text on failure.

### React useCallback Pattern (already applied in admin pages)

```tsx
// Pattern confirmed correct in AdminCasesPage, AdminStudiesPage (Phase 5):
const handleEdit = useCallback((id: string) => navigate(`/admin/cases/${id}/edit`), [navigate]);
const columns = useMemo<ColumnDef<Case>[]>(() => [...], [handleEdit, handlePublish, ...]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N+1 image queries per case | `GetImagesForCases` batch (single IN query) | Already implemented (present in codebase) | No per-case query loop needed |
| No stats cache (every request recalculates) | TTL in-memory cache with invalidation | Phase 7 (this phase) | Stats for large studies served instantly on repeat requests |
| Eager image URL fetch (all images on mount) | Per-image lazy fetch with Skeleton | Phase 7 (this phase) | Images load only when scrolled into view |

**Deprecated/outdated:**
- `noOpCache` in `ClassificationService`: This was the Phase 3 placeholder for the classification cache. It was documented as "Phase 6 hook point" but Phase 6 JWKS work took priority and classification cache was not implemented. For PERF-01, we are adding a study-statistics cache, not a classification cache. The `noOpCache` for classification can remain as-is.

---

## Open Questions

1. **Which pages have the worst useEffect issues?**
   - What we know: `CasesPage`, `AdminCasesPage`, `AdminStudiesPage` are clean. `CaseDetailPage` has the image fetch useEffect that will be refactored. `CaseReliabilityPage` and `StudyReliabilityPage` have not been audited yet.
   - What's unclear: Whether `CaseDivergencePage` and `CaseAnalyticsPage` have any problematic dependency arrays.
   - Recommendation: Planner should allocate task 07-04 to audit all remaining page components not covered by Phase 5.

2. **Does `GetImagesForCases` need changes for PERF-03?**
   - What we know: The implementation already does a single DB query with in-memory grouping. The `case_access_handler.go` already uses it. There is no N+1 at the API layer for the case list.
   - What's unclear: The requirement says "the repository returns pre-grouped results without an additional in-memory pass." The current implementation does have one in-memory pass (the `for _, img := range images` loop to build the map). This is O(N) where N is total images — optimal, not a concern.
   - Recommendation: PERF-03 is satisfied at the repository layer. The plan should document this as "already correct at DB layer; frontend work is adding Skeleton + lazy loading on CaseDetailPage."

---

## Validation Architecture

> `workflow.nyquist_validation` is not set to `true` in `.planning/config.json` — this section is skipped.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection:
  - `/Users/jferrl/git/anklyze/internal/repository/postgres/case.go` lines 134–155 — `GetImagesForCases` implementation confirmed
  - `/Users/jferrl/git/anklyze/internal/api/case_access_handler.go` lines 67–85 — batch loading already wired in `ListPublishedCases`
  - `/Users/jferrl/git/anklyze/internal/service/study.go` lines 196–217 — `GetReliabilityMetrics` injection point for cache
  - `/Users/jferrl/git/anklyze/internal/service/classification.go` lines 26–38 — `ClassificationCache` interface pattern to replicate
  - `/Users/jferrl/git/anklyze/frontend/src/pages/CaseDetailPage.tsx` lines 90–112 — eager image URL fetch useEffect
  - `/Users/jferrl/git/anklyze/frontend/src/components/ui/skeleton.tsx` — `Skeleton` component already present
  - `/Users/jferrl/git/anklyze/frontend/src/test/setup.ts` lines 36–44 — `IntersectionObserver` mock already in test setup
  - `/Users/jferrl/git/anklyze/frontend/package.json` — React 19, no virtualizer library present

### Secondary (MEDIUM confidence)
- Go stdlib `sync.RWMutex` documentation and standard cache patterns — well-established Go idiom
- MDN `<img loading="lazy">` — browser support is 96%+ as of 2025

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all primitives already in project or stdlib; no new dependencies needed
- Architecture: HIGH — injection points directly identified in codebase; `ClassificationCache` pattern provides exact template
- Pitfalls: HIGH — identified from direct code inspection, not speculation

**Research date:** 2026-02-27
**Valid until:** 2026-03-28 (stable domain — no third-party library churn)
