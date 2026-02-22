# Research: Update Classification Algorithm v2

**Branch**: `002-update-classification-algorithm` | **Date**: 2026-02-22

## Overview

All technical decisions for this feature are dictated by the reference flow diagram (`docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd`). Research focused on identifying the specific deltas between the current implementation and the new diagram, and confirming the correct approach for each change.

## Research Findings

### R1: New branching paths in posterior-only and medial-only

**Decision**: Add articular involvement + metaphyseal extension branching before existing classification logic for posterior-only and medial-only paths.

**Rationale**: The new flow diagram introduces an early-exit path for both posterior-only and medial-only malleoli where significant articular involvement with metaphyseal extension leads to a distal tibia fracture classification (AO 43 B1 / 43 B2) instead of an ankle fracture classification. This is a new clinical distinction: the same anatomical fracture location can be classified differently based on the extent of articular surface involvement.

**Alternatives considered**: None — the diagram is the authoritative source.

**Implementation impact**:
- New `FractureInput` fields: `articular_involvement` (enum: `large_with_extension` / `small_without_extension`), `has_articular_depression` (bool)
- New `AOOTACode` constants: `43-B1`, `43-B2`
- New `FractureType` value: `distal_tibia`
- `classifyPosteriorOnly()` and `classifyMedialOnly()` both need early-exit checks

### R2: Medial+posterior path restructured with 5 posterior types

**Decision**: Restructure `classifyMedialPosterior()` to follow the diagram's CT scan → posterior type branching, with the new "Extraincisural postero-medial" type producing AO 44 A3.

**Rationale**: The current implementation treats medial+posterior as a simple ambiguous SER/PA result. The new diagram adds CT scan branching and differentiates based on posterior fragment type, including a 5th type (posteromedial extraincisural) that produces a distinct AO 44 A3 + Lauge-Hansen unclassifiable result. Without CT, the result is "bimaleolar medial+posterior, AO unclassifiable, Lauge-Hansen PA."

**Implementation impact**:
- New `PosteriorFractureType` constant: `extraincisural_posteromedial`
- New `AOOTACode` constant: `44-A3`
- New `LaugeHansenType` or handling for "unclassifiable" (not ambiguous with possible types, but genuinely unclassifiable)
- `classifyMedialPosterior()` rewrite

### R3: Lateral+posterior infrasyndesmotic is no longer impossible

**Decision**: Replace the impossible-case return for lateral+posterior infrasyndesmotic with the diagram's new CT scan + posteromedial fragment branching.

**Rationale**: The current engine returns `Impossible: true` for all lateral+posterior infrasyndesmotic combinations. The new diagram shows this is a valid path: without CT → unclassifiable result (Weber A); with CT → ask if posterior fragment is posteromedial → if yes: AO 44 A3, if no: standard Bartonicek types with unclassifiable AO/LH.

**Implementation impact**:
- New `FractureInput` field: `is_posterior_posteromedial` (bool, only for this path)
- `classifyLateralPosterior()` infrasindesmal branch rewrite
- Existing "impossible" test cases must be updated

### R4: Third fibula trace pattern option (>6cm)

**Decision**: Add `suprasindesmotic_far` as a third `FibulaTracePattern` option that produces the same PER classification as `parasindesmotic_long`.

**Rationale**: The new diagram explicitly shows three trace pattern options for all suprasyndesmotic (simple/multifragmentary) paths: (1) parasyndesmotic short → PA, (2) parasyndesmotic long → PER, (3) suprasyndesmotic >6cm → same as PER. The current implementation only has 2 options; the third provides more clinical precision in data collection while producing equivalent classification output.

**Implementation impact**:
- New `FibulaTracePattern` constant: `suprasindesmotic_far`
- All suprasyndesmotic branches in `classifyLateralOnly()`, `classifyLateralPosterior()`, `classifyLateralMedial()`, `classifyTrimaleolar()` already handle the default case as PER, so the new value naturally falls into the existing `else` branch. Frontend form options need updating.

### R5: AO subtype change for lateral-only transsyndesmotic

**Decision**: Change AO code for lateral-only transsyndesmotic from `44-B1` to `44-B` (subtype unclassifiable B1/B2).

**Rationale**: The new diagram labels both spiral and transverse/oblique lateral-only transsyndesmotic results as "AO 44 B (subtipo no clasificable B1/B2)" instead of a specific B1 code. This reflects clinical uncertainty about the exact subtype without additional information.

**Implementation impact**:
- New `AOOTACode` constant: `44-B` (unclassifiable subtype)
- `classifyLateralOnly()` transsyndesmotic branch: change from `AOOTAB1` to new code
- Translation files need a description for the new code

### R6: Database backward compatibility

**Decision**: No database migration needed. Existing JSONB fields accommodate new classification codes.

**Rationale**: Classification results are stored as JSONB in `CaseResponse.classification`. New AO codes (43-B1, 43-B2, 44-A3, 44-B) are string values that fit the existing schema. Denormalized fields (`danis_weber_type`, `ao_ota_code`, etc.) are also strings. Frontend translation utilities handle unknown codes gracefully by displaying the raw code.

**Alternatives considered**: Adding an `algorithm_version` column to track which version produced each result. Deferred — can be added later if needed for research analysis, and timestamps already provide implicit versioning.

### R7: Medial-only morphology values update

**Decision**: Update medial morphology option labels. The new diagram uses "Vertical" and "Transverso/oblicuo" instead of "Oblique" and "Transverse".

**Rationale**: The diagram shows medial morphology options as "Vertical" (→ SA) and "Transverso/oblicuo" (→ unclassifiable PA/SER/PER). The backend codes remain `oblique` → now maps to "Vertical" and `transverse` → now maps to "Transverso/oblicuo". The code values stay the same but the display labels change in translations.

**Implementation impact**:
- Rename backend constant comments and i18n labels only. No code value changes needed — `MedialMorphologyOblique` maps to "Vertical" in the new diagram, keeping backward compatibility.

## Summary

All unknowns resolved. No NEEDS CLARIFICATION items remain. The implementation is a mechanical translation of the flow diagram into code, following the established `update-flow.md` process.
