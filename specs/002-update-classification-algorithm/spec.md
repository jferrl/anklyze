# Feature Specification: Update Classification Algorithm v2

**Feature Branch**: `002-update-classification-algorithm`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Update the classification algorithm business logic to a new version"

## User Scenarios & Testing

### User Story 1 - Rater classifies fractures using updated decision tree (Priority: P1)

A rater (clinician) opens the fracture classification form and answers questions about a patient's ankle fracture. The system guides them through the updated decision tree, which includes new branching logic for posterior-only, medial-only, medial+posterior, and lateral+posterior infrasyndesmotic paths. The rater receives an accurate classification across all four systems (Danis-Weber, Lauge-Hansen, AO/OTA, Bartonicek) reflecting the latest clinical consensus.

**Why this priority**: This is the core user-facing functionality. Without the updated classification logic, raters will produce incorrect or incomplete results using the outdated algorithm.

**Independent Test**: Can be fully tested by submitting fracture inputs through the questionnaire form for each of the 7 malleoli combinations and verifying the classification output matches the new flow diagram terminal nodes.

**Acceptance Scenarios**:

1. **Given** a rater selects "posterior malleolus only" with <1/3 articular surface involvement, **When** they answer CT scan and posterior type questions, **Then** the system returns the correct AO "No clasificable" + Lauge-Hansen PA + Bartonicek type result.
2. **Given** a rater selects "posterior malleolus only" with >1/3 articular surface with metaphyseal extension, **When** they answer the articular depression question, **Then** the system returns AO 43 B1 (no depression) or AO 43 B2 (with depression) as a distal tibia fracture.
3. **Given** a rater selects "medial malleolus only" with significant articular involvement and metaphyseal extension, **When** they answer the articular depression question, **Then** the system returns AO 43 B1 or AO 43 B2 as a distal tibia fracture.
4. **Given** a rater selects "medial and posterior" malleoli, **When** CT scan is available and they select "Extraincisural postero-medial fragment", **Then** the system returns AO 44 A3 + Lauge-Hansen "No clasificable".
5. **Given** a rater selects "lateral and posterior" with infrasyndesmotic level, **When** CT scan is available and the posterior fragment is posteromedial, **Then** the system returns AO 44 A3 + Lauge-Hansen "No clasificable" + Weber A.
6. **Given** a rater selects a suprasyndesmotic path (any malleoli combination), **When** fibula trace pattern is "Suprasyndesmotic (>6cm from articular surface)", **Then** the system classifies it identically to the "parasyndesmotic long oblique/spiral" pattern (PER mechanism).
7. **Given** a rater selects "lateral only" transsyndesmotic, **When** they specify spiral or transverse/oblique morphology, **Then** the AO code is "44 B (subtype unclassifiable B1/B2)" instead of a specific B1 subtype.

---

### User Story 2 - Frontend form shows correct questions per path (Priority: P1)

The classification form dynamically shows and hides questions based on the rater's answers, matching the updated decision tree exactly. New questions for articular involvement, metaphyseal extension, articular depression, and posteromedial fragment identification appear when relevant. The form completion logic accurately detects when enough data has been collected to reach a terminal node.

**Why this priority**: The form is the primary classification interface. Incorrect show/hide logic means raters cannot reach the correct classification or see irrelevant questions.

**Independent Test**: Can be tested by stepping through each of the 7 malleoli paths in the form and verifying only the questions shown in the MMD flow diagram appear, and the form becomes submittable exactly when a terminal node is reached.

**Acceptance Scenarios**:

1. **Given** a rater selects "posterior malleolus only", **When** they are shown the articular involvement question, **Then** the options are ">1/3 with metaphyseal extension" and "<1/3 without metaphyseal extension".
2. **Given** a rater selects "medial malleolus only", **When** they answer "Yes" to significant articular involvement with metaphyseal extension, **Then** they see the articular depression question and NOT the morphology question.
3. **Given** a rater selects "medial and posterior", **When** CT is available, **Then** the posterior type options include "Extraincisural postero-medial fragment" as an additional option.
4. **Given** a rater selects "lateral and posterior" with infrasyndesmotic level, **When** CT is available, **Then** they are asked "Is the posterior fragment posteromedial?".
5. **Given** a suprasyndesmotic path with simple or multifragmentary type, **When** the fibula trace pattern question appears, **Then** three options are shown: parasyndesmotic short, parasyndesmotic long/spiral, and suprasyndesmotic (>6cm).

