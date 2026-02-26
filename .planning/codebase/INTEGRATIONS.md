# External Integrations

**Analysis Date:** 2026-02-26

## APIs & External Services

**Google Gemini AI:**
- Service: Google AI Studio / Gemini API
- Purpose: Fracture classification and feature extraction using LLM
- SDK/Client: `google.golang.org/genai` v1.47.0
- Auth: `GEMINI_API_KEY` environment variable
- Location: `internal/llm/client.go`
- Model: Configurable via `GEMINI_MODEL` env var (default: "gemini-3-flash-preview")
- Implementation: Located in `internal/llm/` package
  - `NewClient()` - Creates authenticated Gemini client
  - Handles fracture input extraction and clarification questions
  - 30-second timeout on requests (DefaultTimeout in `internal/llm/client.go`)

**Supabase REST APIs:**
- Services: Authentication, Storage, Database pooling
- Purpose: User auth, file storage, database connection
- SDK/Client: `@supabase/supabase-js` v2.95.3 (frontend), custom HTTP clients (backend)
- Auth:
  - Frontend: `VITE_SUPABASE_ANON_KEY` + `VITE_SUPABASE_URL`
  - Backend Admin: `SUPABASE_SERVICE_ROLE_KEY` (service role)
- Endpoints:
  - Authentication: `{SUPABASE_URL}/auth/v1/` (Supabase Auth Admin API)
  - Storage: `{SUPABASE_URL}/storage/v1/` (Supabase Storage REST API)
- Locations:
  - Frontend auth setup: `frontend/src/lib/supabase.ts`
  - Backend auth validation: `internal/auth/auth.go` (JWT validation via JWKS)
  - Backend auth admin: `internal/supabase/auth.go` (role metadata syncing)
  - Backend storage: `internal/storage/supabase.go` (file upload/download)

## Data Storage

**Databases:**

PostgreSQL 14+:
- Provider: Supabase (remote) or local Docker container
- Connection: `DATABASE_URL` environment variable
  - Format: `postgresql://user:password@host:port/database`
  - For Supabase: Uses pooler connection string in Transaction mode
  - Pool: 10 max open, 5 max idle, 1 hour connection lifetime, 15 min idle timeout
- Client: GORM v1.31.1 ORM
- Driver: `gorm.io/driver/postgres` v1.6.0
- Slow query threshold: 500ms (increased for remote databases)
- Connection location: `internal/database/database.go`
- Domain models in `internal/domain/`:
  - `case.go` - Patient X-ray cases with classifications
  - `audit.go` - Audit log entries
  - `user.go` - User profiles and roles
  - `reliability.go` - Inter-rater reliability study data
  - `classification.go` - Classification results
  - `fracture.go` - Fracture input data (JSONB fields)

**File Storage:**

Supabase Storage:
- Bucket: `studies` (configurable via `STUDY_BUCKET_NAME` env var, default: "studies")
- Auth: Service role key (`SUPABASE_SERVICE_ROLE_KEY`) for server operations
- API: REST (`/storage/v1/object/`)
- Timeout: 60 seconds
- Usage: Study image uploads and downloads
- Implementation: `internal/storage/supabase.go`
  - `Upload()` - Upload files to bucket
  - `Download()` - Download files from bucket
  - `SignedURL()` - Generate time-limited signed URLs

**Caching:**

Frontend:
- IndexedDB via Dexie 4.3.0
- Purpose: Offline data persistence
- Mock for testing: fake-indexeddb 6.2.5

Backend:
- No dedicated cache layer (direct database queries via GORM)
- Connection pooling in database layer

## Authentication & Identity

**Auth Provider:**
- Service: Supabase Auth
- Implementation: OAuth 2.0 / JWT-based
- Frontend: `@supabase/supabase-js` SDK (handles login, signup, session management)
- Backend: JWT validation via JWKS
- Locations:
  - Frontend auth context: `frontend/src/contexts/AuthContext.tsx`
  - Frontend Supabase client: `frontend/src/lib/supabase.ts`
  - Backend validator: `internal/auth/auth.go`
  - Backend middleware: `internal/api/` handlers use auth context

**JWT Validation:**
- Library: `github.com/golang-jwt/jwt/v5` v5.3.1
- JWKS handling: `github.com/MicahParks/keyfunc/v3` v3.8.0
- Claims structure: Custom `auth.Claims` with:
  - Standard JWT claims (exp, iat, sub, aud, iss)
  - Custom: `email`, `role`, `app_metadata`, `user_metadata`
- Validation location: `internal/auth/auth.go`
  - `Validator.Validate()` - Token signature and expiry verification
  - Supports both static secret and JWKS (with caching)

**Role-Based Access Control:**
- Roles: `user` (default), `admin`
- Storage: `app_metadata.role` in Supabase Auth (synced via JWT token)
- Admin syncing: `internal/supabase/auth.go`
  - `AuthAdmin.UpdateUserRole()` - Updates user metadata via Admin API
  - Shallow merge preserves other metadata fields

## Monitoring & Observability

**Error Tracking:**
- Service: None detected (relies on application logging)

**Logs:**
- Framework: Go built-in `log/slog` (structured logging)
- Configuration: `internal/logger/` package
- Log levels: debug, info, warn, error (configurable via `LOG_LEVEL` env var)
- Format: text or JSON (configurable via `LOG_FORMAT` env var)
- Database query logging: GORM logger with 500ms slow query threshold

**Metrics:**
- Application: No external metrics collection detected
- Database: GORM provides query timing

## CI/CD & Deployment

**Hosting:**
- Platform: Not specified (infrastructure-agnostic)
- Backend: Deployable as standalone binary (see `make build-backend`)
  - Listens on configurable PORT (default 8080)
  - Health check via API endpoints
- Frontend: Static SPA deployment (Vite build output to `frontend/dist`)

**CI Pipeline:**
- Service: GitHub Actions (workflows in `.github/`)
- Tests: `make test` runs all tests
  - Backend: `go test ./...`
  - Frontend: `npm run build` (type checking and build verification)
  - E2E: Playwright tests in `e2e/` directory

**Local Development:**
- Backend hot reload: `air` (see `.air.toml`)
- Frontend hot reload: Vite dev server on port 5173
- Concurrent startup: `make run` or `make run-backend` + `make run-frontend`

## Environment Configuration

**Required env vars:**

Production:
- `DATABASE_URL` - PostgreSQL connection
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_JWT_SECRET` - JWT validation secret
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for storage
- `GEMINI_API_KEY` - Google AI API key
- `CORS_ALLOW_ORIGIN` - Frontend origin for CORS

Development (with defaults):
- `PORT=8080`
- `LOG_LEVEL=info`
- `LOG_FORMAT=text`
- `RATE_LIMIT_RATE=0.5`
- `RATE_LIMIT_BURST=5`
- `SESSION_MESSAGE_LIMIT=20`
- `STUDY_BUCKET_NAME=studies`

**Secrets location:**
- `.env` file (Git-ignored) for local development
- Environment variables in production
- `.env.example` and `frontend/.env.example` document structure

## Webhooks & Callbacks

**Incoming:**
- Not detected - API is request/response only

**Outgoing:**
- Not detected - No external webhook subscriptions

**Note on Data Flow:**
- Frontend (React/TypeScript) → Vite dev server (localhost:5173)
  → Proxied to backend (localhost:8080)
- Backend (Go/Gin) receives requests, validates JWT from Supabase
- Backend queries PostgreSQL or Supabase Storage
- Real-time: No WebSocket or Server-Sent Events detected

---

*Integration audit: 2026-02-26*
