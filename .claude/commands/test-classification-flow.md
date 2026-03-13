# Test Classification Flow — E2E Exhaustive Testing

Run exhaustive E2E tests of ALL classification paths in the ankle fracture classification form. Parses the drawio decision tree, generates test cases for every terminal node, and spawns parallel sub-agents to test each branch.

## Prerequisites

- App must be running (`make run` or `make run-backend` + frontend dev server)
- Playwright MCP must be available
- Default app URL: `http://localhost:5173`

## Procedure

### Phase 1: Parse the Drawio Decision Tree

Read the drawio file at `docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio` in chunks (it's ~300KB+ XML).

For each `<mxCell>` element, extract:
- **Decision nodes** (rhombus, yellow `fillColor=#fff2cc`): Questions
- **Option nodes** (rounded rectangle, green `fillColor=#d5e8d4`): Answer choices
- **Terminal nodes** (cylinder, red `fillColor=#f8cecc`): Classification results
- **Edges** (`edge="1"` with `source` and `target`): Connections between nodes

Build a complete map:
1. `nodeMap`: id → {value, type (decision|option|terminal)}
2. `edgeMap`: sourceId → [targetId]
3. Reconstruct all paths from root to terminal nodes

Parse each terminal node's value to extract:
- `fracture_type`: Text before first `<br>`
- `ao`: AO/OTA code (e.g., "44-B3") or "no clasificable"
- `lauge_hansen`: LH type (SA, SER, PA, PER) or "no clasificable"
- `weber`: Danis-Weber type (A, B, C) or absent
- `bartonicek`: Bartonicek type (1-4) or absent

**Verification checkpoint**: Count terminal nodes per branch. Expected approximately:
- posterior_only: ~5 terminals (2 distal tibia + 1 no-CT + 4 with-CT bartonicek variants, but some share paths)
- medial_only: ~6 terminals (2 distal tibia + 2 morphology × articular paths)
- lateral_only: ~8-13 terminals
- medial_posterior: ~6 terminals
- lateral_posterior: ~30-40 terminals
- lateral_medial: ~15-18 terminals
- trimaleolar: ~50-67 terminals
- **Total: ~155 terminal nodes**

### Phase 2: Generate Test Cases

For each terminal node, trace the path backwards from terminal to root, recording every decision point and which option was chosen. Convert this into a click sequence using the Spanish label mapping below.

Group test cases by `involved_malleoli` value (7 groups).

#### Test Case Format

Each test case should be structured as:

```
{
  "id": "{branch}_{index}",
  "description": "Human-readable path description",
  "clicks": [
    {"question": "¿Qué maléolos tiene fracturados?", "label": "Maléolo lateral"},
    {"question": "¿A qué nivel está la fractura?", "label": "Transindesmal"},
    {"question": "¿De qué morfología es la fractura?", "label": "Espiroidea (Baja anterior, alta posterior)"},
    {"question": "Clasificar Fractura", "label": null}
  ],
  "expected": {
    "fracture_type": "unimaleolar_lateral",
    "lauge_hansen": "SER",
    "weber": "B",
    "ao": "44-B1",
    "bartonicek": null
  }
}
```

#### Spanish Label Mapping (Value → Form Label)

**Involved Malleoli:**
- `posterior_only` → "Maléolo posterior"
- `medial_only` → "Maléolo medial"
- `lateral_only` → "Maléolo lateral"
- `medial_posterior` → "Maléolos medial y posterior"
- `lateral_posterior` → "Maléolos lateral y posterior"
- `lateral_medial` → "Maléolos lateral y medial"
- `trimaleolar` → "Maléolos medial, lateral y posterior"

**Articular Involvement:**
- `large_with_extension` → ">1/3 de superficie articular con extensión metafisaria"
- `small_without_extension` → "<1/3 de superficie articular sin extensión metafisaria"

**Yes/No questions** (CT scan, depression, posteromedial, infrasindesmal transverse, articular medial):
- `true` / `yes` → "Sí"
- `false` / `no` → "No"

**Medial Morphology:**
- `vertical` → "Vertical"
- `transverse_oblique` → "Transverso/oblicuo"

**Fibular Level (3-option):**
- `infrasindesmal` → "Infrasindesmal"
- `transindesmal` → "Transindesmal"
- `suprasindesmal` → "Suprasindesmal"

**Fibular Level (High/Low for lateral_medial and trimaleolar):**
- `suprasindesmal` → "Suprasindesmal"
- `transindesmal` → "Baja (Transindesmal / Infrasindesmal)"

**Lateral Morphology (2-option for lateral_only, lateral_posterior):**
- `oblique` → "Transversa/Oblicua (Baja medial, alta lateral)/Conminuta"
- `spiral` → "Espiroidea (Baja anterior, alta posterior)"

**Lateral Morphology (3-option for lateral_medial, trimaleolar):**
- `transverse` → "Transversa"
- `oblique` → "Oblicua (Baja medial, alta lateral)/Conminuta"
- `spiral` → "Espiroidea (Baja anterior, alta posterior)"

**Suprasindesmal Type:**
- `simple_diaphyseal` → "Diafisaria Simple"
- `multifragmentary` → "Multifragmentaria"
- `proximal` → "Proximal"

**Fibula Trace Pattern:**
- `parasindesmotic_short` → "Parasindesmal de trazo oblicuo corto/transverso/conminuto"
- `parasindesmotic_long` → "Parasindesmal de trazo oblicuo largo/espiroideo"
- `suprasindesmotic_far` → "Suprasindesmal (>6cm de superficie articular)"

**Posterior Fracture Type:**
- `extraincisural` → "Fragmento extraincisural"
- `posterolateral` → "Fragmento posterolateral"
- `posteromedial_posterolateral` → "Fragmento posteromedial y posterolateral"
- `large_posterolateral` → "Gran fragmento triangular posterolateral"
- `extraincisural_posteromedial` → "Fragmento extraincisural postero-medial"

**Fibular Level for Transverse:**
- `infrasindesmal` → "Infrasindesmal"
- `transindesmal` → "Transindesmal"

**Submit button:** "Clasificar Fractura"
**Reset button:** "Empezar de Nuevo"

### Phase 3: Spawn Single Test Agent

> **Why not parallel?** The Playwright MCP server exposes a single browser instance with a shared "current page" pointer. Parallel agents would race on tab selection, causing non-deterministic failures. A single agent avoids this entirely.

Spawn **1 sub-agent** using the `classification-flow-tester` agent with ALL test cases grouped by branch.

Before spawning, ask the user for:
1. **App URL** (default: `http://localhost:5173`)
2. **Login credentials**: email and password

The sub-agent receives a prompt containing:

1. **App URL**: `http://localhost:5173` (or as configured)
2. **Login credentials**: email/password from user
3. **All test cases**: The complete list grouped by `involved_malleoli` branch (as structured JSON)
4. **Instructions**: Login once, iterate through all test cases sequentially, report results

Example prompt:

```
You are testing ALL classification paths sequentially.

App URL: {url}
Login: email={email}, password={password}

## Test Cases (grouped by branch)

### posterior_only ({N} tests)
{JSON array}

### medial_only ({N} tests)
{JSON array}

### lateral_only ({N} tests)
{JSON array}

### medial_posterior ({N} tests)
{JSON array}

### lateral_posterior ({N} tests)
{JSON array}

### lateral_medial ({N} tests)
{JSON array}

### trimaleolar ({N} tests)
{JSON array}

## Instructions

1. Open the browser and navigate to {url}/login
2. Login with the provided credentials
3. For each test case (process all branches sequentially):
   a. Navigate to {url}/classify
   b. Follow the click sequence (use browser_snapshot to find elements, then browser_click)
   c. After clicking "Clasificar Fractura", use browser_snapshot to read results
   d. Compare actual vs expected
   e. Click "Empezar de Nuevo" to reset
4. Report results in the format specified in your agent instructions
```

### Phase 4: Collect and Report Results

After the sub-agent completes, format its results into a summary report:

```
# Classification Flow E2E Test Report

## Summary
- Total paths tested: {N}
- Passed: {P}
- Mismatched: {M}
- Form errors: {E}

## Results by Branch

### posterior_only (N tests)
[Sub-agent results]

### medial_only (N tests)
[Sub-agent results]

### lateral_only (N tests)
[Sub-agent results]

### medial_posterior (N tests)
[Sub-agent results]

### lateral_posterior (N tests)
[Sub-agent results]

### lateral_medial (N tests)
[Sub-agent results]

### trimaleolar (N tests)
[Sub-agent results]

## Mismatches (if any)
| Test ID | Field | Expected | Actual |
|---------|-------|----------|--------|
| ... | ... | ... | ... |

## Form Errors (if any)
| Test ID | Error Description |
|---------|-------------------|
| ... | ... |

## Conclusion
{Overall assessment: All paths match / N mismatches found / etc.}
```

### Phase 5: Fix Failures (if any)

If the test report contains MISMATCH or FORM_ERROR results, **ask the user** whether to proceed with automatic fixes. If confirmed, analyze the failures and spawn fix agents.

#### Failure Triage

Classify each failure by its likely root cause:

| Failure Type | Likely Cause | Fix Location |
| --- | --- | --- |
| MISMATCH on `ao` or `weber` or `lauge_hansen` | Rules engine returns wrong code | `internal/rules/engine.go` |
| MISMATCH on `bartonicek` | Bartonicek logic wrong or missing | `internal/rules/engine.go` |
| FORM_ERROR: element not found | Form doesn't show expected question/option | `frontend/src/features/fracture-classification/components/FractureForm.tsx`, `frontend/src/utils/formOptions.ts` |
| FORM_ERROR: unexpected question | Form shows wrong conditional question | `frontend/src/features/fracture-classification/utils/formValidation.ts` |
| MISMATCH on `fracture_type` | Frontend label mismatch or i18n issue | `frontend/src/i18n/es.json` |
| Raw i18n key visible in UI (e.g. `results.classifications.aoOta.A1.3_desc`) | Missing or empty translation key | `frontend/src/i18n/es.json`, `frontend/src/i18n/en.json` |

#### Spawn Fix Agents

Group failures by root cause location and spawn **up to 3 agents in parallel** (these don't share browser state, so parallelism is safe):

1. **Backend fix agent** (if rules engine mismatches exist):
   - Receives: list of MISMATCH failures with expected vs actual values
   - Reads: `internal/rules/engine.go`, `internal/rules/engine_test.go`, the drawio diagram
   - Task: Fix classification logic to match the drawio decision tree, update/add unit tests
   - Use `general-purpose` agent type

2. **Frontend form fix agent** (if FORM_ERROR failures exist):
   - Receives: list of FORM_ERROR failures with descriptions
   - Reads: `FractureForm.tsx`, `formOptions.ts`, `formValidation.ts`, `es.json`
   - Task: Fix form conditional logic, missing options, or incorrect labels
   - Use `general-purpose` agent type

3. **i18n/label fix agent** (if fracture_type mismatches or I18N_GAP failures exist):
   - Receives: list of label mismatches AND localization gaps (raw keys detected in UI)
   - Reads: `frontend/src/i18n/es.json`, `frontend/src/i18n/en.json`
   - Task: Add missing translation keys, fix incorrect translations, ensure both `es.json` and `en.json` have all required keys
   - Use `general-purpose` agent type

Only spawn agents for categories that have failures. Skip categories with zero failures.

#### Example fix agent prompt

```text
You are fixing classification mismatches in the rules engine.

The drawio decision tree is the source of truth. The following test cases
produced wrong results — the rules engine returned different values than
what the drawio specifies.

## Failures

{table of MISMATCH failures: test_id, clicks path, expected values, actual values}

## Key Files

- Rules engine: `internal/rules/engine.go`
- Engine tests: `internal/rules/engine_test.go`
- Drawio (source of truth): `docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio`

## Instructions

1. Read the rules engine and the failing test cases
2. For each mismatch, trace the click path through the drawio to confirm the expected value
3. Fix the rules engine logic to produce the correct output
4. Add or update unit tests in engine_test.go for each fixed case
5. Run `go test ./internal/rules/...` to verify fixes pass
6. Report what you changed and why
```

#### After Fix Agents Complete

Collect fix agent results and present a summary of changes made. If fixes were applied, suggest re-running the test flow to verify.

## Key Files Referenced

- **Drawio diagram**: `docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio`
- **Rules engine**: `internal/rules/engine.go` (backend classification logic, for cross-reference)
- **Engine tests**: `internal/rules/engine_test.go` (existing test cases, for cross-reference)
- **Form component**: `frontend/src/features/fracture-classification/components/FractureForm.tsx`
- **Form options**: `frontend/src/utils/formOptions.ts`
- **i18n Spanish**: `frontend/src/i18n/es.json`
- **Sub-agent**: `.claude/agents/classification-flow-tester.md`

## Troubleshooting

### Sub-agent can't find form elements
- The form uses radio button groups — look for the label text, not input values
- Some questions only appear conditionally; make sure previous clicks registered

### Login fails
- Check that the app is running at the expected URL
- Verify credentials are correct
- The login form may use Supabase auth — ensure the auth service is reachable

### Timeouts
- Large branches (trimaleolar ~67 tests) may take a while
- If a sub-agent stalls, check browser state via snapshot

### Mismatches
- Compare against `internal/rules/engine.go` to determine if the mismatch is in the form, the engine, or the drawio
- Check `internal/rules/engine_test.go` for the corresponding unit test
