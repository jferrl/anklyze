---
phase: 01-bug-fixes
plan: 02
subsystem: case-state-machine
tags: [state-machine, tests, frontend, toast, i18n, error-handling]
dependency_graph:
  requires: []
  provides: [BUG-03]
  affects: [frontend-admin-pages, domain-tests]
tech_stack:
  added: []
  patterns: [toast-error-feedback, onError-mutation-callback, InputValidationError-instanceof-check]
key_files:
  created: []
  modified:
    - frontend/src/pages/admin/AdminCasesPage.tsx
    - frontend/src/pages/admin/CaseEditorPage.tsx
    - frontend/src/i18n/en.json
    - frontend/src/i18n/es.json
decisions:
  - Use instanceof InputValidationError with code check rather than generic error.code cast — matches existing error handling pattern in the project
  - Reuse existing INVALID_STATE_TRANSITION uppercase key and add new camelCase keys (invalidStateTransition, publishFailed, closeFailed) per plan spec
  - Close publish dialog on error in CaseEditorPage to avoid showing stale dialog state after a failed mutation
metrics:
  duration: 2 minutes
  completed: 2026-02-26
  tasks_completed: 2
  files_modified: 4
---

# Phase 01 Plan 02: Case State Machine Error Handling Summary

Frontend toast feedback for invalid publish/close state transitions with verified exhaustive unit test coverage across all 4 invalid paths.

## Objective

Confirm complete test coverage for all invalid case state transitions and add frontend toast notifications when publish/close mutations fail with INVALID_STATE_TRANSITION.

## Tasks Completed

### Task 1: Verify and complete state transition test coverage

**Status:** Verified — no modifications needed.

Audited `internal/domain/case_test.go`. All 4 required invalid transition paths were already present and passing:

| Path | Test Case | Result |
|------|-----------|--------|
| closed -> publish | "closed case returns ErrInvalidStateTransition" | PASS |
| published -> publish | "published case returns ErrInvalidStateTransition" | PASS |
| draft -> close | "draft case returns ErrInvalidStateTransition" | PASS |
| closed -> close | "closed case returns ErrInvalidStateTransition" | PASS |

No Reopen() or Unpublish() methods exist — confirming the state machine is closed: draft -> published -> closed with no backward transitions.

**Verification command:** `go test ./internal/domain/... -v -run "TestCase_CanPublish|TestCase_CanClose" -count=1` — PASS

### Task 2: Add onError callbacks with toast notifications for publish/close mutations

**Commit:** cb2d557

Added `onError` callbacks to three mutations across two admin pages:

**AdminCasesPage.tsx:**
- `publishMutation.onError`: shows `t('errors.invalidStateTransition')` for INVALID_STATE_TRANSITION, `t('errors.publishFailed')` for other errors
- `closeMutation.onError`: shows `t('errors.invalidStateTransition')` for INVALID_STATE_TRANSITION, `t('errors.closeFailed')` for other errors

**CaseEditorPage.tsx:**
- `publishMutation.onError`: same pattern as above, plus closes the publish dialog on error

**Error code extraction:** Uses `error instanceof InputValidationError && error.code === 'INVALID_STATE_TRANSITION'` — consistent with existing project patterns in `errorHandling.ts` where HTTP 400 with INVALID_STATE_TRANSITION code is thrown as `InputValidationError`.

**i18n additions** (en.json + es.json):
- `errors.invalidStateTransition` — "This action is not allowed in the current case status. Please refresh and try again."
- `errors.publishFailed` — "Failed to publish case. Please try again."
- `errors.closeFailed` — "Failed to close case. Please try again."

## Deviations from Plan

### Task 1 — Test coverage already complete

**Found during:** Task 1 audit
**Issue:** Plan assumed some test cases may be missing; all 4 required invalid transition paths were already implemented and passing.
**Action:** No modifications made to test file — verified and passed through.

### Pre-existing lint errors (out of scope)

**Found during:** Task 2 lint verification
**File:** `frontend/src/components/ClassificationResult.tsx`
**Issues:** `XCircle` imported but unused, `getImpossibleReason` defined but unused
**Action:** Logged to deferred items — pre-existing, unrelated to current task scope.

## Decisions Made

1. **InputValidationError instanceof check** — Uses `error instanceof InputValidationError && error.code === 'INVALID_STATE_TRANSITION'` instead of a generic cast. This is consistent with the existing error handling pattern in `useChat.ts` and other service layers.

2. **Close dialog on error** — In `CaseEditorPage.tsx`, added `setShowPublishDialog(false)` in the `onError` callback so the publish confirmation dialog is dismissed when the mutation fails, preventing stale dialog state.

3. **Separate fallback messages** — Added distinct `publishFailed` and `closeFailed` keys rather than a single generic `operationFailed` key, providing clearer actionable feedback to users.

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Domain tests | `go test ./internal/domain/... -v -run "TestCase_CanPublish\|TestCase_CanClose"` | PASS |
| TypeScript | `cd frontend && npx tsc --noEmit` | PASS |
| Lint (changed files) | `eslint src/pages/admin/AdminCasesPage.tsx src/pages/admin/CaseEditorPage.tsx` | PASS (0 errors) |
| onError count AdminCasesPage | `grep -c "onError" AdminCasesPage.tsx` | 5 (2 mutations) |
| onError count CaseEditorPage | `grep -c "onError" CaseEditorPage.tsx` | 5 (1 mutation) |
| i18n keys present | `grep "invalidStateTransition" en.json es.json` | Present in both |

## Self-Check: PASSED

All modified files exist. Commit cb2d557 verified in git log.
