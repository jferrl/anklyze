# Codebase Concerns

**Analysis Date:** 2026-02-26

## Tech Debt

**Rule Engine Method Duplication:**
- Issue: Helper functions `getAOOTAForSuprasindesmal`, `getAOOTAForSuprasindesmalBimaleolar`, and `getAOOTAForSuprasindesmalTrimaleolar` contain identical implementations with only function name differences.
- Files: `internal/rules/engine.go` (lines 537-595)
- Impact: Code duplication makes future updates to AO classification logic error-prone, requires changes in three places.
- Fix approach: Consolidate into single helper function `getAOOTAForSuprasindesmal(st domain.SuprasindesmalType)` to eliminate duplication.

**Complex Page Components:**
- Issue: Frontend pages exceed 600-700 lines, mixing state management, UI rendering, and business logic.
- Files:
  - `frontend/src/pages/admin/CaseEditorPage.tsx` (745 lines)
  - `frontend/src/pages/admin/AdminCasesPage.tsx` (625 lines)
  - `frontend/src/pages/admin/AdminStudiesPage.tsx` (583 lines)
- Impact: Difficult to test, maintain, and extend; high cognitive load for developers.
- Fix approach: Extract form state into custom hooks, separate table components, use compound component pattern for complex multi-step flows.

**Large Service Class:**
- Issue: `internal/service/statistics.go` (1178 lines) contains all reliability statistics calculations without modularization.
- Files: `internal/service/statistics.go`
- Impact: Difficult to navigate, test individual calculations, or reuse subsets of logic.
- Fix approach: Split into focused modules: `statistics/cohens_kappa.go`, `statistics/intraclass_correlation.go`, etc.

**LLM Prompt Hardcoding:**
- Issue: Medical classification prompts embedded directly in code with extensive inline documentation.
- Files: `internal/llm/prompts.go` (1028 lines)
- Impact: Difficult to iterate on prompts without code changes, version control mixing code and prompts, language updates require code redeploy.
- Fix approach: Move prompts to external template files (i18n or config-based), support prompt versioning separately.

## Known Bugs

**Ambiguous and Impossible Classifications Not Handled:**
- Symptoms: Some fracture classifications correctly return `Ambiguous: true` or `Impossible: true`, but frontend and API don't clearly indicate to users that the classification is uncertain or invalid.
- Files:
  - `internal/rules/engine.go` (lines 99-101, 192-194, 224, 234, 238, 460-462)
  - Frontend components may treat these as regular results
- Trigger: Lateral-only lateral morphology transverse with specific fibular levels, medial-posterior with CT but extraincisural posteromedial type
- Workaround: Frontend should check `Ambiguous` and `Impossible` fields and display appropriate warnings/error states.

**Case State Transitions Not Validated:**
- Symptoms: Moving cases between draft/published/closed states may not be properly validated at handler or service layer.
- Files: `internal/api/case_*_handler.go`
- Trigger: Attempting to edit or publish a case in invalid state
- Workaround: Frontend relies on UI state to prevent invalid transitions, but backend should enforce via state machines.

**Database Connection Fallback Behavior:**
- Symptoms: If database connection fails, application continues with NoOp repositories but doesn't clearly communicate degraded mode to users.
- Files: `cmd/anklyze-apiserver/main.go` (lines 87-142)
- Trigger: DATABASE_URL not set or PostgreSQL unavailable
- Workaround: API responses should include indication that audit/analytics are disabled, or force error if database is critical.

## Security Considerations

**Supabase Auth Configuration Optional:**
- Risk: Authentication is entirely optional; routes can be public if SUPABASE_URL not configured.
- Files: `cmd/anklyze-apiserver/main.go` (lines 164-179)
- Current mitigation: Requires explicit configuration choice
- Recommendations: Add runtime check to enforce authentication in production (e.g., via REQUIRE_AUTH env var), warn in logs if deployed without auth.

**Service Role Key Exposure:**
- Risk: SUPABASE_SERVICE_ROLE_KEY used for Supabase Auth admin operations and storage; if exposed, allows full control of auth system.
- Files: `cmd/anklyze-apiserver/main.go` (lines 81-85), storage initialization (line 184)
- Current mitigation: Loaded from environment variables (not committed)
- Recommendations: Rotate regularly, restrict to specific IP ranges in Supabase dashboard, audit usage patterns.

