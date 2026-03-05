# Update Classification Flow

When a new classification flow diagram is created (e.g., `docs/Danis-Weber AO_OTA Flow-{DATE}.drawio`), execute the following steps:

## File Naming Convention

Flow diagrams are versioned using the format: `docs/Danis-Weber AO_OTA Flow-{YYYY-MM-DD}-{LANG}.drawio`
- Example: `docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio` (Spanish)
- The Spanish drawio is the single source of truth for the algorithm
- English translations are derived programmatically into code (engine.go) and frontend flowcharts

## Interpreting drawio Files

Drawio files are XML-based (draw.io/diagrams.net format). The file is typically large (~300KB+) and must be read in chunks. The structure uses `<mxCell>` elements with styles indicating node types:

### Node Types (identified by `style` attribute)

- **Decision nodes** (questions): `style="rhombus;...fillColor=#fff2cc;..."` — the `value` attribute contains the question text in Spanish (e.g., `value="¿Qué maleolos tiene fracturados?"`)
- **Option nodes** (answers/choices): `style="rounded=0;...fillColor=#d5e8d4;..."` — the `value` attribute contains the option text (e.g., `value="Maleolo posterior"`)
- **Terminal/result nodes** (classification outcomes): `style="shape=cylinder3;...fillColor=#f8cecc;..."` — the `value` attribute contains the full classification result with HTML line breaks (e.g., `value="Fractura unimaleolar maleolo posterior<br>AO no clasificable<br>Lauge-Hansen PA<br>Bartonicek 1"`)
- **Edge connections**: `<mxCell edge="1" source="sourceId" target="targetId">` — connects nodes in the decision tree

### How to Trace Paths

1. Start from the root decision node (first rhombus after the start node)
2. Follow edges from decision nodes to option nodes (choices)
3. From option nodes, follow edges to the next decision node or terminal node
4. Terminal nodes (cylinder shapes with red fill) contain the final classification
5. Parse terminal node `value` attributes to extract: fracture type, AO/OTA code, Lauge-Hansen type, Danis-Weber type, and Bartonicek type

### Reading Strategy

Since the file is too large to read at once, use offset/limit parameters:
- Read in chunks of ~100 lines to parse the XML structure
- Build a node map (id → value/style) and edge map (source → target) to reconstruct the tree
- Or use Grep to search for specific `value=` patterns to find nodes of interest

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
  - `internal/llm/loader.go` - Language-specific prompts for Gemini API (MUST stay in backend)
  - **NOT used for API error messages** - frontend handles all UI translations

This architecture:
- Reduces API payload size
- Allows frontend to control all UI text
- Enables easier translation updates without backend changes
- Follows standard HTTP practices
- Maintains clear separation: backend = logic & LLM, frontend = presentation

## 1. Review Spanish Spelling and Syntax

Review the Spanish drawio file for spelling and syntax issues in `value="..."` attributes. Common terms to check:
- "maléolo" (with accent)
- "transindesmal" (with 'n', not 's')
- "suprasindesmal" (with 'n', not 's')
- "infrasindesmal" (with 'n', not 's')
- "oblicuo" (not "blicuo")
- "peroné" (not "pernoé")
- "Fractura" (not "ractura")

Rename the Spanish file with `-ES` suffix if not already present.

## 2. Create English Translation

The English translation is no longer a separate drawio file. Instead, the English version is derived into:
- Backend code (`internal/rules/engine.go`) — classification logic uses English domain constants
- Frontend i18n files and classification translations

Key translations to apply when reading the Spanish drawio:
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

Update the classification logic in `internal/rules/engine.go`:
- Ensure all classification paths match the drawio decision tree
- Update the `classifyLateralOnly()`, `classifyLateralPosterior()`, `classifyLateralMedial()`, `classifyTrimaleolar()` functions as needed
- Update impossible case handling
- **IMPORTANT**: Backend should return only codes/keys (e.g., `"type": "Weber A"`, `"fracture_type": "unimaleolar_lateral"`), NOT translated descriptions

**Backend field mapping validation:**

- For each `classify*()` function, verify that the `input.FieldName` references match the fields the form actually sends
- Common pitfall: using `input.FibularLevelForTransverse` when the form sends `input.FibularLevel` (or vice versa)
- Check that conditional branches use the correct field for each path (e.g., suprasyndesmotic paths should check `SuprasindesmalType` and `FibulaTracePattern`, NOT `LateralMorphology`)

**Backend i18n usage (limited scope):**
- `internal/i18n/i18n.go` is **only for**:
  - LLM system prompts (in `internal/llm/loader.go`)
- **NOT used for API error messages** - API returns error codes (e.g., `"error_code": "invalid_input"`)
- Error code constants defined in `internal/domain/errors.go`

## 3.1 Update LLM Prompts

