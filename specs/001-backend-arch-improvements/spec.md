# Feature Specification: Backend Architecture Improvements

**Feature Branch**: `001-backend-arch-improvements`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "Review backend architecture and code against constitution principles to identify and implement improvements"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Classification Logic Safety Net (Priority: P1)

As a clinical user, I need confidence that the fracture classification
algorithm produces correct results every time, so that I can trust the tool
in clinical decision-making.

Today the classification rules engine (~540 lines of medical logic) has
zero automated test coverage. Any accidental change to the decision tree
could silently produce incorrect classifications without detection.

**Why this priority**: This is the highest-risk gap — incorrect medical
classifications directly undermine the tool's core value proposition and
the Clinical Accuracy First principle.

**Independent Test**: Run the classification test suite in isolation;
every known fracture input combination produces the documented correct
classification output.

**Acceptance Scenarios**:

1. **Given** a posterior-only fracture input, **When** the classification
   engine processes it, **Then** the result matches the expected AO/OTA,
   Lauge-Hansen, and Bartonicek codes for that fracture pattern.
2. **Given** a fracture combination that is anatomically impossible (e.g.,
   SA mechanism with posterior malleolus), **When** the engine processes it,
   **Then** it returns an `Impossible` result with the correct reason key.
3. **Given** a golden snapshot of current engine outputs for all known
   fracture input permutations, **When** the engine processes each one,
   **Then** every result matches the snapshot with zero deviations
   (regression safety net).
4. **Given** a future code change to the rules engine, **When** CI runs,
   **Then** any classification regression is detected and the build fails.

---

### User Story 2 - Domain Behavior Ownership (Priority: P2)

As a developer maintaining Anklyze, I need business rules to live inside
domain models and services rather than in HTTP handlers, so that logic is
centralized, testable, and not duplicated across endpoints.

Currently, handlers make business decisions (checking access, enforcing
single-response rules, validating case state) by querying repositories
and inspecting model fields directly instead of delegating to domain
methods.

**Why this priority**: Scattered business logic increases the risk of
inconsistencies and makes the codebase harder to maintain. Fixing this
improves long-term velocity and reduces bug surface area.

**Independent Test**: Modify any business rule in one place and confirm
all endpoints reflect the change without needing handler modifications.

**Acceptance Scenarios**:

1. **Given** a user attempting to submit a response to a published case,
   **When** the system checks eligibility, **Then** the domain model (not
   the handler) determines whether the submission is allowed based on
   status, deadline, and duplicate-response rules. The handler pre-fetches
   access-related booleans (e.g., study membership, prior responses) and
   passes them to the domain method to keep the model repository-free.
2. **Given** a case that does not allow multiple responses and a user who
   has already responded, **When** the user attempts a second response,
   **Then** the domain model rejects it with a specific reason — the
   handler only translates the rejection to an HTTP response.
3. **Given** an admin performing a case state transition (draft → published
   → closed), **When** the transition is requested, **Then** the domain
   model validates and executes the transition, raising a domain error if
   the transition is invalid.

---

### User Story 3 - Leaner Service Layer (Priority: P3)

As a developer, I need each architectural layer to justify its existence,
so that the codebase avoids unnecessary indirection and stays easy to
navigate.

The classifier service is currently a single-method passthrough that adds
no value — it delegates directly to the rules engine without any
additional logic, validation, or orchestration.

**Why this priority**: Unnecessary layers add cognitive load without
benefit. Removing or enriching them aligns with the Deep Modules and
Pragmatic Architecture principles.

**Independent Test**: The classification flow works end-to-end with fewer
indirection layers and the same correctness guarantees.

**Acceptance Scenarios**:

1. **Given** the classification flow, **When** a fracture input is
   processed, **Then** callers invoke the rules engine directly — the
   classifier service no longer exists as an intermediary.
2. **Given** a service that orchestrates multiple concerns (e.g., chat
   service combining LLM extraction with classification), **When** it
   processes a request, **Then** the service encapsulates all decision-
   making (including confidence thresholds) as configurable policy rather
   than hardcoded values.

