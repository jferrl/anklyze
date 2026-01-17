# AGENTS.md - Anklyze

## Project Overview

Ankle fracture classification web application using Go backend + React frontend. Classifies fractures according to three international systems: Danis-Weber, Lauge-Hansen, and AO/OTA.

## Architecture

```
fratures/
├── backend/                     # Go API server (Gin framework)
│   ├── cmd/server/main.go       # Entry point
│   └── internal/
│       ├── api/                 # HTTP handlers and routes
│       ├── domain/              # Domain models and types
│       ├── rules/               # Classification rule engine
│       └── service/             # Business logic services
│
└── frontend/                    # React + TypeScript + shadcn/ui
    └── src/
        ├── components/          # React components + shadcn ui/
        ├── hooks/               # Custom React hooks
        ├── services/            # API client
        └── types/               # TypeScript type definitions
```

## Backend (Go)

### Key Files
- `internal/domain/fracture.go` - Input types: `FibularFractureLevel`, `InjuryMechanism`, `InvolvedStructure`, `FracturePattern`
- `internal/domain/classification.go` - Output types: `ClassificationResult`, `DanisWeberClassification`, `LaugeHansenClassification`, `AOOTAClassification`
- `internal/rules/engine.go` - Orchestrates all three classification systems
- `internal/rules/danis_weber.go` - Type A/B/C based on fibular level
- `internal/rules/lauge_hansen.go` - SA/SER/PER/PA with stages based on mechanism
- `internal/rules/ao_ota.go` - 44-A/B/C subtypes based on structures

### API Endpoints
- `POST /api/classify` - Accepts `FractureInput`, returns `ClassificationResult`
- `GET /api/options` - Returns form options for frontend
- `GET /health` - Health check

### Running Backend
```bash
cd backend
make run  # or: go run cmd/server/main.go
```
Server runs on `http://localhost:8080`

## Frontend (React + TypeScript)

### Key Files
- `src/types/fracture.ts` - TypeScript types mirroring backend domain
- `src/services/api.ts` - API client with `classifyFracture()` and `getFormOptions()`
- `src/hooks/useClassification.ts` - Hook managing classification state
- `src/components/FractureForm.tsx` - Main form with 4 questions
- `src/components/ClassificationResult.tsx` - Displays classification results

### UI Components (shadcn/ui)
- Card, Button, Label, RadioGroup, Checkbox, Alert

### Running Frontend
```bash
cd frontend
npm run dev
```
App runs on `http://localhost:5173`

## Domain Model

### Input Fields
| Field | Type | Values |
|-------|------|--------|
| `fibular_level` | enum | `infrasindesmal`, `transindesmal`, `suprasindesmal` |
| `mechanism` | enum | `supination_adduction`, `supination_external_rotation`, `pronation_external_rotation`, `pronation_abduction` |
| `involved_structures` | array | `lateral_malleolus`, `medial_malleolus`, `posterior_malleolus`, `atfl`, `ptfl`, `deltoid_ligament`, `syndesmosis` |
| `fracture_pattern` | enum | `transverse`, `oblique`, `spiral`, `comminuted` |

### Output Classifications
- **Danis-Weber**: Type A/B/C based on fibular fracture location relative to syndesmosis
- **Lauge-Hansen**: SA/SER/PER/PA with stages 1-4 based on injury mechanism
- **AO/OTA**: 44-A1/A2/A3, 44-B1/B2/B3, 44-C1/C2/C3 based on structures involved

## Rule Engine Logic

### Danis-Weber
- Infrasindesmal → Type A (below syndesmosis, stable)
- Transindesmal → Type B (at syndesmosis, variable stability)
- Suprasindesmal → Type C (above syndesmosis, unstable)

### Lauge-Hansen Stages
| Mechanism | Stages | Progression |
|-----------|--------|-------------|
| SA | 2 | Lateral → Medial (vertical) |
| SER | 4 | ATFL → Lateral → PTFL/Posterior → Medial |
| PER | 4 | Medial → ATFL → Lateral → Posterior |
| PA | 3 | Medial → ATFL → Lateral (comminuted) |

### Morphology Notes
- **Fibular pattern**: Transverse (SA), Spiral (SER), Comminuted (PA), High (PER)
- **Medial malleolus**: Vertical/oblique = push-off (SA), Transverse = pull-off (SER/PER/PA)

## Testing

### Backend
```bash
cd backend && go test ./...
```

### Frontend
```bash
cd frontend && npm run build
```

### E2E Verification
1. Start backend: `cd backend && make run`
2. Start frontend: `cd frontend && npm run dev`
3. Test case: Transindesmal + SER + Lateral+Medial malleolus + Spiral
4. Expected: Type B, SER Stage 4, 44-B2

## Language

UI text is in Spanish. Backend clinical notes are in Spanish.
