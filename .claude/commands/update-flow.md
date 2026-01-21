# Update Classification Flow

When the classification flow changes in `docs/Option Choice Decision Flow-ES.mmd`, execute the following steps:

## 1. Review Spanish Spelling and Syntax
Review the Spanish file for spelling and syntax issues. Common terms to check:
- "maléolo" (with accent)
- "transindesmales" / "transindesmal" (with 'n')
- "suprasindesmales" / "suprasindesmal" (with 'n')
- "infrasindesmal" (with 'n')

## 2. Update English Translation
Translate changes from `docs/Option Choice Decision Flow-ES.mmd` to `docs/Option Choice Decision Flow-EN.mmd`.
Ensure the English file matches the Spanish file's structure and logic.

## 3. Update Backend Rules Engine
Update the classification logic in `backend/internal/rules/engine.go`:
- Ensure all classification paths match the new flow diagram
- Update the `classifyLateralOnly()`, `classifyLateralPosterior()`, `classifyLateralMedial()`, `classifyTrimaleolar()` functions as needed
- Update impossible case handling

Update translations in:
- `backend/internal/i18n/en.go`
- `backend/internal/i18n/es.go`

## 3.1 Update LLM Prompts

Update the LLM prompts in `backend/internal/llm/prompts.go`:

- Update the "Classification Algorithm - Required Fields by Fracture Type" section in both English (`systemPromptEN`) and Spanish (`systemPromptES`) to match the new flow
- Update the "Decision Tree Questions" section to reflect any new decision points or changed logic
- Update the few-shot examples in `fewShotExamplesEN` and `fewShotExamplesES` to reflect new classification paths
- Ensure clarification questions match the updated flow diagram logic

## 4. Update Backend Tests
Update tests in `backend/internal/rules/engine_test.go` to match the new rules.

## 5. Update Frontend Form Logic
Update `frontend/src/components/FractureForm.tsx`:
- Update visibility conditions (`showLateralMorphologyInfra`, `showLPMorphologyInfra`, etc.)
- Update `isFormComplete()` validation logic
- Update form UI rendering as needed

## 6. Update Frontend Flowcharts
Update flowchart diagrams in:
- `frontend/src/data/flowcharts/en.ts`
- `frontend/src/data/flowcharts/es.ts`

## 7. Update E2E Tests
Update test expectations in:
- `e2e/fixtures/test-data.ts` - Update expected results
- `e2e/tests/classification/lateral-only.spec.ts`
- `e2e/tests/classification/lateral-posterior.spec.ts`
- `e2e/tests/classification/lateral-medial.spec.ts`
- `e2e/tests/classification/trimaleolar.spec.ts`

## 8. Run Tests
Run all tests to verify changes:
```bash
# Backend tests
cd backend && go test ./...

# E2E tests
cd e2e && npm run test
```

## Key Files Reference

### Documentation
- `docs/Option Choice Decision Flow-ES.mmd` - Source of truth (Spanish)
- `docs/Option Choice Decision Flow-EN.mmd` - English translation

### Backend

- `backend/internal/rules/engine.go` - Classification logic
- `backend/internal/rules/engine_test.go` - Backend tests
- `backend/internal/domain/fracture.go` - Domain types
- `backend/internal/domain/classification.go` - Classification types
- `backend/internal/i18n/en.go` - English translations
- `backend/internal/i18n/es.go` - Spanish translations
- `backend/internal/llm/prompts.go` - LLM prompts for chat classification (decision tree questions and few-shot examples)

### Frontend
- `frontend/src/components/FractureForm.tsx` - Form component
- `frontend/src/data/flowcharts/en.ts` - English flowchart
- `frontend/src/data/flowcharts/es.ts` - Spanish flowchart
- `frontend/src/types/fracture.ts` - TypeScript types

### E2E Tests
- `e2e/fixtures/test-data.ts` - Expected results
- `e2e/tests/classification/*.spec.ts` - Classification tests
- `e2e/pages/classify.page.ts` - Page object

## Usage
Run this command when you've made changes to the Spanish flow diagram:
```
/update-flow
```