**JWT Secret Optional:**
- Risk: SupabaseJWTSecret can be empty string, falling back to JWKS endpoint validation only.
- Files: `internal/auth/middleware_test.go`, `cmd/anklyze-apiserver/main.go` (line 166)
- Current mitigation: JWKS validation still occurs, but silent fallback reduces explicit security logging
- Recommendations: Log warning if JWT_SECRET not provided, enforce in production environments.

**Sensitive Prompt Data in Logs:**
- Risk: LLM chat messages (user input, extracted data) logged to audit trail without sanitization.
- Files: `internal/domain/chat_audit.go`, `internal/repository/postgres/chat_audit.go`
- Current mitigation: Stored in PostgreSQL (presumably secured)
- Recommendations: Consider field-level encryption for sensitive medical data, add retention policy.

## Performance Bottlenecks

**Batch Image Loading Inefficiency:**
- Problem: `GetImagesForCases()` loads images for multiple cases but requires manual grouping in memory.
- Files: `internal/repository/postgres/case.go` (lines 134-160)
- Cause: Pre-allocated map then manual grouping adds O(n) memory overhead
- Improvement path: Add database-level grouping, return pre-sorted by case ID to reduce memory ops.

**Statistics Calculations Unbounded:**
- Problem: Cohen's Kappa calculations iterate over all ratings without pagination or caching.
- Files: `internal/service/statistics.go` (lines 24-150)
- Cause: No result caching, recalculation on every request for large studies (100+ raters)
- Improvement path: Cache results with TTL (e.g., 1 hour), invalidate on new responses; add percentile sampling for very large datasets.

**Frontend Chat Message History:**
- Problem: `ChatPanel` keeps all messages in React state without virtualizing or pagination.
- Files: `frontend/src/components/ChatPanel.tsx` (546 lines)
- Cause: Long chat sessions (50+ messages) cause re-render performance degradation
- Improvement path: Implement virtual scrolling, paginate history, archive old messages to IndexedDB.

**Multiple useEffect Dependencies Not Optimized:**
- Problem: Pages with many useCallbacks and useEffects not memoizing callbacks consistently.
- Files: `frontend/src/pages/admin/CaseEditorPage.tsx` (745 lines)
- Cause: Missing useCallback wrappers on event handlers passed to mutations
- Improvement path: Add useCallback to all event handlers, use useMemo for derived state.

## Fragile Areas

**Classification Rule Engine:**
- Files: `internal/rules/engine.go` (595 lines)
- Why fragile: 7 classification functions with deeply nested conditionals and similar logic; one missing condition or typo in pointer dereference crashes classification. 46 locations use json.Marshal/Unmarshal conversions that can silently fail.
- Safe modification: Add comprehensive property-based tests for all malleoli combinations; use code generation to create classification paths from a declarative specification; validate JSON schemas for domain types.
- Test coverage: `internal/rules/engine_test.go` (1478 lines) exists but needs coverage for all impossible combinations and edge cases in pointer dereferencing.

**JSONB Field Handling:**
- Files: `internal/domain/case.go`, `internal/domain/audit.go`, `internal/domain/chat_audit.go`
- Why fragile: ReferenceClassification, ReferenceInput, Input, Result all use datatypes.JSON; unmarshaling silently succeeds with partial data if schema changes. No validation of JSONB structure at database level.
- Safe modification: Add pre-unmarshal validation with JSON Schema, test migration scenarios when adding new fields to FractureInput or ClassificationResult, use generated code or validators.
- Test coverage: Unit tests for json.Unmarshal edge cases missing; e2e tests for field additions not present.

**Case State Machine:**
- Files: `internal/domain/case.go`, `internal/api/case_*_handler.go`
- Why fragile: Status transitions (draft → published → closed) not enforced in service layer; handlers check status but don't prevent race conditions (two publishes concurrently).
- Safe modification: Implement strict state machine in service layer with transaction-based updates, add pessimistic locking or version numbers for concurrent update prevention.
- Test coverage: `internal/domain/case_test.go` needs tests for concurrent state transitions.

