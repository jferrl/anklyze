# AGENTS.md - Anklyze

Guidance for coding agents. Product context is in `PRODUCT.md`, the design system in `DESIGN.md`, build commands in `CLAUDE.md` and `README.md`.

## What it is

Anklyze classifies ankle fractures from a guided questionnaire into four systems at once (Lauge-Hansen, Danis-Weber, AO/OTA, Bartonicek) and runs inter-rater reliability studies. Go backend (Gin, GORM, PostgreSQL), React frontend (Vite, Tailwind v4, shadcn/ui), Supabase auth, S3-compatible image storage, English and Spanish.

## Rules that are easy to break

- **Do not change classification behaviour.** The decision tree is the draw.io file in `docs/` (clinical content by Laura Paniagua Andrés, CC BY 4.0). `internal/rules/engine.go` implements it; `internal/rules/engine_drawio_test.go` is generated from it and covers all 165 paths. A change to a classification result needs the clinician, not a code fix.
- **The repo's draw.io is the source of truth**, not copies elsewhere.
- **Statistics are published figures.** Changes to `internal/statistics` or how they are shown must state which numbers change.
- **Every user-facing string** lives in `frontend/src/i18n/{en,es}.json` with identical key sets (a test checks). Spanish addresses the reader as usted.
- **UI follows `DESIGN.md`**: ruled boxes, no shadows on resting surfaces, system colours only for system identity, sentence case.
- **Errors** use `HandleError` and the helpers in `internal/api/errors.go`, which answer `{code, message}` with the right status. Domain errors live in `internal/domain/errors.go`.
- Commits and PRs: conventional messages, no emoji, no AI attribution lines.

## Layout

```text
cmd/anklyze-apiserver/   entry point: config, DB (retried, required), auth, storage, routes, graceful shutdown
internal/api/            HTTP handlers and routes (routes.go), error helpers (errors.go), CSV export (csv.go)
internal/auth/           JWKS validation, auth middleware, role sync, dev-mode user (dev.go)
internal/rules/          classification engine
internal/statistics/     kappa (Fleiss, Cohen, weighted), bootstrap CI, agreement, gold-standard accuracy
internal/service/        business logic: classification, statistics + cache, gold standard, studies, users
internal/repository/     repository interfaces; postgres/ holds the GORM implementations
internal/domain/         models, enums, domain errors
internal/storage/        S3 storage; NoOpStorage answers ErrStorageNotConfigured
internal/config/         environment configuration and production checks
internal/metrics/        Prometheus middleware and /metrics
migrations/              SQL migrations, embedded and applied at startup
scripts/                 draw.io parsing, rendering, engine and e2e test generation (Python, stdlib only)
fixtures/                local seed data
frontend/                React app (pages/, pages/admin/, components/, services/, i18n/)
e2e/                     Playwright; classification specs generated from the draw.io
docs/                    decision tree, decision table, reliability methodology
```

## Domain

- **Case**: one patient's imaging. `draft` -> `published` -> `closed`. Has images (X-ray, CT), responses and an optional gold standard. A case belongs to at most one study (`Case.StudyID`).
- **Study**: a set of cases rated by the same raters. `draft` -> `active` -> `closed`. Closing a study stops its cases accepting responses.
- **Response**: one per rater per case (unique index). The server re-classifies the submitted `input` with the engine and rejects a mismatching classification (422).
- "Study" is the term; "cohort" is deprecated. "Not classifiable" is a valid result, not an error.

## Statistics

Per study and per system (`internal/service/statistics.go`, method in `docs/RELIABILITY_ANALYSIS.md` section 4):

- Fleiss' kappa over the raters who answered every case, with a seeded percentile bootstrap CI. A case where a rater left the system unanswered is excluded and counted.
- Cohen's kappa (same bootstrap) and AO/OTA linear weighted kappa when exactly two raters completed the study. Subgroups map to their group; 44-A3 is in the ordering.
- Per case: agreement with the most common answer. Kappa is never computed for a single case.
- Accuracy against the gold standard; a hard case is accuracy below 50 %, low agreement is below 60 %.

## API

Routes are registered in `internal/api/routes.go`.

| Area | Routes | Access |
|---|---|---|
| System | `GET /health`, `GET /metrics` | public |
| Classify | `POST /api/classify`, `GET /api/me` | signed in |
| Cases | `GET /api/cases`, `/api/cases/:id`, image URLs, `POST /api/cases/:id/responses`, `GET /api/cases/:id/my-responses` | signed in |
| Profile | `GET`/`PUT /api/me/profile` | signed in |
| Admin cases | CRUD, publish, close, images, gold standard, analytics, reliability, accuracy, responses, CSV exports, dashboard | admin |
| Admin studies | CRUD, add/remove/reorder cases, activate, close, reliability, accuracy, CSV export | admin |
| Analytics | `/api/analytics/summary`, `/trends`, `/distribution/:system` | admin |

With `SUPABASE_URL` empty the server runs in dev mode: no auth, and every route acts as one mock admin. Production (`APP_ENV=production`) refuses to start without `SUPABASE_URL` and the S3 variables.

## Environment

`DATABASE_URL` (required), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_USE_SSL`, `STUDY_BUCKET_NAME`, `PORT`, `CORS_ALLOW_ORIGIN`, `LOG_LEVEL`, `LOG_FORMAT`, `APP_ENV`. Defaults and effects are in the README.

## Checks

Run what CI runs before committing:

```bash
go test -race ./...
gofmt -l . && go vet ./...
golangci-lint run ./...
go run honnef.co/go/tools/cmd/staticcheck@v0.7.0 ./...
go run golang.org/x/tools/cmd/deadcode@v0.49.0 ./...   # must print nothing
cd frontend && npm run lint && npx tsc --noEmit && npm run test:run && npm run build
make classify-validate                                  # after touching the draw.io or its scripts
```

CI (`.github/workflows/`): `Build and Test` (backend) and `Build and Lint` (frontend) are required checks and run only when their side changed; CodeQL analyses the languages a PR touches; PRs must be up to date with `main` before merging; every push to `main` deploys. The Playwright suite (`e2e.yml`) runs only on manual dispatch.
