# Research: Backend Architecture Improvements

**Date**: 2026-02-20
**Branch**: `001-backend-arch-improvements`

## 1. Golden Snapshot Test Strategy for Rules Engine

**Decision**: Table-driven tests using a golden snapshot map of all
`FractureInput` → `ClassificationResult` pairs.

**Rationale**: The rules engine has 7 top-level classification paths with
nested decision branches totaling ~40 unique input combinations. A golden
snapshot captured from the current engine output provides immediate
regression safety without requiring independent clinical verification.

**Alternatives considered**:
- *Independent literature verification*: Higher correctness confidence but
  significantly more effort and requires clinical domain expertise to
  validate each output. Deferred to a future audit task.
- *Property-based / fuzz testing*: Useful for finding panics but cannot
  verify classification correctness. Supplementary, not primary.

**Implementation approach**:
- Create a `TestClassify_GoldenSnapshot` test function with a
  `[]struct{ name, input, expected }` table.
- Cover all 7 `InvolvedMalleoli` branches plus sub-branches:
  - Posterior only: 2 variants (CT scan yes/no)
  - Medial only: 2 variants (oblique/transverse morphology)
  - Lateral only: 3 × fibular level × morphology × suprasindesmal type
  - Medial + posterior: 2 variants (CT scan)
  - Lateral + posterior: infrasindesmal (impossible), transindesmal, suprasindesmal
  - Lateral + medial: SA shortcut, suprasindesmal, transindesmal (3 morphologies)
  - Trimaleolar: suprasindesmal, transindesmal (3 morphologies), infrasindesmal (impossible)
- Each test case asserts: FractureType, DanisWeber, LaugeHansen, AOOTA,
  Bartonicek, Impossible flag, and ImpossibleKey.
- Default/none_selected branch also covered.

**Estimated test case count**: ~35-45 test cases for full branch coverage.

## 2. Domain Method Design for Tell Don't Ask

**Decision**: Add behavioral methods to the `Case` domain model that
encapsulate business decisions currently scattered across handlers.

**Rationale**: Handlers in `case_response_handler.go` and
`case_admin_handler.go` contain ~60 lines of conditional business logic
(access checks, state validation, duplicate-response enforcement) that
should live in the domain. This violates Constitution Principle IV (Tell
Don't Ask) and makes logic harder to test in isolation.

**New methods to add to `Case`**:

| Method | Signature | Replaces Handler Logic |
| ------ | --------- | ---------------------- |
| `CanPublish` | `(hasImages bool) error` | admin_handler:265-275 |
| `CanClose` | `() error` | admin_handler:307-310 |
| `ValidateResponseSubmission` | `(userID uuid.UUID, isAdmin, hasResponded bool) error` | response_handler:67-131 |
| `CompareWithReference` | `(userResult *ClassificationResult) *ComparisonResult` | response_handler:224-250 |
| `IsPublished` | `() bool` | response_handler:354-359 |

**Design decisions**:
- Methods return `error` (domain errors) rather than `bool` to carry
  the reason for rejection. Handlers translate domain errors to HTTP.
- `ValidateResponseSubmission` consolidates 4 separate handler checks
  (admin bypass, case state, study membership, duplicate response) into
  one domain method. The handler passes pre-fetched booleans to avoid
  giving the domain model repository awareness.
- Existing methods (`CanBeEdited`, `CanAcceptResponses`, `IsExpired`)
  are preserved and composed internally.

**Alternatives considered**:
- *Service-level validation*: Would create a CaseService that orchestrates
  checks. Rejected because the logic is purely about Case state — no
  cross-entity orchestration needed. Adding a service would violate
  Principle VI (Pragmatic Architecture).
- *Middleware-based access control*: Would centralize access checks.
  Rejected because access rules are case-specific (study membership,
  response limits) and don't generalize across endpoints.

## 3. Classifier Service Removal

**Decision**: Delete `internal/service/classifier.go` entirely. Inject
`*rules.Engine` directly into `chatService`.

**Rationale**: The classifier service is a 27-line passthrough with a
single method that calls `engine.Classify(input)` with no additional
logic. It violates Principle V (Deep Modules) — the interface adds
abstraction without hiding complexity.

**Impact analysis**:
- **Callers**: Only `chatService` uses `ClassifierService`.
- **main.go**: Remove `service.NewClassifierService(ruleEngine)` line.
  Pass `ruleEngine` directly to `service.NewChatService()`.
- **chat.go**: Change `classifier ClassifierService` field to
  `engine *rules.Engine`. Change `s.classifier.Classify(input)` to
  `s.engine.Classify(input)`.
- **Tests**: No existing tests to update (classifier has none).

**Alternatives considered**:
- *Enrich with logging/auditing*: Would add value but the chat service
  already logs. Classification auditing belongs at a higher level (audit
  repository, which already exists). Not justified today.

## 4. Error Wrapping Strategy

**Decision**: Add `fmt.Errorf("method_name: %w", err)` wrapping at every
layer boundary where errors cross packages.

**Rationale**: Current error paths often `slog.Error()` and return a bare
error or a new error without wrapping. This loses the call chain, making
production debugging harder. Constitution Principle III (Idiomatic Go)
mandates `fmt.Errorf("...: %w", err)`.

**Scope**:
- Repository layer (`internal/repository/postgres/`): Wrap all returned
  errors with the repository method name.
- Service layer: Wrap errors received from repositories or external
  clients before returning to handlers.
- Handler layer: Translate domain errors to HTTP; no wrapping needed
  (errors terminate here).

**Pattern**:
```go
// Repository
func (r *caseRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Case, error) {
    var c domain.Case
    if err := r.db.WithContext(ctx).First(&c, "id = ?", id).Error; err != nil {
        return nil, fmt.Errorf("get case by id: %w", err)
    }
    return &c, nil
}
```

**Alternatives considered**:
- *Custom error types with stack traces*: Libraries like `pkg/errors`.
  Rejected — Go's `fmt.Errorf` with `%w` is idiomatic and sufficient.
  The constitution mandates stdlib preference.
- *Structured error fields*: Adding metadata (request ID, entity ID).
  Deferred — structured logging (`slog`) already captures request
  context. Error wrapping provides the method chain.

## 5. Chat Service Confidence Threshold

**Decision**: Extract the hardcoded `0.7` confidence threshold to a
configurable constant or constructor parameter.

**Rationale**: The chat service hardcodes `extraction.Confidence < 0.7`
at line 78. Per spec US3 acceptance scenario 2, confidence thresholds
should be "configurable policy rather than hardcoded values."

**Implementation**: Add a `confidenceThreshold float64` field to
`chatService` struct, set via `NewChatService()` constructor parameter.
Default to `0.7` for backward compatibility.

## 6. Frontend API Response Changes

**Decision**: API response shapes may change during this refactoring.
Frontend updates will be made in the same branch.

**Rationale**: Clarification session confirmed breaking changes are
acceptable. Primary changes expected:
- Error response bodies may include richer domain error codes.
- Handler refactoring may standardize error response format.
- No changes to classification result shapes (those are domain types).

**Scope**: Changes are limited to error responses. Success response
shapes for classification, case CRUD, and study operations remain stable.