---

### User Story 4 - Consistent Error Handling (Priority: P3)

As a developer debugging production issues, I need errors to carry
sufficient context through the call stack, so that I can quickly trace
the root cause of any failure.

Currently, many error paths log and return without wrapping, losing the
call chain context.

**Why this priority**: Poor error context slows down incident response.
This is a code quality improvement that pays off continuously.

**Independent Test**: Trigger an error deep in the repository layer and
confirm the resulting log entry contains the full call chain with context
at each layer.

**Acceptance Scenarios**:

1. **Given** a database error in a repository method, **When** it
   propagates through the service and handler layers, **Then** each layer
   wraps the error with context using standard error wrapping conventions.
2. **Given** a domain validation error, **When** the handler receives it,
   **Then** the error maps to the correct HTTP status and domain error
   code without losing the original error chain.

---

### Edge Cases

- What happens when a classification rule is ambiguous (multiple valid
  classifications for the same input)? The engine MUST return the
  `Ambiguous` flag consistently.
- How does the system handle a domain model method being called in an
  invalid state (e.g., publishing an already-closed case)? Domain methods
  MUST return typed errors, not panic.
- What if the rules engine receives an input combination not covered by
  any decision branch? It MUST return a clear "unclassifiable" result
  rather than a nil pointer or empty result.

## Clarifications

### Session 2026-02-20

- Q: Must HTTP API response shapes and status codes remain identical after refactoring? → A: Breaking changes allowed — frontend will be updated in parallel.
- Q: What should happen to the passthrough classifier service? → A: Remove entirely — inject the rules engine directly into callers.
- Q: How should correct classification outputs be determined for tests? → A: Capture golden snapshot of current engine outputs as the regression test baseline.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The classification rules engine MUST have automated
  regression tests based on a golden snapshot of current outputs, covering
  every decision branch for all four classification systems (Danis-Weber,
  Lauge-Hansen, AO/OTA, Bartonicek).
- **FR-002**: Domain models MUST own all business rule validation — access
  control eligibility, state transition validity, and response submission
  rules MUST be expressed as domain model methods.
- **FR-003**: Handlers MUST NOT contain conditional business logic; they
  MUST delegate decisions to domain models or services and translate
  results to HTTP responses.
- **FR-004**: The classifier service MUST be removed. Callers MUST
  consume the rules engine directly. No passthrough-only service layers
  are permitted.
- **FR-005**: All errors crossing layer boundaries MUST be wrapped with
  contextual information using standard error wrapping conventions.
- **FR-006**: Domain model behavioral methods (e.g., `CanAcceptResponses`,
  `CanBeEdited`, state transitions) MUST have unit tests.
- **FR-007**: Chat input validation rules MUST have automated tests
  covering all defined error codes and spam detection patterns.
- **FR-008**: API response shapes and error codes MAY change during this
  refactoring. Any breaking changes MUST be accompanied by corresponding
  frontend updates within the same feature branch.

### Key Entities

- **Case**: Patient X-ray for classification — owns state machine
  (draft → published → closed), response eligibility rules, and access
  control logic.
- **ClassificationResult**: Output of the rules engine — MUST be fully
  deterministic for any given FractureInput.
- **FractureInput**: Input to the classification engine — represents
  clinical observations about the fracture pattern.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of classification rules engine decision branches are
  covered by automated tests, verified by running the test suite.
- **SC-002**: Zero business logic conditionals remain in HTTP handler
  functions — all business decisions are delegated to domain or service
  layer methods.
- **SC-003**: All domain model behavioral methods have at least one unit
  test each, including edge cases for invalid state transitions.
- **SC-004**: Every error propagated across architectural layers includes
  contextual wrapping, verified by inspecting error chains in tests.
- **SC-005**: No passthrough-only service layers exist — every service
  method adds meaningful logic beyond delegation.
- **SC-006**: Chat input validation achieves full test coverage for all
  defined error codes and detection patterns.
