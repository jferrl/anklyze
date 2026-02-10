# Update Classification Flow

When a new classification flow diagram is created (e.g., `docs/Danis-Weber AO_OTA Flow-{DATE}.mmd`), execute the following steps:

## File Naming Convention
Flow diagrams are versioned using the format: `docs/Danis-Weber AO_OTA Flow-{YYYY-MM-DD}-{LANG}.mmd`
- Example: `docs/Danis-Weber AO_OTA Flow-2026-02-02-ES.mmd` (Spanish)
- Example: `docs/Danis-Weber AO_OTA Flow-2026-02-02-EN.mmd` (English)

## i18n Architecture

The application uses a **frontend-first translation approach**:

- **Backend**: Returns only codes/keys for all responses:
  - Classification results: `"type": "Weber A"`, `"fracture_type": "unimaleolar_lateral"`
  - Error responses: `"error_code": "invalid_input"`, `"error_code": "classification_error"`
  - Statistical notes: `"fleiss_kappa_note": "fleiss_kappa_single_case_limitation"` (translation key)
- **Frontend**: Translates all codes client-side using local i18n files:
  - Classification descriptions: via `frontend/src/utils/classificationTranslations.ts`
  - Error messages: via `errors.*` keys in `frontend/src/i18n/en.json` and `es.json`
- **Language Detection**: Uses standard HTTP `Accept-Language` header (no query parameters)
- **Backend i18n**: **Only for LLM system prompts** (Gemini API)
  - `backend/internal/llm/prompts.go` - Language-specific prompts for Gemini API (MUST stay in backend)
  - **NOT used for API error messages** - frontend handles all UI translations

This architecture:
- Reduces API payload size
- Allows frontend to control all UI text
- Enables easier translation updates without backend changes
- Follows standard HTTP practices
- Maintains clear separation: backend = logic & LLM, frontend = presentation

## 1. Review Spanish Spelling and Syntax
Review the Spanish file for spelling and syntax issues. Common terms to check:
- "maléolo" (with accent)
- "transindesmal" (with 'n', not 's')
- "suprasindesmal" (with 'n', not 's')
- "infrasindesmal" (with 'n', not 's')
- "oblicuo" (not "blicuo")
- "peroné" (not "pernoé")
- "Fractura" (not "ractura")

Rename the Spanish file with `-ES` suffix if not already present.

## 2. Create English Translation
Create the English version from the Spanish file with `-EN` suffix:
- Translate all Spanish text to English
- Ensure the English file matches the Spanish file's structure and logic
- Key translations:
  - maléolo posterior -> posterior malleolus
  - maléolo medial -> medial malleolus
  - maléolo lateral -> lateral malleolus
  - infrasindesmal -> infrasyndesmotic
  - transindesmal -> transsyndesmotic
  - suprasindesmal -> suprasyndesmotic
  - Fractura unimaleolar -> Unimalleolar fracture
  - Fractura bimaleolar -> Bimalleolar fracture
  - Fractura trimaleolar -> Trimalleolar fracture
  - ¿Tiene TAC? -> CT scan available?
  - peroné -> fibula

## 3. Update Backend Rules Engine (using English as source of truth)
Update the classification logic in `backend/internal/rules/engine.go`:
- Ensure all classification paths match the English flow diagram
- Update the `classifyLateralOnly()`, `classifyLateralPosterior()`, `classifyLateralMedial()`, `classifyTrimaleolar()` functions as needed
- Update impossible case handling
- **IMPORTANT**: Backend should return only codes/keys (e.g., `"type": "Weber A"`, `"fracture_type": "unimaleolar_lateral"`), NOT translated descriptions

**Backend field mapping validation:**

- For each `classify*()` function, verify that the `input.FieldName` references match the fields the form actually sends
- Common pitfall: using `input.FibularLevelForTransverse` when the form sends `input.FibularLevel` (or vice versa)
- Check that conditional branches use the correct field for each path (e.g., suprasyndesmotic paths should check `SuprasindesmalType` and `FibulaTracePattern`, NOT `LateralMorphology`)

**Backend i18n usage (limited scope):**
- `backend/internal/i18n/en.go` and `es.go` are **only for**:
  - LLM system prompts (in `backend/internal/llm/prompts.go`)
- **NOT used for API error messages** - API returns error codes (e.g., `"error_code": "invalid_input"`)
- Error code constants defined in `backend/internal/domain/errors.go`

## 3.1 Update LLM Prompts

Update the LLM prompts in `backend/internal/llm/prompts.go`:

- Update the "Classification Algorithm - Required Fields by Fracture Type" section in both English (`systemPromptEN`) and Spanish (`systemPromptES`) to match the new flow
- Update the "Decision Tree Questions" section to reflect any new decision points or changed logic
- Update the few-shot examples in `fewShotExamplesEN` and `fewShotExamplesES` to reflect new classification paths
- Ensure clarification questions match the updated flow diagram logic

