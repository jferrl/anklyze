# Tasks: Backend Architecture Improvements

**Input**: Design documents from `/specs/001-backend-arch-improvements/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED for this feature — the spec mandates TDD for domain methods (FR-006) and golden snapshot tests for the rules engine (FR-001).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Verify existing test infrastructure before making changes

- [x] T001 Verify existing test suite passes by running `go test ./...` — all current tests must be green before any refactoring begins

**Checkpoint**: Baseline confirmed — safe to proceed with changes

---

## Phase 2: User Story 1 — Classification Logic Safety Net (Priority: P1) MVP

**Goal**: Add golden snapshot regression tests for the rules engine (~540 LOC, zero tests today) and chat input validation tests

**Independent Test**: `go test -v -run TestClassify ./internal/rules/...` passes with full branch coverage

### Tests for User Story 1

- [x] T002 [US1] Create `internal/rules/engine_test.go` with `TestClassify_GoldenSnapshot` — a table-driven test covering all 7 top-level `InvolvedMalleoli` branches (posterior-only, medial-only, lateral-only, medial+posterior, lateral+posterior, lateral+medial, trimaleolar) plus the default/none_selected branch (must return a clear "unclassifiable" result, not nil or empty — see spec Edge Cases). For each branch, run the engine with a representative input, capture the current output as the golden expected value, and assert all fields: `FractureType`, `DanisWeber`, `LaugeHansen`, `AOOTA`, `Bartonicek`, `Impossible`, `ImpossibleKey`

- [x] T003 [US1] Extend `internal/rules/engine_test.go` with sub-branch test cases to achieve full decision tree coverage: CT scan yes/no variants for posterior cases, `MedialMorphology` oblique/transverse for medial cases, all `FibularLevel` × `LateralMorphology` × `SuprasindesmalType` combinations for lateral cases, `FibulaTracePattern` `ParasindesmoticShort` vs default for suprasindesmal cases. Target ~35-45 test cases total in the golden snapshot table

- [x] T004 [US1] Add impossible combination test cases in `internal/rules/engine_test.go`: lateral+posterior with `FibularLevelInfrasindesmal` (SA mechanism cannot involve posterior), trimaleolar with infrasindesmal transverse lateral (exceptional impossibility). Verify `Impossible=true` and correct `ImpossibleKey` values

- [x] T005 [US1] Add ambiguous classification test cases in `internal/rules/engine_test.go`: medial-only with transverse morphology (ambiguous Lauge-Hansen with `PossibleTypes: ["PA", "SER", "PER"]`), posterior-only (ambiguous Lauge-Hansen with no `PossibleTypes`). Verify `LaugeHansen.Ambiguous=true` and correct `PossibleTypes`

- [x] T006 [P] [US1] Create `internal/api/input_validation_test.go` with `TestInputValidation` — table-driven tests for all 8 validation rules: `input_too_short` (len < 10), `repeated_characters` (>4 identical), `too_many_special_chars` (alpha ratio < 0.7), `too_few_words` (< 3 words), `keyboard_smash` (QWERTY patterns), `no_medical_context` (no medical keywords), `unsupported_language` (< 20% common words), `no_words` (empty after filtering). Include both valid and invalid inputs for each rule, assert `Valid`, `Code`, and `Reason` fields

**Checkpoint**: Rules engine and chat validation have full test coverage. CI will catch any classification regression. US1 is complete and independently verifiable

---

## Phase 3: User Story 2 — Domain Behavior Ownership (Priority: P2)

**Goal**: Move business logic from HTTP handlers into domain model methods following Tell Don't Ask principle

**Independent Test**: `go test -v ./internal/domain/...` passes; handlers contain zero business logic conditionals

### Tests for User Story 2 (TDD — write tests FIRST, verify they FAIL, then implement)

- [x] T007 [US2] Write tests for existing domain behavioral methods in `internal/domain/case_test.go`: `CanBeEdited` (draft=true, published=false, closed=false), `CanAcceptResponses` (published+not-expired=true, draft=false, expired=false), `IsExpired` (nil deadline=false, future deadline=false, past deadline=true), `CanBeDeleted` (always true), `BelongsToStudy` (nil StudyID=false, set StudyID=true)

- [x] T008 [US2] Write tests for `CanPublish` and `CanClose` in `internal/domain/case_test.go`: `CanPublish` with draft+hasImages=nil error, draft+noImages=`ErrMissingImages`, published case=`ErrInvalidStateTransition`, closed case=`ErrInvalidStateTransition`. `CanClose` with published=nil error, draft=`ErrInvalidStateTransition`, closed=`ErrInvalidStateTransition`. Use `errors.Is()` to check sentinel errors

- [x] T009 [US2] Write tests for `ValidateResponseSubmission` in `internal/domain/case_test.go`: admin bypass (isAdmin=true always returns nil), non-published case returns `ErrCaseNotAcceptingResponses`, expired case returns `ErrDeadlinePassed`, already responded in single-response mode returns `ErrAlreadyResponded`, allowed in multi-response mode returns nil, published+not-expired+not-responded returns nil

- [x] T010 [US2] Write tests for `CompareWithReference` in `internal/domain/case_test.go`: full match (all 4 systems match, accuracy=1.0), partial match (2 of 4 match, accuracy=0.5), no match (accuracy=0.0), nil reference classification returns nil `ComparisonResult`. Also test `IsPublished` (published=true, draft=false, closed=false)

### Implementation for User Story 2

- [x] T011 [US2] Add new error sentinels to `internal/domain/errors.go`: `ErrInvalidStateTransition`, `ErrMissingImages`, `ErrDeadlinePassed`, `ErrCaseNotAcceptingResponses`, `ErrAlreadyResponded`. Add corresponding error code constants

- [x] T012 [US2] Add `ComparisonResult` type to `internal/domain/case.go` with fields: `DanisWeberMatch bool`, `LaugeHansenMatch bool`, `AOOTAMatch bool`, `BartonicekMatch bool`, `OverallAccuracy float64`

- [x] T013 [US2] Implement `CanPublish(hasImages bool) error` and `CanClose() error` methods on `Case` in `internal/domain/case.go`. `CanPublish` checks draft status + hasImages. `CanClose` checks published status. Both return domain errors on failure (depends on T011)

- [x] T014 [US2] Implement `ValidateResponseSubmission(userID uuid.UUID, isAdmin, hasResponded bool) error` on `Case` in `internal/domain/case.go`. Consolidates admin bypass, case state check via `CanAcceptResponses()`, deadline check via `IsExpired()`, and duplicate response enforcement. Returns appropriate domain errors (depends on T011)

- [x] T015 [US2] Implement `CompareWithReference(userResult *ClassificationResult) *ComparisonResult` and `IsPublished() bool` on `Case` in `internal/domain/case.go`. `CompareWithReference` unmarshals the reference classification, compares each system, and calculates `OverallAccuracy` (depends on T012)

- [x] T016 [US2] Refactor `internal/api/case_admin_handler.go`: replace inline publish validation (lines 265-275) with `cs.CanPublish(len(images) > 0)` call; replace close validation (lines 307-310) with `cs.CanClose()` call. Map domain errors to HTTP responses using error codes from contracts/error-responses.md: `ErrInvalidStateTransition` → 400 `INVALID_STATE_TRANSITION`, `ErrMissingImages` → 400 `MISSING_IMAGES` (depends on T013)

- [x] T017 [US2] Refactor `internal/api/case_response_handler.go`: replace access/state/duplicate checks (lines 67-131) with `cs.ValidateResponseSubmission(userID, isAdmin, hasResponded)` call. Replace reference comparison logic (lines 224-250) with `cs.CompareWithReference(userClassification)`. Replace published check (lines 354-359) with `cs.IsPublished()`. Map domain errors to HTTP: `ErrDeadlinePassed` → 403, `ErrCaseNotAcceptingResponses` → 403, `ErrAlreadyResponded` → 409 (depends on T014, T015)

- [x] T018 [US2] Update `frontend/src/services/api.ts` to handle standardized error responses with `code` field for new domain error codes: `INVALID_STATE_TRANSITION`, `MISSING_IMAGES`, `DEADLINE_PASSED`, `CASE_NOT_ACCEPTING_RESPONSES`, `ALREADY_RESPONDED`. Update any error display logic that relies on the old ad-hoc error shapes. Ensure all new user-facing error messages are added as i18n keys in `frontend/src/i18n/{en,es}.json` per constitution Internationalization rules (depends on T016, T017)

**Checkpoint**: All business logic lives in domain methods. Handlers are thin HTTP translators. Domain model tests pass. Frontend handles new error codes

---

## Phase 4: User Story 3 — Leaner Service Layer (Priority: P3)

**Goal**: Remove the passthrough classifier service and inject the rules engine directly into callers

**Independent Test**: `grep -r "ClassifierService" internal/` returns no results; classification flow works end-to-end

### Implementation for User Story 3

- [x] T019 [US3] Delete `internal/service/classifier.go` entirely — removes `ClassifierService` interface, `classifierService` struct, and `NewClassifierService` constructor

- [x] T020 [US3] Refactor `internal/service/chat.go`: replace `classifier ClassifierService` field with `engine *rules.Engine` and add `confidenceThreshold float64` field. Update `NewChatService` constructor signature to `NewChatService(llmClient *llm.Client, engine *rules.Engine, confidenceThreshold float64) ChatService`. Replace `s.classifier.Classify(input)` with `s.engine.Classify(input)`. Replace hardcoded `0.7` threshold at line 78 with `s.confidenceThreshold` (depends on T019)

- [x] T021 [US3] Update `cmd/anklyze-apiserver/main.go`: remove `classifier := service.NewClassifierService(ruleEngine)` line. Update `service.NewChatService(llmClient, classifier)` call to `service.NewChatService(llmClient, ruleEngine, 0.7)`. Add `import "github.com/jferrl/anklyze/internal/rules"` if not already present (depends on T020)

- [x] T022 [US3] Write unit tests for refactored `ChatService` in `internal/service/chat_test.go`: verify that `NewChatService` accepts `*rules.Engine` and `confidenceThreshold float64`, verify classification is invoked via engine directly, verify configurable confidence threshold is used instead of hardcoded `0.7`. Constitution II requires service test coverage for exported functions (depends on T020)

**Checkpoint**: Classifier service fully removed. Chat service calls rules engine directly with configurable confidence threshold. No passthrough layers remain. ChatService refactoring is tested

---

## Phase 5: User Story 4 — Consistent Error Handling (Priority: P3)

**Goal**: Add contextual error wrapping at all layer boundaries using `fmt.Errorf("...: %w", err)`

**Independent Test**: Error chain tests verify wrapped errors can be unwrapped to sentinel errors

### Tests for User Story 4

- [x] T023 [US4] Write error chain tests in `internal/repository/postgres/error_wrapping_test.go` (or extend existing test files): verify that repository errors wrap correctly and can be unwrapped using `errors.Is()` to the original GORM/sentinel error. Test with simulated DB errors for `GetByID`, `Create`, `Update`, `Delete` on case repository

### Implementation for User Story 4

- [x] T024 [US4] Add `fmt.Errorf("method_name: %w", err)` wrapping to all error returns in `internal/repository/postgres/case.go`. Every method that returns an error from GORM must wrap it with the method name for context (e.g., `return nil, fmt.Errorf("get case by id: %w", err)`)

- [x] T025 [P] [US4] Add `fmt.Errorf` error wrapping to all error returns in remaining postgres repository files: `internal/repository/postgres/audit.go`, `internal/repository/postgres/study.go`, `internal/repository/postgres/user.go`, and any other files in that directory. Follow the same pattern: method name prefix + `%w` wrapping

- [x] T026 [US4] Add error wrapping to service layer in `internal/service/chat.go` and `internal/service/statistics.go`: wrap errors received from repositories or external clients (LLM) before returning. Use `fmt.Errorf("service_method: %w", err)` pattern (depends on T020 if chat.go was already refactored in US3)

- [x] T027 [US4] Update error-to-HTTP mapping in `internal/api/errors.go` (or handler error helpers): ensure domain errors map consistently to HTTP status codes using `errors.Is()` unwrapping. Verify that wrapped errors still match sentinel comparisons correctly

**Checkpoint**: All errors carry full context chain from repository through service. Debugging production issues shows complete call path

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [x] T028 Run `go test -v -race ./...` — all tests pass with race detector enabled, no regressions in existing tests
- [x] T029 [P] Run `go vet ./...` — zero warnings
- [x] T030 [P] Run `cd frontend && npx tsc --noEmit && npm run lint` — zero TypeScript and ESLint errors
- [ ] T031 Execute quickstart.md verification steps 1-9 end-to-end
- [x] T032 Regenerate Swagger docs with `make swagger` — API response shapes change in this feature (new error codes, standardized error format)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — verify baseline
- **US1 (Phase 2)**: Depends on Phase 1 only — can start immediately
- **US2 (Phase 3)**: Depends on Phase 1 only — can start in parallel with US1
- **US3 (Phase 4)**: Depends on Phase 1 only — can start in parallel with US1/US2 (but recommended after US1 golden snapshot is in place as safety net)
- **US4 (Phase 5)**: Depends on Phase 1 only — can start in parallel. T025 should run after T020 if US3 is done first
- **Polish (Phase 6)**: Depends on all user stories completing

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories. RECOMMENDED FIRST — provides safety net for US2/US3 refactoring
- **US2 (P2)**: No hard dependency on US1, but golden snapshot tests (US1) provide confidence that handler refactoring doesn't break classification
- **US3 (P3)**: No hard dependency. T025 in US4 should account for chat.go changes from T020
- **US4 (P3)**: No hard dependency. Can run in parallel with US2/US3

### Within Each User Story

- US1: T002 → T003 → T004 → T005 (sequential, building test table); T006 parallel with all
- US2: T007 → T008 → T009 → T010 (sequential tests in shared file, TDD RED) → T011-T012 (parallel setup) → T013-T015 (sequential impl, GREEN) → T016-T017 (parallel handler refactor) → T018 (frontend)
- US3: T019 → T020 → T021 (sequential, cascading changes) → T022 (test refactored ChatService)
- US4: T023 (test) → T024 → T025 (parallel repo wrapping) → T026 → T027

### Parallel Opportunities

- T006 can run parallel with T002-T005 (different file: input_validation_test.go vs engine_test.go)
- T007 → T008 → T009 → T010 must run sequentially (all write to same file: case_test.go)
- T011 and T012 can run in parallel (errors.go vs case.go)
- T016 and T017 can run in parallel (different handler files)
- T024 and T025 can run in parallel (different repository files)
- T028, T029, T030 can run in parallel (different linting tools)
- All four user stories can theoretically run in parallel after Phase 1

---

## Parallel Example: User Story 2

```bash
# TDD tests sequentially (RED phase — all write to same case_test.go):
Task: "Write existing method tests in internal/domain/case_test.go"        # T007
Task: "Write CanPublish/CanClose tests in internal/domain/case_test.go"    # T008
Task: "Write ValidateResponseSubmission tests in internal/domain/case_test.go" # T009
Task: "Write CompareWithReference tests in internal/domain/case_test.go"   # T010