---

### User Story 3 - Chat-based classification reflects updated algorithm (Priority: P2)

A rater describes a fracture in natural language through the chat interface. The LLM extracts structured fracture input and the rules engine produces a classification consistent with the updated flow. The LLM prompts include updated decision tree information so extraction accuracy is maintained.

**Why this priority**: The chat interface is a secondary classification pathway. It depends on the same rules engine but also requires LLM prompt updates to correctly extract the new fields.

**Independent Test**: Can be tested by sending natural language descriptions of fractures that exercise the new branching paths (e.g., "posterior malleolus fracture with >1/3 articular surface involvement and metaphyseal extension with articular depression") and verifying the output matches expected classifications.

**Acceptance Scenarios**:

1. **Given** a rater describes a posterior-only fracture with metaphyseal extension in natural language, **When** the LLM extracts the input and the rules engine classifies it, **Then** the result includes AO 43 B1 or B2 as appropriate.
2. **Given** a rater describes a medial+posterior fracture with a posteromedial extraincisural fragment, **When** the system classifies it, **Then** the result includes AO 44 A3 and Lauge-Hansen "No clasificable".

---

### User Story 4 - Frontend displays updated flowcharts and translations (Priority: P2)

Embedded flowchart visualizations and all user-facing labels (questions, options, results) in both English and Spanish reflect the updated algorithm. Labels match the reference MMD diagrams exactly.

**Why this priority**: Translation and visual accuracy are important for clinical reliability studies but depend on the core logic being correct first.

**Independent Test**: Can be tested by switching between English and Spanish locales and comparing every question text, option label, and result description against the reference MMD diagrams.

**Acceptance Scenarios**:

1. **Given** a rater views the classification flowchart in English, **When** they examine any decision node, **Then** the question text and option labels match the English reference MMD exactly.
2. **Given** a rater views a classification result that includes the new AO 43 B1/B2 codes, **Then** the result displays a human-readable description in the selected language.
3. **Given** a rater encounters a "No clasificable" (unclassifiable) Lauge-Hansen result, **Then** the description explains what "unclassifiable" means in context.

---

### User Story 5 - Existing classifications remain backward-compatible (Priority: P3)

Previously submitted case responses and reference classifications stored in the database continue to render correctly. The system handles both old and new classification codes gracefully.

**Why this priority**: Data integrity for existing studies and cases must be preserved, but this is lower priority since the vast majority of paths produce the same outputs.

**Independent Test**: Can be tested by querying existing case responses from the database and verifying they still render properly in the results view.

**Acceptance Scenarios**:

1. **Given** a case response was submitted under the previous algorithm version, **When** a user views the response details, **Then** all classification fields render without errors.
2. **Given** a study contains responses from both algorithm versions, **When** reliability statistics are calculated, **Then** comparisons use consistent classification codes.

---

### Edge Cases

- What happens when a rater selects "lateral + posterior" with infrasyndesmotic level and no CT scan? The system should return a result without Bartonicek classification (AO/Lauge-Hansen unclassifiable, Weber A).
- How does the system handle the "Fractura de tibia distal" (AO 43 B1/B2) results which are technically not ankle fracture classifications? The result should clearly indicate this is a distal tibia fracture, distinct from ankle fracture classifications.
- What happens when a rater encounters the "No posible, mecanismo excepcional" (impossible/exceptional mechanism) result for trimaleolar + infrasyndesmotic + transverse? The system should display this as an exceptional case.
- How does the system handle the new "Extraincisural postero-medial" posterior fragment type that only appears in the medial+posterior path? Other paths should NOT show this option.
- What happens when suprasyndesmotic >6cm trace pattern is selected? It should produce the same PER classification as parasyndesmotic long oblique/spiral.

## Requirements

### Functional Requirements

