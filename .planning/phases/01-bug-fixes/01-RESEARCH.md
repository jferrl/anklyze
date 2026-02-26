# Phase 1: Bug Fixes - Research

**Researched:** 2026-02-26
**Domain:** Go API correctness, React/TypeScript frontend UI states, HTTP error contracts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Classification warnings UX:** Ambiguous → yellow/orange warning banner above results. Impossible → same banner pattern but red. Both banners include a brief clinical reason explaining WHY the classification is ambiguous or impossible. Warnings appear only in the direct classification UI, NOT in the chat flow.

### Claude's Discretion

- State transition error handling: how to present invalid transition errors in the UI (toast, inline, button disabling)
- Degraded mode indication: how to communicate database unavailability (admin-facing banner, API headers, health endpoint)
- API error contracts: exact response structure for classification flags and state transition errors
- Warning banner component design: exact styling, placement relative to existing result components
- Whether to disable UI actions that would trigger invalid transitions vs show errors after attempt

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUG-01 | Ambiguous classifications clearly indicated in API responses and frontend UI | Engine already sets `Ambiguous: true` + `PossibleTypes` on `LaugeHansenClassification`; API already serializes it; frontend ClassificationResult.tsx already renders the amber Alert for ambiguous with possible_types. The bug is that `ambiguous: true` without `possible_types` (e.g., `classifyMedialPosterior` line 193, `classifyLateralPosterior` lines 224, 235, 238) is rendered as a regular card, not as a warning. |
| BUG-02 | Impossible classifications clearly indicated in API responses and frontend UI | Engine sets `Impossible: true` + `ImpossibleKey`; API serializes it; frontend already handles it in ClassificationResult.tsx (destructive Alert). The gap: impossible cases show results title but no explicit "error state" banner — they stop rendering but don't prominently communicate severity to the clinical user. User decision: red banner above results (same pattern as BUG-01). |
| BUG-03 | Case state transitions validated in service layer with proper error responses | Domain already has `CanPublish()` / `CanClose()` / `ErrInvalidStateTransition` sentinel. Handlers call `HandleError()` which maps the sentinel to HTTP 400 + `INVALID_STATE_TRANSITION` code. The bug: `CloseCase` validates correctly, `PublishCase` validates correctly, but no service layer wraps both — validation sits in handlers directly calling domain methods. BUG-03 is really about: (a) whether ALL invalid transitions are caught (e.g., re-publishing a closed case, re-closing an already-closed case), and (b) whether the error response is machine-readable. |
| BUG-04 | Database connection fallback explicitly communicates degraded mode | main.go silently falls back to NoOp repos with a `slog.Warn`. The `/health` endpoint returns `{"status":"ok"}` regardless. Callers cannot distinguish healthy from degraded. Fix: health endpoint must include a `db` field indicating status. |
</phase_requirements>

---

## Summary

This phase targets four correctness bugs. All four bugs involve cases where the backend already produces the correct data but either the API doesn't expose it clearly enough, the frontend doesn't render the right state, or the health/error contract doesn't distinguish degraded from healthy.

**BUG-01 and BUG-02 share the same fix pattern:** The classification `ClassificationResult` struct already has `Ambiguous` (on `LaugeHansenClassification`) and `Impossible`/`ImpossibleKey` at the top level. The rule engine already sets these flags. The API already serializes them. The frontend already handles the `ambiguous` + `possible_types` case. The gaps are: (1) `ambiguous: true` without `possible_types` (happens in 4 paths in engine.go) is rendered as a plain card, not a warning; (2) the impossible case already renders an Alert but the user decision is to keep results visible below a prominent red banner rather than replacing them entirely.

**BUG-03:** The `CanPublish()` / `CanClose()` state machine and `HandleError()` mapping already exist. The risk is missing coverage of all transition paths — specifically attempting to publish an already-published or closed case, and attempting to close a draft case. Both `CanPublish` and `CanClose` return `ErrInvalidStateTransition` for invalid source states, and `HandleError` maps that to HTTP 400 with `INVALID_STATE_TRANSITION` code. The fix may be confirming all paths are covered and ensuring the UI can act on the structured error code.

