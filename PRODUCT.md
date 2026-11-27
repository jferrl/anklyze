# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Orthopedic surgeons and residents** who classify an ankle fracture from radiographs, either at the point of care or as invited raters in a study. They are experts in the anatomy and the classification systems; they are not here to learn software.
- **Researchers (admins)** who upload cases, group them into studies, set gold standards, and read inter-rater reliability results.
- **Outsiders evaluating the project** (hospitals, journal reviewers, conference audiences) who meet it through the public landing page.

Confirmed by the user on 2026-11-17: the product is both a research instrument and a daily clinical tool, and the landing page must present the project publicly.

## Product Purpose

Anklyze turns a short guided questionnaire about an ankle fracture into its classification in four systems at once: Lauge-Hansen, Danis-Weber, AO/OTA and Bartonicek. It also runs inter-rater reliability studies: raters classify the same cases, and the system reports agreement (kappa) and accuracy against a gold standard.

Success is a surgeon reaching a correct classification quickly and trusting it, and a researcher getting reliability figures they can publish.

## Positioning

One deterministic decision tree, authored by clinicians as a flow diagram, drives every answer. The engine's tests are generated from the same diagram. The result is rule-based and reproducible, not a statistical guess.

## Operating Context

- Radiographs (and CT where the tree asks for it) are read alongside the form; case pages show the images next to the questions.
- A Case is one patient's imaging (draft, published, closed). A Study is a set of cases rated by several raters (draft, active, closed).
- The interface ships in English and Spanish, with light and dark themes.
- Sign-in is through Supabase (email, Google, Microsoft).

## Capabilities and Constraints

- "Study" is the term; "Cohort" is deprecated.
- "No clasificable" / not classifiable is a valid clinical result, not an error.
- Open source under Apache 2.0 (github.com/jferrl/anklyze). There is no generated API reference; the old Swagger link is dead.
- Stack is fixed: React 19, TypeScript, Vite, Tailwind v4, shadcn/ui, Recharts.
- All user-facing strings live in `frontend/src/i18n/{en,es}.json`.

## Brand Commitments

- Name: Anklyze. Logo asset: `frontend/public/favicon.svg`.
- Footer disclaimer stays: for medical purposes only, always correlate with clinical findings.
- User's stated bar (2026-11-17): must look like a professional page, with no generic AI-generated look.

## Evidence on Hand

- The classification flow diagram: `internal/api/flowdiagram/classification-flow.{es,en}.svg` (served to admins only at `GET /api/admin/flow-diagram`), built from `docs/*.drawio` by `make export-diagram`.
- The decision tree has 165 terminal paths (`docs/decision_table.txt`); the generated engine test covers all 165 (`internal/rules/engine_drawio_test.go`, counted 2026-11-18). On one path (draw.io node `0S3fIhuK620pGgQrKJa_-70`) the AO/OTA assertion is skipped because the diagram reads "AO clasificable" with no code; update this line when that is resolved.
- Reliability methodology: `docs/RELIABILITY_ANALYSIS.md`.
- Absent, do not fabricate: testimonials, user counts, named institutions, accuracy percentages, response-time benchmarks, published study results, "no data collection" (accounts and responses are stored).

## Product Principles

1. The clinician's judgment leads; the tool confirms and records it.
2. Show the reasoning: every result traces back to answers and a path in the tree.
3. Images first on case screens; chrome gives way to the radiograph.
4. Numbers that will be published are shown exactly, with their method.
5. Nothing is claimed that the project cannot evidence.

## Accessibility & Inclusion

Both themes and both languages must be complete. Keyboard navigation of the classification form is an existing feature and must keep working.
