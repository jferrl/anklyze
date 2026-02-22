# Tasks: Update Classification Algorithm v2

**Input**: Design documents from `/specs/002-update-classification-algorithm/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included per Constitution Principle II (Test-Driven Development) — backend engine tests are written/updated before engine logic changes.

**Organization**: Tasks are grouped by user story. US1 (backend logic) and US2 (frontend form) are both P1 and can proceed in parallel after the Foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Documentation)

**Purpose**: Prepare reference documentation that all subsequent phases depend on

- [ ] T001 Review Spanish MMD spelling and syntax in `docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd` per `update-flow.md` section 1 checklist (maléolo, transindesmal, suprasindesmal, infrasindesmal, oblicuo, peroné, Fractura)
- [ ] T002 Create English MMD translation at `docs/Danis-Weber AO_OTA Flow-2026-02-22-EN.mmd` by translating the reviewed Spanish file using key translations from `update-flow.md` section 2

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend domain types and frontend TypeScript types that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete. The English MMD (T002) is the source of truth for all code changes.

- [ ] T003 [P] Add new `ArticularInvolvement` type (enum: `large_with_extension`, `small_without_extension`) and `articular_involvement` field to `FractureInput` in `internal/domain/fracture.go`
- [ ] T004 [P] Add `has_articular_depression` (*bool) field to `FractureInput` in `internal/domain/fracture.go`
- [ ] T005 [P] Add `is_posterior_posteromedial` (*bool) field to `FractureInput` in `internal/domain/fracture.go`
- [ ] T006 [P] Add `PosteriorExtraincisuralPosteromedial` constant (`"extraincisural_posteromedial"`) to `PosteriorFractureType` in `internal/domain/fracture.go`
- [ ] T007 [P] Add `FibulaTraceSuprasindesmoticFar` constant (`"suprasindesmotic_far"`) to `FibulaTracePattern` in `internal/domain/fracture.go`
- [ ] T008 [P] Add new `AOOTACode` constants in `internal/domain/classification.go`: `AOOTA43B1` (`"43-B1"`), `AOOTA43B2` (`"43-B2"`), `AOOTAA3` (`"44-A3"`), `AOOTAB` (`"44-B"`)
- [ ] T009 [P] Update TypeScript `FractureInput` interface in `frontend/src/types/domain/fracture.ts`: add `articular_involvement`, `has_articular_depression`, `is_posterior_posteromedial` fields and new type unions for `PosteriorFractureType` (`extraincisural_posteromedial`), `FibulaTracePattern` (`suprasindesmotic_far`)

**Checkpoint**: All domain types are defined. Backend and frontend type systems are in sync. Run `go vet ./...` and `cd frontend && npx tsc --noEmit` to verify.

---

## Phase 3: User Story 1 — Rater classifies fractures using updated decision tree (Priority: P1) MVP

**Goal**: Backend rules engine produces correct classification results for all 7 malleoli paths matching the new flow diagram terminal nodes.

**Independent Test**: Run `go test -race ./internal/rules/...` — all tests pass with new expected outputs.

### Tests for User Story 1

> **NOTE: Write/update these tests FIRST, ensure they FAIL before implementation (TDD per Constitution Principle II)**

- [ ] T010 [US1] Update test cases for `classifyPosteriorOnly` in `internal/rules/engine_test.go`: add tests for articular involvement branching — `large_with_extension` + depression → AO 43-B2, `large_with_extension` + no depression → AO 43-B1, `small_without_extension` → existing Bartonicek path (AO unclassifiable + LH PA)
- [ ] T011 [US1] Update test cases for `classifyMedialOnly` in `internal/rules/engine_test.go`: add tests for articular involvement branching — `large_with_extension` + depression → AO 43-B2, `large_with_extension` + no depression → AO 43-B1, `small_without_extension` → morphology path (vertical → SA AO 44-A2, transverse/oblique → ambiguous)
- [ ] T012 [US1] Update test cases for `classifyMedialPosterior` in `internal/rules/engine_test.go`: add tests for CT + 5 posterior types including `extraincisural_posteromedial` → AO 44-A3 + LH unclassifiable, no CT → AO unclassifiable + LH PA, other 4 types → AO 44-B3 + LH PA + Bartonicek 1-4
- [ ] T013 [US1] Update test cases for `classifyLateralPosterior` infrasindesmal in `internal/rules/engine_test.go`: replace impossible case tests with new path — no CT → unclassifiable Weber A, CT + posteromedial → AO 44-A3 + LH unclassifiable + Weber A, CT + not posteromedial → Bartonicek types + AO unclassifiable + LH unclassifiable + Weber A
- [ ] T014 [US1] Update test cases for `classifyLateralOnly` transsyndesmotic in `internal/rules/engine_test.go`: change expected AO code from `44-B1` to `44-B` for both spiral and oblique morphology
- [ ] T015 [US1] Add test cases for `suprasindesmotic_far` trace pattern in `internal/rules/engine_test.go`: verify it produces PER mechanism (same as `parasindesmotic_long`) across `classifyLateralOnly`, `classifyLateralPosterior`, `classifyLateralMedial`, `classifyTrimaleolar`

### Implementation for User Story 1

- [ ] T016 [US1] Update `classifyPosteriorOnly()` in `internal/rules/engine.go`: add articular involvement check at start — `large_with_extension` → early return with `distal_tibia` fracture type + AO 43-B1/B2 based on depression; `small_without_extension` → existing CT + Bartonicek path with AO unclassifiable + LH PA
- [ ] T017 [US1] Update `classifyMedialOnly()` in `internal/rules/engine.go`: add articular involvement check at start — `large_with_extension` → early return with `distal_tibia` + AO 43-B1/B2; `small_without_extension` → existing morphology path (Vertical → SA AO 44-A2, Transverse/oblique → ambiguous PA/SER/PER AO 44-A2)
- [ ] T018 [US1] Rewrite `classifyMedialPosterior()` in `internal/rules/engine.go`: no CT → bimaleolar medial+posterior AO unclassifiable + LH PA; CT → branch on 5 posterior types: `extraincisural_posteromedial` → AO 44-A3 + LH unclassifiable, other 4 standard types → AO 44-B3 + LH PA + Bartonicek 1-4 (`extraincisural` → Bartonicek 1, `posterolateral` → Bartonicek 2, `posteromedial_posterolateral` → Bartonicek 3, `large_posterolateral` → Bartonicek 4)
- [ ] T019 [US1] Rewrite `classifyLateralPosterior()` infrasindesmal branch in `internal/rules/engine.go`: replace impossible return with — no CT → unclassifiable (Weber A); CT + `is_posterior_posteromedial` true → AO 44-A3 + LH unclassifiable + Weber A; CT + false → standard Bartonicek with unclassifiable AO/LH + Weber A
- [ ] T020 [US1] Update `classifyLateralOnly()` transsyndesmotic branch in `internal/rules/engine.go`: change `AOOTAB1` to `AOOTAB` for both spiral and oblique morphology
- [ ] T021 [US1] Verify `suprasindesmotic_far` trace pattern works via existing `else` branches in all suprasyndesmotic paths in `internal/rules/engine.go` — no code change needed if default case already returns PER, but add explicit handling if clearer
- [ ] T022 [US1] Run `go test -race ./internal/rules/...` to verify all tests pass

**Checkpoint**: Backend classification engine matches the flow diagram for all paths. All engine tests pass.

---

## Phase 4: User Story 2 — Frontend form shows correct questions per path (Priority: P1)

**Goal**: Classification form dynamically shows correct questions per the new decision tree, detects form completion at terminal nodes, and calculates progress accurately.

**Independent Test**: Step through each of the 7 malleoli paths in the form and verify only the correct questions appear per the English MMD.

### Implementation for User Story 2

- [ ] T023 [P] [US2] Add new form question options for `articular_involvement` (2 options), `has_articular_depression` (Yes/No), and `is_posterior_posteromedial` (Yes/No) in `frontend/src/utils/formOptions.ts`
- [ ] T024 [P] [US2] Add third `fibula_trace_pattern` option (`suprasindesmotic_far`) and fifth `posterior_fracture_type` option (`extraincisural_posteromedial`) to `frontend/src/utils/formOptions.ts`
- [ ] T025 [US2] Update show/hide flags in `frontend/src/features/fracture-classification/components/FractureForm.tsx`: add `showArticularInvolvement` (posterior_only, medial_only), `showArticularDepression` (when articular_involvement = large_with_extension), `showPosteriorPosteromedial` (lateral_posterior + infrasindesmal + has_ct_scan), update `showMedialMorphology` to exclude when articular_involvement = large_with_extension, update `showCTScan` and `showPosteriorType` for medial_posterior path
- [ ] T026 [US2] Update `isFormComplete()` in `frontend/src/features/fracture-classification/components/FractureForm.tsx`: add terminal detection for posterior_only (large_with_extension + has_articular_depression → complete), medial_only (large_with_extension + has_articular_depression → complete), lateral_posterior infra (no CT → complete, CT + is_posterior_posteromedial answered → complete), medial_posterior (no CT → complete, CT + posterior_type answered → complete)
- [ ] T027 [US2] Update `calculateProgress()` in `frontend/src/features/fracture-classification/components/FractureForm.tsx`: adjust estimated step counts for posterior_only (add articular involvement step), medial_only (add articular involvement step), medial_posterior (add CT + posterior type steps), lateral_posterior infra (add CT + posteromedial steps)
- [ ] T028 [US2] Run `cd frontend && npx tsc --noEmit` to verify frontend compiles without type errors

**Checkpoint**: Frontend form shows exactly the correct questions for all 7 paths. Form completes at terminal nodes.

---

## Phase 5: User Story 3 — Chat-based classification reflects updated algorithm (Priority: P2)

**Goal**: LLM prompts include the updated decision tree so Gemini correctly extracts new fields from natural language descriptions.

**Independent Test**: Send natural language fracture descriptions through the chat interface that exercise new paths and verify correct classifications.

**Depends on**: US1 (backend engine must be updated first, since chat service delegates to the same engine)

### Implementation for User Story 3

- [ ] T029 [US3] Update English system prompt (`systemPromptEN`) in `internal/llm/prompts.go`: update "Classification Algorithm - Required Fields by Fracture Type" section with new fields (`articular_involvement`, `has_articular_depression`, `is_posterior_posteromedial`), update "Decision Tree Questions" with new branching logic, update `suprasindesmotic_far` trace pattern option
- [ ] T030 [US3] Update Spanish system prompt (`systemPromptES`) in `internal/llm/prompts.go`: mirror all changes from T029 in Spanish
- [ ] T031 [US3] Update English few-shot examples (`fewShotExamplesEN`) in `internal/llm/prompts.go`: add examples for posterior-only with metaphyseal extension, medial+posterior with posteromedial fragment, lateral+posterior infrasyndesmotic
- [ ] T032 [US3] Update Spanish few-shot examples (`fewShotExamplesES`) in `internal/llm/prompts.go`: mirror all example changes from T031 in Spanish

**Checkpoint**: Chat-based classification extracts new fields correctly and produces results matching the updated engine.

---

## Phase 6: User Story 4 — Frontend displays updated flowcharts and translations (Priority: P2)

**Goal**: All user-facing labels, flowchart visualizations, and translation helpers match the reference MMD diagrams in both English and Spanish.

**Independent Test**: Switch between EN/ES locales and compare every label against the reference MMD node by node.

### Implementation for User Story 4

- [ ] T033 [P] [US4] Update `frontend/src/i18n/en.json`: add translation keys for new questions (`form.questions.articularInvolvement`, `form.questions.articularDepression`, `form.questions.posteriorPosteromedial`), new options, new result descriptions (AO 43-B1, 43-B2, 44-A3, 44-B, distal tibia fracture type), update medial morphology labels (oblique → "Vertical", transverse → "Transverse/Oblique")
- [ ] T034 [P] [US4] Update `frontend/src/i18n/es.json`: mirror all changes from T033 in Spanish, matching the Spanish MMD labels exactly (maléolo, transverso/oblicuo, vertical, etc.)
- [ ] T035 [P] [US4] Update `frontend/src/utils/classificationTranslations.ts`: add translation helpers for new AO codes (43-B1, 43-B2, 44-A3, 44-B), new fracture type (`distal_tibia`), update `getAOOTADescription()`, `getFractureDescription()`, handle unclassifiable Lauge-Hansen in `getLaugeHansenDescription()`
- [ ] T036 [P] [US4] Update embedded Spanish flowchart in `frontend/src/data/flowcharts/es.ts` to match the reviewed `docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd` exactly
- [ ] T037 [P] [US4] Update embedded English flowchart in `frontend/src/data/flowcharts/en.ts` to match `docs/Danis-Weber AO_OTA Flow-2026-02-22-EN.mmd` exactly
- [ ] T038 [US4] Run label parity checks per `update-flow.md` section 8: compare embedded MMD question text, option labels, trace pattern labels, Oxford commas, and Bartonicek terminal values against reference MMDs

**Checkpoint**: Both languages show correct labels and flowcharts matching the reference diagrams.

---

## Phase 7: User Story 5 — Existing classifications remain backward-compatible (Priority: P3)

**Goal**: Previously submitted case responses and reference classifications render correctly with the updated frontend translation utilities.

**Independent Test**: Query existing case responses from the database and verify they display without errors in the results view.

### Implementation for User Story 5

- [ ] T039 [US5] Verify `frontend/src/utils/classificationTranslations.ts` handles unknown/old AO codes gracefully (falls back to raw code display) — no code changes expected, but verify no runtime errors for old values like `44-B1`
- [ ] T040 [US5] Verify `CompareWithReference()` in `internal/domain/case.go` handles new AO codes and nil DanisWeber/LaugeHansen fields for distal tibia results — update comparison logic if needed
- [ ] T041 [US5] Verify denormalized field update logic in response submission handler handles new codes correctly (e.g., `ao_ota_code` can store `43-B1`, `44-A3`, `44-B`)

**Checkpoint**: Old responses render correctly. New responses with new codes display correctly. No data loss.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, final verification, build validation

- [ ] T042 [P] Update expected results in `e2e/fixtures/test-data.ts` for all changed classification paths (posterior-only, medial-only, medial+posterior, lateral+posterior infra, lateral-only trans, suprasyndesmotic trace patterns)
- [ ] T043 Update lateral-only E2E tests in `e2e/tests/classification/lateral-only.spec.ts`: update expected AO code for transsyndesmotic paths from `44-B1` to `44-B`
- [ ] T044 [P] Update lateral-posterior E2E tests in `e2e/tests/classification/lateral-posterior.spec.ts`: replace impossible infrasyndesmotic tests with new CT + posteromedial branching tests
- [ ] T045 [P] Update lateral-medial E2E tests in `e2e/tests/classification/lateral-medial.spec.ts`: add suprasyndesmotic far trace pattern tests
- [ ] T046 [P] Update trimaleolar E2E tests in `e2e/tests/classification/trimaleolar.spec.ts`: add suprasyndesmotic far trace pattern tests
- [ ] T047 Run full backend test suite: `go test -race ./...`
- [ ] T048 Run full frontend validation: `cd frontend && npx tsc --noEmit && npm run lint`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (English MMD needed as source of truth for code)
- **US1 (Phase 3)**: Depends on Phase 2 (domain types must exist)
- **US2 (Phase 4)**: Depends on Phase 2 (frontend types must exist). Can run in parallel with US1.
- **US3 (Phase 5)**: Depends on US1 (engine must be updated before prompts reference new fields)
- **US4 (Phase 6)**: Depends on Phase 2 (types must exist). Can run in parallel with US1/US2.
- **US5 (Phase 7)**: Depends on US1 + US4 (need updated engine and translation helpers)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — no dependencies on other stories (parallel with US1)
- **US3 (P2)**: Must wait for US1 completion (engine logic must be finalized)
- **US4 (P2)**: Can start after Phase 2 — no dependencies on other stories (parallel with US1/US2)
- **US5 (P3)**: Must wait for US1 + US4 (needs updated engine and translations)

### Within Each User Story

- Tests FIRST, verify they FAIL (US1 — TDD per constitution)
- Implementation follows test expectations
- Verification step at the end of each story

### Parallel Opportunities

- Phase 2: All T003-T009 can run in parallel (different files/fields)
- Phase 3: T010-T015 (tests) are sequential within engine_test.go but can be done in one pass
- Phase 4: T023-T024 (form options) in parallel, then T025-T027 (form logic) sequential
- Phase 6: T033-T037 all in parallel (different files)
- Phase 8: T042, T044, T045, T046 all in parallel (different test files)
- US1 and US2 can proceed entirely in parallel after Phase 2
- US4 can also proceed in parallel with US1 and US2

---

## Parallel Example: After Phase 2

```text
# Stream A (Backend — US1):
T010-T015 → T016-T022 (tests first, then implementation)