**BUG-04:** The simplest structural fix. `/health` must return a `db` field (`"healthy"` vs `"degraded"`) so callers (monitoring, frontend, other services) can distinguish modes.

**Primary recommendation:** Audit each bug's actual gap against the existing code, then make the minimum targeted changes to close each gap without refactoring other concerns.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go `log/slog` | stdlib | Structured logging | Already in use throughout backend |
| Gin | v1 | HTTP routing and JSON responses | Project standard |
| React + TypeScript | 19 + strict | Frontend | Project standard |
| shadcn/ui Alert | existing | Warning/error banners | Already used in ClassificationResult.tsx for ambiguous and impossible; consistent with design system |
| react-i18next | existing | i18n for banner strings | All user-facing strings go through i18n keys in `en.json` / `es.json` |
| Tailwind CSS v4 | existing | Styling for banner variants | Project standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner (toast) | existing | Admin state transition error feedback | Claude's discretion — for inline state transition errors in admin UI |
| lucide-react | existing | Icons for banners (AlertTriangle, XCircle) | Same icon library used in ClassificationResult.tsx |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Alert | Custom div | Alert already exists with variant="destructive" for red; simpler to reuse |
| Toast for state transition errors | Inline alert near button | Toasts are transient; inline errors persist until resolved. Either is valid — Claude's discretion. |
| Separate degraded health endpoint | Headers on all responses | Health endpoint approach is clean, observable, and standard |

**Installation:** No new packages required. All dependencies already in use.

---

## Architecture Patterns

### Existing Structure (relevant to this phase)

```
internal/
├── domain/
│   ├── classification.go      # ClassificationResult, LaugeHansenClassification (Ambiguous field)
│   ├── errors.go              # ErrInvalidStateTransition, ErrCodeInvalidStateTransition
│   └── case.go                # CanPublish(), CanClose() state machine
├── rules/
│   └── engine.go              # Sets Ambiguous:true, Impossible:true in results
├── api/
│   ├── handler.go             # ClassifyFracture → returns result as-is
│   ├── errors.go              # HandleError → maps domain errors to HTTP + code
│   └── case_admin_handler.go  # PublishCase, CloseCase handlers
frontend/src/
├── components/
│   └── ClassificationResult.tsx  # Renders ambiguous (Alert) and impossible (Alert)
├── features/fracture-classification/components/
│   └── ResultsPanel.tsx       # Wraps ClassificationResult
├── i18n/
│   ├── en.json                # results.*, errors.*
│   └── es.json                # Spanish translations
└── types/domain/
    └── fracture.ts            # ClassificationResult type (has ambiguous?, impossible?)
```

### Pattern 1: Ambiguous Without possible_types (BUG-01 gap)

**What:** The engine returns `ambiguous: true` with an empty `possible_types` array (or nil) when the fracture mechanism is unclear but no specific alternative types can be listed. This currently renders as a regular card (because the conditional in `ClassificationResult.tsx` at line 110 requires `possible_types.length > 0`).

**Affected engine paths:**
- `classifyMedialPosterior` line 193: `LaugeHansen: &domain.LaugeHansenClassification{Ambiguous: true}` — no PossibleTypes
- `classifyLateralPosterior` infrasindesmal paths (lines 224, 235, 238): `Ambiguous: true` — no PossibleTypes

**Fix:** The frontend condition must also trigger the amber warning banner when `ambiguous === true` even if `possible_types` is empty/absent. The banner should display a clinical reason string — this requires adding a reason field to the API response or using the `fracture_type` context to derive the reason string client-side via i18n keys.

**Example (current frontend logic):**
```typescript
// Current — only shows amber banner if possible_types.length > 0
if (result.lauge_hansen.ambiguous && result.lauge_hansen.possible_types && result.lauge_hansen.possible_types.length > 0) {
  // render amber Alert
} else {
  // render normal Card — WRONG for ambiguous:true without possible_types
}
```

**Fixed logic:**
```typescript
// Show amber banner for ANY ambiguous result
if (result.lauge_hansen.ambiguous) {
  // render amber Alert — always, regardless of possible_types presence
}
```

