# Phase 7: Performance - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize statistics calculations, image loading, and React re-renders to perform efficiently under real-world load. Chat virtualization (PERF-02) is explicitly out of scope — conversations are not long enough to warrant optimization.

</domain>

<decisions>
## Implementation Decisions

### Statistics Caching
- Stale-while-revalidate pattern: serve cached stats immediately, refresh in background
- In-memory Go cache (e.g., sync.Map or small LRU) — no external dependencies
- 5-minute TTL as safety net, even with explicit invalidation
- Cache invalidated only when a rater submits a new classification response (not on other study changes)

### Chat Optimization
- SKIP PERF-02 entirely — conversations in the AI chat panel are not long enough to need virtualization or pagination
- No work on ChatPanel performance

### Image Loading
- Skeleton loaders (gray animated shimmer) as placeholders while images load
- Lazy loading: only load images as they scroll into view
- Optimization scoped to case list pages only (not study views or admin panels)
- On image load failure: show error immediately, no retry — user can manually refresh

### React Optimization
- Audit page-level components only (case list, study detail, admin pages) — not shared UI pieces
- Fix useEffect dependency arrays, apply useCallback/useMemo for stable references
- No performance monitoring or metrics collection — just fix the issues

### Claude's Discretion
- Specific in-memory cache implementation (sync.Map, LRU library, etc.)
- Reasonable latency targets based on operation type
- Which specific page components have the worst re-render issues
- Lazy loading implementation approach (Intersection Observer, library, etc.)

</decisions>

<specifics>
## Specific Ideas

- This is proactive optimization — no specific pain points reported yet, optimizing for expected growth
- Focus effort on stats caching and image loading (the dropped PERF-02 time goes to deeper work here)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-performance*
*Context gathered: 2026-02-27*