- **FR-001**: System MUST implement the updated classification decision tree as defined in the reference flow diagram `docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd`.
- **FR-002**: System MUST add articular surface involvement branching for posterior-only malleolus path: >1/3 with metaphyseal extension leads to AO 43 B1/B2 (distal tibia), <1/3 without extension leads to existing Bartonicek classification.
- **FR-003**: System MUST add articular involvement with metaphyseal extension branching for medial-only malleolus path: significant involvement leads to AO 43 B1/B2, otherwise proceeds to morphology question.
- **FR-004**: System MUST add articular depression sub-question for both posterior-only (>1/3) and medial-only (significant involvement) paths to differentiate between AO 43 B1 and AO 43 B2.
- **FR-005**: System MUST support "Extraincisural postero-medial" as a new posterior fragment type option in the medial+posterior path, resulting in AO 44 A3 + Lauge-Hansen "No clasificable".
- **FR-006**: System MUST handle the new lateral+posterior infrasyndesmotic path with CT scan question and posteromedial fragment identification, producing AO 44 A3 or standard Bartonicek results depending on fragment location.
- **FR-007**: System MUST support three fibula trace pattern options for suprasyndesmotic paths: parasyndesmotic short, parasyndesmotic long/spiral, and suprasyndesmotic (>6cm), where suprasyndesmotic >6cm produces the same classification as parasyndesmotic long/spiral (PER mechanism).
- **FR-008**: System MUST update AO codes for lateral-only transsyndesmotic fractures to "44 B (subtype unclassifiable B1/B2)" instead of specific B1 subtypes.
- **FR-009**: System MUST create the English translation of the reference MMD flow diagram to match the new Spanish source.
- **FR-010**: System MUST update LLM prompts (both English and Spanish) to reflect the new decision tree, including new fields and branching logic.
- **FR-011**: System MUST update all frontend form show/hide logic, completion detection, and progress calculation to match the new decision tree paths.
- **FR-012**: System MUST update embedded flowchart visualizations in both languages to match the reference MMD.
- **FR-013**: System MUST update all translation files (i18n) in both languages for new questions, options, and result descriptions.
- **FR-014**: System MUST return only codes/keys from the backend (no translated descriptions), following the existing frontend-first translation architecture.

### Key Entities

- **ClassificationResult**: Extended to support new AO codes (43 B1, 43 B2, 44 A3) and the "distal tibia fracture" fracture type alongside existing ankle fracture types.
- **FractureInput**: Extended with new fields for articular surface involvement, metaphyseal extension, articular depression, and posteromedial fragment identification.
- **Posterior Fragment Type**: Extended with "Extraincisural postero-medial" option for medial+posterior path.
- **Fibula Trace Pattern**: Extended with "Suprasyndesmotic (>6cm)" option for suprasyndesmotic paths.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 7 malleoli combination paths in the classification form produce results matching the reference flow diagram terminal nodes with 100% accuracy.
- **SC-002**: All existing backend tests pass after updates, and new tests cover every new branching path introduced in the updated flow.
- **SC-003**: Frontend form shows exactly the correct questions for each path (no extra, no missing) as verified by path-by-path comparison against the reference MMD.
- **SC-004**: Both English and Spanish translations are complete and match the reference MMD labels exactly (verified by node-by-node comparison).
- **SC-005**: E2E tests pass for all classification paths including new ones.
- **SC-006**: Previously submitted case responses continue to display correctly without data loss or rendering errors.

## Clarifications

### Session 2026-02-22

- Q: How should all classification results (including new AO 43 B1/B2 and AO 44 A3 terminal nodes) be treated? → A: The flow diagram (`docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd`) is the single source of truth. Every terminal node in the diagram is a valid classification result stored and treated equally. No terminal node should be excluded, modified, or given special treatment beyond what the diagram specifies.

## Assumptions

- The Spanish MMD file (`docs/Danis-Weber AO_OTA Flow-2026-02-22-ES.mmd`) is the authoritative source of truth for the new classification logic.
- The English version will be created as a translation of the Spanish source, following the established naming convention (`-EN` suffix).
- The update-flow command (`.claude/commands/update-flow.md`) defines the complete step-by-step process for propagating flow changes across the full stack.
- The AO 43 B1/B2 codes represent distal tibia fractures, which are a distinct entity from standard ankle fracture classifications but still need to be handled within the same classification flow.
- Existing database records with old classification codes do not need migration; the frontend will handle display of both old and new codes gracefully.
- The new "Suprasyndesmotic >6cm" trace pattern option is clinically equivalent to the "parasyndesmotic long oblique/spiral" pattern for classification purposes (both produce PER mechanism).
