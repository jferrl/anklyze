# AGENTS.md - Anklyze

## Project Overview

Ankle fracture classification web application using Go backend + React frontend. Classifies fractures according to four international systems: Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek.

## Architecture

```
anklyze/
├── .github/workflows/           # CI/CD pipelines
│   ├── backend.yml              # Backend CI (test, vet, build)
│   └── frontend.yml             # Frontend CI (lint, typecheck, build)
│
├── backend/                     # Go API server (Gin framework)
│   ├── cmd/
│   │   └── server/main.go       # HTTP API entry point
│   └── internal/
│       ├── api/                 # HTTP handlers and routes
│       │   ├── handler.go       # Classification handlers
│       │   ├── study_handlers.go    # Study CRUD and response handlers
│       │   └── cohort_handlers.go   # Cohort management and reliability
│       ├── config/              # Configuration loading
│       ├── database/            # Database connection (GORM)
│       ├── domain/              # Domain models and types
│       │   ├── fracture.go      # Classification input types
│       │   ├── study.go         # Study, StudyImage, StudyResponse
│       │   ├── cohort.go        # StudyCohort, CohortUser
│       │   └── reliability.go   # ReliabilityMetrics, FleissKappa
│       ├── i18n/                # Translations (en.go, es.go)
│       ├── llm/                 # LLM integration (Gemini API)
│       ├── repository/          # Data access layer
│       │   ├── cohort.go        # CohortRepository interface
│       │   └── postgres/        # PostgreSQL implementation
│       │       ├── study.go     # Study repository
│       │       └── cohort.go    # Cohort repository
│       ├── rules/               # Classification rule engine
│       ├── service/             # Business logic services
│       │   └── statistics.go    # Kappa calculations, reliability metrics
│       └── storage/             # File storage (Supabase Storage)
│
├── docs/                        # Documentation
│   ├── RELIABILITY_ANALYSIS.md  # Reliability analysis guide (EN)
│   └── RELIABILITY_ANALYSIS_ES.md # Reliability analysis guide (ES)
│
├── fixtures/                    # SQL test fixtures
│   ├── cohort_test_data.sql     # Test data for cohort UI
│   └── cleanup_cohort_test_data.sql # Cleanup script
│
└── frontend/                    # React + TypeScript + shadcn/ui
    └── src/
        ├── components/          # React components + shadcn ui/
        │   └── annotation/      # Image annotation components
        ├── hooks/               # Custom React hooks
        ├── i18n/                # Translations (en.json, es.json)
        ├── pages/
        │   └── admin/           # Admin pages
        │       ├── AdminCohortsPage.tsx      # Cohort list
        │       ├── CohortEditorPage.tsx      # Cohort editor
        │       └── CohortReliabilityPage.tsx # Reliability dashboard
        ├── services/            # API client
        └── types/
            └── study.ts         # Study and cohort TypeScript types
```

## Backend (Go)

### Key Files

**Classification:**

- `internal/domain/fracture.go` - Input types: `FractureInput`, `MedialMorphology`, `FibularLevel`, `FibularMorphology`, `WeberCFractureType`, `InvolvedMalleoli`, `BartonicekType`
- `internal/domain/classification.go` - Output types: `ClassificationResult`, `DanisWeberClassification`, `LaugeHansenClassification`, `AOOTAClassification`, `BartonicekClassification`
- `internal/rules/engine.go` - Decision tree rule engine for all four classification systems
- `internal/api/handler.go` - HTTP handlers with form options, audit logging, and analytics

**Studies & Cohorts:**

- `internal/domain/study.go` - `Study`, `StudyImage`, `StudyResponse`, `StudyUser` models
- `internal/domain/cohort.go` - `StudyCohort`, `CohortUser` models with status (draft/active/closed)
- `internal/domain/reliability.go` - `ReliabilityMetrics`, `FleissKappaResult`, `CohortReliabilityMetrics`, `RaterProgress`
- `internal/api/study_handlers.go` - Study CRUD, image upload, response submission with cohort access control
- `internal/api/cohort_handlers.go` - Cohort management, rater assignment, reliability metrics
- `internal/repository/cohort.go` - `CohortRepository`, `CohortResponseRepository` interfaces
- `internal/repository/postgres/cohort.go` - PostgreSQL implementation with access control and progress tracking
- `internal/service/statistics.go` - Kappa calculations (Cohen's, Fleiss', Weighted), sensitivity/specificity, confidence intervals

