---
phase: 01-bug-fixes
plan: 01
subsystem: ui
tags: [react, typescript, go, i18n, classification, rules-engine]

# Dependency graph
requires: []
provides:
  - AmbiguousReasonKey field on LaugeHansenClassification Go domain type
  - Engine paths populated with AmbiguousReasonKey for all 4 ambiguous-without-possible_types cases
  - ambiguous_reason_key optional field on LaugeHansenClassification TypeScript interface
  - Updated ClassificationResult.tsx rendering ambiguous cases (all) as yellow/orange banner, impossible as red banner above results
  - i18n strings for ambiguousBanner, ambiguousReasons, impossibleBanner, impossibleReasons in en.json and es.json
affects: [02-bug-fixes, 03-service-layer, frontend-classification-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AmbiguousReasonKey pattern: engine populates i18n key string; frontend looks up via t(`results.ambiguousReasons.${key}`)"
    - "Banner-first rendering: impossible/ambiguous banners render above classification cards, never replace them"

key-files:
  created: []
  modified:
    - internal/domain/classification.go
    - internal/rules/engine.go
    - frontend/src/types/domain/fracture.ts
    - frontend/src/components/ClassificationResult.tsx
    - frontend/src/i18n/en.json
    - frontend/src/i18n/es.json

key-decisions:
  - "Ambiguous banner triggers on ambiguous===true regardless of possible_types presence — no silent failures"
  - "Impossible classification shows red banner at top AND continues rendering all available classification cards below"
  - "AmbiguousReasonKey uses i18n key pattern (not raw string) so frontend can display locale-appropriate clinical reason"
  - "Removed getImpossibleReason import from ClassificationResult.tsx (replaced by direct t() lookup with impossibleReasons keys)"

patterns-established:
  - "i18n key pattern for engine reason strings: engine sets snake_case key, frontend resolves via t(`results.ambiguousReasons.${key}`)"
  - "Classification banner placement: impossible banner first, then ambiguous banner, then classification cards"

requirements-completed: [BUG-01, BUG-02]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 1 Plan 1: Surface Ambiguous and Impossible Classification Flags Summary

**AmbiguousReasonKey field on Go domain type and engine (4 paths), TypeScript interface updated, ClassificationResult.tsx shows yellow/orange banner for all ambiguous cases and red banner above results for impossible cases, with i18n strings in English and Spanish**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T21:06:43Z
- **Completed:** 2026-02-26T21:10:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `AmbiguousReasonKey string` field to `LaugeHansenClassification` in Go domain with json tag `ambiguous_reason_key,omitempty`
- Populated `AmbiguousReasonKey` in all 4 engine paths that set `Ambiguous: true` without `PossibleTypes` (1 medial+posterior, 3 lateral+posterior infrasindesmal)
- Fixed frontend: ambiguous banner now triggers on `ambiguous===true` for all cases (previously silently fell through to a regular card when no `possible_types`)
- Fixed frontend: impossible classification no longer uses early-return; shows red `XCircle` banner at top, classification cards still rendered below
- Added full i18n coverage in en.json and es.json for all new banner strings and reason keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AmbiguousReasonKey to domain type and populate in rule engine** - `131c4f4` (feat)
2. **Task 2: Update frontend to render ambiguous and impossible banners per user decision** - `cd14965` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `internal/domain/classification.go` - Added `AmbiguousReasonKey string` field with `json:"ambiguous_reason_key,omitempty"` to `LaugeHansenClassification`
- `internal/rules/engine.go` - Populated `AmbiguousReasonKey` on 4 ambiguous paths: `medial_posterior_extraincisural` (1) and `lateral_posterior_infrasindesmal` (3)
- `frontend/src/types/domain/fracture.ts` - Added `ambiguous_reason_key?: string` to `LaugeHansenClassification` interface
- `frontend/src/components/ClassificationResult.tsx` - Fixed ambiguous/impossible rendering; added `XCircle` import; removed unused `getImpossibleReason` import
- `frontend/src/i18n/en.json` - Added `ambiguousBanner`, `ambiguousReasons`, `impossibleBanner`, `impossibleReasons` keys under `results`
- `frontend/src/i18n/es.json` - Added matching Spanish translations for all new keys

## Decisions Made
- Triggered ambiguous banner on `ambiguous===true` (not `possible_types.length > 0`) to catch all ambiguous cases
- Used direct `t()` lookup with template key (`results.impossibleReasons.${key}`) instead of `getImpossibleReason` helper for impossible banner
- Kept `getImpossibleReason` function in `utils/classificationTranslations.ts` (not deleted, just no longer imported in ClassificationResult.tsx)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `getImpossibleReason` import causing lint error**
- **Found during:** Task 2 (Update frontend)
- **Issue:** After replacing early-return impossible block with inline i18n banner, `getImpossibleReason` became unused. ESLint `@typescript-eslint/no-unused-vars` error blocked verification.
- **Fix:** Removed `getImpossibleReason` from the import statement in `ClassificationResult.tsx`. Function definition stays in utils (not deleted).
- **Files modified:** `frontend/src/components/ClassificationResult.tsx`
- **Verification:** `npm run lint` passes with 0 errors
- **Committed in:** `cd14965` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - unused import lint error)
**Impact on plan:** Necessary for lint verification to pass. No scope creep — simply cleaned up import made obsolete by the planned impossible banner change.

## Issues Encountered
- Pre-existing build error in `cmd/anklyze-apiserver/main.go` (missing `bool` argument to `api.SetupRoutes`) unrelated to this plan's changes. Scoped packages (`./internal/domain/...`, `./internal/rules/...`) build cleanly. Logged for deferred attention.

## Next Phase Readiness
- Backend domain type and engine ready — API responses now include `ambiguous_reason_key` in JSON
- Frontend renders correct banners for all ambiguous and impossible classification paths
- i18n coverage complete in both English and Spanish
- Phase 1 Plan 2 can proceed

---
*Phase: 01-bug-fixes*
*Completed: 2026-02-26*
