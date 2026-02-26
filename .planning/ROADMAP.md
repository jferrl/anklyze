# Roadmap: Anklyze Codebase Hardening

## Overview

This milestone hardens the Anklyze codebase from a working prototype to production-grade quality. Work proceeds in dependency order: fix observable bugs first (classification results must be trustworthy), then enforce security (auth must not be optional), then add missing architectural layers (services wrap the rule engine), then clean up backend and frontend tech debt (internals become maintainable), then address performance bottlenecks (the system handles real load). Each phase delivers a coherent, verifiable improvement to the codebase.

## Phases

- [ ] **Phase 1: Bug Fixes** - Correct classification surface, state machine enforcement, and DB fallback transparency
- [ ] **Phase 2: Security** - Auth enforcement, JWT hardening, sensitive data protection, and service key audit
- [ ] **Phase 3: Backend Architecture** - ClassificationService, Study domain service, and model decoupling
- [ ] **Phase 4: Backend Tech Debt** - Rule engine consolidation, statistics modularization, prompts extraction, JSONB validation, migrations
- [ ] **Phase 5: Frontend Tech Debt** - API retry logic, page component decomposition, and event handler memoization
- [ ] **Phase 6: Performance** - Statistics caching, chat virtualization, batch image loading, React memoization

## Phase Details

### Phase 1: Bug Fixes
**Goal**: The application correctly surfaces all classification outcomes and enforces valid case state transitions
**Depends on**: Nothing (first phase)
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04
**Success Criteria** (what must be TRUE):
  1. When a fracture pattern produces an ambiguous classification, the API response includes an explicit ambiguous indicator and the frontend displays a visible warning — never a silent regular result
  2. When a fracture pattern produces an impossible classification, the API response includes an explicit impossible indicator and the frontend displays a visible error state
  3. Attempting to transition a case to an invalid state (e.g., closed → draft) returns a structured error response with a descriptive code, not a silent no-op
  4. When the database is unavailable, the API returns a response that identifies degraded mode; callers can distinguish a healthy response from a degraded one
**Plans**: 3 plans (Wave 1 — all parallel)

Plans:
- [x] 01-01-PLAN.md — Surface ambiguous and impossible classification flags in API responses and frontend UI (BUG-01, BUG-02)
- [x] 01-02-PLAN.md — Enforce case state machine transitions with test coverage and frontend error handling (BUG-03)
- [ ] 01-03-PLAN.md — Make database fallback mode explicit in health endpoint and server startup logs (BUG-04)

### Phase 2: Security
**Goal**: Authentication, JWT validation, sensitive data protection, and service key access are enforced for production deployment
**Depends on**: Phase 1
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. When REQUIRE_AUTH (or equivalent) is set in production, all protected routes reject unauthenticated requests — the server cannot start with auth silently disabled
  2. If SUPABASE_JWT_SECRET is absent at startup, a WARN-level log entry is emitted that flags the missing secret before the server accepts requests
  3. Sensitive medical data in the audit trail is either field-level encrypted or sanitized so that raw PII does not appear in plaintext log records
  4. SUPABASE_SERVICE_ROLE_KEY usage is documented with a list of required permissions and an audit comment at each call site; overprivileged calls are restricted
**Plans**: TBD

Plans:
- [ ] 02-01: Enforce authentication in production and add startup validation for auth configuration
- [ ] 02-02: Harden JWT secret handling with warning logs and production enforcement
- [ ] 02-03: Protect sensitive medical data in audit trail with field-level sanitization or encryption
- [ ] 02-04: Audit service role key usage and document required permissions at each call site

### Phase 3: Backend Architecture
**Goal**: Core classification and study operations are mediated by domain services with clear boundaries
**Depends on**: Phase 2
**Requirements**: ARCH-01, ARCH-02, ARCH-04
**Success Criteria** (what must be TRUE):
  1. Classification requests pass through ClassificationService which provides audit logging, error wrapping, and a hook point for caching — handlers no longer call the rule engine directly
  2. Case-study relationship operations (adding cases to studies, querying study membership) flow through a Study domain service — no scattered repository calls across handlers for relationship logic
  3. Case and Study models do not directly expose repository join logic; updates to study-case relationships require changes in one place only
**Plans**: TBD

