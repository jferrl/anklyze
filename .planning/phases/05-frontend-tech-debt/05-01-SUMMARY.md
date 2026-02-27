---
phase: 05-frontend-tech-debt
plan: 01
subsystem: ui
tags: [react, typescript, fetch, exponential-backoff, retry, refactor, hooks, components]

# Dependency graph
requires: []
provides:
  - "apiClient with exponential backoff retry for GET/PUT/DELETE (3 retries, base 300ms, cap 10s)"
  - "useCaseEditorForm hook with render-time sync pattern for existingCase"
  - "useCaseEditorMutations hook encapsulating all 5 case mutations"
  - "CaseImagesStep standalone component with xray/tac dropzones and image grids"
  - "CaseEditorStepper standalone stepper navigation component"
  - "CaseEditorPage orchestrator under 300 lines (263 lines)"
affects: [future-frontend-phases, case-editor-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exponential backoff with full jitter for idempotent HTTP methods only"
    - "Render-time sync pattern (not useEffect) for derived form state from server data"
    - "Callback injection pattern for mutations (getPendingUploads, clearPendingUploads)"
    - "Colocated case-editor/ directory: orchestrator + hooks + subcomponents"

key-files:
  created:
    - frontend/src/pages/admin/case-editor/CaseEditorPage.tsx
    - frontend/src/pages/admin/case-editor/CaseEditorStepper.tsx
    - frontend/src/pages/admin/case-editor/CaseImagesStep.tsx
    - frontend/src/pages/admin/case-editor/useCaseEditorForm.ts
    - frontend/src/pages/admin/case-editor/useCaseEditorMutations.ts
  modified:
    - frontend/src/services/core/apiClient.ts
    - frontend/src/pages/admin/CaseEditorPage.tsx

key-decisions:
  - "RETRYABLE_METHODS = Set(['GET', 'PUT', 'DELETE']) — POST excluded from retry to preserve non-idempotent semantics"
  - "getAuthHeaders called fresh on each retry attempt to support token refresh between retries"
  - "Render-time sync pattern preserved exactly (no useEffect conversion) — prevents form reset on re-render"
  - "CaseEditorStepper extracted to its own file to bring orchestrator under 300 lines (263 lines)"
  - "useCaseEditorMutations receives getPendingUploads/clearPendingUploads callbacks instead of the state directly — avoids stale closure in onSuccess handlers"
  - "Old CaseEditorPage.tsx reduced to single re-export for backward compatibility with existing route imports"

patterns-established:
  - "Retry logic: only RETRYABLE_METHODS (idempotent) retried; non-retryable status codes propagate immediately"
  - "Hooks colocated with their page in case-editor/ directory pattern"

requirements-completed: [ARCH-03, DEBT-06]

# Metrics
duration: 12min
completed: 2026-02-27
---

# Phase 05 Plan 01: Frontend Tech Debt Summary

**Exponential backoff retry added to apiClient (GET/PUT/DELETE only, 3 retries, base 300ms with full jitter); CaseEditorPage (754 lines) decomposed into useCaseEditorForm, useCaseEditorMutations, CaseImagesStep, CaseEditorStepper, and a 263-line orchestrator**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-27T14:00:00Z
- **Completed:** 2026-02-27T14:12:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- apiRequest now retries GET/PUT/DELETE up to 3 times with exponential backoff (base 300ms, cap 10s, full jitter) on 429/5xx; POST is never retried; non-retryable status codes (400, 401, 403, 404) propagate immediately
- CaseEditorPage decomposed from 754 lines into 5 focused modules in `frontend/src/pages/admin/case-editor/`
- useCaseEditorForm preserves the render-time sync pattern (not useEffect) for existingCase data
- useCaseEditorMutations encapsulates all 5 mutations with callback injection for pendingUploads access
- TypeScript and lint pass cleanly (0 errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add exponential backoff retry to apiClient** - `9a75cbd` (feat)
2. **Task 2: Decompose CaseEditorPage into colocated modules** - `2ee1a3b` (feat)

**Plan metadata:** (to be added in final commit)

## Files Created/Modified
- `frontend/src/services/core/apiClient.ts` - Added RETRYABLE_METHODS, RETRYABLE_STATUSES, sleep helper, retry loop with exponential backoff
- `frontend/src/pages/admin/case-editor/CaseEditorPage.tsx` - New 263-line orchestrator wiring hooks and subcomponents
- `frontend/src/pages/admin/case-editor/CaseEditorStepper.tsx` - Standalone stepper navigation component
- `frontend/src/pages/admin/case-editor/CaseImagesStep.tsx` - Xray/tac dropzones + image grids + step navigation
- `frontend/src/pages/admin/case-editor/useCaseEditorForm.ts` - Form state hook with render-time sync
- `frontend/src/pages/admin/case-editor/useCaseEditorMutations.ts` - All 5 mutations (create/update/uploadImage/deleteImage/publish)
- `frontend/src/pages/admin/CaseEditorPage.tsx` - Reduced to single re-export for backward compatibility

## Decisions Made
- RETRYABLE_METHODS = `Set(['GET', 'PUT', 'DELETE'])` — POST excluded to preserve non-idempotent semantics
- `getAuthHeaders` called fresh on each retry attempt — supports token refresh between retries
- Render-time sync pattern preserved exactly (no useEffect) — prevents form reset on re-render
- `CaseEditorStepper` extracted to its own file to keep orchestrator under 300 lines (263 lines)
- `useCaseEditorMutations` receives `getPendingUploads`/`clearPendingUploads` callbacks instead of state directly — avoids stale closure in onSuccess handlers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invalid useCallback pattern in CaseImagesStep**
- **Found during:** Task 2 (lint verification)
- **Issue:** `useCallback(onDrop('xray'), [onDrop])` calls the function immediately rather than wrapping it — ESLint reported "Expected first argument to be an inline function expression"
- **Fix:** Removed the incorrect `useCallback` wrappers; passed `onDrop('xray')` and `onDrop('tac')` directly to `useDropzone` `onDrop` config
- **Files modified:** `frontend/src/pages/admin/case-editor/CaseImagesStep.tsx`
- **Verification:** Lint passes with 0 errors
- **Committed in:** `2ee1a3b` (Task 2 commit)

**2. [Rule 1 - Bug] Removed unused imports and unused `navigate` in orchestrator**
- **Found during:** Task 2 (lint verification)
- **Issue:** `ChevronRight`, `Card`, `CardContent`, and `navigate` were imported/declared but unused — ESLint reported `@typescript-eslint/no-unused-vars`
- **Fix:** Removed unused lucide-react imports and removed `const navigate = useNavigate()` (navigation handled by mutations hook)
- **Files modified:** `frontend/src/pages/admin/case-editor/CaseEditorPage.tsx`
- **Verification:** Lint passes with 0 errors
- **Committed in:** `2ee1a3b` (Task 2 commit)

**3. [Rule 2 - Missing Critical] Extracted CaseEditorStepper to meet 300-line limit**
- **Found during:** Task 2 (line count verification)
- **Issue:** After initial decomposition, orchestrator was 432 lines (over 300-line requirement). Inline `CaseEditorStepper` and `LoadingSpinner` components added 170 lines.
- **Fix:** Extracted `CaseEditorStepper` to its own file `CaseEditorStepper.tsx`. Combined loading state inline (8 lines). Orchestrator reduced to 263 lines.
- **Files modified:** `frontend/src/pages/admin/case-editor/CaseEditorStepper.tsx` (created)
- **Verification:** `wc -l CaseEditorPage.tsx` = 263
- **Committed in:** `2ee1a3b` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 2 correctness)
**Impact on plan:** All auto-fixes necessary for lint compliance and correctness. No scope creep.

## Issues Encountered
None beyond what was documented as deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Retry logic is live for all idempotent API calls — transient network failures no longer immediately fail user actions
- CaseEditorPage is now maintainable; each module has a single responsibility
- Future case-editor features can be added to the colocated `case-editor/` directory
- No blockers

---
*Phase: 05-frontend-tech-debt*
*Completed: 2026-02-27*