**Audit & Analytics:**

- `internal/domain/audit.go` - Audit trail model: `AuditEntry` with GORM tags for PostgreSQL
- `internal/domain/analytics.go` - Analytics models: `AnalyticsSummary`, `TrendData`, `ClassificationDistribution`
- `internal/repository/audit.go` - `AuditRepository` and `AnalyticsRepository` interfaces with NoOp implementations
- `internal/repository/postgres/audit.go` - PostgreSQL audit implementation with async writes
- `internal/repository/postgres/analytics.go` - PostgreSQL analytics implementation with aggregation queries

**Infrastructure:**

- `internal/i18n/` - Internationalization: `en.go`, `es.go` for English/Spanish translations
- `internal/config/config.go` - Configuration loading from environment variables
- `internal/database/database.go` - GORM PostgreSQL connection setup
- `internal/storage/storage.go` - File storage interface (Supabase Storage implementation)
- `internal/llm/client.go` - Gemini API client for natural language fracture extraction
- `internal/service/chat.go` - Chat service for processing natural language fracture descriptions

### API Endpoints

**Classification:**

- `POST /api/classify` - Accepts `FractureInput`, returns `ClassificationResult`
- `POST /api/chat` - Chat-based classification from natural language descriptions
- `GET /api/options` - Returns form options for frontend

**Studies (requires auth):**

- `GET /api/studies` - List published studies available to user
- `GET /api/studies/:id` - Get study details with images
- `POST /api/studies/:id/responses` - Submit classification response (with cohort access control)
- `GET /api/studies/:id/my-responses` - Get user's own responses

**Admin Studies:**

- `POST /api/admin/studies` - Create study
- `GET /api/admin/studies` - List all studies (with filters)
- `GET /api/admin/studies/:id` - Get study with analytics
- `PUT /api/admin/studies/:id` - Update study
- `DELETE /api/admin/studies/:id` - Delete study
- `POST /api/admin/studies/:id/images` - Upload image
- `PUT /api/admin/studies/:id/publish` - Publish study
- `PUT /api/admin/studies/:id/close` - Close study
- `GET /api/admin/studies/:id/reliability` - Get reliability metrics (Kappa, etc.)

**Admin Cohorts:**

