# Technology Stack

**Analysis Date:** 2026-02-26

## Languages

**Primary:**
- Go 1.25.0 - Backend API server and business logic
- TypeScript 5.9.3 - Frontend application with strict mode enabled
- JavaScript/JSX (React 19.2.4) - UI components and application framework

**Secondary:**
- SQL (PostgreSQL dialect) - Database queries via GORM ORM
- Markdown - Configuration and documentation files

## Runtime

**Environment:**
- Go 1.25.0 - Backend runtime
- Node.js (v18+) - Frontend development and E2E testing
- PostgreSQL 14+ - Data persistence
- Docker - Local PostgreSQL container (make db-start)

**Package Manager:**
- Go modules (go mod) - Backend dependency management
  - Lockfile: `go.sum` (present)
- npm - Frontend dependency management
  - Lockfile: `package-lock.json` (implied by npm setup)

## Frameworks

**Core Backend:**
- Gin v1.11.0 - HTTP web framework with routing, middleware, and OpenAPI documentation
- GORM v1.31.1 - ORM for PostgreSQL
- google.golang.org/genai v1.47.0 - Google Gemini API client for AI classification
- Supabase JS SDK v2.95.3 (frontend) - Authentication and file storage client

**Frontend:**
- React 19.2.4 - UI component library
- React Router v7.13.0 - Client-side routing
- Vite 7.2.4 - Development server and build tool
- TailwindCSS v4.1.18 - Utility-first CSS framework
- Tailwind CSS Vite plugin v4.1.18 - Vite integration for TailwindCSS
- Radix UI - Headless UI component primitives (v1.x)
  - Alert dialogs, avatars, checkboxes, dialogs, dropdowns, labels, progress, radio groups, scrollables, tabs, tooltips, toggles

**Testing:**
- Vitest 4.0.18 - Frontend unit test runner and framework
- Playwright 1.49.0+ - E2E test framework and runner
- Go test (built-in) - Backend unit testing

**Build & Dev:**
- air - Hot reload server during Go development (`cmd = "go build -o ./tmp/main ./cmd/anklyze-apiserver/main.go"`)
- swag 1.16.6 - OpenAPI/Swagger documentation generation from Go code comments
- TSC 5.9.3 - TypeScript compiler with type checking
- ESLint 9.39.1 - Frontend linting
- Vite 7.2.4 - Frontend bundling and dev server

## Key Dependencies

**Critical:**

Backend:
- `gorm.io/driver/postgres` v1.6.0 - PostgreSQL driver for GORM
- `github.com/golang-jwt/jwt/v5` v5.3.1 - JWT token validation for Supabase Auth
- `github.com/MicahParks/keyfunc/v3` v3.8.0 - JWKS key fetching and caching
- `github.com/joho/godotenv` v1.5.1 - Environment variable loading from .env files

Frontend:
- `@supabase/supabase-js` 2.95.3 - Supabase Auth and storage client
- `@tanstack/react-query` 5.90.21 - Server state management and data synchronization
- `react-i18next` 16.5.4 - Internationalization (English/Spanish)
- `i18next` 25.8.10 - i18n core with JSON translation files

**Infrastructure:**

Backend:
- `golang.org/x/time` v0.14.0 - Rate limiting primitive (token bucket)
- `github.com/google/uuid` v1.6.0 - UUID generation (uses uuid.UUID GORM type)

Frontend:
- `dexie` 4.3.0 - IndexedDB wrapper for offline data caching
- `recharts` 2.15.4 - Data visualization charts
- `mermaid` 11.12.2 - Diagram rendering (classification flowcharts)
- `embla-carousel-react` 8.6.0 - Image carousel component
- `react-dropzone` 15.0.0 - File upload handling
- `sonner` 2.0.7 - Toast notifications
- `lucide-react` 0.564.0 - Icon library
- `next-themes` 0.4.6 - Theme management (light/dark mode)

**Testing:**
- `msw` 2.12.10 - Mock Service Worker for API mocking in frontend tests
- `@testing-library/react` 16.3.2 - React component testing utilities
- `@testing-library/jest-dom` 6.9.1 - DOM matchers
- `happy-dom` 20.6.1 - Lightweight DOM implementation for Vitest
- `fake-indexeddb` 6.2.5 - IndexedDB mock for testing
- `@vitest/coverage-v8` 4.0.18 - Code coverage reporting

## Configuration

**Environment:**

Backend (.env file):
- `DATABASE_URL` - PostgreSQL connection string (required for audit/persistence)
- `SUPABASE_URL` - Supabase project URL (e.g., https://xxx.supabase.co)
- `SUPABASE_JWT_SECRET` - JWT validation secret from Supabase Dashboard
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for Supabase Storage operations
- `GEMINI_API_KEY` - Google AI API key for Gemini LLM (optional but required for AI classification)
- `GEMINI_MODEL` - LLM model selector (default: "gemini-3-flash-preview")
- `PORT` - Server port (default: 8080)
- `CORS_ALLOW_ORIGIN` - CORS origin allowlist (default: "*")
- `LOG_LEVEL` - Logging level: debug|info|warn|error (default: info)
- `LOG_FORMAT` - Log format: json|text (default: text)
- `RATE_LIMIT_RATE` - Requests per second (default: 0.5)
- `RATE_LIMIT_BURST` - Burst size (default: 5)
- `SESSION_MESSAGE_LIMIT` - Max chat messages per session (default: 20)
- `AUDIT_BUFFER_SIZE` - Audit log buffer size (default: 100)
- `STUDY_BUCKET_NAME` - Supabase Storage bucket for study data (default: "studies")

Frontend (.env.local):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon public key
- `VITE_API_URL` - Backend API URL (default: http://localhost:8080)

**Build:**

Backend:
- `.air.toml` - Hot reload configuration for local development
  - Watches: `cmd/`, `internal/` directories
  - Excludes: `_test.go` files, node_modules, frontend, e2e
  - Binary output: `./tmp/main`

Frontend:
- `vite.config.ts` - Vite build configuration
  - Path aliases: `@`, `@components`, `@pages`, `@hooks`, `@services`, `@types`, `@utils`, `@lib`
  - Dev server port: 5173 with `/api` proxy to localhost:8080
  - Manual chunk splitting for vendor React, auth, i18n, utils
  - Drops console and debugger statements in production
  - TypeScript strict mode via `tsconfig.json`

- `tsconfig.json` - TypeScript compiler options
  - Target: ES2022
  - Module resolution: bundler
  - Strict mode: true
  - Path aliases matching Vite config

## Platform Requirements

**Development:**
- Go 1.25.0+
- Node.js 18.0.0+
- Docker (for local PostgreSQL)
- PostgreSQL 14+ connection string (Supabase or local)
- macOS/Linux/Windows with bash/zsh shell
- Port 8080 available (backend)
- Port 5173 available (frontend)
- Port 5432 available (local PostgreSQL if using make db-start)

**Production:**
- Deployment target: Cloud environment with:
  - Supabase PostgreSQL database
  - Supabase Auth enabled
  - Supabase Storage configured (studies bucket)
  - Google Cloud/Gemini API access (for AI features)
- HTTPS required (frontend and backend)
- Environment variables configured as per .env.example
- Static file serving for frontend dist

---

*Stack analysis: 2026-02-26*
