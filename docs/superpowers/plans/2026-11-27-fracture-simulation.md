# Fracture Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The 3D ankle in the classifier shows the fracture the answers describe — cut fragments with rough broken-bone faces and conservative displacement — instead of a tint.

**Architecture:** A new build script cuts the tibia and fibula of `ankle.bin` along every fracture "piece" (a convex region bounded by noisy planes), splitting each bone into cells tagged by a bitmask of the pieces they lie in, and writes `fractures.bin`. At runtime a pure function maps the answers to the active pieces and their moves; the scene groups cells into fragments, shows only the cut faces between different fragments, and eases fragments to their pose.

**Tech Stack:** three.js 0.186, React 19, TypeScript strict, Vitest 4, Node 24 (build scripts, stdlib + `three` only).

**Spec:** `docs/superpowers/specs/2026-11-27-fracture-simulation-design.md`

## Global Constraints

- Model frame: mm, origin on the plafond over the talar dome, +y superior, +z anterior, +x medial (right ankle). Landmarks today: syndesmosis 23 mm; fibula centre about x −24, z −10 at the joint; medial malleolus x > 16.5; posterior region z < −11.1.
- No new runtime or build dependency. Build scripts: Node stdlib and `three` (already installed).
- `ankle.bin` is not changed. `fractures.bin` sits beside it, CC BY-SA 4.0, listed in `frontend/public/models/ankle/README.md` Changes.
- `fractures.bin` ≤ 300 KB gzipped; every cell < 65,536 vertices (16-bit indices).
- All per-pattern numbers (plane placement, noise, displacement) live in one file, `frontend/src/components/anatomy/fractureParams.json`.
- Displacement is conservative: 1–3 mm and ≤ 5° per fragment. The talus and whole bones move only when unstable: two or more malleoli, fibula supra/supra_far/proximal, `lateral_subtype = syndesmosis_rupture`, or `medial_subtype = open_mortise`.
- Only answered fractures draw: no default crack for a structure whose level or type is unanswered. Moves only when the form is complete; before that, active pieces show as closed cracks.
- The fracture is behind a `fracture` prop on `AnatomyView`/`Anatomy3D`: on in `FractureForm`, off (today's tint figure, unchanged) in `StudyClassificationForm` while a study is active.
- Reduced motion: fragments jump to their pose.
- No tint, glow or outline on fragments. Labels, syndesmosis bracket and proximal arrow stay.
- If `fractures.bin` fails to load, the bones show whole and the figure keeps working.
- User-facing strings: none added. Comments: short, why only.
- Commits: conventional messages, no co-author trailer or tool attribution (user preference). Work on branch `feat/fracture-simulation`.

## Review Focus

1. Switching answers back and forth (e.g. trimalleolar → lateral only → trimalleolar) must leave no stray fragment displaced or cut face showing; the pose is a function of the state alone.
2. A ligament-only answer (`open_mortise`, `syndesmosis_rupture` with no other break on that bone) cuts nothing on that bone but still moves the talus or fibula.
3. The fibula turns see-through from the lateral side (`placeFibula`); the fibula cells must follow the same ghost material switch, or the posterior fragment hides behind an opaque fibula.
4. The AP and Lateral snapshots (result screen) must show the fracture, since they are what the result shows.
5. `fractures.bin` arriving after the user has already answered must apply the current state at once.

---

### Task 1: Fracture parameters table

**Files:**
- Create: `frontend/src/components/anatomy/fractureParams.json`
- Create: `frontend/src/components/anatomy/fractureParams.ts`
- Test: `frontend/src/components/anatomy/fractureParams.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Vec3 = [number, number, number];
  /** A half-space: points p with dot(p - point, normal) >= 0 are inside; normal is unit length. */
  interface Plane { point: Vec3; normal: Vec3 }
  interface Move { translate: Vec3; /** degrees about axis through origin */ rotate?: { axis: Vec3; origin: Vec3; deg: number } }
  type PieceId = 'fib_tip_avulsion' | 'fib_infra' | 'fib_trans_spiral' | 'fib_trans_short' | 'fib_trans_coronal'
    | 'fib_trans_wedge' | 'fib_trans_comm_a' | 'fib_trans_comm_b' | 'fib_supra' | 'fib_supra_wedge' | 'fib_supra_far'
    | 'med_transverse' | 'med_vertical' | 'post_b1' | 'post_b2' | 'post_b3_pl' | 'post_b3_pm' | 'post_b4'
    | 'post_pm_extraincisural' | 'art_depression';
  interface Piece { id: PieceId; bone: 'tibia' | 'fibula'; /** the region is the intersection */ planes: Plane[];
    /** fractal noise amplitude on the cut, mm */ noise: number; /** conservative move when complete */ move: Move;
    /** 'images' | 'literature', and the cases or reference it comes from */ source: string }
  interface FractureParams { pieces: Piece[]; /** whole-bone moves when unstable */ unstable: { talus: Move; fibula: Move } }
  export const fractureParams: FractureParams; // the JSON, typed
  export const pieceIndex: (id: PieceId) => number; // 0-based position in pieces = bit in a cell mask
  ```
  Array order is priority: a cell belongs to the first active piece whose bit it has.

- [ ] **Step 1: Write the failing tests** in `fractureParams.test.ts`:
  - `has at most 8 pieces per bone` (masks are one byte per bone): count by bone ≤ 8.
  - `every normal is unit length`: `|n| ∈ [0.999, 1.001]`.
  - `keeps every piece at its level` — for each piece, the centroid of its planes' points lies where the classification puts it: `fib_tip_avulsion`, `fib_infra` y < 0; `fib_trans_*` 0 ≤ y ≤ 23; `fib_supra*` 23 < y ≤ 60; `fib_supra_far` y > 60; `med_*` x > 10; `post_*` z < −5; `art_depression` |y| < 4.
  - `keeps moves conservative`: |translate| ≤ 3, |deg| ≤ 5 per piece; unstable talus/fibula |translate| ≤ 3.
  - `cites a source for every piece`: `source` non-empty.
- [ ] **Step 2:** Run `cd frontend && npx vitest run src/components/anatomy/fractureParams.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Write the JSON with literature placeholders (`source: "literature: …"`), then the typed export. Placement:

  | Piece | Region (placeholder) |
  |---|---|
  | `fib_tip_avulsion` | fibula below a near-transverse plane at y −10 |
  | `fib_infra` | fibula below a transverse plane at y −3, 10° oblique |
  | `fib_trans_spiral` | below an oblique sheet rising from anteroinferior (y 0, anterior cortex) to posterosuperior (y 18, posterior cortex) |
  | `fib_trans_short` | below a short oblique plane at y 8 |
  | `fib_trans_coronal` | below a plane low medially (y 4 at x −17) and high laterally (y 14 at x −31) |
  | `fib_trans_wedge` | above the spiral sheet, below y 16, lateral of x −24 |
  | `fib_trans_comm_a`, `_b` | two wedges between y 4 and 16 on the anterior and posterior halves |
  | `fib_supra` | below a short oblique plane at y 40 |
  | `fib_supra_wedge` | wedge between y 34 and 46, lateral half |
  | `fib_supra_far` | below a short oblique plane at y 72 |
  | `med_transverse` | medial of a near-transverse plane from the medial plafond corner (x 14, y 2), 15° up medially |
  | `med_vertical` | medial of a near-vertical plane from the plafond corner (x 12, y 0) to the medial cortex at y 35 |
  | `post_b1` | z < −14, −15 < x < −2, y < 8: small rim, outside the incisura |
  | `post_b2` | z < −8 behind a plane slanting posterolaterally, x < 5, top y 15: includes the incisura |
  | `post_b3_pl` | as `post_b2` |
  | `post_b3_pm` | z < −6, x > 5, y < 18: posteromedial, reaching the posterior colliculus |
  | `post_b4` | behind a plane from the plafond (z −2) to the posterior cortex at y 40, x < 10 |
  | `post_pm_extraincisural` | z < −14, 4 < x < 16, y < 8 |
  | `art_depression` | 8 × 8 × 3 mm box under the plafond, posterolateral (x −6, z −6) |

  Moves (direction, 1–3 mm): distal fibula pieces posterior + proximal + external rotation (axis +y through the fibula centre); medial pieces distal + medial; posterior pieces proximal + posterior; `art_depression` proximal 2 mm; unstable talus lateral 2 mm + external rotation 4°; unstable fibula lateral 2 mm.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat(anatomy): add fracture piece parameters`.

### Task 2: Cutting geometry

**Files:**
- Create: `frontend/scripts/fracture-geometry.mjs`
- Test: `frontend/scripts/fracture-geometry.test.mjs`
- Modify: `frontend/vitest.config.ts` (add `'scripts/**/*.test.mjs'` to `include`)

**Interfaces:**
- Produces (plain JS, JSDoc types):
  ```js
  /** Mesh: { pos: number[] (xyz), index: number[] } */
  export function noisyPlane(plane, noise, seed) // -> sdf(p: number[3]) => number; fbm, 3 octaves, base wavelength 6 mm
  export function split(mesh, sdf) // -> { inside: Mesh, outside: Mesh, rim: number[][] }  shared vertex pool, cut points by 12-step bisection along each crossing edge, computed once per edge
  export function cap(pos, rimLoop, sdf, normalHint) // -> number[] triangles: earcut via THREE.ShapeUtils on the loop projected to the plane, then two rounds of 1->3 centroid insertion; each new vertex is projected onto sdf = 0 along normalHint. Rim edges are never split (no T-junctions).
  export function cutBone(mesh, pieces) // -> cells: { mask: number, mesh: Mesh, face: number[] (per triangle: 0 periosteal, k+1 = cut face of piece k), rim: number[] (per vertex 0 at rim, 1 at >=2 mm inside) }[]
  ```
  `cutBone` splits sequentially by every plane of every piece; a cell's mask bit k is set when the cell is inside all planes of piece k.

- [ ] **Step 1: Write the failing tests** on an icosphere (radius 10, built in the test):
  - `split by a flat plane gives two closed halves`: after `cap`, each half has no open edges; volumes sum to the sphere's within 1%.
  - `split shares the seam`: every `rim` vertex is the same index in `inside` and `outside`.
  - `cap lies on the noisy surface`: |sdf(v)| < 0.02 for every cap vertex, with noise 0.8.
  - `cap leaves the rim whole`: the set of open edges of the uncapped half equals the set of cap boundary edges.
  - `cutBone masks cells by piece`: two overlapping half-space pieces on the sphere give cells with masks {0, 1, 2, 3}, and face tags only for pieces 1 and 2.
- [ ] **Step 2:** Run `cd frontend && npx vitest run scripts/fracture-geometry.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Implement. `split` generalises `clip()` in `build-ankle-model.mjs:228` from `y - level` to `sdf(p)`.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat(anatomy): add fracture cutting geometry`.

### Task 3: Build `fractures.bin`

**Files:**
- Create: `frontend/scripts/build-fracture-model.mjs`
- Create: `frontend/public/models/ankle/fractures.bin` (generated)
- Modify: `frontend/public/models/ankle/README.md` (Changes: the fracture cells; rebuild command)

**Interfaces:**
- Consumes: `cutBone`, `noisyPlane` (Task 2); `fractureParams.json` (Task 1); `ankle.bin`.
- Produces: `fractures.bin`, same container as `ankle.bin` (uint32 JSON length, JSON manifest padded to 4, then 4-aligned chunks). Manifest:
  ```json
  { "version": 1, "quant": { "min": [..], "step": 0.05 }, "pieces": ["fib_tip_avulsion", ...],
    "cells": [{ "bone": "fibula", "mask": 5, "vertices": n, "triangles": m,
                "position": off, "index": off, "face": off, "occlusion": off, "rim": off }] }
  ```
  `position` uint16×3, `index` uint16×3, `face` uint8 per triangle, `occlusion` and `rim` uint8 per vertex. Cut-face vertices take occlusion 90 (of 255); surface vertices interpolate the parent's occlusion.

- [ ] **Step 1:** Decode `ankle.bin` in the script (12 lines mirroring `parseAnkleModel`), run `cutBone` per bone with that bone's pieces in params order, seed fixed per piece id so rebuilds are byte-identical.
- [ ] **Step 2:** Self-checks that fail the build (as `check()` in `build-ankle-model.mjs:500`): every piece has ≥ 1 cell with its bit and ≥ 20 cut-face triangles; every cell is closed (no open edges once its cut faces are included); gzip ≤ 300 KB; each cell < 65,536 vertices. Log per-piece triangle counts and the size.
- [ ] **Step 3:** Run `cd frontend && node scripts/build-fracture-model.mjs`. Expected: all checks pass; prints `fractures.bin N bytes, M gzipped`.
- [ ] **Step 4:** Run it again and `shasum public/models/ankle/fractures.bin` both times. Expected: identical.
- [ ] **Step 5:** Commit `feat(anatomy): build fracture cells into fractures.bin`.

### Task 4: Decode `fractures.bin`

**Files:**
- Create: `frontend/src/components/anatomy/fractureModel.ts`
- Test: `frontend/src/components/anatomy/fractureModel.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface FractureCell { bone: 'tibia' | 'fibula'; mask: number; positions: Float32Array; index: Uint16Array;
    face: Uint8Array; occlusion: Uint8Array; rim: Uint8Array }
  interface FractureModel { pieces: PieceId[]; cells: FractureCell[] }
  export function parseFractureModel(buffer: ArrayBuffer): FractureModel;
  ```
- [ ] **Step 1: Write the failing tests** reading `public/models/ankle/fractures.bin` as `ankleModel.test.ts` does: `decodes cells with in-range indices`; `lists the pieces in params order` (equals `fractureParams.pieces.map(p => p.id)`); `places each piece's cut faces inside its planes` (every vertex of a triangle with face k+1 satisfies all of piece k's planes within 1.5 mm, allowing for noise).
- [ ] **Step 2:** Run `npx vitest run src/components/anatomy/fractureModel.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement, reusing the quantisation decode of `ankleModel.ts:36-54`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(anatomy): decode fracture cells`.

### Task 5: From answers to a fracture pose

**Files:**
- Modify: `frontend/src/components/anatomy/anatomyState.ts`
- Create: `frontend/src/components/anatomy/fracturePose.ts`
- Test: `frontend/src/components/anatomy/fracturePose.test.ts`
- Modify: `frontend/src/components/anatomy/anatomyState.test.ts` (new fields)

**Interfaces:**
- Consumes: `fractureParams`, `pieceIndex`, `PieceId`, `Move` (Task 1); `isFormComplete` (`features/fracture-classification/utils/formValidation.ts:6`).
- Produces:
  ```ts
  // AnatomyState gains (all optional, copied from the form):
  //   lateralMorphology, traceCount, lateralSubtype, infraMorphology, medialMorphology, medialSubtype,
  //   articularInvolvement, articularDepression, posteriorPosteromedial; and complete: boolean.
  interface FracturePose { pieces: PieceId[] /* active, params order */; moves: Partial<Record<PieceId | 'talus' | 'fibula', Move>> }
  export function fracturePose(state: AnatomyState): FracturePose;
  /** fragmentOf is the first active piece whose bit is in mask, or -1 for the main body. */
  export function fragmentOf(mask: number, active: number[]): number;
  /** cutShown: the cut face of piece k on a cell shows only when the cells on its two sides are in different fragments. */
  export function cutShown(mask: number, k: number, active: number[]): boolean; // fragmentOf(mask) !== fragmentOf(mask ^ (1 << k))
  ```
  Piece selection (masks are per bone, so `active` passed to the helpers is the bone's own indices):

  | Answer | Pieces |
  |---|---|
  | lateral, level unknown | none |
  | infra, `infraMorphology = avulsion` | `fib_tip_avulsion` |
  | infra otherwise (incl. `fibula_infrasindesmal_transverse`) | `fib_infra` |
  | trans, `lateralMorphology` oblique / transverse / conminuta / spiral or unset | `fib_trans_coronal` / `fib_trans_short` / spiral + `comm_a` + `comm_b` / `fib_trans_spiral` |
  | trans, `traceCount = multiple` or `lateralSubtype = butterfly` | add `fib_trans_wedge` |
  | supra simple / multifragmentary / supra_far / proximal | `fib_supra` / + `fib_supra_wedge` / `fib_supra_far` / none (arrow) |
  | medial, `medialMorphology = vertical` or medial-only `articularInvolvement = large_with_extension` | `med_vertical` |
  | `medialMorphology = transverse_oblique`, `medialSubtype = malleolus_fracture`, or medial-only `articularInvolvement = small_without_extension` | `med_transverse` |
  | medial, nothing above answered yet | none |
  | `medialSubtype = open_mortise` | no medial piece |
  | posterior unknown | none |
  | `extraincisural` / `posterolateral` / `posteromedial_posterolateral` / `large_posterolateral` | `post_b1` / `post_b2` / `post_b3_pl` + `post_b3_pm` / `post_b4` |
  | `extraincisural_posteromedial` or `posteriorPosteromedial` | `post_pm_extraincisural` |
  | posterior-only `articularInvolvement` large / small | `post_b4` / `post_b1` |
  | `articularDepression` | add `art_depression` |

  Moves only when `state.complete`: each active piece's `move`; plus `talus` and `fibula` from `unstable` when unstable (Global Constraints); `fibula` only for supra, supra_far, proximal or `syndesmosis_rupture`.

- [ ] **Step 1: Write the failing tests**:
  - `covers every reachable answer`: a helper walks `getQuestionSteps(form, getLocalFormOptions(), hasTAC)` depth-first over every option, for `hasTAC` true and false, collecting complete forms (`isFormComplete`). For each: `fracturePose(getAnatomyState(form))` does not throw; every piece's bone is involved by `involved_malleoli`; a fibula piece exists unless the fibula is proximal or not involved; the walk finds > 100 forms.
  - `keeps the fibula at its level`: infra forms only use `fib_tip_avulsion`/`fib_infra`; trans only `fib_trans_*`; supra only `fib_supra*`.
  - `moves nothing until complete`: a trimalleolar form missing its last answer has `moves` = `{}` and non-empty `pieces`.
  - `draws only what is answered`: `{ involved_malleoli: 'trimaleolar' }` alone gives `pieces` = `[]`; adding `fibular_level: 'transindesmal'` gives only `fib_*` pieces.
  - `keeps a stable lateral Weber B in place`: lateral-only, transindesmal, spiral, simple, complete → no `talus` or `fibula` move.
  - `opens the mortise without a medial cut`: lateral+medial with `medial_subtype = open_mortise`, complete → no `med_*` piece, `talus` move present.
  - `cutShown hides faces inside one fragment`: with pieces 0 and 1 active and cell masks 0b11 / 0b01, `cutShown(0b11, 1, [0, 1])` is false (both sides belong to piece 0), `cutShown(0b01, 0, [0, 1])` is true.
  - `returns to the same pose`: `fracturePose` of trimalleolar → lateral-only → trimalleolar states deep-equals the first.
- [ ] **Step 2:** Run `npx vitest run src/components/anatomy/fracturePose.test.ts src/components/anatomy/anatomyState.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Extend `getAnatomyState` (it calls `isFormComplete(form)` for `complete`), then implement `fracturePose`, `fragmentOf`, `cutShown`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(anatomy): map answers to a fracture pose`.

### Task 6: Draw the fracture

**Files:**
- Modify: `frontend/src/components/anatomy/ankleScene.ts` (`boneMaterial` cut-face branch; new `setFractures`; `setState`; `placeFibula`; `dispose`)
- Modify: `frontend/src/components/anatomy/Anatomy3D.tsx` (`loadFractures` beside `loadModel`, line 50)
- Modify: `frontend/src/components/anatomy/AnatomyView.tsx`, `frontend/src/features/fracture-classification/components/FractureForm.tsx` (`fracture` prop)

**Interfaces:**
- Consumes: `parseFractureModel`, `FractureModel` (Task 4); `fracturePose`, `cutShown`, `fragmentOf` (Task 5).
- Produces: `AnkleScene.setFractures(model: FractureModel): void`.

- [ ] **Step 1: Material.** `boneMaterial` takes two new attributes, `cut` (1 on cut-face vertices, from `face`) and `rim`. Where `cut` = 1: ivory cortical colour for `rim` < 0.35, else a warmer darker cancellous base (`#cdb48f`) modulated by a 3D cellular (Worley) pattern of 1.2 mm cells in model space, with roughness 0.85 and no sheen. Periosteal shading unchanged.
- [ ] **Step 2: Cells.** `setFractures` builds one mesh per cell with the fill material (and its hull), with the triangles ordered so each piece's cut faces form one geometry group; hides the uncut tibia and fibula meshes; puts cells under one `Group` per fragment. Normals: periosteal vertices take the normal of the nearest uncut-bone vertex, so seams between cells of one fragment don't shade.
- [ ] **Step 3: Pose.** `setState` computes `fracturePose`, regroups cells with `fragmentOf`, sets each cut-face group's `materialIndex` to the fill or to a `visible: false` material from `cutShown`, and eases each fragment group and the talus to its `Move` over 600 ms with the existing `ease` (jump when `reducedMotion()`). Whole-fibula moves apply to every fibula group; fibula pieces move relative to it.
- [ ] **Step 4: Ghost.** `placeFibula` switches the material of every fibula cell mesh, not only the uncut one.
- [ ] **Step 5: Load.** `AnatomyView` and `Anatomy3D` take `fracture?: boolean` (default false); `FractureForm` passes `fracture`, `StudyClassificationForm` does not. With it off nothing below happens and the figure is exactly today's. With it on, `Anatomy3D` fetches `/models/ankle/fractures.bin` after the scene is created and calls `setFractures` then `setState(state)`; on failure it logs once and leaves the bones whole (no `onFail`).
- [ ] **Step 6: Tint off with the fracture.** When fractures are set, `setState` drives the lateral, medial, posterior and level-band highlights to 0; labels, the syndesmosis bracket and the proximal arrow stay. Without fractures the highlights work as today, so `marksFor` and its tests are unchanged.
- [ ] **Step 7: Check.** Run `cd frontend && npx tsc -p tsconfig.app.json --noEmit && npm run lint && npx vitest run`. Expected: all pass.
- [ ] **Step 8: See it.** With `make run`, in headless Chromium via Node (never the visible Playwright window), answer these paths and save 3D, AP and Lateral screenshots of the figure to the scratchpad: lateral-only infra avulsion; lateral-only trans spiral; trimalleolar trans spiral Bartonicek 2; trimalleolar Bartonicek 3; lateral+medial vertical (SA); suprasyndesmotic multifragmentary + open mortise; proximal (Maisonneuve); posterior-only large with depression. Each must show the break at the right place, no gaps or z-fighting at seams, no stray cut faces, and the result screen's snapshots matching. Then switch trimalleolar → lateral only → trimalleolar and confirm the figure returns exactly. Open a study case form and confirm the figure is today's tint figure, unchanged.
- [ ] **Step 9:** Commit `feat(anatomy): show fractures in the 3D ankle`.

### Task 7: Reference values and the review pack

Starts when the Codex reference reading (`codex_reference.md` in the session scratchpad) is back.

**Files:**
- Modify: `frontend/src/components/anatomy/fractureParams.json` (values and `source`)
- Create: `docs/fracture-patterns.md` (the review table and screenshots for Laura)
- Regenerate: `frontend/public/models/ankle/fractures.bin`

- [ ] **Step 1:** Reconcile Claude's and Codex's per-group readings: for each piece, take the median level, angle and fragment size; where the two disagree by more than 5 mm or 15°, re-read those cases and record the decision. Set `source` to `images: <n> cases (<groups>)` or `literature: <reference>`.
- [ ] **Step 2:** Rebuild (`node scripts/build-fracture-model.mjs`) and rerun `npx vitest run`. Expected: PASS.
- [ ] **Step 3:** Regenerate the Task 6 Step 8 screenshots and write `docs/fracture-patterns.md`: one row per pattern with level, orientation, fragment size, displacement, source, and its three screenshots, in English. Note that it needs Laura's review before any presentation.
- [ ] **Step 4:** Commit `feat(anatomy): set fracture values from the case reference study`.