- `POST /api/admin/cohorts` - Create cohort
- `GET /api/admin/cohorts` - List cohorts (with status filter)
- `GET /api/admin/cohorts/:id` - Get cohort with cases
- `PUT /api/admin/cohorts/:id` - Update cohort
- `DELETE /api/admin/cohorts/:id` - Delete cohort
- `POST /api/admin/cohorts/:id/cases` - Add study to cohort
- `DELETE /api/admin/cohorts/:id/cases/:studyId` - Remove study from cohort
- `PUT /api/admin/cohorts/:id/cases/reorder` - Reorder cases
- `PUT /api/admin/cohorts/:id/activate` - Activate cohort
- `PUT /api/admin/cohorts/:id/close` - Close cohort
- `GET /api/admin/cohorts/:id/users` - List assigned raters
- `POST /api/admin/cohorts/:id/users` - Assign rater to cohort
- `DELETE /api/admin/cohorts/:id/users/:userId` - Remove rater from cohort
- `GET /api/admin/cohorts/:id/reliability` - Get cohort reliability (Fleiss' Kappa, per-case metrics)
- `GET /api/admin/cohorts/:id/progress` - Get rater progress

**Analytics:**

- `GET /api/analytics/summary` - Returns aggregated statistics for a time period
- `GET /api/analytics/trends` - Returns time-series classification data
- `GET /api/analytics/distribution/:system` - Returns distribution for a classification system

**System:**

- `GET /health` - Health check
- `GET /swagger/*` - OpenAPI documentation (Swagger UI)

### Environment Variables

| Variable        | Description                   | Default                     |
|-----------------|-------------------------------|-----------------------------|
| `PORT`          | Server port                   | `8080`                      |
| `DATABASE_URL`  | PostgreSQL connection string  | (none - audit disabled)     |
| `GEMINI_API_KEY`| Google Gemini API key         | (none - chat disabled)      |
| `GEMINI_MODEL`  | Gemini model to use           | `gemini-3-flash-preview`    |

### Running Backend

```bash
cd backend
make run          # Run without database (audit disabled)
make run-with-db  # Run with local PostgreSQL (audit enabled)
make swagger      # Regenerate OpenAPI docs after changing handlers
```

Server runs on `http://localhost:8080`

Swagger UI available at `http://localhost:8080/swagger/index.html`

### Database Commands

```bash
make db-start     # Start local PostgreSQL with Docker
make db-stop      # Stop and remove local PostgreSQL
make db-shell     # Open psql shell to local database
make db-audit     # Show recent audit entries
```

### Audit Trail

When `DATABASE_URL` is set, the backend logs every classification request to PostgreSQL:

- Input parameters (JSONB)
- Classification result (JSONB)
- Denormalized fields for analytics (danis_weber_type, lauge_hansen_type, ao_ota_code)
- Request metadata (client_ip, user_agent, language, duration_ms)

Schema is auto-migrated on startup using GORM AutoMigrate.

### Analytics

Analytics endpoints provide aggregated statistics from audit entries:

**Summary** (`GET /api/analytics/summary?from=2024-01-01&to=2024-01-31`):

- Total classifications count
- Impossible classifications count and percentage
- Average processing time
- Distribution by language, Danis-Weber, Lauge-Hansen, and AO/OTA

**Trends** (`GET /api/analytics/trends?from=2024-01-01&to=2024-01-31&granularity=day`):

- Time-series data with configurable granularity (day, week, month)
- Count and impossible count per period

**Distribution** (`GET /api/analytics/distribution/:system`):

- Detailed distribution for a specific system (danis-weber, lauge-hansen, ao-ota)
- Counts and percentages per classification type

Query parameters:

- `from` - Start date (YYYY-MM-DD), defaults to 30 days ago
- `to` - End date (YYYY-MM-DD), defaults to today
- `granularity` - Time aggregation (day, week, month), defaults to day

### Chat-Based Classification

The chat endpoint (`POST /api/chat`) allows users to describe fractures in natural language and receive classifications.

**Request:**

```json
{
  "message": "Patient has a lateral malleolus fracture at the level of the syndesmosis with spiral morphology",
  "language": "en"
}
```

**Response:**

```json
{
  "status": "complete",
  "extracted_input": { ... },
  "classification": { ... },
  "confidence": 0.85,
  "message": "Fracture classified successfully."
}
```

**Status values:**

- `complete` - Classification successful
- `needs_clarification` - More information needed (includes `clarifications` array with questions)
- `error` - Processing failed

**How it works:**

1. User sends natural language fracture description
2. Gemini LLM extracts structured `FractureInput` parameters
3. If confidence < 0.7 or fields are ambiguous, returns clarification questions
4. Otherwise, runs the rules engine and returns full classification

**Note:** Requires `GEMINI_API_KEY` environment variable. Returns 503 if chat service is unavailable.

### Authentication & Authorization

The application uses Supabase Auth for authentication with JWT validation and role-based access control.

**Architecture:**

```text
Frontend (React)                    Supabase Auth                    Backend (Go/Gin)
     |                                   |                                |
     |--- Login (Email/Password) ------->|                                |
     |<-- JWT Access Token --------------|                                |
     |                                   |                                |
     |--- API Request + JWT Bearer ------------------------------------>|
     |                                   |                     JWT Validation (JWKS)
     |                                   |                     User Sync to DB
     |                                   |                     Role Check
     |<------------------- Response ------------------------------------|
```

**Key Files:**

- `internal/auth/auth.go` - JWT validator using JWKS (ES256 signing)
- `internal/auth/middleware.go` - AuthMiddleware, UserSyncMiddleware, RequireRole
- `internal/domain/user.go` - User model with role field
- `internal/repository/user.go` - UserRepository interface
- `internal/repository/postgres/user.go` - PostgreSQL implementation with SyncOnLogin

**User Sync on Login:**

On each authenticated request, `UserSyncMiddleware`:

1. Extracts user ID from JWT claims
2. Fetches user from local `users` table (read-only SELECT)
3. If user doesn't exist (first login), calls `SyncOnLogin` to create them with `last_login_at`
4. Retrieves user with DB role (takes precedence over JWT claims)
5. Stores user in request context for handlers

This approach avoids unnecessary database writes on every request - only first logins trigger an INSERT.

**Roles:**

| Role | Access |
|------|--------|
| `user` | Classification endpoints, chat, form options |
| `admin` | All user endpoints + analytics |

**Access Control Matrix:**

| Endpoint | Public | User | Admin |
|----------|--------|------|-------|
| `/health` | ✅ | ✅ | ✅ |
| `/swagger/*` | ✅ | ✅ | ✅ |
| `/api/classify` | ❌ | ✅ | ✅ |
| `/api/options` | ❌ | ✅ | ✅ |
| `/api/chat/*` | ❌ | ✅ | ✅ |
| `/api/analytics/*` | ❌ | ❌ | ✅ |

**Environment Variables:**

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes (for auth) |
| `SUPABASE_JWT_SECRET` | JWT secret (optional, uses JWKS if not set) | No |

**Making a User Admin:**

After first login, run in Supabase SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

**Frontend Auth:**

- `src/lib/supabase.ts` - Supabase client initialization
- `src/contexts/AuthContext.tsx` - Auth state management, profile extraction
- `src/components/auth/LoginPage.tsx` - Login form (sign-up disabled)
- `src/components/auth/ProtectedRoute.tsx` - Route guard for authenticated routes
- `src/components/auth/UserMenu.tsx` - User dropdown with role badge

**Profile Display:**

User display name is extracted in this priority:

1. `user_metadata.full_name` (if set in Supabase)
2. `user_metadata.name` (if set)
3. Email username (part before `@`)

## Frontend (React + TypeScript)

### Key Files
- `src/types/fracture.ts` - TypeScript types mirroring backend domain
- `src/types/annotation.ts` - TypeScript types for image annotations
- `src/services/api.ts` - API client with `classifyFracture()` and `getFormOptions()`
- `src/hooks/useClassification.ts` - Hook managing classification state and comparison scenarios
- `src/hooks/useAnnotations.ts` - Hook managing annotation state (useReducer-based)
- `src/components/FractureForm.tsx` - Main form with dynamic question flow, keyboard navigation, and history
- `src/components/ClassificationResult.tsx` - Displays classification results
- `src/components/ComparisonView.tsx` - Side-by-side comparison of multiple classification scenarios
- `src/components/annotation/ImageAnnotator.tsx` - Main image annotation wrapper component
- `src/components/annotation/AnnotationCanvas.tsx` - Konva canvas with annotation rendering
- `src/components/annotation/AnnotationToolbar.tsx` - Tool selection and controls
- `src/components/annotation/ImageUploader.tsx` - Drag-drop image upload component
- `src/utils/shareUrl.ts` - URL encoding/decoding for shareable classification links
- `src/i18n/` - Internationalization: `en.json`, `es.json`, `config.ts`

### UI Components (shadcn/ui)
- Card, Button, Label, RadioGroup, Checkbox, Alert

### Frontend Features

#### Keyboard Navigation

- Number keys `1-9`: Select the corresponding option in the current question
- `Backspace`: Go back to the previous question (undo last selection)
- `Enter`: Submit the form when complete

#### Back/Reset Navigation

- Form maintains a history stack of previous states
- Back button allows undoing the last selection
- Reset button clears the form and starts over

#### Shareable URLs

- After classification, users can copy a shareable URL
- URLs use compact parameter encoding (e.g., `?m=lateral_only&fl=infrasindesmal`)
- Opening a shared URL auto-classifies and shows results directly
- URL is cleaned after loading to avoid stale state

#### Classification Comparison

- Compare up to 3 different fracture scenarios side-by-side
- After viewing a result, click "Compare" to start comparison mode
- Differences between scenarios are highlighted with colored rings
- Each classification system (Lauge-Hansen, Danis-Weber, AO/OTA, Bartonicek) shown in its own card

#### Image Annotation

Optional collapsible section in the classification form for uploading and annotating images.

**Tools available:**

- `Select` (V) - Select and move annotations
- `Marker` (M) - Place point markers
- `Circle` (C) - Draw circles
- `Arrow` (A) - Draw arrows
- `Line` (L) - Draw lines
- `Measurement` (R) - Measure distances in pixels
- `Angle` (G) - Measure angles (3-point)
- `Text` (T) - Add text labels
- `Pan` (H) - Pan/drag the canvas

**Features:**

- Drag-drop or click to upload images (JPEG, PNG, max 10MB)
- Zoom with scroll wheel or buttons (0.1x - 5x)
- Color picker with 5 preset colors
- Delete selected annotation with `Delete`/`Backspace`
- Session-only persistence (annotations not saved to backend)
- Built with Konva + react-konva for canvas rendering

### Running Frontend
```bash
cd frontend
npm run dev
```
App runs on `http://localhost:5173`

## Domain Model

### Input Flow (Decision Tree)

The form follows a decision tree based on which malleoli are fractured:

1. **Which malleoli are fractured?** (checkboxes: medial, lateral, posterior)

Based on selection, different paths are followed:

| Path | Condition | Questions |
|------|-----------|-----------|
| Posterior Only | No medial, no lateral, yes posterior | → Bartonicek type |
| Medial Only | Yes medial, no lateral, no posterior | → Complete (AO-44-A1, LH PER/PA) |
| Medial + Posterior | Yes medial, no lateral, yes posterior | → Complete (AO-44-A2, LH PA) |
| Lateral Only | No medial, yes lateral, no posterior | → Lateral level → (if supra) type |
| Complex | Medial + Lateral (± posterior) | → Medial morphology → ... |

### Input Fields

| Field | Type | Values |
|-------|------|--------|
| `has_medial_fracture` | bool | true/false |
| `has_lateral_fracture` | bool | true/false |
| `has_posterior_fracture` | bool | true/false |
| `posterior_fracture_type` | enum | `type_1`, `type_2`, `type_3`, `type_4` (Bartonicek) |
| `lateral_fracture_level` | enum | `infrasindesmal`, `transindesmal`, `suprasindesmal_high` |
| `suprasindesmal_type` | enum | `simple_diaphyseal`, `multifragmentary`, `proximal` |
| `medial_morphology` | enum | `oblique_vertical`, `transverse`, `doubtful` |
| `fibula_transverse` | bool | true/false |
| `fibular_level` | enum | `infrasindesmal`, `transindesmal`, `suprasindesmal_high`, `doubtful` |
| `fibular_transverse` | bool | true/false |
| `fibular_morphology` | enum | `transverse`, `oblique`, `spiral` |
| `oblique_fibular_level` | enum | `infrasindesmal`, `transindesmal`, `suprasindesmal_high` |
| `involved_malleoli` | enum | `unifocal`, `bifocal`, `trifocal`, `lateral_only`, `lateral_medial`, `lateral_medial_posterior` |
| `posterior_type` | enum | `type_1`, `type_2`, `type_3`, `type_4` (Bartonicek) |

### Output Classifications

- **Danis-Weber**: Type A/B/C based on fibular fracture location relative to syndesmosis
- **Lauge-Hansen**: SA/SER/PER/PA based on injury mechanism
- **AO/OTA**: 44-A1/A2/A3, 44-B1/B2/B3, 44-C1/C2/C3 based on structures involved
- **Bartonicek**: Type 1-4 for posterior malleolus fractures

## Rule Engine Logic

### Classification Paths

**Lateral Only:**
- Infrasindesmal → Weber A, AO-44-A1, LH SA
- Transindesmal → Weber B, AO-44-B1, LH SER
- Suprasindesmal → Weber C, LH PER, AO-44-C1/C2/C3 (based on type)

**Complex Path (Medial + Lateral):**
1. Check medial morphology
2. If oblique/vertical → Check if fibula is transverse → SA path or morphology check
3. If transverse/doubtful → Check fibular level
4. Based on fibular morphology:
   - Transverse → SA / Weber A
   - Spiral → SER / Weber B
   - Oblique → PA (check level for Weber type)

### Lauge-Hansen Mechanisms

| Type | Mechanism | Typical Pattern |
|------|-----------|-----------------|
| SA | Supination-Adduction | Push-off medial, transverse fibula |
| SER | Supination-External Rotation | Spiral fibula |
| PER | Pronation-External Rotation | High fibula (>6cm) |
| PA | Pronation-Abduction | Oblique fibula |

### Bartonicek Types

| Type | Description |
|------|-------------|
| Type 1 | Fragmento extraincisural |
| Type 2 | Fragmento posterolateral |
| Type 3 | Fragmento posteromedial y posterolateral |
| Type 4 | Gran fragmento triangular posterolateral |

## Studies & Cohorts (Inter-Rater Reliability)

### Study Model

Studies are individual cases with X-ray images for classification evaluation:

```go
type Study struct {
    ID                      uuid.UUID
    Title                   string
    Description             string
    Status                  StudyStatus  // draft, published, closed
    Deadline                *time.Time
    ReferenceClassification *string      // Gold standard (JSON)
    CohortID                *uuid.UUID   // If part of a cohort
    CaseOrder               int          // Order within cohort
    ResponseCount           int          // Denormalized counter
    UniqueUsers             int          // Unique raters
}
```

**Study Status Flow:** `draft` → `published` → `closed`

### Cohort Model

Cohorts group multiple studies for proper inter-rater reliability analysis (Fleiss' Kappa):

```go
type StudyCohort struct {
    ID             uuid.UUID
    Title          string
    Description    string
    Status         CohortStatus  // draft, active, closed
    CaseCount      int           // Number of studies
    TotalResponses int
    UniqueRaters   int
    CompleteRaters int           // Raters who completed ALL cases
}

type CohortUser struct {
    CohortID       uuid.UUID
    UserID         uuid.UUID
    UserEmail      string
    CasesCompleted int           // Progress tracking
    LastResponseAt *time.Time
}
```

**Access Control:**

- **Standalone studies**: Open to all authenticated users
- **Cohort studies**: Only pre-assigned raters can respond (enforced in `SubmitResponse`)

### Reliability Metrics

The statistics service calculates:

| Metric | Description |
|--------|-------------|
| **Cohen's Kappa** | Agreement between 2 raters (with 95% CI) |
| **Fleiss' Kappa** | Agreement among 3+ raters across multiple cases |
| **Weighted Kappa** | For ordinal data (AO/OTA) with linear weights |
| **Percent Agreement** | Simple agreement percentage |
| **Sensitivity/Specificity** | Per-category diagnostic metrics |
| **PPV/NPV/F1** | Positive/Negative Predictive Value, F1 score |

**Fleiss' Kappa Requirements:**

- Multiple cases (subjects) in a cohort
- 3+ raters who completed ALL cases
- Returns `null` with explanatory note for single-case studies

### Cohort Workflow

```text
1. Admin creates cohort (draft)
2. Admin adds studies (cases) to cohort
3. Admin assigns raters (CohortUser)
4. Admin activates cohort
5. Raters complete all cases
6. Admin views reliability metrics (Fleiss' Kappa, per-case agreement)
7. Admin closes cohort
```

## Testing

### Backend
```bash
cd backend && go vet ./...           # Static analysis
cd backend && go test -v -race ./... # Run tests with race detection
```

### Frontend
```bash
cd frontend && npm run lint      # ESLint
cd frontend && npx tsc --noEmit  # Type check
cd frontend && npm run build     # Build
```

### E2E Verification
1. Start backend: `cd backend && make run`
2. Start frontend: `cd frontend && npm run dev`
3. Test cases:
   - Only lateral + infrasindesmal → Weber A, AO-44-A1, LH SA
   - Only lateral + suprasindesmal + simple → Weber C, AO-44-C1, LH PER
   - Medial + lateral + spiral fibula + lateral+medial → Weber B, AO-44-B2, LH SER
   - Only posterior + type 2 → Bartonicek Type 2

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

### Backend CI (`backend.yml`)

Triggers on push/PR to `main` when `backend/**` changes:

1. Setup Go (version from `go.mod`)
2. Download and verify dependencies
3. Run `go vet ./...`
4. Run `go test -v -race ./...`
5. Build binary

### Frontend CI (`frontend.yml`)

Triggers on push/PR to `main` when `frontend/**` changes:

1. Setup Node.js 20
2. Install dependencies (`npm ci`)
3. Run linter (`npm run lint`)
4. Type check (`npx tsc --noEmit`)
5. Build (`npm run build`)
6. Upload build artifacts

## Development Tools

### Claude Code Configuration

- `.claudeignore` - Controls which files Claude Code indexes and searches. Excludes:
  - Dependencies: `node_modules/`, `vendor/`
  - Build outputs: `dist/`, `bin/`, `backend/tmp/`
  - Test artifacts: `playwright-report/`, `test-results/`, coverage files
  - Version control: `.git/`
  - IDE/OS files: `.vscode/`, `.DS_Store`
  - Logs and temporary files

This improves Claude Code's performance by focusing on source code and relevant configuration files.

## Language

UI supports English and Spanish (i18n). Backend clinical notes are localized.