**Clinical reason string:** The user decision says banners must include "a brief clinical reason explaining WHY." The engine knows the reason (e.g., infrasindesmal lateral + posterior → AO unclassifiable). This reason can be derived from the `fracture_type` + context already in the result. Add an i18n key mapping approach: a `ambiguous_reason_key` field on the classification or derive from the existing `fracture_type`. The simplest approach is to add an optional `ambiguous_reason_key` field to `LaugeHansenClassification` in both the Go domain type and the TypeScript type, populated by the engine.

### Pattern 2: Impossible Case Display (BUG-02 gap)

**What:** Currently, `ClassificationResult.tsx` renders an early-return `Alert` for impossible cases (lines 64–81), showing the `results.notPossible` text and the impossible reason. The user decision is: red banner, results still shown below.

**Current behavior:** If `result.impossible === true`, the component returns early with only the alert. Other classification fields (DanisWeber, LaugeHansen, etc.) are not rendered.

**Required behavior:** Red banner displayed prominently above the result cards, with all non-impossible classification fields still shown below.

**Fix:** Remove the early-return for impossible cases. Instead, render a red `Alert` (variant="destructive") at the top of the results section, then continue to render whatever classification fields are present.

**Example pattern:**
```tsx
// Source: existing ClassificationResult.tsx pattern, adapted
{result.impossible && (
  <Alert variant="destructive" className="question-card-enter">
    <XCircle className="h-5 w-5" />
    <AlertTitle>{t('results.impossibleBanner.title')}</AlertTitle>
    <AlertDescription>
      {result.impossible_key && getImpossibleReason(t, result.impossible_key)}
    </AlertDescription>
  </Alert>
)}
// Then continue rendering DanisWeber, LaugeHansen, etc. as usual
```

### Pattern 3: State Transition Validation Coverage (BUG-03)

**What:** `CanPublish()` and `CanClose()` in `domain/case.go` already return `ErrInvalidStateTransition` for invalid source states. `HandleError()` already maps this to HTTP 400 with code `INVALID_STATE_TRANSITION`. The issue is verifying all paths are covered and the frontend can act on the structured code.

**Existing state machine:**
```go
// CanPublish — only valid from draft
func (c *Case) CanPublish(hasImages bool) error {
    if c.Status != CaseStatusDraft {
        return ErrInvalidStateTransition  // covers: published→publish, closed→publish
    }
    ...
}

// CanClose — only valid from published
func (c *Case) CanClose() error {
    if c.Status != CaseStatusPublished {
        return ErrInvalidStateTransition  // covers: draft→close, closed→close
    }
    return nil
}
```

**Verified coverage:** All invalid transitions return the sentinel error. The API already returns a structured error with code `INVALID_STATE_TRANSITION`. The fix for BUG-03 is likely: (a) adding unit tests proving each invalid transition path, and (b) ensuring the admin frontend shows a meaningful error when receiving this code rather than silently failing.

