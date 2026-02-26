# Phase 1: Bug Fixes - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all known bugs: surface ambiguous and impossible classification outcomes clearly in the UI and API, enforce valid case state transitions in the service layer, and make database fallback mode explicit. No new features — only correctness fixes.

</domain>

<decisions>
## Implementation Decisions

### Classification warnings UX
- Ambiguous classifications: yellow/orange warning banner displayed above the classification results
- Impossible classifications: same banner pattern but red (stronger severity), results still shown below
- Both banners include a brief clinical reason explaining WHY the classification is ambiguous or impossible (e.g., "Transverse lateral morphology with this fibular level has multiple valid interpretations")
- Warnings appear only in the direct classification UI, NOT in the chat flow — chat handles ambiguity conversationally through the LLM

### Claude's Discretion
- State transition error handling: how to present invalid transition errors in the UI (toast, inline, button disabling)
- Degraded mode indication: how to communicate database unavailability (admin-facing banner, API headers, health endpoint)
- API error contracts: exact response structure for classification flags and state transition errors
- Warning banner component design: exact styling, placement relative to existing result components
- Whether to disable UI actions that would trigger invalid transitions vs show errors after attempt

</decisions>

<specifics>
## Specific Ideas

- Warning banners should feel like clinical alerts — clear severity distinction between ambiguous (caution) and impossible (error)
- The engine already returns `Ambiguous: true` and `Impossible: true` fields — these need to flow through the API response and be rendered by the frontend

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-bug-fixes*
*Context gathered: 2026-02-26*