Plans:
- [ ] 03-01: Implement ClassificationService wrapping the rule engine with audit logging and error handling
- [ ] 03-02: Implement Study domain service managing case-study relationships
- [ ] 03-03: Decouple Case and Study model coupling through domain service abstraction

### Phase 4: Backend Tech Debt
**Goal**: Backend internals are modular, validated against data schema changes, and managed by an explicit migration system
**Depends on**: Phase 3
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05
**Success Criteria** (what must be TRUE):
  1. The three suprasyndesmotic AO helper functions in the rule engine are replaced by a single parameterized function — a change to AO classification logic requires editing one function, not three
  2. Statistics calculations live in focused per-algorithm files (cohens_kappa.go, fleiss_kappa.go, etc.) under a statistics package — a developer can navigate to any calculation without scrolling through 1178 lines
  3. LLM prompt strings are not embedded in Go source files; they are loaded from external template files at startup, and a prompt change does not require a Go recompile
  4. JSONB fields are validated against a schema before deserialization; a partial or structurally invalid payload is rejected with a descriptive error, not silently accepted with zero values
  5. Database schema changes are applied through an explicit migration system (golang-migrate or equivalent); GORM AutoMigrate is removed from production startup
**Plans**: TBD

Plans:
- [ ] 04-01: Consolidate suprasyndesmotic AO helper functions into single parameterized function
- [ ] 04-02: Split statistics service into focused per-algorithm modules
- [ ] 04-03: Extract LLM prompts into external versioned template files
- [ ] 04-04: Add JSONB field validation against schemas before deserialization
- [ ] 04-05: Upgrade database migrations from AutoMigrate to explicit migration system

### Phase 5: Frontend Tech Debt
**Goal**: Frontend page components are decomposed into focused modules and the API client handles transient failures gracefully
**Depends on**: Phase 4
**Requirements**: ARCH-03, DEBT-06, DEBT-07, DEBT-08, DEBT-09
**Success Criteria** (what must be TRUE):
  1. The API client retries idempotent operations with exponential backoff on transient network failures; a user-initiated action does not fail immediately on a temporary connection issue
  2. CaseEditorPage is under 300 lines per file; form state is managed in custom hooks and complex UI sections are compound components
  3. AdminCasesPage table and filter logic lives in reusable components that can be shared with AdminStudiesPage
  4. AdminStudiesPage uses the same shared table and filter components as AdminCasesPage — no duplicated table/filter code between the two pages
  5. Event handlers in page components use useCallback consistently; no handler function is recreated on every render when passed as a prop
**Plans**: TBD

Plans:
- [ ] 05-01: Add exponential backoff retry logic to the frontend API client for idempotent operations
- [ ] 05-02: Decompose CaseEditorPage into custom hooks and compound components
- [ ] 05-03: Extract reusable table and filter components from AdminCasesPage and AdminStudiesPage
- [ ] 05-04: Wrap event handlers in page components with useCallback for consistent memoization

### Phase 6: Performance
**Goal**: Statistics calculations, chat rendering, image loading, and React re-renders perform efficiently under real-world load
**Depends on**: Phase 5
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Statistics for a study are served from cache on repeated requests; the cache is invalidated when new responses are submitted — a large study does not trigger full recalculation on every page load
  2. Chat sessions with 50+ messages render without perceptible lag; messages are virtualized or paginated so the DOM does not hold the full history
  3. Batch image loading for case lists uses database-level grouping; the repository returns pre-grouped results without an additional in-memory pass
  4. useEffect hooks in page components have correct dependency arrays; useCallback and useMemo are applied to derived state and callbacks, eliminating unnecessary re-renders that can be verified with React DevTools profiler
**Plans**: TBD

Plans:
- [ ] 06-01: Implement statistics caching with TTL and invalidation on new responses
- [ ] 06-02: Virtualize chat message history in ChatPanel for long sessions
- [ ] 06-03: Optimize batch image loading with database-level grouping
- [ ] 06-04: Fix useEffect dependency arrays and apply useCallback/useMemo for stable references

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bug Fixes | 2/3 | In Progress|  |
| 2. Security | 0/4 | Not started | - |
| 3. Backend Architecture | 0/3 | Not started | - |
| 4. Backend Tech Debt | 0/5 | Not started | - |
| 5. Frontend Tech Debt | 0/4 | Not started | - |
| 6. Performance | 0/4 | Not started | - |
