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
│   ├── cmd/server/main.go       # Entry point
│   └── internal/
│       ├── api/                 # HTTP handlers and routes
│       ├── config/              # Configuration loading
│       ├── database/            # Database connection (GORM)
│       ├── domain/              # Domain models and types
│       ├── i18n/                # Translations (en.go, es.go)
│       ├── llm/                 # LLM integration (Gemini API)
│       ├── repository/          # Data access layer
│       │   └── postgres/        # PostgreSQL implementation
│       ├── rules/               # Classification rule engine
│       └── service/             # Business logic services
│
└── frontend/                    # React + TypeScript + shadcn/ui
    └── src/
        ├── components/          # React components + shadcn ui/
        │   └── annotation/      # Image annotation components
        │       ├── ImageAnnotator.tsx    # Main wrapper component
        │       ├── AnnotationCanvas.tsx  # Konva canvas with tools
        │       ├── AnnotationToolbar.tsx # Tool selection & controls
        │       └── ImageUploader.tsx     # Drag-drop image upload
        ├── hooks/               # Custom React hooks
        ├── i18n/                # Translations (en.json, es.json)
        ├── services/            # API client
        └── types/               # TypeScript type definitions
```

## Backend (Go)

### Key Files
- `internal/domain/fracture.go` - Input types: `FractureInput`, `MedialMorphology`, `FibularLevel`, `FibularMorphology`, `WeberCFractureType`, `InvolvedMalleoli`, `BartonicekType`
- `internal/domain/classification.go` - Output types: `ClassificationResult`, `DanisWeberClassification`, `LaugeHansenClassification`, `AOOTAClassification`, `BartonicekClassification`
- `internal/domain/audit.go` - Audit trail model: `AuditEntry` with GORM tags for PostgreSQL
- `internal/domain/analytics.go` - Analytics models: `AnalyticsSummary`, `TrendData`, `ClassificationDistribution`
- `internal/rules/engine.go` - Decision tree rule engine for all four classification systems
- `internal/api/handler.go` - HTTP handlers with form options, audit logging, and analytics
- `internal/i18n/` - Internationalization: `en.go`, `es.go` for English/Spanish translations
- `internal/config/config.go` - Configuration loading from environment variables
- `internal/database/database.go` - GORM PostgreSQL connection setup
- `internal/repository/audit.go` - `AuditRepository` and `AnalyticsRepository` interfaces with NoOp implementations
- `internal/repository/postgres/audit.go` - PostgreSQL audit implementation with async writes
- `internal/repository/postgres/analytics.go` - PostgreSQL analytics implementation with aggregation queries
- `internal/llm/client.go` - Gemini API client for natural language fracture extraction
- `internal/service/chat.go` - Chat service for processing natural language fracture descriptions

### API Endpoints
- `POST /api/classify` - Accepts `FractureInput`, returns `ClassificationResult`
- `POST /api/chat` - Chat-based classification from natural language descriptions
- `GET /api/options` - Returns form options for frontend
- `GET /api/analytics/summary` - Returns aggregated statistics for a time period
- `GET /api/analytics/trends` - Returns time-series classification data
- `GET /api/analytics/distribution/:system` - Returns distribution for a classification system
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

## Language

UI supports English and Spanish (i18n). Backend clinical notes are localized.