# Stream B (Frontend Form — US2):
T023-T024 → T025-T027 → T028

# Stream C (Translations — US4):
T033-T037 → T038

# After US1 completes:
T029-T032 (US3 — LLM prompts)

# After US1 + US4 complete:
T039-T041 (US5 — backward compatibility)

# After all stories:
T042-T048 (Polish — E2E tests + final verification)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (MMD review + English translation)
2. Complete Phase 2: Foundational (domain types)
3. Complete Phase 3: User Story 1 (backend engine + tests)
4. **STOP and VALIDATE**: Run `go test -race ./internal/rules/...` — all pass
5. Backend is correct, even if frontend isn't updated yet

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Add US1 → Backend engine correct (MVP!)
3. Add US2 → Frontend form works with new paths
4. Add US3 → Chat classification works with new paths
5. Add US4 → Labels and flowcharts match diagram
6. Add US5 → Backward compatibility verified
7. Phase 8 → E2E tests pass, full validation

---

## Notes

- The flow diagram (`docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd`) is the single source of truth for ALL tasks
- Follow `update-flow.md` field mapping validation guidelines when updating engine.go (verify input field names match form fields)
- Backend returns codes only — no translated descriptions (FR-014)
- Medial morphology code values (`oblique`, `transverse`) stay the same; only display labels change in i18n
- `suprasindesmotic_far` produces same PER result as `parasindesmotic_long` — existing `else` branches may already handle it