Update the LLM prompts in `internal/llm/loader.go`:

- Update the "Classification Algorithm - Required Fields by Fracture Type" section in both English and Spanish prompts to match the new flow
- Update the "Decision Tree Questions" section to reflect any new decision points or changed logic
- Update the few-shot examples to reflect new classification paths
- Ensure clarification questions match the updated flow diagram logic

## 4. Update Backend Tests

Update tests in `internal/rules/engine_test.go` to match the new rules:
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

### 6.1 Show/Hide Flags - Path-by-Path Drawio Validation

For **each of the 7 `involved_malleoli` paths**, trace through the drawio decision tree and verify:

- Which questions appear on that path in the drawio
- Which questions the form shows via its `show*` flags

**Critical checks (common sources of bugs):**

- `showMedialMorphology`: Should ONLY include malleoli combinations where the drawio asks about medial morphology. Do NOT include `medial_posterior` (drawio skips medial morphology for that path).
- `showBimaleolarInfraQuestion`: Triggers for `lateral_medial` when medial morphology is **oblique** (not transverse). The drawio asks "Is fibula fracture infrasyndesmotic and transverse?" only after the oblique/vertical branch.
- `showFibulaTracePattern`: Should check `suprasindesmal_type` exists and is NOT `proximal`. Must NOT check `lateral_morphology === 'spiral'` — morphology is not asked for suprasyndesmotic paths.
- `showLateralMorphology`: Must skip for infrasyndesmotic paths where the drawio goes directly to a result (lateral-only infra, lateral+posterior infra).
- `showCTScan`: Must exclude paths where posterior malleolus is impossible (e.g., lateral+posterior infrasyndesmotic).
- `showPosteriorType`: Must depend on `showCTScan` being true AND `has_ct_scan === true`, not just `has_ct_scan === true` alone.

### 6.2 `isFormComplete()` - Terminal Node Validation

For **each `involved_malleoli` case**, verify the function returns `true` exactly when the form has collected enough data to reach a terminal node (result) in the drawio.

**Critical checks:**

- **Infrasyndesmotic shortcuts**: `lateral_only` + infra and `lateral_posterior` + infra should return `true` immediately (no morphology needed).
- **Suprasyndesmotic paths**: Should require `suprasindesmal_type`. If type is NOT `proximal`, also require `fibula_trace_pattern`. Should NOT require `lateral_morphology`.
- **`lateral_medial` oblique shortcut**: If `medial_morphology === 'oblique'` and `fibula_infrasindesmal_transverse === true`, the form is complete (SA path).
- **`lateral_medial` transverse path**: Transverse medial goes directly to fibular level question (no infra question).
- **`medial_posterior`**: Does NOT require `medial_morphology` (drawio goes straight to CT scan).

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

## 8. Update Drawio Viewer Diagram

When a new drawio file is created, copy it to the static assets directory so the embedded viewer picks it up:

```bash
cp "docs/Danis-Weber AO_OTA Flow-{DATE}-ES.drawio" frontend/public/classification-flow.drawio
```

The diagram is rendered by `frontend/src/components/DrawioViewer.tsx` using the draw.io viewer script (`viewer-static.min.js`). The `FlowDiagramSidebar` component loads the diagram from `/classification-flow.drawio`.

## 9. Update Translation Labels (i18n)

Update `frontend/src/i18n/en.json` and `frontend/src/i18n/es.json`:

**Cross-reference checks:**

- `form.questions.*` keys must match the drawio question text for each node
- `form.options.*` labels must match the drawio option labels for each node
- Common pitfall: question uses "trace" when drawio says "fracture" (e.g., "fibula trace pattern" vs "fibula fracture pattern")
- Common pitfall: medialMorphology.oblique says "Oblique" when drawio says "Oblique/Vertical"
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
go test ./...