**Frontend approach (Claude's discretion):** The simplest pattern is to show a toast with the translated error message when the mutation returns an error with code `INVALID_STATE_TRANSITION`. This is consistent with how other admin actions handle errors.

### Pattern 4: Degraded Mode Health Endpoint (BUG-04)

**What:** `/health` currently returns `{"status": "ok"}` with no database indicator. When the DB is unavailable, NoOp repos silently absorb writes. Callers cannot distinguish healthy from degraded.

**Fix:** Extend the health response to include a `db` field. The handler needs access to whether the DB is connected. The cleanest approach is to pass a `dbStatus` string to the handler at construction time, or to perform a live ping check.

**Option A — static status at startup (recommended):** Pass a `dbHealthy bool` to the `Handler` at construction. Set it to `true` when `database.Connect()` succeeds in main.go, `false` otherwise. The health check returns this status without a live ping.

**Option B — live ping check:** Call `sqlDB.PingContext()` inside the health handler. More accurate but adds latency and a DB dependency to a simple endpoint.

**Recommended:** Option A (static status). It avoids health endpoint latency spikes and is sufficient for distinguishing "started with no DB" from "started with DB." A live ping can be a separate `/health/ready` endpoint (out of scope).

**Response contract:**
```json
// Healthy
{"status": "ok", "db": "healthy"}

// Degraded
{"status": "ok", "db": "degraded"}
```

Note: `status` remains `"ok"` in both cases — the server is functioning. The `db` field is the degraded indicator. HTTP status code remains 200 to avoid breaking monitoring that checks only status code.

### Anti-Patterns to Avoid

- **Don't change the rule engine to fix display bugs.** The engine correctly sets `Ambiguous: true` and `Impossible: true`. The fix is in the API response shape and frontend rendering, not the engine logic.
- **Don't return HTTP 503 for degraded mode.** The server is operational; `db: "degraded"` in the health body is sufficient. Returning 503 would break uptime monitors.
- **Don't add a `possible_types` requirement to the ambiguous condition.** The engine intentionally omits `possible_types` when alternatives cannot be enumerated — the frontend must handle both cases.
- **Don't add banner logic to the chat flow.** User decision: ambiguous/impossible banners are only for the direct classification UI (`ClassificationResult.tsx`), not `ChatPanel.tsx`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Warning banner UI | Custom styled div | shadcn `Alert` with `variant="destructive"` or default | Already in use for impossible/ambiguous; consistent with design system |
| Error notification for state transitions | Custom toast component | `sonner` (already imported in project) | Already used in ResultsPanel.tsx for share errors |
| i18n string lookup | Custom translation map | `useTranslation()` hook + existing `en.json`/`es.json` keys | All strings must go through i18n for bilingual support |
| Health endpoint DB check | Manual DB query | `sql.DB.PingContext()` (stdlib) | Standard library ping is reliable and idiomatic |

**Key insight:** This phase is about closing gaps in existing infrastructure, not building new abstractions. Every tool needed is already in the codebase.

---

## Common Pitfalls

### Pitfall 1: Ambiguous Banner Without Reason String
**What goes wrong:** Adding the amber banner for `ambiguous: true` without a `possible_types` but not providing a clinical reason string — the banner becomes an unlabeled warning.
**Why it happens:** The engine doesn't currently populate a `reason` or `ambiguous_reason_key` for the pathways that have no `possible_types`.
**How to avoid:** Add a nullable `ambiguous_reason_key string` field to `domain.LaugeHansenClassification` (Go) and `LaugeHansenClassification` (TypeScript interface). Populate it in the 4 engine paths that set `Ambiguous: true` without `PossibleTypes`. Map it to an i18n key in both `en.json` and `es.json`.
**Warning signs:** Banner renders with empty content in the `AlertDescription`.

### Pitfall 2: Breaking the Impossible Early-Return
**What goes wrong:** Removing the early return in `ClassificationResult.tsx` for impossible cases can cause crash if downstream code assumes non-nil classification fields.
**Why it happens:** The engine sets `Impossible: true` but may still populate some classification fields (e.g., the trimaleolar case sets `FractureType: "trimaleolar"` with `Impossible: true`). The component must guard field access with optional chaining.
**How to avoid:** Review all `result.impossible` cases in engine.go to confirm which fields are populated. Use `result.danis_weber?.type` (TypeScript optional chaining) throughout the render path.
**Warning signs:** Runtime TypeErrors in the browser console when rendering impossible results.

### Pitfall 3: Health Endpoint Breaking Monitoring
**What goes wrong:** Returning HTTP 503 for degraded mode breaks monitoring that treats any non-200 as outage.
**Why it happens:** Instinct to signal degraded mode via HTTP status code.
**How to avoid:** Keep HTTP 200. Use the `db` JSON field to signal degraded. Only return 503 if the server itself is failing to process requests.
**Warning signs:** PagerDuty alerts firing when DB is unavailable but the classification API is still operational.

### Pitfall 4: i18n Key Gaps in Spanish
**What goes wrong:** Adding new i18n keys only to `en.json` but forgetting `es.json` — Spanish UI shows raw key strings.
**Why it happens:** Easy to forget the second locale file.
**How to avoid:** For every new key added to `en.json`, add the corresponding entry to `es.json` in the same commit. The Spanish translation can be a placeholder initially if the clinical text is not yet translated.
**Warning signs:** Spanish UI displays `results.ambiguousBanner.title` as literal text.

### Pitfall 5: State Transition Tests Missing Edge Cases
**What goes wrong:** Tests only verify the "happy path" of publish/close but not all invalid source states.
**Why it happens:** Test authors focus on what works, not every failure mode.
**How to avoid:** Add test cases for: closed→publish, published→publish, draft→close, closed→close. Confirm each returns 400 with `INVALID_STATE_TRANSITION` code.
**Warning signs:** A closed case can be re-published because the test didn't cover that path.

---

## Code Examples

Verified patterns from the existing codebase:

### Ambiguous Classification — Current Engine Output
```go
// Source: internal/rules/engine.go — classifyMedialPosterior (line 192-194)
// Returns ambiguous with NO possible_types — frontend currently renders this as regular card
result.LaugeHansen = &domain.LaugeHansenClassification{
    Ambiguous: true,
}
```

### Ambiguous Classification — Engine Output With possible_types
```go
// Source: internal/rules/engine.go — classifyMedialOnly (line 99-102)
// Returns ambiguous WITH possible_types — frontend correctly renders amber Alert
result.LaugeHansen = &domain.LaugeHansenClassification{
    Ambiguous:     true,
    PossibleTypes: []string{"PA", "SER", "PER"},
}
```

### Impossible Classification — Current Engine Output
```go
// Source: internal/rules/engine.go — classifyTrimaleolar (line 458-462)
return &domain.ClassificationResult{
    FractureType:  "trimaleolar",
    Impossible:    true,
    ImpossibleKey: "exceptional",
}, nil
```

### State Transition Error Handling — Existing Pattern
```go
// Source: internal/api/case_admin_handler.go — CloseCase (line 302-304)
// This pattern already works correctly — replicate for any missing paths
if err := cs.CanClose(); err != nil {
    HandleError(c, err, "Cannot close case")
    return
}
```

### State Transition Error Mapping — HandleError
```go
// Source: internal/api/errors.go (line 52-53)
// ErrInvalidStateTransition already maps to HTTP 400 with domain error code
case errors.Is(err, domain.ErrInvalidStateTransition):
    status, code, message = http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, err.Error()
```

### Health Endpoint — Current (No DB Signal)
```go
// Source: internal/api/handler.go — HealthCheck (line 151-153)
func (h *Handler) HealthCheck(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
```

### Health Endpoint — Target Pattern
```go
// Handler needs a dbStatus field to report degraded mode
func (h *Handler) HealthCheck(c *gin.Context) {
    dbStatus := "healthy"
    if !h.dbHealthy {
        dbStatus = "degraded"
    }
    c.JSON(http.StatusOK, gin.H{"status": "ok", "db": dbStatus})
}
```

### Frontend Ambiguous Banner — Current (Only With possible_types)
```tsx
// Source: frontend/src/components/ClassificationResult.tsx (line 110-145)
{result.lauge_hansen.ambiguous && result.lauge_hansen.possible_types && result.lauge_hansen.possible_types.length > 0 ? (
  <Alert className="border-l-amber-500 bg-amber-50">
    ...
  </Alert>
) : (
  // Regular Card — shown even when ambiguous without possible_types
  <Card ...>
)}
```

### Frontend Ambiguous Banner — Fixed Pattern
```tsx
// Show amber banner for ALL ambiguous results, with or without possible_types
{result.lauge_hansen?.ambiguous ? (
  <Alert className="question-card-enter border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20">
    <AlertTriangle className="h-5 w-5 text-amber-600" />
    <AlertTitle>{t('results.ambiguousBanner.title')}</AlertTitle>
    <AlertDescription>
      {/* Show clinical reason */}
      {result.lauge_hansen.ambiguous_reason_key
        ? t(`results.ambiguousReasons.${result.lauge_hansen.ambiguous_reason_key}`)
        : t('results.ambiguousBanner.genericReason')}
      {/* Show possible types if present */}
      {result.lauge_hansen.possible_types && result.lauge_hansen.possible_types.length > 0 && (
        <div className="space-y-2 mt-3">
          <p className="font-semibold">{t('results.possibleTypes')}:</p>
          {result.lauge_hansen.possible_types.map((type) => (
            <div key={type} className="p-3 rounded-md bg-white dark:bg-slate-900 border border-amber-200">
              <p className="font-semibold">{type} - {getLaugeHansenFullName(t, type)}</p>
              <p className="text-sm mt-1">{getLaugeHansenDescription(t, type)}</p>
            </div>
          ))}
        </div>
      )}
    </AlertDescription>
  </Alert>
) : (
  <Card ...>{/* regular classification card */}</Card>
)}
```

### Frontend Impossible Banner — Fixed Pattern (Banner + Results Below)
```tsx
// Source: ClassificationResult.tsx — adapted for "banner + results below" pattern
// Remove the early return; render banner then continue to render classification cards

// Before classification cards:
{result.impossible && (
  <Alert variant="destructive" className="question-card-enter">
    <XCircle className="h-5 w-5" />
    <AlertTitle>{t('results.impossibleBanner.title')}</AlertTitle>
    <AlertDescription>
      {result.impossible_key && getImpossibleReason(t, result.impossible_key)}
    </AlertDescription>
  </Alert>
)}

// Then: existing DanisWeber, LaugeHansen, AO/OTA, Bartonicek cards...
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Implicit degraded mode (slog.Warn only) | Explicit `db` field in health response | Phase 1 | Callers can distinguish healthy from degraded |
| Ambiguous early-return as regular card | Amber warning banner for ALL ambiguous | Phase 1 | Clinical users always see warning on ambiguous |
| Impossible as early-return (no results shown) | Red banner + results below | Phase 1 | Clinically useful — user can still see partial classification |
| State transition validation in handlers only | Domain methods + HandleError + frontend error code handling | Phase 1 | Complete validation chain |

**Deprecated/outdated:**
- `ClassificationResult.tsx` early-return for impossible: replaced by banner-above-results pattern
- Ambiguous check requiring `possible_types.length > 0`: replaced by checking `ambiguous === true` directly

---

## Open Questions

1. **Clinical reason strings for ambiguous paths without possible_types**
   - What we know: 4 engine paths return `Ambiguous: true` without `PossibleTypes`. The clinical reason differs per path (e.g., "bimaleolar medial+posterior with extraincisural posteromedial — unclassifiable by LH").
   - What's unclear: The exact clinical wording for each reason. The planner can add `ambiguous_reason_key` strings using existing patterns (e.g., `"medial_posterior_ct_extraincisural"`) and map them to placeholder strings in i18n, to be refined by the clinical team.
   - Recommendation: Add `ambiguous_reason_key` field to domain and engine, use descriptive keys, add i18n strings as best-effort clinical prose. Flag for clinical review.

2. **Whether to add `ambiguous_reason_key` to Go domain type or derive from `fracture_type` on the frontend**
   - What we know: The backend knows the reason (it's in the engine logic). Deriving on the frontend requires replicating engine logic.
   - What's unclear: Whether a new domain field is worth the type surface increase.
   - Recommendation: Add `ambiguous_reason_key` to the Go `LaugeHansenClassification` struct and TypeScript interface. It is optional (omitempty), so existing code is unaffected. This is cleaner than deriving on the frontend.

3. **Health endpoint backward compatibility**
   - What we know: The current health response is `{"status": "ok"}`.
   - What's unclear: Whether any external callers (monitoring, frontend) parse and depend on the exact response shape.
   - Recommendation: Adding `"db"` is additive and non-breaking for callers that only check `status`. Safe to proceed.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `internal/rules/engine.go` — all `Ambiguous` and `Impossible` paths confirmed
- Direct codebase inspection: `internal/domain/classification.go` — struct fields confirmed
- Direct codebase inspection: `internal/api/errors.go` — HandleError mapping confirmed
- Direct codebase inspection: `internal/api/case_admin_handler.go` — PublishCase, CloseCase handlers confirmed
- Direct codebase inspection: `frontend/src/components/ClassificationResult.tsx` — rendering logic confirmed
- Direct codebase inspection: `cmd/anklyze-apiserver/main.go` — NoOp fallback and health endpoint confirmed

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` — bug descriptions and fragile area analysis

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all tools already in codebase
- Architecture: HIGH — all bugs verified against actual source files
- Pitfalls: HIGH — derived from direct code inspection, not speculation

**Research date:** 2026-02-26
**Valid until:** 2026-04-26 (stable codebase, no fast-moving dependencies affected)
