# AGENTS.md - Anklyze

## Project Overview

Ankle fracture classification web application using Go backend + React frontend. Classifies fractures according to four international systems: Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek.

## Architecture

```
anklyze/
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
- `internal/domain/fracture.go` - Input types: `FractureInput`, `MedialMorphology`, `FibularLevel`, `FibularMorphology`, `WeberCFractureType`, `InvolvedMalleoli`, `BartonicekType`
- `internal/domain/classification.go` - Output types: `ClassificationResult`, `DanisWeberClassification`, `LaugeHansenClassification`, `AOOTAClassification`, `BartonicekClassification`
- `internal/rules/engine.go` - Decision tree rule engine for all four classification systems
- `internal/api/handler.go` - HTTP handlers with form options

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
- `src/components/FractureForm.tsx` - Main form with dynamic question flow
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
cd backend && go test ./...
```

### Frontend
```bash
cd frontend && npm run build
```

### E2E Verification
1. Start backend: `cd backend && make run`
2. Start frontend: `cd frontend && npm run dev`
3. Test cases:
   - Only lateral + infrasindesmal → Weber A, AO-44-A1, LH SA
   - Only lateral + suprasindesmal + simple → Weber C, AO-44-C1, LH PER
   - Medial + lateral + spiral fibula + lateral+medial → Weber B, AO-44-B2, LH SER
   - Only posterior + type 2 → Bartonicek Type 2

## Language

UI text is in Spanish. Backend clinical notes are in Spanish.