## 4. Update Backend Tests
Update tests in `backend/internal/rules/engine_test.go` to match the new rules:
- Test expectations should check for codes/keys, NOT translated descriptions
- Example: `result.FractureType` should be `"unimaleolar_lateral"` (key), not `"Lateral malleolus fracture"` (translation)
- Example: `result.ImpossibleKey` should be `"sa_mechanism"` (key), not `"SA mechanism not possible"` (translation)
- **IMPORTANT**: When engine.go field references change, test input structs must match. If the engine checks `input.FibularLevel`, the test must set `fibularLevel` (not `fibularLevelForTransverse`)

## 5. Update Frontend Translation Utilities
Update `frontend/src/utils/classificationTranslations.ts`:
- Update helper functions if new classification types are added
- Ensure all translation keys match the backend response codes
- Key functions to maintain:
  - `getFractureDescription()` - translates `fracture_type` keys
  - `getDanisWeberDescription()` - translates Danis-Weber types
  - `getLaugeHansenFullName()` - translates Lauge-Hansen type names
  - `getLaugeHansenDescription()` - translates Lauge-Hansen descriptions
  - `getAOOTADescription()` - translates AO/OTA codes
  - `getBartonicekDescription()` - translates Bartonicek types
  - `getImpossibleReason()` - translates impossible case reasons

Update translation files to include new keys:
- `frontend/src/i18n/en.json`
- `frontend/src/i18n/es.json`

## 6. Update Frontend Form Logic
Update `frontend/src/features/fracture-classification/components/FractureForm.tsx`:

### 6.1 Show/Hide Flags - Path-by-Path MMD Validation

For **each of the 7 `involved_malleoli` paths**, trace through the MMD decision tree and verify:

- Which questions appear on that path in the MMD
- Which questions the form shows via its `show*` flags

**Critical checks (common sources of bugs):**

- `showMedialMorphology`: Should ONLY include malleoli combinations where the MMD asks about medial morphology. Do NOT include `medial_posterior` (MMD skips medial morphology for that path).
- `showBimaleolarInfraQuestion`: Triggers for `lateral_medial` when medial morphology is **oblique** (not transverse). The MMD asks "Is fibula fracture infrasyndesmotic and transverse?" only after the oblique/vertical branch.
- `showFibulaTracePattern`: Should check `suprasindesmal_type` exists and is NOT `proximal`. Must NOT check `lateral_morphology === 'spiral'` — morphology is not asked for suprasyndesmotic paths.
- `showLateralMorphology`: Must skip for infrasyndesmotic paths where the MMD goes directly to a result (lateral-only infra, lateral+posterior infra).
- `showCTScan`: Must exclude paths where posterior malleolus is impossible (e.g., lateral+posterior infrasyndesmotic).
- `showPosteriorType`: Must depend on `showCTScan` being true AND `has_ct_scan === true`, not just `has_ct_scan === true` alone.

### 6.2 `isFormComplete()` - Terminal Node Validation

For **each `involved_malleoli` case**, verify the function returns `true` exactly when the form has collected enough data to reach a terminal node (result) in the MMD.

**Critical checks:**

- **Infrasyndesmotic shortcuts**: `lateral_only` + infra and `lateral_posterior` + infra should return `true` immediately (no morphology needed).
- **Suprasyndesmotic paths**: Should require `suprasindesmal_type`. If type is NOT `proximal`, also require `fibula_trace_pattern`. Should NOT require `lateral_morphology`.
- **`lateral_medial` oblique shortcut**: If `medial_morphology === 'oblique'` and `fibula_infrasindesmal_transverse === true`, the form is complete (SA path).
- **`lateral_medial` transverse path**: Transverse medial goes directly to fibular level question (no infra question).
- **`medial_posterior`**: Does NOT require `medial_morphology` (MMD goes straight to CT scan).

### 6.3 `calculateProgress()` Consistency

Ensure the estimated step counts match the show/hide flags:

- The malleoli lists in `calculateProgress` must match those in the show/hide flags (e.g., if `showMedialMorphology` excludes `medial_posterior`, so must `calculateProgress`).
- The bimaleolar infra question condition must use the same morphology value as `showBimaleolarInfraQuestion`.

### 6.4 Form Options

Update `frontend/src/utils/formOptions.ts` if new options are added or existing ones change.

## 7. Update Frontend API Service
Update `frontend/src/services/api.ts`:
- Ensure all API calls use Accept-Language header (not query parameters)
- Language is set via `headers['Accept-Language'] = lang`
- No `?lang=` query parameters should be used
- **Error handling**: API returns `error_code` field (not `error`), frontend translates using `i18n.t(\`errors.\${error_code}\`)`
- Example error codes: `invalid_input`, `classification_error`, `chat_unavailable`, `session_limit_exceeded`

