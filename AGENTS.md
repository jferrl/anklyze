# AGENTS.md - Anklyze

## Project Overview

Ankle fracture classification web application using Go backend + React frontend. Classifies fractures according to four international systems: Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek.

## Architecture

Follows the [Go server project layout](https://go.dev/doc/modules/layout#server-project).

```text
anklyze/
├── go.mod                       # Go module (root): github.com/jferrl/anklyze
├── go.sum
│
├── cmd/
│   └── anklyze-apiserver/       # HTTP API entry point
│
├── internal/                    # Go server logic (Gin framework)
│   ├── api/                     # HTTP handlers and routes
│   │   ├── routes.go            # Route registration (SetupRoutes, SetupCaseRoutes, SetupStudyRoutes)
│   │   ├── handler.go           # Classification + chat + analytics handlers
│   │   ├── case_admin_handler.go    # Case CRUD (admin)
│   │   ├── case_image_handler.go    # Case image upload/management
│   │   ├── case_access_handler.go   # Case listing + user access control
│   │   ├── case_response_handler.go # Case response submission
│   │   ├── case_analytics_handler.go# Case analytics + reliability + divergence
│   │   ├── study_handlers.go        # Study CRUD, rater management, reliability
│   │   ├── chat_handlers.go         # Chat session management
│   │   ├── user_handlers.go         # User profile endpoints
│   │   ├── case_types.go            # Case-related request/response types
│   │   ├── errors.go                # Error response helpers
│   │   ├── validation.go            # Request validation
│   │   ├── input_validation.go      # Input sanitization
│   │   └── ratelimit.go             # IP-based rate limiting
│   ├── auth/                    # JWT authentication (Supabase)
│   │   ├── auth.go              # JWT validator using JWKS (ES256)
│   │   └── middleware.go        # AuthMiddleware, UserSyncMiddleware, RequireRole
│   ├── config/                  # Configuration from environment variables
│   ├── database/                # GORM PostgreSQL connection
│   ├── domain/                  # Domain models
│   │   ├── case.go              # Case, CaseImage, CaseResponse, CaseStatus
│   │   ├── case_user.go         # CaseUser (access control)
│   │   ├── study.go             # Study, StudyRater, StudyStatus
│   │   ├── fracture.go          # FractureInput and classification enums
│   │   ├── classification.go    # ClassificationResult output types
│   │   ├── reliability.go       # ReliabilityMetrics, FleissKappaResult
│   │   ├── user.go              # User model with roles
│   │   ├── audit.go             # AuditEntry for classification logging
│   │   ├── analytics.go         # AnalyticsSummary, TrendData
│   │   ├── chat_audit.go        # Chat session audit models
│   │   ├── chat_analytics.go    # Chat analytics models
│   │   └── errors.go            # Domain error types
│   ├── i18n/                    # Internationalization (en.go, es.go)
│   ├── llm/                     # LLM integration (Gemini API)
│   │   ├── client.go            # Gemini API client
│   │   └── prompts.go           # Structured prompts for fracture extraction
│   ├── logger/                  # Structured logging
│   ├── repository/              # Data access interfaces
│   │   ├── case.go              # CaseRepository, CaseResponseRepository, CaseAnalyticsRepository
│   │   ├── study.go             # StudyRepository, StudyResponseRepository
│   │   ├── user.go              # UserRepository
│   │   ├── audit.go             # AuditRepository, AnalyticsRepository
│   │   ├── chat_audit.go        # ChatAuditRepository
│   │   └── postgres/            # PostgreSQL implementations
│   │       ├── case.go
│   │       ├── study.go
│   │       ├── user.go
│   │       ├── audit.go
│   │       ├── analytics.go
│   │       ├── chat_audit.go
│   │       └── chat_analytics.go
│   ├── rules/                   # Classification decision tree engine
│   │   └── engine.go
│   ├── service/                 # Business logic
│   │   ├── classifier.go        # ClassifierService (wraps rules engine)
│   │   ├── statistics.go        # Kappa calculations, reliability metrics
│   │   ├── divergence.go        # Inter-rater divergence analysis
│   │   ├── chat.go              # Chat service (LLM orchestration)
│   │   └── user.go              # User profile service
│   ├── storage/                 # File storage (Supabase Storage)
│   ├── supabase/                # Supabase auth client
│   └── timeutil/                # Date range utilities
│
├── docs/                        # Swagger/OpenAPI + project documentation
│   ├── docs.go, swagger.json, swagger.yaml
│   ├── RELIABILITY_ANALYSIS.md
│   └── *.mmd                    # Mermaid classification flow diagrams (EN/ES)
│
├── fixtures/                    # SQL test fixtures
│   ├── study_test_data.sql
│   ├── study_test_data_auto.sql
│   └── cleanup_study_test_data.sql
│
├── e2e/                         # Playwright E2E tests
│
└── frontend/                    # React + TypeScript + shadcn/ui
    └── src/
        ├── components/
        │   ├── layout/          # AppShell, AppSidebar
        │   ├── auth/            # LoginPage, ProtectedRoute
        │   ├── studies/         # StudyClassificationForm, ImageGrid, ImageLightbox
        │   ├── analytics/       # StatCard, KappaGauge, ClassificationChart, ConfusionMatrix
        │   ├── admin/           # CaseUsersManager, StudyUsersManager
        │   ├── profile/         # UserProfileForm
        │   └── ui/              # shadcn/ui components
        ├── pages/
        │   ├── ClassifyPage.tsx
        │   ├── CasesPage.tsx
        │   ├── CaseDetailPage.tsx
        │   ├── ProfilePage.tsx
        │   └── admin/
        │       ├── AdminDashboardPage.tsx
        │       ├── AdminCasesPage.tsx
        │       ├── CaseEditorPage.tsx
        │       ├── CaseReliabilityPage.tsx
        │       ├── CaseAnalyticsPage.tsx
        │       ├── CaseDivergencePage.tsx
        │       ├── AdminStudiesPage.tsx
        │       ├── StudyEditorPage.tsx
        │       └── StudyReliabilityPage.tsx
        ├── hooks/               # Custom React hooks
        ├── services/            # API client
        ├── types/               # TypeScript types
        └── i18n/                # Translations (en.json, es.json)
```

## Domain Concepts

### Case vs Study

- **Case**: An individual patient X-ray case created by an admin. Users view published cases and submit classification responses.
  - Status flow: `draft` -> `published` -> `closed`
  - Has images (X-ray, CT/TAC), responses, gold standard classification
- **Study**: Groups multiple cases for multi-case inter-rater reliability analysis (Fleiss' Kappa).
  - Status flow: `draft` -> `active` -> `closed`
  - Assigns specific raters, tracks progress across all cases

### Classification Systems

- **Danis-Weber**: Type A/B/C based on fibular fracture location relative to syndesmosis
- **Lauge-Hansen**: SA/SER/PER/PA based on injury mechanism
- **AO/OTA**: 44-A1/A2/A3, 44-B1/B2/B3, 44-C1/C2/C3 based on structures involved
- **Bartonicek**: Type 1-4 for posterior malleolus fractures

## API Endpoints

**Classification (auth required):**

- `POST /api/classify` - Classify fracture from structured input
- `POST /api/chat` - Chat-based classification (rate limited)
- `POST /api/chat/session` - Create chat session
- `PUT /api/chat/session/:id/complete` - Complete session
- `PUT /api/chat/session/:id/abandon` - Abandon session
- `POST /api/chat/session/:id/feedback` - Submit feedback
- `GET /api/chat/session/:id/feedback` - Get feedback

**Cases (auth required):**

- `GET /api/cases` - List published cases
- `GET /api/cases/:id` - Get published case
- `GET /api/cases/:id/images/:imageId/url` - Get signed image URL
- `POST /api/cases/:id/responses` - Submit classification response
- `GET /api/cases/:id/my-responses` - Get user's responses

**User profile (auth required):**

- `GET /api/me` - Get current user
- `GET /api/me/profile` - Get user profile
- `PUT /api/me/profile` - Update user profile

**Admin Cases (admin role):**

- `POST/GET /api/admin/cases` - CRUD
- `GET/PUT/DELETE /api/admin/cases/:id` - Single case
- `PUT /api/admin/cases/:id/publish` - Publish case
- `PUT /api/admin/cases/:id/close` - Close case
- `POST /api/admin/cases/:id/images` - Upload image
- `GET/PATCH/DELETE /api/admin/cases/:id/images/:imageId` - Manage images
- `PUT /api/admin/cases/:id/images/reorder` - Reorder images
- `GET /api/admin/cases/:id/analytics` - Case analytics
- `GET /api/admin/cases/:id/reliability` - Reliability metrics
- `GET /api/admin/cases/:id/divergence` - Divergence analysis
- `GET /api/admin/cases/:id/responses` - List responses
- `GET /api/admin/cases/:id/export` - Export responses (CSV)
- `GET /api/admin/cases/:id/export/detailed` - Detailed export
- `GET/POST/DELETE /api/admin/cases/:id/users` - User access

**Admin Studies (admin role):**

- `POST/GET /api/admin/studies` - CRUD
- `GET/PUT/DELETE /api/admin/studies/:id` - Single study
- `POST/DELETE /api/admin/studies/:id/cases` - Add/remove cases
- `PUT /api/admin/studies/:id/cases/reorder` - Reorder cases
- `GET/POST/DELETE /api/admin/studies/:id/raters` - Rater management
- `GET /api/admin/studies/:id/progress` - Rater progress
- `PUT /api/admin/studies/:id/activate` - Activate study
- `PUT /api/admin/studies/:id/close` - Close study
- `GET /api/admin/studies/:id/reliability` - Study reliability (Fleiss' Kappa)

**Analytics (admin role):**

- `GET /api/analytics/summary` - Classification statistics
- `GET /api/analytics/trends` - Time-series data
- `GET /api/analytics/distribution/:system` - Per-system distribution
- `GET /api/analytics/chat/summary` - Chat analytics
- `GET /api/analytics/chat/feedback` - Chat feedback summary
- `GET /api/analytics/chat/confidence` - Confidence distribution
- `GET /api/analytics/chat/trends` - Chat trends

**System:**

- `GET /health` - Health check
- `GET /swagger/*` - Swagger UI

## Reliability Metrics

The statistics service (`internal/service/statistics.go`) calculates:

| Metric | Description |
|--------|-------------|
| Cohen's Kappa | Agreement between 2 raters (with 95% CI) |
| Fleiss' Kappa | Agreement among 3+ raters across multiple cases |
| Weighted Kappa | For ordinal data (AO/OTA) with linear weights |
| Percent Agreement | Simple agreement percentage |
| Sensitivity/Specificity | Per-category diagnostic metrics |
| PPV/NPV/F1 | Positive/Negative Predictive Value, F1 score |

Fleiss' Kappa requires multiple cases in a study and 3+ raters who completed ALL cases.

## Rule Engine

The classification decision tree is in `internal/rules/engine.go`. Input flow:

1. **Which malleoli are fractured?** (medial, lateral, posterior)
2. Based on selection, follows one of:
   - Posterior Only -> Bartonicek type
   - Medial Only -> Complete (AO-44-A1, LH PER/PA)
   - Lateral Only -> Level -> (if supra) type
   - Complex (Medial + Lateral) -> Medial morphology -> Fibular analysis

## Authentication

Supabase Auth with JWT validation (JWKS, ES256). Roles: `user`, `admin`.

| Endpoint | Public | User | Admin |
|----------|--------|------|-------|
| `/health`, `/swagger/*` | yes | yes | yes |
| `/api/classify`, `/api/chat/*` | no | yes | yes |
| `/api/cases/*` | no | yes | yes |
| `/api/analytics/*` | no | no | yes |
| `/api/admin/*` | no | no | yes |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | (none - audit disabled) |
| `GEMINI_API_KEY` | Google Gemini API key | (none - chat disabled) |
| `GEMINI_MODEL` | Gemini model to use | `gemini-3-flash-preview` |
| `SUPABASE_URL` | Supabase project URL | (none - auth disabled) |
| `SUPABASE_JWT_SECRET` | JWT secret (optional, uses JWKS if not set) | (none) |

## Development

```bash
make run              # Run backend + frontend concurrently
make run-backend      # Backend only (air hot reload)
make run-with-db      # Backend with local PostgreSQL
make test             # Run all tests
make swagger          # Regenerate OpenAPI docs
make db-start         # Start local PostgreSQL (Docker)
make db-stop          # Stop local PostgreSQL
```

## CI/CD

### Backend CI (`backend.yml`)

Triggers on push/PR to `main` when `cmd/**`, `internal/**`, or `go.mod`/`go.sum` changes:
`go vet ./...` -> `go test -v -race ./...` -> `go build`

### Frontend CI (`frontend.yml`)

Triggers on push/PR to `main` when `frontend/**` changes:
`npm ci` -> `npm run lint` -> `npx tsc --noEmit` -> `npm run build`

## Language

UI supports English and Spanish (i18n). Backend clinical notes are localized.
