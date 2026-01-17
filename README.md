# Anklyze - Ankle Fracture Classification

A web application for classifying ankle fractures according to three international classification systems:

- **Danis-Weber** - Based on fibular fracture location
- **Lauge-Hansen** - Based on injury mechanism
- **AO/OTA** - Alphanumeric system (44-A/B/C)

## Features

- Dynamic form with 4 clinical questions
- Rule engine that classifies fractures across all three systems
- Clinical notes based on fracture morphology
- Spanish language interface

## Tech Stack

- **Backend**: Go + Gin framework
- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn/ui components + Tailwind CSS

## Quick Start

### Prerequisites
- Go 1.21+
- Node.js 18+

### Backend
```bash
cd backend
go mod download
make run
```
Server runs on http://localhost:8080

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs on http://localhost:5173

## API

### POST /api/classify
Classify a fracture based on clinical findings.

**Request:**
```json
{
  "fibular_level": "transindesmal",
  "mechanism": "supination_external_rotation",
  "involved_structures": ["lateral_malleolus", "medial_malleolus"],
  "fracture_pattern": "spiral"
}
```

**Response:**
```json
{
  "danis_weber": {
    "type": "Type B",
    "description": "Fractura del peroné a nivel de la sindesmosis..."
  },
  "lauge_hansen": {
    "type": "SER",
    "full_name": "Supinación-Rotación Externa",
    "stage": 4,
    "max_stages": 4,
    "description": "Estadio IV: Fractura del maléolo medial..."
  },
  "ao_ota": {
    "code": "44-B2",
    "description": "Transindesmal con lesión medial..."
  },
  "notes": ["Clinical morphology notes..."]
}
```

### GET /api/options
Get form options for the frontend.

### GET /health
Health check endpoint.

## Classification Logic

### Danis-Weber
| Fibular Level | Type | Stability |
|---------------|------|-----------|
| Infrasindesmal | A | Stable |
| Transindesmal | B | Variable |
| Suprasindesmal | C | Unstable |

### Lauge-Hansen
| Mechanism | Abbreviation | Max Stages |
|-----------|--------------|------------|
| Supination-Adduction | SA | 2 |
| Supination-External Rotation | SER | 4 |
| Pronation-External Rotation | PER | 4 |
| Pronation-Abduction | PA | 3 |

### AO/OTA
- **44-A**: Infrasindesmal (A1, A2, A3)
- **44-B**: Transindesmal (B1, B2, B3)
- **44-C**: Suprasindesmal (C1, C2, C3)

## Project Structure

```
fratures/
├── backend/
│   ├── cmd/server/          # Entry point
│   └── internal/
│       ├── api/             # HTTP handlers
│       ├── domain/          # Domain models
│       ├── rules/           # Classification engine
│       └── service/         # Business logic
│
└── frontend/
    └── src/
        ├── components/      # React components
        ├── hooks/           # Custom hooks
        ├── services/        # API client
        └── types/           # TypeScript types
```

## License

MIT
