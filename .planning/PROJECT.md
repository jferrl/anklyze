# Anklyze — Codebase Hardening

## What This Is

Anklyze is a medical classification tool for ankle fractures. It provides both deterministic (rule engine) and AI-powered (Gemini LLM) classification across Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek systems. It supports case management, inter-rater reliability studies, and analytics for orthopedic research. This milestone focuses on hardening the existing codebase to production-grade quality.

## Core Value

The classification engine must produce correct, reliable results for every fracture pattern — ambiguous and impossible cases must be clearly surfaced, never silently dropped.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Deterministic fracture classification via rule engine (Danis-Weber, Lauge-Hansen, AO/OTA, Bartonicek) — existing
- ✓ AI-powered classification via Gemini LLM chat interface — existing
- ✓ Case lifecycle management (draft → published → closed) — existing
- ✓ Inter-rater reliability studies with Fleiss's kappa — existing
- ✓ Case image upload and storage via Supabase — existing
- ✓ Admin and rater role-based access control — existing
- ✓ Bilingual UI (English/Spanish) — existing
- ✓ Analytics dashboard with trends and distribution — existing
- ✓ Audit trail for classification and chat events — existing
- ✓ Rate limiting on chat endpoints — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] All known bugs fixed (ambiguous/impossible classifications surfaced, case state machine enforced, DB fallback behavior clear)
- [ ] Security hardened for production (auth enforced, JWT validation strict, sensitive data protected in logs)
- [ ] Rule engine deduplicated and maintainable (single helper for suprasyndesmotic AO classification)
- [ ] Large files split into focused modules (statistics, prompts, page components)
- [ ] Missing service layers added (ClassificationService, Study domain service)
- [ ] Frontend API client retry logic for transient failures
- [ ] Performance bottlenecks addressed (statistics caching, chat virtualization, batch image loading)
- [ ] JSONB field validation hardened against silent partial deserialization
- [ ] Database migration strategy upgraded from AutoMigrate to explicit migrations
- [ ] Frontend large components decomposed into hooks and compound components

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- New features (admin audit UI, prompt versioning, bulk operations, study export) — hardening first, features later
- Test coverage expansion — important but separate milestone
- Mobile app or responsive redesign — web-first, not in this pass
- LLM provider abstraction — acknowledged risk but not blocking production readiness
- Supabase SDK v3 migration — current v2 is stable

## Context

The codebase is a working prototype deployed to staging. It has a solid layered architecture (handlers → services → repositories) but accumulated tech debt during rapid feature development. The classification rule engine is the most critical and fragile component — it drives the core value but has deeply nested conditionals and duplicated logic. Several security configurations are optional when they should be enforced for production. Large files (statistics service at 1178 lines, prompts at 1028 lines, page components at 600-745 lines) make maintenance difficult.

The codebase map in `.planning/codebase/` provides detailed analysis of all concerns.

## Constraints

- **Tech stack**: Go + Gin + GORM backend, React + TypeScript + Vite frontend — no stack changes
- **Database**: PostgreSQL via GORM — schema changes must be backward-compatible with existing data
- **Auth**: Supabase Auth — keep existing integration, harden configuration
- **Classification logic**: Rule engine behavior must match existing golden reference tests — refactoring must not change outputs
- **Deployment**: Staging environment on Supabase — changes must be deployable incrementally

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Harden before adding features | Prevent compounding tech debt; bugs and security gaps block production confidence | — Pending |
| Full cleanup approach | Moderate fixes would leave architectural debt that slows future work | — Pending |
| Production-grade target | Includes performance bottlenecks and monitoring readiness, not just bug fixes | — Pending |
| Defer test coverage to next milestone | Keep scope focused; hardening changes will need new tests but that's separate work | — Pending |

---
*Last updated: 2026-02-26 after initialization*
