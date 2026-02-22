# CLAUDE.md - Project Instructions

## Build & Run

```bash
make run              # Backend (air) + frontend concurrently
make run-backend      # Backend only with hot reload
make run-with-db      # Backend with local PostgreSQL
make build            # Build both
make test             # Run all tests (backend + frontend)
make swagger          # Regenerate OpenAPI docs
```

## Test Commands

```bash
go test ./...                     # All backend tests
go test -v -race ./...            # With race detection
go test ./internal/service/...    # Single package
cd frontend && npm run lint       # Frontend lint
cd frontend && npx tsc --noEmit   # Frontend typecheck
```

## Code Style

### Go

- Follow standard Go conventions and `go vet`
- Handlers are split by concern: `case_admin_handler.go`, `case_image_handler.go`, etc.
- Repository pattern: interfaces in `internal/repository/`, implementations in `internal/repository/postgres/`
- Domain models in `internal/domain/` — use GORM tags for PostgreSQL
- Services in `internal/service/` — business logic layer between handlers and repositories
- Tests use `_test.go` suffix in the same package
- Error handling: return domain errors from `internal/domain/errors.go`

### Frontend

- React + TypeScript + Vite
- shadcn/ui components in `frontend/src/components/ui/`
- i18n: all user-facing strings in `frontend/src/i18n/{en,es}.json`
- Pages in `frontend/src/pages/`, admin pages in `frontend/src/pages/admin/`
- API client in `frontend/src/services/api.ts`

## Project Structure

Go module at repo root (`go.mod`), follows [go.dev/doc/modules/layout#server-project](https://go.dev/doc/modules/layout#server-project).

- `cmd/anklyze-apiserver/` — server entry point
- `internal/` — all Go packages (not importable externally)
- `frontend/` — React SPA
- `e2e/` — Playwright tests
- `docs/` — Swagger + project documentation

## Key Domain Concepts

- **Case** = individual patient X-ray for classification (draft -> published -> closed)
- **Study** = group of cases for inter-rater reliability analysis (draft -> active -> closed)
- These are distinct entities: a Study contains multiple Cases

## Terminology

- "Cohort" is **deprecated** — the codebase uses "Study" instead
- Classification systems: Danis-Weber, Lauge-Hansen, AO/OTA, Bartonicek
- Rater = a user who submits classification responses

## Active Technologies
- Go 1.21+ + Gin (HTTP), GORM (ORM), google/genai (Gemini LLM) (001-backend-arch-improvements)
- PostgreSQL 14+ (GORM), Supabase (auth + file storage) (001-backend-arch-improvements)
- Go 1.21+ (backend), TypeScript strict mode (frontend) + Gin (HTTP), GORM (ORM), google/genai (Gemini LLM), React 19+, Vite, shadcn/ui + Tailwind CSS v4 (002-update-classification-algorithm)
- PostgreSQL 14+ (GORM) — no schema migration needed (JSONB fields accommodate new codes) (002-update-classification-algorithm)

## Recent Changes
- 001-backend-arch-improvements: Added Go 1.21+ + Gin (HTTP), GORM (ORM), google/genai (Gemini LLM)
