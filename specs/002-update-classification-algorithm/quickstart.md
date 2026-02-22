# Quickstart: Update Classification Algorithm v2

**Branch**: `002-update-classification-algorithm` | **Date**: 2026-02-22

## Prerequisites

- Go 1.21+ installed
- Node.js 18+ installed
- PostgreSQL 14+ running (or use `make run` for in-memory mode)

## Implementation Order

Follow the established `update-flow.md` process. The order is critical — each step depends on the previous:

### Step 1: Review Spanish MMD spelling

Review `docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd` for Spanish spelling/syntax issues per the checklist in `update-flow.md` section 1.

### Step 2: Create English MMD translation

Create `docs/Danis-Weber AO_OTA Flow-2026-02-22-EN.mmd` by translating the Spanish reference following the key translations in `update-flow.md` section 2.

### Step 3: Update backend domain types

Extend types in `internal/domain/fracture.go` and `internal/domain/classification.go`:

```text
Files to modify:
  internal/domain/fracture.go       — New fields and type constants
  internal/domain/classification.go — New AO codes
```

### Step 4: Update backend rules engine

Update `internal/rules/engine.go` to match the English MMD (source of truth for code). Key functions:

```text
classifyPosteriorOnly()      — Add articular involvement branching
classifyMedialOnly()         — Add articular involvement branching
classifyMedialPosterior()    — Restructure with CT + 5 posterior types
classifyLateralPosterior()   — Infrasindesmal is no longer impossible
classifyLateralOnly()        — AO B subtype change for transsyndesmotic
All suprasyndesmotic paths   — Add third trace pattern option
```

### Step 5: Update backend tests

Update `internal/rules/engine_test.go` — write/update tests BEFORE changing engine logic (TDD per Constitution Principle II).

### Step 6: Update LLM prompts

Update `internal/llm/prompts.go` — both `systemPromptEN` and `systemPromptES` with new decision tree fields and few-shot examples.

### Step 7: Update frontend types

Update `frontend/src/types/domain/fracture.ts` to mirror backend type changes.

### Step 8: Update frontend form logic

Update `frontend/src/features/fracture-classification/components/FractureForm.tsx`:
- Show/hide flags for new questions
- `isFormComplete()` for new terminal node detection
- `calculateProgress()` for new step counts

### Step 9: Update frontend translations and form options

```text
Files to modify:
  frontend/src/i18n/en.json
  frontend/src/i18n/es.json
  frontend/src/utils/formOptions.ts
  frontend/src/utils/classificationTranslations.ts
```

### Step 10: Update embedded flowcharts

```text
Files to modify:
  frontend/src/data/flowcharts/en.ts
  frontend/src/data/flowcharts/es.ts
```

### Step 11: Update E2E tests

```text
Files to modify:
  e2e/fixtures/test-data.ts
  e2e/tests/classification/*.spec.ts
```

## Verification

```bash
# Backend tests
go test -race ./...

# Frontend typecheck
cd frontend && npx tsc --noEmit

# Frontend lint
cd frontend && npm run lint
```

## Key Reference Files

- **Flow diagram (source of truth)**: `docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd`
- **Implementation process**: `.claude/commands/update-flow.md`
- **Feature spec**: `specs/002-update-classification-algorithm/spec.md`
- **Data model changes**: `specs/002-update-classification-algorithm/data-model.md`