# Frontend type check
cd frontend && npx tsc --noEmit
```

## Key Files Reference

### Documentation

- `docs/Danis-Weber AO_OTA Flow-{DATE}-ES.drawio` - Spanish version (source of truth for algorithm)

### Backend

- `internal/rules/engine.go` - Classification logic (returns codes only, no descriptions)
- `internal/rules/engine_test.go` - Backend tests (test for codes/keys, not translations)
- `internal/domain/fracture.go` - Domain types
- `internal/domain/classification.go` - Classification types (codes only)
- `internal/domain/errors.go` - Error code constants (used in API responses)
- `internal/api/handler.go` - API handlers (returns `error_code`, not translated messages)
- `internal/api/chat_handlers.go` - Chat API handlers (returns `error_code` for errors)
- `internal/service/classification.go` - Classifier service (no lang parameter)
- `internal/service/chat.go` - Chat service (no message translation, frontend handles via Status)
- `internal/service/statistics.go` - Statistics service (returns translation keys for notes)
- `internal/i18n/i18n.go` - Translations (LLM prompts only)
- `internal/llm/client.go` - LLM client
- `internal/llm/loader.go` - LLM prompt loader (MUST use i18n for Gemini API)

### Frontend

- `frontend/src/features/fracture-classification/components/FractureForm.tsx` - Form component (show/hide flags, isFormComplete, calculateProgress)
- `frontend/src/features/fracture-classification/hooks/useFormState.ts` - Form state management with undo history
- `frontend/src/utils/formOptions.ts` - Form question definitions and select options
- `frontend/src/utils/classificationTranslations.ts` - Translation helper functions (maps backend codes to i18n keys)
- `frontend/src/services/api.ts` - API service (translates `error_code` to user messages)
- `frontend/src/i18n/en.json` - English translations (includes `errors.*` for API error codes, `results.*` for classifications, `admin.reliability.*` for stats)
- `frontend/src/i18n/es.json` - Spanish translations (same structure as en.json)
- `frontend/src/i18n/config.ts` - i18n configuration and utilities
- `frontend/src/components/DrawioViewer.tsx` - Draw.io diagram viewer component
- `frontend/src/components/FlowDiagramSidebar.tsx` - Sidebar that displays the drawio diagram
- `frontend/public/classification-flow.drawio` - Static drawio file served to the viewer
- `frontend/src/types/domain/fracture.ts` - TypeScript domain types (FractureInput interface)
- `frontend/src/types/fracture.ts` - Re-export barrel file (deprecated, imports from domain/)

### Scripts

- `scripts/parse_drawio_test_cases.py` - Parses drawio XML to generate ALL classification test paths into `/tmp/classification_test_cases.json`. Contains a question-mark heuristic: option nodes with `?` in text are reclassified as decision nodes.

### E2E Tests

- `e2e/fixtures/test-data.ts` - Expected results
- `e2e/tests/classification/*.spec.ts` - Classification tests
- `e2e/pages/classify.page.ts` - Page object

## Common Pitfalls and Patterns

### Drawio Parser Pitfall
Green (option) nodes sometimes contain question text (contain `?`). The parser in `scripts/parse_drawio_test_cases.py` has a heuristic: if an `option` node's text contains `?`, reclassify it as `decision`. This must be maintained when modifying the parser.

### AO Subtype Architecture
The drawio specifies detailed subtypes (e.g., 44-B1.1, 44-B1.2) that require:
- New `AOOTACode` constants in `internal/domain/classification.go`
- New input fields in `FractureInput` (e.g., `LateralSubtype`, `InfrasindesmalMorphology`, `MedialSubtype`, `HasFibulaHeadShortening`)
- All new fields MUST be `omitempty` for backward compatibility
- Engine fallback: when subtype field is empty, return base code (e.g., 44-B1 instead of 44-B1.1)

### Engine Divergence Patterns
Common divergences between engine and drawio:
- **AO=nil vs AO=code**: Some paths return no AO (nil pointer), meaning "no clasificable". Engine must NOT set `AOOTA` field at all (not set to empty).
- **"clasificable" marker**: Some drawio terminals say "AO clasificable" meaning a code EXISTS but isn't specified in detail. Map to base code + TODO comment.
- **Impossible to Valid transitions**: What was "impossible" in one version may become valid in the next (e.g., trimaleolar transverse infrasindesmal went from impossible to 44-A3.3).
- **Conminuta morphology**: A special morphology type that forces AO=nil. Added as `LateralMorphologyConminuta` in domain.

### Frontend New Question Patterns
When adding new conditional questions to the form:
- Add question to `formOptions.ts` (questions dict + options array + return object)
- Add to `FormOptions` interface in `types/ui/forms.ts`
- Add show/hide flag in `FractureForm.tsx`
- Add `<QuestionStep>` component in the JSX
- Add translations in both `en.json` and `es.json`
- Update `isFormComplete()` — new optional subtype fields don't block completion
- Import new types in FractureForm.tsx

### Test Update Patterns
- When AO changes from a code to nil: remove the AOOTA assertion, add `if result.AOOTA != nil { t.Error(...) }`
- When LH changes to nil: add `expectedLHNil bool` field to table-driven tests
- When a path goes from impossible to valid: remove from impossible tests, add to classification tests
- When base AO code changes (e.g., 44-B to 44-B1): update all table test `expectedAOOTA` fields
- Always add `TestEngine_Classify_AOSubtypes` style tests for new codes

### E2E Test Case Generation
The `scripts/parse_drawio_test_cases.py` script generates ALL test paths from drawio. Run it after parser fixes to regenerate `/tmp/classification_test_cases.json`. Use `/test-classification-flow` command for exhaustive E2E testing.

## Usage

Run this command when you've created a new flow diagram:

```
/update-flow
```
