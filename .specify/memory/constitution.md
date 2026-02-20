<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0
Modified principles: N/A (initial adoption)
Added sections:
  - Core Principles (6 principles)
  - Technology Constraints
  - Development Workflow
  - Security & Privacy
  - Internationalization
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ compatible (Constitution Check section present)
  - .specify/templates/spec-template.md — ✅ compatible (requirements and success criteria align)
  - .specify/templates/tasks-template.md — ✅ compatible (phase structure supports TDD and story-driven flow)
Follow-up TODOs: None
-->

# Anklyze Constitution

## Core Principles

### I. Clinical Accuracy First

Every classification rule, algorithm, and clinical output MUST be derived from
peer-reviewed orthopedic literature. No feature, optimization, or refactor
may compromise the medical correctness of Lauge-Hansen, Danis-Weber, AO/OTA,
or Bartonicek classification results.

- Classification logic in `internal/rules/` MUST reference the source
  literature or validated clinical algorithm it implements.
- Any change to classification output MUST be verified against known
  correct cases before merge.
- When in doubt between UX convenience and clinical precision, clinical
  precision wins.

### II. Test-Driven Development

All classification rules and business-critical logic MUST have tests written
before implementation. The red-green-refactor cycle is enforced for domain
code.

- `internal/rules/` and `internal/service/` packages MUST maintain test
  coverage for every exported function.
- Tests MUST assert against clinically validated expected outputs, not
  implementation details.
- Regression tests MUST be added for every bug fix — the failing test
  comes first.
- Frontend components that encode clinical logic (e.g., guided
  questionnaire flow) MUST have corresponding test coverage.

### III. Idiomatic Go

The backend MUST follow standard Go conventions, tooling, and community
best practices. Code MUST pass `go vet`, `go fmt`, and produce zero lint
warnings.

- Use the standard library where it suffices; third-party dependencies
  MUST be justified.
- Error handling follows Go conventions: return errors, wrap with context
  via `fmt.Errorf("...: %w", err)`, never panic in library code.
- Naming follows Go conventions: short, descriptive names; acronyms in
  consistent case; unexported by default.
- Concurrency primitives (goroutines, channels) MUST only be introduced
  when there is a measured need, not speculatively.

### IV. Tell, Don't Ask

Objects and services MUST expose behavior, not state. Callers tell an
object what to do rather than querying its internals and deciding
externally.

- Services MUST encapsulate decisions — handlers call service methods
  that perform complete operations, not getters followed by conditionals.
- Domain models MUST own their validation and state transitions. A `Case`
  knows how to transition from `draft` to `published`; the handler does
  not assemble this logic.
- Avoid getter/setter patterns that leak internal state. Expose methods
  that express intent (e.g., `case.Publish()` not `case.SetStatus("published")`).

### V. Deep Modules

Modules MUST provide rich functionality behind simple interfaces. A module's
interface should be small relative to the complexity it hides. Shallow
modules that add abstraction without reducing cognitive load are discouraged.

- Each package in `internal/` MUST have a clear, narrow public API that
  hides implementation complexity.
- Repository interfaces MUST be defined by what the consumer needs, not
  by what the database can do — avoid 1:1 CRUD mirrors of tables.
- Prefer fewer, more capable functions over many thin wrappers. A
  `ClassifyFracture(input)` that handles the full pipeline is better than
  five granular steps the caller must orchestrate.
- New packages MUST justify their existence: if a package exports only
  one type or function, it likely belongs in an existing package.

### VI. Pragmatic Architecture

The codebase follows a layered architecture (handlers → services →
repositories → domain) but MUST NOT over-engineer. Every layer and
abstraction MUST earn its place by solving a real, current problem.

- Handlers (`internal/api/`) own HTTP concerns: parsing, validation,
  response formatting. No business logic.
- Services (`internal/service/`) own business logic and orchestration.
  They depend on repository interfaces, never on concrete implementations.
- Repositories (`internal/repository/`) own data access. Implementations
  live in `internal/repository/postgres/`.
