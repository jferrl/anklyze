# Fracture simulation in the 3D ankle

## Intent

The classifier's 3D ankle (`frontend/src/components/anatomy/`) today marks the injured structures
with a translucent tint and level bands. It should instead show the fracture itself: real fracture
lines through the bone, separate fragments, and the displacement typical of each pattern, so the
figure reads like the injury a surgeon would picture. It must look realistic and professional; it
also appears in the international presentation of Anklyze (English first).

The simulation is one standard fracture per pattern the form describes. It does not model any one
patient. The 120 published cases (X-rays and CT snapshots, anonymised, gold standard per case) are
reference material for the shape, level and displacement of each pattern.

## Goals

- Every answer combination the form can reach shows an anatomically plausible fracture: the right
  bone, level, line orientation, fragment size and typical displacement.
- The fracture builds up while a rater answers, and the same figure shows with the result.
- Fracture faces read as broken bone: rough edge, cortical rim, cancellous interior.
- Parameters (levels, angles, fragment sizes, displacement) come from the reference study and are
  written down with their source, so a clinician can check them.

## Non-goals

- Per-patient reconstruction from the case images (2D X-rays and a few CT JPGs cannot support it).
- Soft tissue (ligaments, the deltoid, the syndesmosis ligaments) beyond what the figure already
  draws.
- Physics or animation of the injury mechanism.
- A user control for the amount of displacement.

## Anti-goals

- A fracture that is anatomically wrong for its classification (e.g. a Weber B line above the
  syndesmosis, a Bartonicek 1 fragment that enters the incisura). That would be worse than the tint.
- A game-like look: exploding fragments, glow, gore.
- Slowing the classification form: the model must still load and turn as smoothly as now.

## Constraints

