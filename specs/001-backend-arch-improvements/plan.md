# Implementation Plan: Backend Architecture Improvements

**Branch**: `001-backend-arch-improvements` | **Date**: 2026-02-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-backend-arch-improvements/spec.md`

## Summary

Align the Anklyze backend with the project constitution by: (1) adding
golden-snapshot regression tests for the classification rules engine
(~540 LOC, zero tests today), (2) moving business logic from HTTP handlers
into domain model methods (Tell Don't Ask), (3) removing the passthrough
classifier service, and (4) adding contextual error wrapping across layer
boundaries. Breaking API changes are permitted; the frontend will be
updated in parallel.

## Technical Context

**Language/Version**: Go 1.21+
**Primary Dependencies**: Gin (HTTP), GORM (ORM), google/genai (Gemini LLM)
**Storage**: PostgreSQL 14+ (GORM), Supabase (auth + file storage)
**Testing**: `go test` with `testing` stdlib, table-driven tests, in-memory SQLite for repos
**Target Platform**: Linux server (deployed), macOS (development)
**Project Type**: Web application (Go backend + React frontend)
**Performance Goals**: No degradation from refactoring; existing p95 latency maintained
**Constraints**: Classification output MUST remain deterministic for identical inputs
**Scale/Scope**: ~8,000 LOC backend, 68 Go files, 15 handler files, 7 classification branches

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
| --------- | ---- | ------ |
| I. Clinical Accuracy First | Classification logic changes MUST NOT alter outputs; golden snapshot verifies | PASS |
| II. Test-Driven Development | Tests written BEFORE refactoring domain methods; golden snapshot first | PASS |
| III. Idiomatic Go | Error wrapping uses `fmt.Errorf("...: %w", err)`; standard testing patterns | PASS |
| IV. Tell, Don't Ask | Core goal: move business logic from handlers into domain methods | PASS |
| V. Deep Modules | Removing shallow classifier service; enriching domain with behavior | PASS |
| VI. Pragmatic Architecture | No new layers added; existing layers clarified in responsibility | PASS |

No violations. No complexity justification needed.

**Post-Design Re-Check (after Phase 1)**:
All gates remain PASS. The design introduces no new layers, no new
dependencies, and no changes to classification logic. Domain model
enrichment strengthens Tell Don't Ask compliance. Error wrapping aligns
with Idiomatic Go. Golden snapshot tests satisfy Clinical Accuracy First
and Test-Driven Development.

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-arch-improvements/
├── plan.md              # This file
├── research.md          # Phase 0: codebase audit findings
├── data-model.md        # Phase 1: domain model changes
├── quickstart.md        # Phase 1: verification steps
├── contracts/           # Phase 1: API changes (if any)
└── tasks.md             # Phase 2: task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
internal/
├── api/                    # Handlers (refactor: remove business logic)
│   ├── case_admin_handler.go     # State transition logic → domain
│   ├── case_response_handler.go  # Access/eligibility logic → domain
│   ├── chat_handlers.go          # Update classifier → rules.Engine
│   └── input_validation.go       # Add tests (no structural changes)
│
├── domain/                 # Domain models (enrich with behavior)
│   ├── case.go                   # Add: CanPublish, CanClose, CanUserSubmitResponse, etc.
│   ├── case_test.go              # NEW: unit tests for all behavioral methods
│   ├── errors.go                 # Add state transition errors
│   └── classification.go         # No changes (already clean)
│
├── rules/                  # Classification engine (add tests only)
│   ├── engine.go                 # No changes to logic
│   └── engine_test.go            # NEW: golden snapshot regression tests
│
├── service/                # Services (remove classifier, update chat)
│   ├── classifier.go             # DELETE
│   ├── chat.go                   # Refactor: inject rules.Engine directly
│   └── statistics.go             # No changes
│
├── repository/             # Repositories (error wrapping only)
│   └── postgres/                 # Add fmt.Errorf wrapping to all error returns
│
└── cmd/anklyze-apiserver/
    └── main.go                   # Update DI: remove classifier, wire engine directly

frontend/
└── src/services/api.ts           # Update if API response shapes change
```

**Structure Decision**: Existing web application structure preserved. No new
packages or layers introduced. Changes are surgical within existing files.

## Complexity Tracking

> No Constitution Check violations. No complexity justification required.