# Launch setup tasks in parallel:
Task: "Add error sentinels to internal/domain/errors.go"
Task: "Add ComparisonResult type to internal/domain/case.go"

# Launch handler refactors in parallel (after domain methods exist):
Task: "Refactor internal/api/case_admin_handler.go"
Task: "Refactor internal/api/case_response_handler.go"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify baseline
2. Complete Phase 2: US1 — Golden snapshot tests + chat validation tests
3. **STOP and VALIDATE**: Run `go test -v -run TestClassify ./internal/rules/...`
4. Safety net in place — all future refactoring is protected

### Incremental Delivery

1. US1 → Golden snapshot tests in place (MVP safety net)
2. US2 → Domain behavior ownership + handler refactoring + frontend updates
3. US3 → Classifier service removed, chat service simplified
4. US4 → Error wrapping across all layers
5. Each story adds value without breaking previous stories

### Recommended Sequential Order

With a single developer (most likely scenario):

1. **US1 first** — provides the regression safety net
2. **US3 second** — small, surgical change (3 tasks) that simplifies the codebase
3. **US2 third** — largest story, benefits from US1 safety net and US3 simplification
4. **US4 last** — cross-cutting improvement, benefits from all prior changes being stable

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- TDD approach for US2: write tests first (T007-T010), verify they fail, then implement (T011-T015)
- Golden snapshot approach for US1: capture current engine outputs as expected values
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