- Model: BodyParts3D right tibia, fibula and talus, distal 100 mm, built by
  `frontend/scripts/build-ankle-model.mjs` into `frontend/public/models/ankle/ankle.bin`
  (CC BY-SA 4.0; any new geometry stays under that licence and the README's Changes list grows).
- Frame: mm, origin on the plafond over the talar dome, +y superior, +z anterior, +x medial.
- three.js 0.186, no new runtime dependency unless the plan shows it is needed.
- Build script: Node stdlib only, reproducible, checked by hashes as today.
- The answers are the input (`FractureInput`), through `getAnatomyState`, as today. Gold codes are
  not used at runtime.
- Reduced motion: fragments appear in their displaced place with no animation.

## Approaches

1. **Pre-cut at build time (chosen).** The build script cuts each bone along every fracture surface
   the patterns need and stores the pieces; the viewer groups pieces into fragments and moves them.
   Best fidelity: real closed fracture faces, rough edges, baked occlusion on the faces. Cost: a
   larger `ankle.bin` (estimate +150-300 KB) and a more involved build script.
2. Cut in the browser: split the mesh live from the answers. No build step and fully tunable, but
   capping a rough cut live is fragile and the faces look worse up close.
3. Per-case reconstruction: ruled out, see non-goals.

The user chose 1.

## Design

### Cells, not variants

Shipping one tibia per combination of medial and posterior pattern would multiply the tibia about
fifteen times. Instead each bone is cut once by **all** its fracture surfaces, which splits it into
small **cells**. Every cut face is stored with the id of the surface that made it. At runtime a
pattern is a grouping of cells into fragments:

- a fragment is a set of cells moved by one transform;
- a cut face shows only when the cells on its two sides are in different fragments; otherwise it is
  hidden and the two cells meet as unbroken bone (the cut points are computed once per edge, so the
  surface seam is exact; normals come from the uncut bone so the seam does not shade).

Fibula surfaces: Weber A tip avulsion (transverse) and infrasyndesmotic malleolus fracture; Weber B
short oblique and long spiral (anteroinferior to posterosuperior); Weber C simple diaphyseal,
multifragmentary (wedge) and far (>6 cm). The proximal (Maisonneuve) fracture is outside the model
and keeps the existing arrow.

Also on the fibula, to cover every answer the engine branches on: a butterfly (wedge) fragment and
a comminuted zone at the transsyndesmotic level (`fibula_trace_count = multiple`,
`lateral_subtype = butterfly`, `lateral_morphology = conminuta`), and the coronal oblique line,
"low medial, high lateral" (`lateral_morphology = oblique`), distinct from the SER spiral.

Ligament-only answers (`lateral_subtype = syndesmosis_rupture`, `medial_subtype = open_mortise`)
cut nothing: the fibula (diastasis) or the talus (medial clear space) moves as a whole bone.
Articular depression (`has_articular_depression`) is a small osteochondral cell under the plafond
pushed proximally. Medial transverse/oblique shows supracollicular unless the study says otherwise
(builder's call, noted). `AnatomyState` grows to carry these fields.

Tibia surfaces: medial transverse/oblique (tip and supracollicular) and vertical (shear); posterior
Bartonicek 1 (extraincisural), 2 (posterolateral into the incisura), 3 (posteromedial plus
posterolateral, two parts), 4 (large triangular posterolateral) and the extraincisural posteromedial
fragment of the medial+posterior path.

### Fracture surfaces

Each surface is a signed-distance function: a plane or helical sheet from the reference study plus
fractal noise (about 0.5-1 mm) so the edge is jagged. `clip()` in the build script generalises from
"y above a level" to "sign of the SDF", with the cut point found by bisection along each edge. Each
cut face is triangulated with interior points displaced onto the noisy surface, not a flat fan.

### Look

The bone material gains a cut-face branch: a thin cortical rim near the face's edge, cancellous
(trabecular) texture inside, slightly darker and warmer than the periosteal surface, with the baked
occlusion. No tint, glow or outline on fragments; the existing labels and syndesmosis bracket stay.

### Displacement

Conservative (user's decision): the form never asks about displacement or stability, so fragments
only separate enough for the break to read (about 1-3 mm along the study's displacement direction,
small rotation). The talus and whole bones move only when the answers imply instability:
bimalleolar or trimalleolar patterns, Weber C, syndesmosis rupture, or deltoid rupture
(`open_mortise`). Directions come from the reference study (e.g. SER Weber B distal fibula:
posterior, proximal, external rotation; posterior fragment: proximal with a step-off). Fragments ease from closed to displaced over the
house curve; the talus follows when the pattern implies talar shift.

### Building up while answering

The figure shows only what has been answered, so it never suggests an answer (a default crack would
nudge raters towards the commonest pattern, e.g. Weber B):

- A structure becomes known as involved: it is labelled, nothing is cut yet.
- The level or type becomes known: that fracture shows as a closed, undisplaced crack.
- The pattern is complete: fragments displace.
- "Not classifiable" and impossible results show the cracks without displacement.

With the fracture on, the tint and level bands go; the camera presets and labels keep working.

### Studies

A study is in progress and its form shows the same figure. Changing the tool mid-study would mean
early and late raters used different figures, so the study form keeps today's figure (tint and
bands) until the user turns the fracture on for studies, e.g. for the next study (user's decision).
The figure takes a `fracture` switch: on in the classification page, off in the study form.

### Reference study (in progress)

Claude and Codex each read up to three cases per gold-standard group (53 cases, 170 images, OCR
checked: no personal data, only side and scale markers) and record per case the fracture levels,
orientations, fragment sizes and displacement. Per group they agree a consensus geometry, marking
what comes from images and what from literature where a group has few cases. That table goes into
`frontend/public/models/ankle/README.md` (or a sibling file) and drives the build script's
constants. Clinical review (Laura) happens after release, from that table and a screenshot per
pattern; it is not a release gate (user's decision), but it must happen before the figure is used in a
presentation. The values must be easy to change in one place.

### Size

`ankle.bin` is 273 KB gzipped and the build fails above 400 KB; each bone must stay under 65,536
vertices (16-bit indices). The cells and cut faces go in a second file, `fractures.bin`, fetched
after the base model draws, so first paint is unchanged; until it arrives the figure shows the bones
whole. Its own gzipped cap is set in the build script (target under 300 KB).

## Left to the builder

- Exact SDF shapes and noise, within the reference ranges.
- Storage layout of cells and cut faces in `ankle.bin` (manifest version bump).
- How fragment grouping is expressed in code (a table from AnatomyState to cell groups is the
  likely shape) and how it is tested.
- Easing timings within the existing motion constants.
