# Data Model: Update Classification Algorithm v2

**Branch**: `002-update-classification-algorithm` | **Date**: 2026-02-22

## Entity Changes

### FractureInput (extended)

New fields added to support the updated decision tree branching:

| Field | Type | When Required | Description |
| ----- | ---- | ------------- | ----------- |
| `articular_involvement` | enum: `large_with_extension`, `small_without_extension` | posterior_only, medial_only | Articular surface involvement level. >1/3 with metaphyseal extension vs <1/3 without. |
| `has_articular_depression` | bool | When `articular_involvement` = `large_with_extension` | Whether articular depression is present. Differentiates AO 43 B1 vs B2. |
| `is_posterior_posteromedial` | bool | lateral_posterior + infrasindesmal + has_ct_scan | Whether posterior fragment is posteromedial. Determines AO 44 A3 path. |

### PosteriorFractureType (extended)

New value for medial+posterior path only:

| Value | Code | Description |
| ----- | ---- | ----------- |
| `extraincisural_posteromedial` | NEW | Extraincisural postero-medial fragment. Only available in medial+posterior path. Produces AO 44 A3 + Lauge-Hansen unclassifiable. |

Existing values unchanged:

| Value | Bartonicek | Description |
| ----- | ---------- | ----------- |
| `extraincisural` | 1 | Fragmento extraincisural |
| `posterolateral` | 2 | Fragmento posterolateral |
| `posteromedial_posterolateral` | 3 | Fragmento posteromedial y posterolateral |
| `large_posterolateral` | 4 | Gran fragmento triangular posterolateral |

### FibulaTracePattern (extended)

New third option for suprasyndesmotic paths:

| Value | Code | Mechanism | Description |
| ----- | ---- | --------- | ----------- |
| `parasindesmotic_short` | existing | PA | Parasyndesmotic short oblique/transverse/comminuted |
| `parasindesmotic_long` | existing | PER | Parasyndesmotic long oblique/spiral |
| `suprasindesmotic_far` | NEW | PER | Suprasyndesmotic (>6cm from articular surface). Clinically equivalent to `parasindesmotic_long` for classification. |

### AOOTACode (extended)

New constants:

| Code | Context | Description |
| ---- | ------- | ----------- |
| `43-B1` | posterior_only (>1/3, no depression), medial_only (significant, no depression) | Distal tibia fracture without articular depression |
| `43-B2` | posterior_only (>1/3, depression), medial_only (significant, depression) | Distal tibia fracture with articular depression |
| `44-A3` | medial_posterior (posteromedial extraincisural), lateral_posterior (infra + posteromedial) | Trifocal / Medial + posterior special type |
| `44-B` | lateral_only transsyndesmotic (both spiral and oblique) | B subtype unclassifiable (B1/B2) — replaces specific B1 |

### ClassificationResult (extended)

No structural changes to the ClassificationResult type. New values flow through existing fields:

- `FractureType`: new value `"distal_tibia"` for AO 43 B1/B2 paths
- `AOOTA.Code`: new values `"43-B1"`, `"43-B2"`, `"44-A3"`, `"44-B"`
- `LaugeHansen`: for unclassifiable cases (not ambiguous, genuinely unclassifiable), use `Ambiguous: false` with empty `Type` and a note, or introduce a new `Unclassifiable` field. Decision: use existing `Ambiguous: true` with `PossibleTypes: []` (empty) to signal "unclassifiable" vs `PossibleTypes: ["PA", "SER"]` for "ambiguous between these types"
- `DanisWeber`: nil for distal tibia results (not an ankle classification)
- `Bartonicek`: nil for distal tibia results

### MedialMorphology (label change only)

Backend code values unchanged. Frontend translation labels updated:

| Code Value | Old Label (EN) | New Label (EN) | New Label (ES) |
| ---------- | -------------- | -------------- | -------------- |
| `oblique` | Oblique | Vertical | Vertical |
| `transverse` | Transverse | Transverse/Oblique | Transverso/oblicuo |

## State Transitions

No new entity state transitions. Cases and studies maintain existing draft → published → closed lifecycle.

## Validation Rules

- `articular_involvement` MUST be provided when `involved_malleoli` is `posterior_only` or `medial_only`
- `has_articular_depression` MUST be provided when `articular_involvement` is `large_with_extension`
- `is_posterior_posteromedial` MUST be provided when `involved_malleoli` is `lateral_posterior` AND `fibular_level` is `infrasindesmal` AND `has_ct_scan` is `true`
- `posterior_fracture_type` for `medial_posterior` path now accepts 5 values (including `extraincisural_posteromedial`)
- `fibula_trace_pattern` now accepts 3 values (including `suprasindesmotic_far`)
- When `articular_involvement` is `large_with_extension`, the morphology question (`medial_morphology` for medial-only, `posterior_fracture_type` / CT scan for posterior-only) is NOT asked — the path leads directly to AO 43 B1/B2

## Database Impact

**No migration required.** All classification data is stored as JSONB in `case_responses.classification` and `cases.reference_classification`. New string values for AO codes and fracture types are accommodated by the existing schema. Denormalized string columns (`ao_ota_code`, `danis_weber_type`, etc.) accept any string value.
