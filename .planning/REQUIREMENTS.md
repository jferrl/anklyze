# Requirements: Anklyze Codebase Hardening

**Defined:** 2026-02-26
**Core Value:** The classification engine must produce correct, reliable results for every fracture pattern — ambiguous and impossible cases must be clearly surfaced, never silently dropped.

## v1 Requirements

Requirements for production-grade hardening. Each maps to roadmap phases.

### Bug Fixes

- [x] **BUG-01**: Ambiguous classifications are clearly indicated to users in API responses and frontend UI
- [x] **BUG-02**: Impossible classifications are clearly indicated to users in API responses and frontend UI
- [x] **BUG-03**: Case state transitions (draft → published → closed) are validated in service layer with proper error responses
- [x] **BUG-04**: Database connection fallback behavior explicitly communicates degraded mode to users and API consumers

### Security

- [x] **SEC-01**: Authentication is enforced in production environments (REQUIRE_AUTH or equivalent mechanism)
- [x] **SEC-02**: JWT secret absence triggers a warning log and prevents silent fallback in production
- [x] **SEC-03**: Sensitive medical data in audit trail logs is protected with field-level encryption or sanitization
- [x] **SEC-04**: Service role key usage is audited and restricted with clear documentation of required permissions

### Architecture

- [x] **ARCH-01**: ClassificationService wraps rule engine with audit logging, caching, and error handling
- [x] **ARCH-02**: Study domain service manages case-study relationships transparently
- [x] **ARCH-03**: Frontend API client implements exponential backoff retry for idempotent operations
- [x] **ARCH-04**: Case and Study model coupling reduced through domain service abstraction

### Tech Debt — Backend

- [x] **DEBT-01**: Rule engine suprasyndesmotic AO helper functions consolidated into single parameterized function
- [x] **DEBT-02**: Statistics service split into focused modules (cohens_kappa.go, fleiss_kappa.go, divergence.go, etc.)
- [x] **DEBT-03**: LLM prompts extracted from code into external versioned template files
- [x] **DEBT-04**: JSONB fields validated against schemas before deserialization to prevent silent partial data
- [x] **DEBT-05**: Database migrations upgraded from GORM AutoMigrate to explicit migration system (golang-migrate or equivalent)

### Tech Debt — Frontend

- [x] **DEBT-06**: CaseEditorPage decomposed into custom hooks and compound components (target <300 lines per file)
- [x] **DEBT-07**: AdminCasesPage decomposed into reusable table and filter components
- [x] **DEBT-08**: AdminStudiesPage decomposed into reusable table and filter components
- [ ] **DEBT-09**: Event handlers in page components wrapped with useCallback for consistent memoization

### Performance

- [ ] **PERF-01**: Statistics calculations cached with TTL and invalidated on new responses
- [ ] **PERF-02**: Chat message history virtualized with pagination for long sessions
- [ ] **PERF-03**: Batch image loading optimized with database-level grouping
- [ ] **PERF-04**: Frontend useEffect dependencies optimized with proper useCallback/useMemo usage

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Test Coverage

- **TEST-01**: Integration tests for handler → service → repository paths with real database
- **TEST-02**: Property-based tests for exhaustive classification rule combinations
- **TEST-03**: E2E tests for critical user workflows (case creation, classification, study setup)
- **TEST-04**: Migration test harness that runs against test database
- **TEST-05**: Performance benchmarks for statistics calculations and bulk operations

### Missing Features

- **FEAT-01**: Admin audit trail UI (view who changed what and when)
- **FEAT-02**: Prompt versioning system for LLM sessions
- **FEAT-03**: Image preprocessing and validation (format, dimensions, metadata)
- **FEAT-04**: Bulk case operations (create cohorts, assign to studies, delete multiple)
- **FEAT-05**: Study result export to CSV/Excel

### Dependency Modernization

- **DEP-01**: LLM provider abstraction layer (support OpenAI/Anthropic as fallback)
- **DEP-02**: Supabase JS SDK v3 migration
- **DEP-03**: GORM v2 migration evaluation

## Out of Scope

| Feature | Reason |
|---------|--------|
| New user-facing features | Hardening first, features later — no scope creep |
| Mobile app or responsive redesign | Web-first, not relevant to hardening |
| Infrastructure changes (hosting, CI/CD) | Separate concern from code quality |
| Internationalization expansion beyond en/es | Existing i18n is sufficient |
| Schema redesign or major data model changes | Changes must be backward-compatible |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 1 | Complete |
| BUG-02 | Phase 1 | Complete |
| BUG-03 | Phase 1 | Pending |
| BUG-04 | Phase 1 | Complete |
| SEC-01 | Phase 2 | Complete |
| SEC-02 | Phase 2 | Complete |
| SEC-03 | Phase 2 | Complete |
| SEC-04 | Phase 2 | Complete |
| ARCH-01 | Phase 3 | Complete |
| ARCH-02 | Phase 3 | Complete |
| ARCH-03 | Phase 5 | Complete |
| ARCH-04 | Phase 3 | Complete |
| DEBT-01 | Phase 4 | Complete |
| DEBT-02 | Phase 4 | Complete |
| DEBT-03 | Phase 4 | Complete |
| DEBT-04 | Phase 4 | Complete |
| DEBT-05 | Phase 4 | Complete |
| DEBT-06 | Phase 5 | Complete |
| DEBT-07 | Phase 5 | Complete |
| DEBT-08 | Phase 5 | Complete |
| DEBT-09 | Phase 5 | Pending |
| PERF-01 | Phase 6 | Pending |
| PERF-02 | Phase 6 | Pending |
| PERF-03 | Phase 6 | Pending |
| PERF-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
