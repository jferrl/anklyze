# Data Model Changes: Backend Architecture Improvements

**Date**: 2026-02-20
**Branch**: `001-backend-arch-improvements`

## Overview

This feature does NOT introduce new database entities or schema changes.
All changes are behavioral — adding methods to existing domain models and
restructuring how existing types are consumed. The database schema remains
unchanged.

## Domain Model: Case (internal/domain/case.go)

### Existing Behavioral Methods (preserved)

| Method | Returns | Logic |
| ------ | ------- | ----- |
| `CanBeEdited()` | `bool` | `Status == CaseStatusDraft` |
| `CanBeDeleted()` | `bool` | Always `true` |
| `CanAcceptResponses()` | `bool` | Published + not expired |
| `IsExpired()` | `bool` | Deadline != nil && now > deadline |
| `BelongsToStudy()` | `bool` | StudyID != nil |
| `SetStudy(id, order)` | void | Assigns study |
| `RemoveFromStudy()` | void | Clears study |
| `GetReferenceClassification()` | `(*ClassificationResult, error)` | JSON unmarshal |
| `SetReferenceClassification()` | `error` | JSON marshal |
| `HasReferenceClassification()` | `bool` | Null check |
| `GetReferenceInput()` | `(*FractureInput, error)` | JSON unmarshal |
| `SetReferenceInput()` | `error` | JSON marshal |
| `HasReferenceInput()` | `bool` | Null check |

### New Behavioral Methods

#### `CanPublish(hasImages bool) error`

Validates whether the case can transition from draft to published.

**Rules**:
- Status MUST be `CaseStatusDraft` → else return `ErrInvalidStateTransition`
- `hasImages` MUST be `true` → else return `ErrMissingImages`

**Replaces**: `case_admin_handler.go:265-275`

#### `CanClose() error`

Validates whether the case can transition from published to closed.

**Rules**:
- Status MUST be `CaseStatusPublished` → else return `ErrInvalidStateTransition`

**Replaces**: `case_admin_handler.go:307-310`

#### `ValidateResponseSubmission(userID uuid.UUID, isAdmin, hasResponded bool) error`

Consolidated eligibility check for response submission.

**Rules** (evaluated in order, short-circuit on first failure):
1. If `isAdmin` → skip access and duplicate checks, proceed.
2. Case MUST accept responses (`CanAcceptResponses()`) → else:
   - If expired → return `ErrDeadlinePassed`
   - Else → return `ErrCaseNotAcceptingResponses`
3. If `!AllowMultipleResponses` AND `hasResponded` → return `ErrAlreadyResponded`

**Note**: Study membership access is NOT checked here because it requires
repository lookups. The handler pre-fetches `hasResponded` and passes it
as a boolean to keep the domain model repository-free.

**Replaces**: `case_response_handler.go:67-131` (4 separate conditionals)

#### `CompareWithReference(userResult *ClassificationResult) *ComparisonResult`

Compares a user's classification against the case's reference
classification.

**Returns**: `ComparisonResult` struct with per-system match booleans.

**Replaces**: `case_response_handler.go:224-250`

#### `IsPublished() bool`

Simple state check.

**Rules**: `Status == CaseStatusPublished`

**Replaces**: `case_response_handler.go:354-359`

### New Error Sentinels

Added to `internal/domain/errors.go`:

| Error | Value | Used By |
| ----- | ----- | ------- |
| `ErrInvalidStateTransition` | "invalid state transition" | `CanPublish`, `CanClose` |
| `ErrMissingImages` | "case must have at least one image" | `CanPublish` |
| `ErrDeadlinePassed` | "case deadline has passed" | `ValidateResponseSubmission` |
| `ErrCaseNotAcceptingResponses` | "case is not accepting responses" | `ValidateResponseSubmission` |
| `ErrAlreadyResponded` | "user has already responded" | `ValidateResponseSubmission` |

### New Types

#### `ComparisonResult`

```
ComparisonResult {
    DanisWeberMatch   bool
    LaugeHansenMatch  bool
    AOOTAMatch        bool
    BartonicekMatch   bool
    OverallAccuracy   float64  // fraction of matching systems
}
```

## Domain Model: ChatService (internal/service/chat.go)

### Structural Change

Replace `classifier ClassifierService` field with `engine *rules.Engine`.

**Before**:
```
chatService {
    llmClient  *llm.Client
    classifier ClassifierService
}
```

**After**:
```
chatService {
    llmClient            *llm.Client
    engine               *rules.Engine
    confidenceThreshold  float64
}
```

### Constructor Change

**Before**: `NewChatService(llmClient, classifier)`
**After**: `NewChatService(llmClient, engine, confidenceThreshold)`

Default `confidenceThreshold` to `0.7` at the call site in `main.go`.

## Deleted Types

| Type | File | Reason |
| ---- | ---- | ------ |
| `ClassifierService` (interface) | `internal/service/classifier.go` | Passthrough removed |
| `classifierService` (struct) | `internal/service/classifier.go` | Passthrough removed |
| `NewClassifierService` (func) | `internal/service/classifier.go` | Passthrough removed |

## State Transitions (unchanged)

```
Case: Draft → Published → Closed
                ↑ validated by CanPublish(hasImages)
                           ↑ validated by CanClose()
```

No new states. No new entities. No schema migrations required.