**Frontend Form Persistence:**
- Files: `frontend/src/hooks/useFormPersistence.test.ts`, `frontend/src/pages/admin/CaseEditorPage.tsx`
- Why fragile: Form state persisted to localStorage without versioning; schema changes break restoration; no error boundaries for recovery.
- Safe modification: Add schema versioning to persisted form data, implement migration functions, catch errors and reset to empty form with toast notification.
- Test coverage: Tests exist but don't cover schema version mismatches or corruption scenarios.

**Database Migration Reliance on AutoMigrate:**
- Files: `cmd/anklyze-apiserver/main.go` (lines 103-117)
- Why fragile: GORM AutoMigrate only adds columns, never modifies or removes; if existing schema doesn't match models, migration silently skips changes.
- Safe modification: Implement explicit migration system (e.g., golang-migrate/migrate or GORM Migrator), version schema, test migrations on staging before production.
- Test coverage: No migration tests; prod schema drift not detected.

## Scaling Limits

**Audit Trail Buffer Model:**
- Current capacity: Configurable AuditBufferSize (default typically 1000); writes buffered in memory before batch insert
- Limit: Memory exhaustion if buffer fills faster than database writes; no overflow handling
- Scaling path: Implement circular buffer with overflow-to-file, add backpressure metrics, queue to message broker (Redis/RabbitMQ) for async writes.

**Study Statistics Recalculation:**
- Current capacity: Cohen's Kappa calculated in-memory for entire study at request time
- Limit: O(n²) computation for n raters; 100+ raters = multi-second response latency
- Scaling path: Pre-calculate and cache, use incremental updates on new responses, implement async job queue for background recalculation.

**Case Image Storage:**
- Current capacity: Supabase storage with no documented size limits per case
- Limit: Large TAC scans (100+ MB) + multiple copies = storage quota exhaustion
- Scaling path: Implement image compression/conversion, set per-case size limits, archive old images to cold storage.

**Frontend State for Large Studies:**
- Current capacity: Loads all cases in study into React state at once
- Limit: 500+ cases = browser memory pressure, slow table rendering
- Scaling path: Implement pagination/virtual scrolling, lazy load case details, use IndexedDB for local caching.

## Dependencies at Risk

**Google Genai SDK:**
- Risk: `google.golang.org/genai` v1.47.0 is relatively new API; Google may change pricing, availability, or API surface
- Impact: Chat classification feature becomes unavailable or prohibitively expensive
- Migration plan: Implement provider abstraction layer (interface in `internal/llm/`), support OpenAI/Anthropic as fallback options.

**Supabase JavaScript Client:**
- Risk: `@supabase/supabase-js` ^2.95.3 is pinned to major version 2; version 3 may have breaking changes
- Impact: Frontend authentication/storage breaks on major version bump
- Migration plan: Monitor releases, test v3 upgrade in staging, maintain compatibility layer if needed.

**GORM v1.31:**
- Risk: GORM 2.0 is mature, but v1 receives declining updates; edge cases in AutoMigrate may not be fixed
- Impact: Database schema drift, migration issues, potential security patches delayed
- Migration plan: Evaluate GORM 2 compatibility, plan gradual migration (move new models to explicit Migrator calls first).

**React 19:**
- Risk: `react@^19.2.4` is cutting-edge; some libraries may have compatibility issues
- Impact: Breaking changes in hook behavior, suspense integration, or compiler features
- Migration plan: Monitor React patch releases, test before updating, maintain list of known incompatibilities.

## Test Coverage Gaps

**No Integration Tests for Handler/Service/Repository Layers:**
- What's not tested: End-to-end request → handler → service → repository paths; actual database interactions
- Files: `internal/api/handler_test.go` tests in isolation with mock data, but doesn't test integration with real DB
- Risk: SQL injection vulnerabilities, transaction handling bugs, data consistency issues not caught
- Priority: **High** — integration tests would catch state machine violations, concurrent updates, cascade deletes.

