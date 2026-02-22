# Implementation Plan: Update Classification Algorithm v2

**Branch**: `002-update-classification-algorithm` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-update-classification-algorithm/spec.md`

## Summary

Update the ankle fracture classification rules engine, frontend form, LLM prompts, translations, and embedded flowcharts to match the new flow diagram (`docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd`). Key changes: new posterior-only and medial-only articular involvement branching (AO 43 B1/B2), new medial+posterior posteromedial fragment type (AO 44 A3), reworked lateral+posterior infrasyndesmotic path, third fibula trace pattern option (>6cm), and updated AO B subtype codes. The implementation follows the established `update-flow.md` 11-step process.

## Technical Context

**Language/Version**: Go 1.21+ (backend), TypeScript strict mode (frontend)
**Primary Dependencies**: Gin (HTTP), GORM (ORM), google/genai (Gemini LLM), React 19+, Vite, shadcn/ui + Tailwind CSS v4
**Storage**: PostgreSQL 14+ (GORM) — no schema migration needed (JSONB fields accommodate new codes)
**Testing**: `go test -race ./...` (backend), `tsc --noEmit` + `eslint` (frontend), Playwright (E2E)
**Target Platform**: Web application (Go server + React SPA)
**Project Type**: Web (backend + frontend)
**Performance Goals**: N/A — classification is a deterministic rules engine, no performance regression expected
**Constraints**: Clinical accuracy is paramount (Constitution Principle I). All terminal nodes in the flow diagram must be faithfully reproduced.
**Scale/Scope**: ~15 files modified across backend, frontend, and tests. No new API endpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Clinical Accuracy First | PASS | Flow diagram is the single source of truth. All changes derive from it. |
| II. Test-Driven Development | PASS | Engine tests will be updated with new expected outputs before logic changes. |
| III. Idiomatic Go | PASS | Follows existing patterns in `internal/rules/engine.go` and `internal/domain/`. |
| IV. Tell, Don't Ask | PASS | Rules engine encapsulates classification decisions. No new getters needed. |
| V. Deep Modules | PASS | `Classify(input)` interface unchanged. New complexity hidden behind same API. |
| VI. Pragmatic Architecture | PASS | No new layers or abstractions. Extends existing types and switch branches. |

## Project Structure

### Documentation (this feature)

```text
specs/002-update-classification-algorithm/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
internal/
├── domain/
│   ├── fracture.go          # FractureInput + new fields, new type constants
│   └── classification.go    # ClassificationResult + new AO codes (43-B1, 43-B2, 44-A3)
├── rules/
│   ├── engine.go            # Classification rules engine (main logic changes)
│   └── engine_test.go       # Backend tests for all classification paths
├── llm/
│   └── prompts.go           # LLM prompts (EN/ES) with updated decision tree
└── service/
    └── chat.go              # Chat service (no structural changes, benefits from engine updates)

frontend/src/
├── types/domain/
│   └── fracture.ts          # TypeScript FractureInput + new fields, new type unions
├── features/fracture-classification/components/
│   └── FractureForm.tsx     # Show/hide flags, isFormComplete(), calculateProgress()
├── utils/
│   ├── formOptions.ts       # Form question definitions and select options
│   └── classificationTranslations.ts  # Translation helpers for new codes
├── services/
│   └── api.ts               # No structural changes expected
├── data/flowcharts/
│   ├── en.ts                # Embedded English flowchart MMD
│   └── es.ts                # Embedded Spanish flowchart MMD
└── i18n/
    ├── en.json              # English translations
    └── es.json              # Spanish translations

docs/
├── Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd   # Spanish reference (exists)
└── Danis-Weber AO_OTA Flow-2026-02-22-EN.mmd   # English reference (to create)

e2e/
├── fixtures/test-data.ts                # Expected results
└── tests/classification/*.spec.ts       # E2E classification tests
```

**Structure Decision**: Existing web application structure preserved. No new packages, directories, or architectural changes. All modifications extend existing files.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