- Domain models (`internal/domain/`) are framework-agnostic value holders
  with behavior. GORM tags are a pragmatic exception for this project's
  scale.
- Do not add layers, patterns, or abstractions "for the future." If three
  lines of direct code solve the problem, prefer them over a premature
  abstraction.

## Technology Constraints

The following technology choices are locked. Deviations require explicit
justification in the relevant plan document and approval before
implementation.

| Layer | Technology | Version Constraint |
| ------- | ------------ | -------------------- |
| Backend runtime | Go | 1.21+ |
| HTTP framework | Gin | Latest stable |
| ORM | GORM | Latest stable |
| Database | PostgreSQL | 14+ |
| Frontend runtime | React | 19+ |
| Frontend language | TypeScript | Strict mode |
| Build tool | Vite | Latest stable |
| UI library | shadcn/ui + Tailwind CSS v4 | Latest stable |
| API docs | Swagger/OpenAPI | Generated via swag |

- New backend dependencies MUST be justified in a PR description. Prefer
  the Go standard library.
- New frontend dependencies MUST not duplicate functionality already
  provided by shadcn/ui or existing packages.
- Database migrations MUST be backward-compatible or include a documented
  migration plan.

## Development Workflow

- **Branching**: Feature branches off `main`. Branch naming:
  `<issue-number>-<short-description>` (e.g., `42-add-bartonicek`).
- **Code review**: All changes to `internal/rules/` (classification logic)
  require review before merge.
- **CI gates**: Backend CI (`go test -race ./...`, `go vet`, lint) and
  Frontend CI (`tsc --noEmit`, `eslint`) MUST pass before merge.
- **Commit style**: Conventional commits with emoji prefixes as used in
  the project history.
- **Swagger**: API changes MUST regenerate Swagger docs (`make swagger`)
  and include the updated files in the same PR.
- **E2E tests**: Changes to user-facing classification flows SHOULD
  include Playwright test updates in `e2e/`.

## Security & Privacy

- Anklyze is an educational/clinical decision support tool. It MUST NOT
  collect, store, or transmit personally identifiable information (PII)
  or protected health information (PHI).
- User inputs (fracture characteristics) are classification parameters,
  not patient data. No input MUST be linked to a patient identity.
- API endpoints MUST validate and sanitize all input. SQL injection, XSS,
  and OWASP Top 10 vulnerabilities are zero-tolerance defects.
- Authentication/authorization for admin endpoints MUST use proven
  patterns — no custom crypto or token schemes.
- The disclaimer "For educational purposes only. Always correlate with
  clinical findings." MUST remain visible to end users.

## Internationalization

- All user-facing strings MUST be defined in `frontend/src/i18n/{en,es}.json`.
  Hardcoded UI strings are not permitted.
- Every new feature that introduces user-facing text MUST include
  translations for both English (en) and Spanish (es) at minimum.
- Backend error messages returned to the frontend MUST use i18n keys or
  be translatable by the frontend layer.
- Date, number, and unit formatting MUST respect the active locale.

## Governance

This constitution is the highest-authority document for Anklyze development
practices. When a PR, design document, or implementation conflicts with
these principles, the constitution takes precedence.

- **Amendments**: Any change to this constitution MUST be documented with
  a version bump, rationale, and updated `LAST_AMENDED_DATE`. Changes
  that remove or redefine principles require a MAJOR version bump.
- **Versioning**: This document follows semantic versioning:
  - MAJOR: Principle removal, redefinition, or backward-incompatible
    governance change.
  - MINOR: New principle or section added, material expansion of guidance.
  - PATCH: Clarifications, typo fixes, non-semantic wording improvements.
- **Compliance review**: Feature plans (`/speckit.plan`) MUST pass a
  Constitution Check gate before implementation begins. The check
  verifies alignment with all six core principles.

**Version**: 1.0.0 | **Ratified**: 2026-02-20 | **Last Amended**: 2026-02-20