**Classification Engine Rule Logic Incomplete:**
- What's not tested: All combinations of malleouli + conditions for edge cases; pointer dereferencing panics
- Files: `internal/rules/engine_test.go` covers happy paths but not exhaustive combinations
- Risk: Silent classification failures, incorrect outputs for rare fracture patterns
- Priority: **High** — property-based tests needed for exhaustive combinations.

**Frontend Component Interaction Tests Missing:**
- What's not tested: Form submission with image uploads, multi-step workflows, error boundaries
- Files: Individual component tests exist but not integration tests for full CaseEditorPage flow
- Risk: Regressions in multi-step workflows, broken image uploads not caught until production
- Priority: **High** — E2E tests with Playwright should cover critical user paths.

**Database Schema Migration Verification:**
- What's not tested: GORM AutoMigrate behavior with schema changes, rollback scenarios, data integrity on migration
- Files: No migration test suite exists
- Risk: Production migrations fail, data loss, version mismatch between code and database
- Priority: **High** — implement migration test harness that runs against test database.

**Performance and Load Testing:**
- What's not tested: Concurrent chat requests, large study statistics calculations, bulk case operations
- Files: No load tests or performance benchmarks
- Risk: Latency spikes, memory leaks, or crashes under real-world load not detected
- Priority: **Medium** — add benchmark tests for statistics calculations, Playwright load tests for UI.

**Error Recovery Paths:**
- What's not tested: Chat LLM client failures, Supabase auth token expiry, database connection loss during request
- Files: Tests use mocks that don't simulate failures
- Risk: Unhandled errors, poor error messages, cascading failures
- Priority: **Medium** — add chaos tests, simulate service degradation.

## Missing Critical Features

**Case/Study Auditing for Admins:**
- Problem: Audit trail exists for analytics, but admins have no UI to view who changed what and when
- Blocks: Compliance, debugging user issues, detecting abuse
- Estimated effort: Medium (requires audit repository queries, admin dashboard UI)

**Prompt Versioning for LLM:**
- Problem: Changing prompts affects all ongoing chat sessions retroactively; no version control
- Blocks: A/B testing, rollback on bad prompts, version tracking for research reproducibility
- Estimated effort: Medium (versioned prompt storage, session-specific prompt selection)

**Image Preprocessing and Validation:**
- Problem: Images uploaded with no validation of format, dimensions, or metadata; TAC images may need special handling
- Blocks: Consistent image quality, proper display across devices, compliance with medical imaging standards
- Estimated effort: Medium (image library integration, server-side processing, quality metrics)

**Bulk Case Operations:**
- Problem: Admin UI doesn't support bulk actions (create cohorts, assign to studies, delete multiple)
- Blocks: Efficient administration of large case libraries, study setup
- Estimated effort: Medium (backend batch endpoints, frontend bulk select/confirm UI)

**Study Result Export:**
- Problem: Statistics calculated but no export to CSV/Excel for publication or further analysis
- Blocks: Research workflow, sharing results with collaborators
- Estimated effort: Medium (template generation, file streaming)

## Architectural Concerns

**Missing Service Abstraction for Core Classification:**
- Issue: Rule engine called directly from handlers; no service layer wrapping it
- Location: `internal/api/case_admin_handler.go` likely calls `rules.Engine.Classify()` directly
- Impact: Difficult to compose with audit logging, caching, or alternative implementations
- Fix: Create `ClassificationService` that orchestrates rule engine, logging, and caching.

**Frontend API Client Lacks Retry Logic:**
- Issue: Mutations don't retry on transient failures
- Location: `frontend/src/services/api.ts`
- Impact: User-initiated actions fail immediately on temporary network issues
- Fix: Implement exponential backoff retry for safe operations (idempotent POST/PUT).

**Tight Coupling Between Case and Study Models:**
- Issue: Case and Study share complex relationships (cases belong to studies) but no domain service to manage the relationship
- Files: `internal/domain/case.go`, `internal/domain/study.go`
- Impact: Updating study logic requires cascading changes across multiple repositories
- Fix: Create DomainService for Study operations that handles case relationships transparently.

---

*Concerns audit: 2026-02-26*