## 8. Update Frontend Flowcharts (Embedded MMD)

Update flowchart diagrams in:

- `frontend/src/data/flowcharts/en.ts`
- `frontend/src/data/flowcharts/es.ts`

**Label parity checks — compare embedded MMD against reference MMD node by node:**

- Question text must match exactly (e.g., "What is the morphology?" not "What morphology does it have?")
- Option labels must match exactly (e.g., "Oblique/Vertical" not just "Oblique")
- Trace pattern labels must use full reference text (e.g., "Parasyndesmotic with short oblique/transverse/comminuted pattern" not just "Short/transverse/comminuted")
- Check Oxford commas in lists (e.g., "Medial, lateral, and posterior malleoli")
- Verify Bartonicek values on terminal nodes are correct (1-4 mapping)

## 9. Update Translation Labels (i18n)

Update `frontend/src/i18n/en.json` and `frontend/src/i18n/es.json`:

**Cross-reference checks:**

- `form.questions.*` keys must match the MMD question text for each node
- `form.options.*` labels must match the MMD option labels for each node
- Common pitfall: question uses "trace" when MMD says "fracture" (e.g., "fibula trace pattern" vs "fibula fracture pattern")
- Common pitfall: medialMorphology.oblique says "Oblique" when MMD says "Oblique/Vertical"
- Ensure both `medialMorphology` and `medialMorphologyLM` are consistent when they should be

## 10. Update E2E Tests
Update test expectations in:
- `e2e/fixtures/test-data.ts` - Update expected results
- `e2e/tests/classification/lateral-only.spec.ts`
- `e2e/tests/classification/lateral-posterior.spec.ts`
- `e2e/tests/classification/lateral-medial.spec.ts`
- `e2e/tests/classification/trimaleolar.spec.ts`

## 11. Run Tests
Run all tests to verify changes:
```bash
# Backend tests
cd backend && go test ./...

# Frontend type check
cd frontend && npx tsc --noEmit
```

## Key Files Reference

### Documentation
- `docs/Danis-Weber AO_OTA Flow-{DATE}-ES.mmd` - Spanish version
- `docs/Danis-Weber AO_OTA Flow-{DATE}-EN.mmd` - English version (source of truth for code)

### Backend

- `backend/internal/rules/engine.go` - Classification logic (returns codes only, no descriptions)
- `backend/internal/rules/engine_test.go` - Backend tests (test for codes/keys, not translations)
- `backend/internal/domain/fracture.go` - Domain types
- `backend/internal/domain/classification.go` - Classification types (codes only)
- `backend/internal/domain/errors.go` - Error code constants (used in API responses)
- `backend/internal/api/handler.go` - API handlers (returns `error_code`, not translated messages)
- `backend/internal/api/chat_handlers.go` - Chat API handlers (returns `error_code` for errors)
- `backend/internal/service/classifier.go` - Classifier service (no lang parameter)
- `backend/internal/service/chat.go` - Chat service (no message translation, frontend handles via Status)
- `backend/internal/service/statistics.go` - Statistics service (returns translation keys for notes)
- `backend/internal/i18n/en.go` - English translations (LLM prompts only)
- `backend/internal/i18n/es.go` - Spanish translations (LLM prompts only)
- `backend/internal/llm/prompts.go` - LLM system prompts (MUST use i18n for Gemini API)

### Frontend

- `frontend/src/features/fracture-classification/components/FractureForm.tsx` - Form component (show/hide flags, isFormComplete, calculateProgress)
- `frontend/src/features/fracture-classification/hooks/useFormState.ts` - Form state management with undo history
- `frontend/src/utils/formOptions.ts` - Form question definitions and select options
- `frontend/src/utils/classificationTranslations.ts` - Translation helper functions (maps backend codes to i18n keys)
- `frontend/src/services/api.ts` - API service (translates `error_code` to user messages)
- `frontend/src/i18n/en.json` - English translations (includes `errors.*` for API error codes, `results.*` for classifications, `admin.reliability.*` for stats)
- `frontend/src/i18n/es.json` - Spanish translations (same structure as en.json)
- `frontend/src/i18n/config.ts` - i18n configuration and utilities
- `frontend/src/data/flowcharts/en.ts` - English flowchart (embedded MMD)
- `frontend/src/data/flowcharts/es.ts` - Spanish flowchart (embedded MMD)
- `frontend/src/types/domain/fracture.ts` - TypeScript domain types (FractureInput interface)
- `frontend/src/types/fracture.ts` - Re-export barrel file (deprecated, imports from domain/)

### E2E Tests
- `e2e/fixtures/test-data.ts` - Expected results
- `e2e/tests/classification/*.spec.ts` - Classification tests
- `e2e/pages/classify.page.ts` - Page object

## Usage
Run this command when you've created a new flow diagram:
```
/update-flow
```
