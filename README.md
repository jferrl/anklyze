# Anklyze

<p align="center">
  <img src="frontend/public/favicon.svg" alt="Anklyze Logo" width="80" height="80">
</p>

<p align="center">
  <a href="https://github.com/jferrl/anklyze/actions/workflows/backend.yml">
    <img src="https://github.com/jferrl/anklyze/actions/workflows/backend.yml/badge.svg" alt="Backend CI">
  </a>
  <a href="https://github.com/jferrl/anklyze/actions/workflows/frontend.yml">
    <img src="https://github.com/jferrl/anklyze/actions/workflows/frontend.yml/badge.svg" alt="Frontend CI">
  </a>
</p>

<p align="center">
  <strong>Clinical Decision Support Tool</strong>
</p>

<p align="center">
  <b>Classify Ankle Fractures in Seconds</b>
</p>

<p align="center">
  Get instant Lauge-Hansen, Danis-Weber, AO/OTA, and Bartonicek classifications<br>
  with our evidence-based algorithm. Trusted by orthopedic surgeons worldwide.
</p>

<p align="center">
  <a href="https://anklyze.onrender.com"><strong>Start Classifying</strong></a>
  &nbsp;·&nbsp;
  <a href="#how-it-works">Learn More</a>
</p>

---

## Why Anklyze?

Built for orthopedic surgeons who need accurate, fast fracture classification at the point of care.

| Feature | Description |
| ------- | ----------- |
| **Evidence-Based** | Classifications derived from peer-reviewed literature and validated clinical algorithms |
| **Instant Results** | Get comprehensive classifications in under 30 seconds with our guided questionnaire |
| **Four Systems** | Lauge-Hansen, Danis-Weber, AO/OTA, and Bartonicek classifications in one tool |
| **Always Free** | No subscription, no ads, no data collection. Just a tool that works |

---

## How It Works

Three simple steps to accurate fracture classification:

### 1. Select Fracture Location

Identify which malleoli are involved: medial, lateral, or posterior.

### 2. Answer Guided Questions

Our algorithm adapts to show only relevant questions based on your selections.

### 3. Get Classification

Receive detailed classifications with clinical notes and treatment considerations.

---

## Classification Systems

### Danis-Weber

Based on fibular fracture location relative to the syndesmosis.

| Level | Type | Stability |
| ----- | ---- | --------- |
| Infrasyndesmal | A | Stable |
| Transsyndesmal | B | Variable |
| Suprasyndesmal | C | Unstable |

### Lauge-Hansen

Based on injury mechanism (foot position + deforming force).

| Mechanism | Abbreviation | Stages |
| --------- | ------------ | ------ |
| Supination-Adduction | SA | 2 |
| Supination-External Rotation | SER | 4 |
| Pronation-External Rotation | PER | 4 |
| Pronation-Abduction | PA | 3 |

### AO/OTA

International alphanumeric classification system for ankle fractures (44).

- **44-A**: Infrasyndesmal (A1, A2, A3)
- **44-B**: Transsyndesmal (B1, B2, B3)
- **44-C**: Suprasyndesmal (C1, C2, C3)

### Bartonicek

Posterior malleolus classification based on fragment size and location.

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| **Backend** | Go + Gin |
| **Frontend** | React 19 + TypeScript + Vite |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **i18n** | English & Spanish |

---

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+

### Run Locally

```bash
# Backend
cd backend && go run cmd/server/main.go
# → http://localhost:8080

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

Or use Make:

```bash
make run-backend  # Start backend
make run-frontend # Start frontend
```

---

## API Reference

### `POST /api/classify`

Classify a fracture based on clinical findings.

### `GET /api/options`

Get form options for the frontend.

### `GET /health`

Health check endpoint.

---

## Project Structure

```text
anklyze/
├── backend/
│   ├── cmd/server/        # Entry point
│   └── internal/
│       ├── api/           # HTTP handlers
│       ├── domain/        # Domain models
│       ├── i18n/          # Translations
│       ├── rules/         # Classification engine
│       └── service/       # Business logic
│
└── frontend/
    └── src/
        ├── components/    # React components
        ├── i18n/          # Translations
        └── ...
```

---

<p align="center">
  <strong>Ready to Classify?</strong>
</p>

<p align="center">
  Start using Anklyze now. No signup required.
</p>

<p align="center">
  <a href="https://anklyze.onrender.com"><strong>Classify Your First Fracture →</strong></a>
</p>

---

<p align="center">
  <em>For educational purposes only. Always correlate with clinical findings.</em>
</p>

<p align="center">
  <strong>Anklyze</strong> © 2025
</p>
