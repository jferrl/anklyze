# Architecture

**Analysis Date:** 2026-02-26

## Pattern Overview

**Overall:** Layered monolithic architecture with clear separation between HTTP handlers, business services, domain logic, and data persistence. The system uses the repository pattern with interfaces defined at domain level and PostgreSQL implementations. Frontend is a React SPA with component-based architecture and separate service layer for API communication.

**Key Characteristics:**
- Request flows through Gin HTTP handlers → Services → Rule engine → Repository layer
- Domain models use GORM with JSONB for flexible classification storage
- Services orchestrate business logic (user sync, chat classification, statistics)
- Repository interfaces enable NoOp implementations for environments without database
- Frontend decoupled from backend via typed API clients
- Classification drives entire application flow (both static and LLM-powered paths)

## Layers

**HTTP Handler Layer:**
- Purpose: Accept requests, validate input, coordinate service calls, return JSON responses
- Location: `internal/api/`
- Contains: Gin handler functions split by concern (case_admin_handler.go, case_image_handler.go, etc.), validation logic, rate limiting, CORS
- Depends on: Services, repositories, domain types
- Used by: Gin router setup in main.go

**Service Layer:**
- Purpose: Implement business logic, orchestrate repositories and external services, apply rules
- Location: `internal/service/`
- Contains: ChatService (LLM extraction + classification), UserService (Supabase + DB sync), StatisticsService (Fleiss's kappa, divergence analysis)
- Depends on: Domain types, repositories, LLM client, rules engine
- Used by: HTTP handlers

**Rule Engine (Classification):**
- Purpose: Apply deterministic classification rules based on decision tree flowcharts
- Location: `internal/rules/`
- Contains: Engine with classification methods for each fracture pattern (posterior-only, trimaleolar, etc.)
- Depends on: Domain FractureInput types, classification constants
- Used by: ChatService, handlers

**Domain Layer:**
- Purpose: Define core business entities, error types, validation rules
- Location: `internal/domain/`
- Contains: Case, Study, User, ChatSession, audit types; Classification types (DanisWeber, LaugeHansen, AO/OTA, Bartonicek); Error sentinel values
- Depends on: Nothing (no outbound dependencies)
- Used by: All other backend layers

**Repository Layer:**
- Purpose: Abstract data persistence and provide NoOp fallback for optional database
- Location: `internal/repository/` (interfaces) and `internal/repository/postgres/` (implementations)
- Contains: Interfaces (CaseRepository, UserRepository, AuditRepository) with Postgres implementations using GORM
- Depends on: Domain types, GORM, PostgreSQL driver
- Used by: Services and handlers

**Cross-Cutting Layers:**
- **Auth Layer** (`internal/auth/`): Supabase JWT validation, user sync middleware, role-based access control
- **LLM Client** (`internal/llm/`): Google Generative AI integration for natural language extraction
- **Storage** (`internal/storage/`): Supabase file storage for case images, NoOp implementation fallback
- **Logger** (`internal/logger/`): Structured logging with slog
- **Config** (`internal/config/`): Environment-based configuration loading

## Data Flow

**Classification Request (Direct):**

1. User sends POST /api/classify with FractureInput (JSON)
2. Handler validates input using InputValidator
3. Handler calls RulesEngine.Classify(input)
4. Engine applies decision tree logic, returns ClassificationResult
5. Handler saves audit entry via AuditRepository
6. Handler returns ClassificationResult + analytics metadata (JSON)

**Chat Classification Request:**

1. User sends POST /api/chat with natural language message + language
2. Handler creates/updates ChatSession via ChatAuditRepository
3. Handler calls ChatService.ProcessMessage(message, language, previousInput)
4. ChatService calls LLMClient.ExtractFractureInput() (Google Generative AI)
5. LLMClient returns FractureInput + confidence + clarifications
6. If confidence high and no clarifications: ChatService calls RulesEngine.Classify()
7. If confidence low or clarifications needed: returns extracted input + questions
8. Handler saves ChatMessage and (if classification complete) ChatFeedback
9. Handler saves audit entry, returns ChatResponse (JSON)

**Case Lifecycle:**

1. Admin creates Case via POST /api/admin/cases (title, description, deadline)
2. Admin uploads images via POST /api/cases/{id}/image (stores in Supabase, saves CaseImage)
3. Admin publishes case via PUT /api/cases/{id}/publish (Case.Status → published)
4. Users fetch published cases via GET /api/cases
5. Users submit responses via POST /api/cases/{id}/responses (FractureInput + classification)
6. Handler saves CaseResponse via CaseResponseRepository
7. Case can transition: draft → published → closed

**Study (Multi-Case Reliability):**

1. Admin creates Study with multiple Cases
2. Study assigned Raters (users)
3. Each Rater classifies all Cases
4. Admin views inter-rater reliability metrics (Fleiss's kappa, agreement %)
5. Admin views divergence analysis (answer paths compared to reference)

**State Management:**
- **Backend**: Immutable domain models, GORM handles persistence, audit trail captures all mutations
- **Frontend**: React Query manages server state with 5-minute stale time, Context API for auth state
- **Classification**: Once determined by rules engine, stored in JSONB for later retrieval/analysis

## Key Abstractions

**FractureInput (Intermediate):**
- Purpose: Represents structured fracture parameters extracted from UI or LLM
- Examples: `internal/domain/fracture.go` defines InvolvedMalleoli, MedialMorphology, FibularLevel, etc.
- Pattern: Value object with validation rules embedded in domain layer

**ClassificationResult (Output):**
- Purpose: Holds all classification systems applied to a fracture
- Examples: `internal/domain/classification.go` contains DanisWeber, LaugeHansen, AO/OTA, Bartonicek
- Pattern: Struct with optional fields for each classification system

**Repository Interfaces:**
- Purpose: Enable swappable persistence and graceful degradation
- Examples: `CaseRepository`, `AuditRepository`, `ChatAuditRepository`
- Pattern: Interfaces in `internal/repository/`, Postgres implementations in `internal/repository/postgres/`, NoOp fallbacks for disabled features

**ChatSession & ChatMessage:**
- Purpose: Stateful conversation for multi-turn natural language classification
- Location: `internal/domain/chat_audit.go`
- Pattern: Sessions created on first message, messages linked to session, feedback collected after completion

## Entry Points

**Backend Server:**
- Location: `cmd/anklyze-apiserver/main.go`
- Triggers: `make run` or `go run ./cmd/anklyze-apiserver`
- Responsibilities: Load config, initialize DB connection, set up repositories, create services, register routes, start Gin server, handle graceful shutdown

**Frontend App:**
- Location: `frontend/src/main.tsx` → `frontend/src/App.tsx`
- Triggers: Vite dev server or production build
- Responsibilities: Initialize React Query client, set up auth context, define route tree, render AppShell with breadcrumbs

**API Routes:**
- Location: `internal/api/routes.go`
- Classification endpoint: POST /api/classify
- Chat endpoint: POST /api/chat with rate limiting
- Case admin endpoints: POST /api/admin/cases (create), GET /api/admin/cases (list)
- Case user endpoints: GET /api/cases (published), POST /api/cases/{id}/responses (submit response)
- Study endpoints: POST /api/admin/studies (create), GET /api/studies/{id}/reliability (inter-rater metrics)
- Analytics endpoints: GET /api/analytics/summary, /trends, /distribution/{system} (admin only)

## Error Handling

**Strategy:** Sentinel error values with programmatic error checking using errors.Is(). Validation errors aggregated into FieldError arrays. API responses include error codes for i18n translation on frontend.

**Patterns:**
- Domain errors defined in `internal/domain/errors.go`: ErrNotFound, ErrUnauthorized, ErrInvalidInput, ErrQuotaExceeded, etc.
- Handlers check domain error types and map to HTTP status codes: ErrInvalidInput → 400, ErrForbidden → 403, ErrNotFound → 404
- Validation errors wrapped in ValidationError struct with Unwrap() method for errors.Is() compatibility
- Error codes (lowercase) stored in API responses: `{"code":"invalid_input","errors":[...]}`
- Frontend maps error codes to i18n keys: `errors.invalid_input` → localized message

## Cross-Cutting Concerns

**Logging:** Structured logging via `log/slog` with INFO level for server startup/shutdown, WARN for graceful degradation (DB connection failed), ERROR for actual failures. All error returns include slog.Error() calls in handlers and services.

**Validation:** Two-layer validation:
1. InputValidator checks format (email, repeated chars, keyboard smash for chat inputs)
2. Domain logic validates state transitions (case status, deadline, response limits)

**Authentication:** Supabase JWT validation via `internal/auth/middleware.go`. AuthMiddleware extracts token from Authorization header, validates with JWKS, sets ContextKeyUserID. UserSyncMiddleware syncs Supabase user to database and updates app_metadata roles. RequireRole middleware checks admin role. All protected endpoints require auth middleware; public endpoints (/health, /swagger) excluded.

**Audit Trail:** Optional async audit logging via `AuditRepository.Save()`. Batched writes with configurable buffer size. Tracks who did what (classification, response, creation) with timestamps. Disabled gracefully if DATABASE_URL not set.

**Rate Limiting:** IP-based rate limiter for /api/chat endpoints to protect against LLM API cost overruns. Configured via RateLimitRate and RateLimitBurst. Returns 429 TooManyRequests if exceeded.

**CORS:** Configured via CORSMiddleware with origin from CORS_ALLOW_ORIGIN env var. Allows credentials, common HTTP methods, content-type headers.
