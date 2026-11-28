# Anklyze

<img src="frontend/public/favicon.svg" alt="Anklyze logo" width="64" height="64">

[![Backend CI](https://github.com/jferrl/anklyze/actions/workflows/backend.yml/badge.svg)](https://github.com/jferrl/anklyze/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/jferrl/anklyze/actions/workflows/frontend.yml/badge.svg)](https://github.com/jferrl/anklyze/actions/workflows/frontend.yml)

Anklyze classifies ankle fractures from a guided questionnaire. The answers walk one deterministic decision tree, and the result is reported in four systems at once: Danis-Weber, Lauge-Hansen, AO/OTA and Bartonicek. It also runs inter-rater reliability studies: an admin groups X-ray cases into a study, raters classify them, and the app reports kappa statistics and accuracy against a gold standard.

The hosted version is at <https://www.anklyze.es>.

For medical purposes only. Always correlate with clinical findings.

## How classification works

The questionnaire starts with which malleoli are fractured (lateral, medial, posterior, or a combination) and then asks only the questions that branch of the tree needs. There is no model and no scoring: the same answers always give the same result.

The tree is maintained as a draw.io diagram, [`docs/Danis-Weber AO_OTA Flow-2026-02-28-ES.drawio`](docs/Danis-Weber%20AO_OTA%20Flow-2026-02-28-ES.drawio), and implemented in `internal/rules/engine.go`. Two text renderings are generated from the diagram, in Spanish (the diagram's language) and English:

- [`docs/decision_tree.txt`](docs/decision_tree.txt) / [`docs/decision_tree.en.txt`](docs/decision_tree.en.txt): the tree, indented.
- [`docs/decision_table.txt`](docs/decision_table.txt) / [`docs/decision_table.en.txt`](docs/decision_table.en.txt): one row per terminal path, 165 paths across 7 malleoli combinations.

The English versions use the same translations as the English flow diagram (`scripts/build_flow_diagram.py`); the codes in each row are identical in both languages.

`make classify-validate` parses the diagram, regenerates those files and `internal/rules/engine_drawio_test.go`, and runs the engine tests. The generated tests cover all 165 paths. On one path the diagram reads "AO clasificable" with no code, so that path's AO/OTA result is not checked until the diagram is corrected. The Playwright suite drives the form through the same 165 paths (`e2e/fixtures/classification-cases.json`, generated from the diagram).

| System | What the engine returns |
| ------ | ----------------------- |
| Danis-Weber | Weber A, B or C, by fibular fracture level relative to the syndesmosis |
| Lauge-Hansen | SA, SER, PER or PA (injury mechanism) |
| AO/OTA | 44-A, 44-B and 44-C groups and subgroups (for example `44-B1.2`), plus 43-B1 and 43-B2 |
| Bartonicek | Types 1 to 4 for posterior malleolus fragments, or no posterior fracture |

Every system can also return "not classifiable".

## Reliability studies

A case is one patient's X-rays (draft, published, closed). A study is a set of cases that the same raters all classify (draft, active, closed). Closing a study stops it accepting responses.

For a study the app computes, per classification system:

- Fleiss' kappa across the raters who answered every case, with a 95% bootstrap confidence interval. A case where a rater left that system unanswered is left out, and the count is shown.
- Cohen's kappa, and AO/OTA linear weighted kappa, when exactly two raters completed the study.
- Per case, agreement with the most common answer.
- Accuracy against each case's gold standard.

Responses export as CSV.

[`docs/RELIABILITY_ANALYSIS.md`](docs/RELIABILITY_ANALYSIS.md) explains the statistics and how to design a study.

## Stack

- Backend: Go 1.27, Gin, GORM, PostgreSQL
- Frontend: React 19, TypeScript, Vite, shadcn/ui, Tailwind CSS v4
- Auth: Supabase (JWT)
- Image storage: any S3-compatible store (RustFS locally)
- UI languages: English and Spanish

## Run locally

You need Go 1.27+, Node.js 20, Docker, and [air](https://github.com/air-verse/air) for backend hot reload.

```bash
make install   # Go modules and frontend npm packages
make run       # PostgreSQL + RustFS in Docker, backend on :8080, frontend on :5173
```

On first start the database container loads the schema and the fixtures in `fixtures/`. `make db-reset` wipes it and reloads them.

Other ways to start:

```bash
go run ./cmd/anklyze-apiserver    # backend without air; needs DATABASE_URL
make run-frontend                 # frontend only
```

### Configuration

The backend reads `.env` if present; `.env.example` lists the variables. The frontend reads `frontend/.env.local`; see `frontend/.env.example`.

| Variable | Default | Effect |
| -------- | ------- | ------ |
| `DATABASE_URL` | unset | PostgreSQL connection. Required: the server retries for about 25 seconds, then exits non-zero. |
| `SUPABASE_URL` | unset | Enables JWT auth. Unset: every route is public and `/api/me` returns a mock admin (local development only). Set but malformed: the server refuses to start. |
| `SUPABASE_SERVICE_ROLE_KEY` | unset | Lets the server sync user roles to Supabase. |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | unset | Case image storage. Unset: image uploads and image URLs answer 503, and `APP_ENV=production` refuses to start. |
| `STUDY_BUCKET_NAME` | `studies` | Bucket for case images. |
| `S3_USE_SSL` | `true` | |
| `PORT` | `8080` | |
| `CORS_ALLOW_ORIGIN` | `*` | |
| `LOG_LEVEL`, `LOG_FORMAT` | `info`, `text` | |
| `APP_ENV` | unset | Anything but `development`, including unset, makes the server refuse to start without `SUPABASE_URL` or the S3 variables. |
| `TRUSTED_PROXIES` | private ranges | Comma-separated CIDRs whose `X-Forwarded-For` sets the client IP. The default trusts loopback and private networks, which covers a proxy on the same Docker host. |

`make run` sets `DATABASE_URL` and the S3 variables for the Docker services. It does not set `SUPABASE_URL`, so auth stays off unless your `.env` provides it.

With auth on, sign in once and then promote your account:

```bash
make db-make-admin EMAIL=you@example.com
```

## Tests

```bash
make test                      # go test ./... and a frontend build
go test -race ./...
cd frontend && npm run lint && npx tsc --noEmit && npm run test:run
make e2e-install && make e2e   # Playwright; needs the app running
make lint-go                   # gofmt, staticcheck, deadcode, golangci-lint
```

## API

The production API is at `https://api.anklyze.es`. Routes are registered in `internal/api/routes.go`; there is no generated API reference.

| Method | Path | Access | Purpose |
| ------ | ---- | ------ | ------- |
| `GET` | `/health` | public | Health check |
| `GET` | `/metrics` | public | Prometheus metrics |
| `POST` | `/api/classify` | signed in | Classify a fracture from questionnaire answers |
| `GET` | `/api/me`, `/api/me/profile` | signed in | Current user and profile (`PUT` to update) |
| `GET` | `/api/cases`, `/api/cases/:id` | signed in | Published cases |
| `POST` | `/api/cases/:id/responses` | signed in | Submit a classification for a case |
| `GET` | `/api/analytics/...` | admin | Classification counts, trends and distributions |
| various | `/api/admin/cases/...` | admin | Case CRUD, images, gold standard, reliability, accuracy, CSV export |
| various | `/api/admin/studies/...` | admin | Study CRUD, case assignment, reliability, accuracy, CSV export |

## Layout

```text
cmd/anklyze-apiserver/   server entry point
internal/api/            HTTP handlers and routes
internal/rules/          classification engine
internal/statistics/     kappa and agreement calculations
internal/service/        business logic
internal/repository/     repository interfaces, PostgreSQL implementations
internal/domain/         domain models and errors
migrations/              SQL migrations, applied at startup
fixtures/                local seed data
scripts/                 decision-tree parsing, rendering and test generation
frontend/                React app
e2e/                     Playwright tests
docs/                    decision tree and reliability documentation
```

## Licence and authors

The code is under the Apache License 2.0 ([LICENSE](LICENSE)). The decision tree (the drawio diagram and its text renderings `docs/decision_tree*.txt` and `docs/decision_table*.txt`) is under Creative Commons Attribution 4.0 ([LICENSE-CC-BY-4.0](LICENSE-CC-BY-4.0)): it can be reused and adapted with credit to its author.

The clinical content and decision tree are by Laura Paniagua Andrés (orthopaedic and trauma surgeon, Hospital de León). The software is by Jorge Ferrero Linacero. The four classification systems belong to their original authors; references are in [NOTICE](NOTICE). Anklyze is not affiliated with or endorsed by the AO Foundation or the Orthopaedic Trauma Association.
