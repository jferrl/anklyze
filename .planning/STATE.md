---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-02-27T22:54:13.507Z"
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 20
  completed_plans: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** The classification engine must produce correct, reliable results for every fracture pattern — ambiguous and impossible cases must be clearly surfaced, never silently dropped.
**Current focus:** Phase 3 — Backend Architecture

## Current Position

Phase: 7 of 7 (Performance)
Plan: 4 of 4 in current phase (all plans complete)
Status: Complete
Last activity: 2026-02-27 — Completed 07-01: In-memory TTL cache for study reliability metrics, StudyStatsCache interface, integrated into StudyService

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~3 minutes
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-bug-fixes | 3 | ~9 min | ~3 min |
| 02-security | 1 (so far) | ~3 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 01-01, 01-02, 01-03, 02-01
- Trend: Fast execution, minimal changes needed

*Updated after each plan completion*
| Phase 03-backend-architecture P01 | 6 | 2 tasks | 9 files |
| Phase 03-backend-architecture P02 | 7 | 2 tasks | 11 files |
| Phase 04-backend-tech-debt P03 | 8 | 2 tasks | 6 files |
| Phase 04-backend-tech-debt P04 | 5 | 2 tasks | 8 files |
| Phase 04-backend-tech-debt P01 | 15 | 3 tasks | 15 files |
| Phase 04-backend-tech-debt P02 | 12 | 2 tasks | 13 files |
| Phase 05-frontend-tech-debt P02 | 78s | 2 tasks | 6 files |
| Phase 05-frontend-tech-debt P01 | 12 | 2 tasks | 7 files |
| Phase 05 P03 | 283 | 2 tasks | 3 files |
| Phase 06-gap-closure P01 | 208s | 2 tasks | 9 files |
| Phase 07-performance P03 | 2 | 1 tasks | 2 files |
| Phase 07-performance P01 | 160s | 2 tasks | 5 files |
| Phase 07-performance P04 | 2 | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Harden before adding features — prevent compounding debt
- [Init]: Full cleanup approach — moderate fixes leave architectural debt
- [Init]: Defer test coverage to next milestone — keep scope focused
- [01-01]: Ambiguous banner triggers on ambiguous===true regardless of possible_types presence — no silent failures
- [01-01]: Impossible classification shows red banner at top AND continues rendering all available classification cards below
- [01-01]: AmbiguousReasonKey uses i18n key pattern so frontend can display locale-appropriate clinical reason
- [01-02]: Use instanceof InputValidationError with code check for INVALID_STATE_TRANSITION — consistent with existing error pattern
- [01-02]: Close publish dialog on error in CaseEditorPage — prevents stale dialog state after failed mutation
- [01-02]: Separate publishFailed/closeFailed keys over generic operationFailed — clearer actionable feedback
- [01-03]: HTTP 200 in both healthy and degraded health responses — preserves monitoring that checks status code only
- [01-03]: dbHealthy bool passed via constructor parameter, not runtime check — determined once at startup
- [01-03]: SetupRoutes receives dbHealthy so main.go remains single source of truth for db connection state
- [Phase 02-security]: jwtPattern applied before longCredentialPattern because JWT three-segment structure spans dots that break base64 contiguous match
- [Phase 02-security]: 50-char minimum for longCredentialPattern ensures UUIDs (36 chars) are never redacted — case/study IDs remain readable in logs
- [Phase 02-security]: RedactCredentials is a string helper, not custom slog.Handler — applied selectively at log call sites where credential values appear
- [Phase 02-security]: ServiceKeyOperation typed string enum exported from internal/supabase enumerates all permitted service key uses with required Supabase permission comments
- [Phase 02-security]: LogServiceKeyUsage variadic attrs signature prevents callers from accidentally passing the service key value to log output
- [Phase 02-security]: Timestamp embedded inside LogServiceKeyUsage so callers cannot omit it from audit records
- [02-01]: errors.Is(err, ErrTokenExpired) replaces == switch — safe against wrapping, idiomatic Go
- [02-01]: Expired token gets own early return with {code:TOKEN_EXPIRED} — clearer control flow, distinct from other auth failures
- [02-01]: ValidateProduction() accumulates all violations simultaneously — operator sees full picture on startup failure
- [02-01]: IsProduction() gates ValidateProduction() in main.go — dev startup unaffected, no ENV required in non-production
- [Phase 03-backend-architecture]: ClassificationService.Classify() does not do HTTP audit — that stays in handler.go which has gin.Context for IP/UserAgent
- [Phase 03-backend-architecture]: ClassifyAndSave always calls engine directly (skips cache) to ensure fresh results are stored for case responses
- [Phase 03-backend-architecture]: noOpCache is the Phase 3 default — ClassificationCache interface is the Phase 6 hook point
- [Phase 03-backend-architecture]: rules.Engine is no longer referenced in internal/api/ — all classification goes through ClassificationService
- [03-02]: DivergenceService fully absorbed into StudyService — types kept in service package, no separate struct
- [03-02]: ReliabilityCalculator interface defined in service package enables StudyService testing without *StatisticsService
- [03-02]: ValidateResponseSubmission checks study membership only — case-level checks stay in handler
- [03-02]: Counter update failures in AddCase/RemoveCase are logged but non-fatal
- [Phase 04-backend-tech-debt]: validate.Struct() called before domain method calls to fail fast before any allocation; HTTP 422 for struct validation failures distinguishes from 400 malformed JSON
- [Phase 04-backend-tech-debt]: fe.Namespace() over fe.Field() in validationFieldErrors includes parent struct path for precise field identification
- [Phase 04-backend-tech-debt]: validate omitempty on ClassificationResult pointer sub-structs allows legitimate partial payloads to pass validation
- [Phase 04-backend-tech-debt]: RunMigrations uses iofs.New with embed.FS — migrations embedded in binary, no external files needed at runtime
- [Phase 04-backend-tech-debt]: Migration failure in main.go is fatal (os.Exit(1)) — running on wrong schema causes data corruption, app must not start
- [Phase 04-backend-tech-debt]: migrate.ErrNoChange handled gracefully (returns nil) — first-run and subsequent starts work identically
- [Phase 04-backend-tech-debt]: internal/statistics package imports only internal/domain and stdlib — pure testability without DB or service mocks
- [Phase 04-backend-tech-debt]: AOOTAOrdering exported from internal/statistics so all callers reference the canonical ordering from one location
- [Phase 04-backend-tech-debt]: StatisticsService method signatures unchanged — no call site updates required in handlers after statistics package split
- [Phase 04-backend-tech-debt]: Static system prompts loaded via fs.ReadFile (not template.ParseFS) — avoids double-brace escaping issues in JSON schema examples within prompt content
- [Phase 04-backend-tech-debt]: PromptLoader initialized before HasGemini() check in main.go — template loading is independent of API key, fail-fast on bad templates at startup
- [05-02]: manualPagination: true required on DataTable — data is server-paginated; getPaginationRowModel deliberately excluded
- [05-02]: DataTable renders only desktop table view (hidden md:block); mobile card layouts stay in each admin page
- [05-02]: Pagination returns null when totalPages <= 1 — eliminates conditional rendering boilerplate at call sites
- [05-02]: SectionErrorBoundary placed in components/ui/ not pages/admin/components/ — generic UI building block usable anywhere
- [Phase 05-01]: RETRYABLE_METHODS = Set(['GET','PUT','DELETE']) — POST excluded to preserve non-idempotent semantics; getAuthHeaders called fresh on each retry attempt for token refresh support
- [Phase 05-01]: Render-time sync pattern preserved exactly (no useEffect conversion) — prevents form reset on re-render in useCaseEditorForm
- [Phase 05-01]: useCaseEditorMutations receives getPendingUploads/clearPendingUploads callbacks to avoid stale closure in mutation onSuccess handlers
- [Phase 05-03]: Use whole mutation object not mutation.mutate in useCallback deps — React Compiler preserve-manual-memoization requires it
- [Phase 05-03]: column meta.className in DataTable module augmentation enables hidden lg:table-cell via generic DataTable component
- [Phase 05-03]: CaseRow and StudyRow deleted — ColumnDef arrays with useMemo replace them with no behavior change
- [06-01]: ProbeJWKS uses http.NewRequestWithContext with 5s timeout — not bare http.Get — to honour context cancellation
- [06-01]: retryJWKSProbeWithBackoff accepts initialBackoff for testability; RetryJWKSProbe calls it with default 5s
- [06-01]: jwksReady nil = not tracked = ready in HealthCheck — preserves backwards compatibility for non-production callers
- [06-01]: JWKS probe fires only when cfg.IsProduction() && authValidator != nil — avoids false noise in dev
- [06-01]: ARCH-03 acknowledged but no work performed — PATCH retry dropped from scope per user decision
- [07-02]: PERF-02 (chat virtualization) explicitly deferred — conversations in AI chat panel do not reach lengths requiring optimization; effort redirected to statistics caching and image loading
- [Phase 07-performance]: LazyImage is a non-exported internal component inside ImageGrid.tsx — encapsulates per-image URL fetch lifecycle with cancellation
- [Phase 07-performance]: onUrlResolved with useCallback in CaseDetailPage provides stable reference to avoid re-triggering LazyImage useEffect on every render
- [Phase 07-performance]: setImageUrls({}) reset placed in render-time sync block to preserve existing Phase 05-01 pattern
- [Phase 07-04]: cases array wrapped in useMemo([casesData]) to provide stable reference — required so downstream useMemo hooks on stats/recentActiveCases/casesNeedingAttention are not invalidated by ?? [] new-array creation
- [Phase 07-04]: formatDuration extracted as module-level function — pure function with no component state dependency, no useCallback needed
- [Phase 07-04]: useCallback applied to handleExportCSV in analytics/reliability pages for consistency with admin page patterns, even on native Button onClick
- [07-01]: StudyStatsCache.Get takes uuid.UUID not context.Context — in-memory access is instantaneous, no cancellation needed
- [07-01]: Lazy eviction with double-check pattern under write lock prevents TOCTOU race in ttlStatsCache.Get
- [07-01]: Cache invalidated at start of UpdateProgressAfterResponse (conservative) — ensures next read always recalculates after response submission
- [07-01]: NewTTLStatsCache(5 * time.Minute) in main.go — bounds stale data without excessive recalculation

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3 - RESOLVED]: ClassificationService must not change rule engine outputs — golden reference tests pass unchanged after wrapping
- [Phase 4]: Explicit migrations must be backward-compatible with existing staging data — no destructive schema changes

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 07-01-PLAN.md — In-memory TTL cache for study reliability metrics, StudyStatsCache interface and ttlStatsCache implementation
Resume file: None
