# Codebase Structure

**Analysis Date:** 2026-02-26

## Directory Layout

```
anklyze/
├── cmd/
│   └── anklyze-apiserver/
│       └── main.go                    # Server entry point
├── internal/
│   ├── api/                           # HTTP handlers and routing
│   ├── domain/                        # Core business entities and errors
│   ├── service/                       # Business logic orchestration
│   ├── repository/                    # Data persistence abstractions
│   │   └── postgres/                  # PostgreSQL implementations
│   ├── rules/                         # Classification rule engine
│   ├── auth/                          # Supabase auth middleware
│   ├── config/                        # Configuration loading
│   ├── database/                      # GORM connection setup
│   ├── logger/                        # Structured logging
│   ├── llm/                           # Google Generative AI client
│   ├── storage/                       # File storage (Supabase or NoOp)
│   ├── supabase/                      # Supabase admin client for role sync
│   ├── i18n/                          # Internationalization support
│   └── timeutil/                      # Date range utilities
├── frontend/
│   ├── src/
│   │   ├── pages/                     # Page components
│   │   ├── components/                # Reusable UI components
│   │   ├── features/                  # Feature modules
│   │   ├── services/                  # API clients and business logic
│   │   ├── types/                     # TypeScript type definitions
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/                       # Utility functions
│   │   ├── i18n/                      # i18n configuration and translations
│   │   ├── contexts/                  # React Context providers
│   │   ├── assets/                    # Static assets
│   │   ├── data/                      # Static data (flowcharts)
│   │   ├── index.css                  # Global styles
│   │   ├── main.tsx                   # React entry point
│   │   └── App.tsx                    # App router and providers
│   ├── public/                        # Static files
│   └── vite.config.ts                 # Vite build configuration
├── e2e/                               # Playwright end-to-end tests
├── docs/                              # OpenAPI Swagger spec and docs
├── fixtures/                          # Test fixtures and sample data
├── .github/                           # GitHub workflows and config
├── go.mod                             # Go module definition
├── CLAUDE.md                          # Project coding guidelines
└── Makefile                           # Build and test commands
```

## Directory Purposes

**cmd/anklyze-apiserver/:**
- Purpose: Application entry point for the API server
- Contains: main.go with initialization, config loading, dependency injection, router setup
- Key files: `main.go` (278 lines) - bootstraps DB, auth, services, and starts HTTP server

**internal/api/:**
- Purpose: HTTP handlers for all API endpoints
- Contains: Handler functions split by concern (case_admin_handler.go, case_image_handler.go, chat_handlers.go, user_handlers.go, study_handlers.go, case_analytics_handler.go)
- Key patterns: Each handler takes repositories and services as dependencies, returns gin.Context handlers, validates input before calling services
- Key files:
  - `handler.go` - Base Handler struct with rules engine and services
  - `routes.go` - SetupRoutes, SetupCaseRoutes, SetupStudyRoutes defining all endpoints
  - `validation.go`, `input_validation.go` - Request validation and InputValidator
  - `errors.go` - Error response formatting

**internal/domain/:**
- Purpose: Core business entities, types, and error definitions
- Contains: Case, Study, User, ChatSession models; Classification types (DanisWeber, LaugeHansen, AO/OTA, Bartonicek); FractureInput and related enums
- Key patterns: GORM struct tags for DB mapping, JSONB for flexible classification storage, immutable value objects for classification results
- Key files:
  - `case.go` - Case entity with status lifecycle, reference classification, images
  - `fracture.go` - FractureInput with all classification questions (InvolvedMalleoli, MedialMorphology, etc.)
  - `classification.go` - ClassificationResult and all classification system types
  - `user.go` - User with roles
  - `chat_audit.go` - ChatSession, ChatMessage, ChatFeedback
  - `errors.go` - Sentinel errors and error codes

**internal/service/:**
- Purpose: Business logic orchestration between handlers and repositories
- Contains: ChatService (LLM extraction + classification), UserService (sync Supabase to DB), StatisticsService (reliability metrics)
- Key patterns: Stateless services, interfaces for dependency injection, error propagation with slog
- Key files:
  - `chat.go` - ChatService.ProcessMessage() handles extraction and classification
  - `user.go` - UserService.SyncUser() updates DB from Supabase
  - `statistics.go` - StatisticsService.CalculateFleisskappa(), AnalyzeDivergence()

**internal/repository/:**
- Purpose: Data persistence abstraction layer with interfaces
- Contains: Interfaces (CaseRepository, UserRepository, AuditRepository, ChatAuditRepository, StudyRepository)
- Key patterns: Interfaces defined here, implementations in postgres/ subdirectory, NoOp implementations for disabled features
- Key files:
  - `case.go` - CaseRepository interface (Create, Get, List, Update)
  - `audit.go` - AuditRepository interface (Save, Close) with async batching
  - `chat_audit.go` - ChatAuditRepository interface (CreateSession, SaveMessage, SaveFeedback)
  - `user.go` - UserRepository interface (GetByID, GetByEmail, Upsert)

**internal/repository/postgres/:**
- Purpose: PostgreSQL implementations of repository interfaces using GORM
- Contains: Concrete implementations with SQL queries via GORM, error wrapping, batch operations
- Key patterns: Methods called from services, GORM model references, jsonb.JSONQuery for filtering JSONB columns
- Key files:
  - `case.go` - Case CRUD with status filtering
  - `audit.go` - Async audit buffer with goroutine worker
  - `chat_audit.go` - Chat session and message persistence
  - `analytics.go` - Aggregation queries for classification distribution, trends

**internal/rules/:**
- Purpose: Deterministic classification rule engine applying decision tree flowchart
- Contains: Engine struct with Classify() method and private classification methods for each fracture pattern
- Key patterns: Switch on InvolvedMalleoli, nested conditionals for each sub-question, returns ClassificationResult with relevant systems populated
- Key files:
  - `engine.go` - Main Engine.Classify() routing to pattern-specific methods, classification helpers

**internal/auth/:**
- Purpose: Supabase JWT validation and role-based access control
- Contains: Validator struct wrapping JWKS client, middleware functions for auth enforcement
- Key patterns: Extraction of sub/email from JWT claims, setting ContextKeyUserID/ContextKeyRole in gin context
- Key files:
  - `auth.go` - Validator.ValidateToken()
  - `middleware.go` - AuthMiddleware, UserSyncMiddleware, RequireRole()

**internal/config/:**
- Purpose: Environment-based configuration loading with validation
- Contains: Config struct with all env var mappings
- Key patterns: Load from env with defaults, validation (DatabaseURL, SupabaseURL, etc.), feature flag methods (HasDatabase, HasSupabase)
- Key files: `config.go` - Load(), feature flag methods

**internal/database/:**
- Purpose: GORM database connection initialization
- Contains: Connect() function returning *gorm.DB
- Key files: `database.go` - PostgreSQL DSN parsing, connection pooling config

**internal/llm/:**
- Purpose: Google Generative AI (Gemini) client for natural language extraction
- Contains: Client struct wrapping google.GenerativeAI, ExtractFractureInput() method
- Key patterns: Structured prompt engineering, JSON parsing of LLM response, confidence scoring
- Key files:
  - `client.go` - Client initialization, ExtractFractureInput()
  - `prompts.go` - Prompt templates with medical context

**internal/logger/:**
- Purpose: Structured logging configuration using log/slog
- Contains: Setup() with log level and format options
- Key files: `logger.go`

**internal/storage/:**
- Purpose: File storage abstraction (Supabase or NoOp)
- Contains: Storage interface, SupabaseStorage implementation, NoOpStorage fallback
- Key patterns: UploadFile(), DeleteFile(), GetSignedURL() methods
- Key files:
  - `supabase.go` - Supabase storage client
  - `noop.go` - NoOp implementation for disabled storage

**internal/supabase/:**
- Purpose: Supabase admin client for syncing roles to app_metadata
- Contains: AuthAdmin struct wrapping Supabase management API
- Key files: `auth.go` - UpdateUserRole()

**internal/i18n/:**
- Purpose: Internationalization support for backend error messages
- Contains: Language enum, parsing logic from Accept-Language header
- Key files: `i18n.go`

**internal/timeutil/:**
- Purpose: Date range utilities for analytics queries
- Contains: DateRange struct, parsing and validation
- Key files: `daterange.go`

**frontend/src/pages/:**
- Purpose: Top-level page components for main user flows
- Contains: ClassifyPage, CasesPage, CaseDetailPage, ProfilePage, admin/* pages
- Key pattern: Each page maps to one route, uses hooks for API calls and state
- Key files:
  - `ClassifyPage.tsx` - Main classification interface
  - `CasesPage.tsx` - Browse published cases
  - `CaseDetailPage.tsx` - Case details + submit response
  - `ProfilePage.tsx` - User profile management
  - `admin/AdminDashboardPage.tsx` - Admin overview
  - `admin/AdminCasesPage.tsx` - Case CRUD
  - `admin/CaseAnalyticsPage.tsx` - Classification distribution charts
  - `admin/CaseReliabilityPage.tsx` - Inter-rater reliability metrics

**frontend/src/components/:**
- Purpose: Reusable UI components organized by feature/domain
- Contains: Layout (AppShell, Navbar), UI primitives (buttons, cards, dialogs from shadcn), Feature components (ClassificationResult, ChatPanel, FlowDiagramSidebar)
- Subdirectories:
  - `ui/` - Headless shadcn/ui components
  - `auth/` - Auth-specific components (LoginPage, ProtectedRoute, HomeRedirect)
  - `admin/` - Admin panel components
  - `layout/` - App shell and navigation
  - `cases/` - Case-related components
  - `analytics/` - Analytics charts and displays
  - `research/` - Research/study components
  - `studies/` - Study-specific components

**frontend/src/features/fracture-classification/:**
- Purpose: Encapsulated feature for the classification questionnaire flow
- Contains: Classification form, step components, results panel, hooks for form state
- Key files:
  - `components/FractureForm.tsx` - Main form component
  - `components/QuestionStep.tsx` - Single question UI
  - `components/ResultsPanel.tsx` - Classification results display
  - `hooks/` - useClassificationForm, custom hooks
  - `utils/` - Helper functions for form logic

**frontend/src/services/:**
- Purpose: API client layer and business logic services
- Subdirectories:
  - `core/` - apiClient.ts (base fetch wrapper), errorHandling.ts (error types)
  - `classification/` - classificationService.ts (classify, validate endpoints)
  - `chat/` - chatService.ts (chat message, session endpoints)
  - `study/` - studyService.ts, caseService.ts
  - `feedback/` - feedbackService.ts (chat feedback endpoints)
- Key pattern: Service functions are async, call apiRequest() for type-safe API communication

**frontend/src/types/:**
- Purpose: Shared TypeScript type definitions mirroring backend domain models
- Subdirectories:
  - `api/` - API request/response types
  - `domain/` - Domain entity types (Case, Study, User, Classification)
  - `ui/` - UI-specific types
- Key files: Auto-generated or manually maintained types that match backend Go structs

**frontend/src/lib/:**
- Purpose: Utility functions and configuration
- Contains: Supabase client initialization, formatting functions, validation utilities
- Key files:
  - `supabase.ts` - Supabase client singleton
  - `utils.ts` - Common utilities

**frontend/src/hooks/:**
- Purpose: Custom React hooks for reusable state/effect logic
- Contains: useAuth, useQuery wrappers, form state hooks
- Key pattern: Composition with React Query for server state, Context for auth state

**frontend/src/contexts/:**
- Purpose: React Context providers for global state
- Contains: AuthContext with user, loading, login/logout
- Key files: `AuthContext.tsx`

**frontend/src/i18n/:**
- Purpose: Internationalization configuration and translations
- Contains: i18n configuration with language detection, translation JSON files (en.json, es.json)
- Key files:
  - `config.ts` - i18n setup with language detection
  - `en.json`, `es.json` - Translation strings for all user-facing text

**frontend/src/assets/:**
- Purpose: Static assets (images, icons, fonts)

**frontend/src/data/:**
- Purpose: Static data including classification flowcharts
- Subdirectories:
  - `flowcharts/` - Mermaid diagram data for classification decision trees

**frontend/public/:**
- Purpose: Static files served directly (favicon, etc.)

**e2e/:**
- Purpose: End-to-end test suite using Playwright
- Contains: Test files for user workflows (classification, case management, admin operations)
- Key pattern: Page objects, fixture setup, login before tests

**docs/:**
- Purpose: API documentation (Swagger/OpenAPI spec)
- Generated from Go swagger comments in handler code

## Key File Locations

**Entry Points:**
- Backend: `cmd/anklyze-apiserver/main.go` - Bootstraps entire server
- Frontend: `frontend/src/main.tsx` - React root, `frontend/src/App.tsx` - Router and providers
- API routes: `internal/api/routes.go` - SetupRoutes() defines all endpoints

**Configuration:**
- Backend: `internal/config/config.go` - Environment variable loading
- Frontend: `frontend/vite.config.ts` - Build config, `frontend/src/i18n/config.ts` - i18n setup
- Build: `Makefile` - Tasks like `make run`, `make test`, `make build`

**Core Logic:**
- Classification rules: `internal/rules/engine.go` - Decision tree engine
- Chat processing: `internal/service/chat.go` - LLM extraction + classification
- Validation: `internal/api/input_validation.go` - Chat input validation

**Data Models:**
- Entities: `internal/domain/case.go`, `internal/domain/study.go`, `internal/domain/user.go`
- Classification: `internal/domain/fracture.go`, `internal/domain/classification.go`
- Request/Response: `internal/api/case_types.go` (Go request structs), `frontend/src/types/api/` (TS types)

**Testing:**
- Go tests: `internal/**/*_test.go` co-located with source files
- Frontend tests: `frontend/src/**/*.test.tsx` or `frontend/src/**/*.spec.ts`
- E2E tests: `e2e/tests/` with Playwright

## Naming Conventions

**Files:**
- Go handlers: `{domain}_{type}_handler.go` (e.g., `case_admin_handler.go`, `case_image_handler.go`)
- Go tests: `{module}_test.go` co-located with source in same package
- React pages: `{Feature}Page.tsx` (PascalCase with Page suffix)
- React components: `{ComponentName}.tsx` (PascalCase)
- Services: `{domain}Service.ts` (camelCase with Service suffix)
- Types: `{entity}.ts` or `{entity}Types.ts`

**Directories:**
- Go packages: lowercase, no underscores (e.g., `internal/repository`, `internal/llm`)
- React components: lowercase with dash for multi-word (e.g., `components/ui`, `features/fracture-classification`)
- Go types in domain: PascalCase (Case, Study, User, ClassificationResult)
- TypeScript types: PascalCase (FractureInput, ClassificationResult)

**Functions:**
- Go: PascalCase for exported, camelCase for private (e.g., Classify, classifyPosteriorOnly)
- React: PascalCase for components, camelCase for hooks and utilities (e.g., useFractureForm, classifyFracture)
- Service functions: camelCase, descriptive verb-noun (e.g., classifyFracture, validateCombination)

**Variables:**
- Go constants: UPPER_SNAKE_CASE (e.g., DanisWeberA, InvolvedPosteriorOnly)
- Go variables: camelCase (e.g., confidenceThreshold, fractureInput)
- TypeScript: camelCase for variables, UPPER_SNAKE_CASE for constants
- React component props: camelCase (e.g., isLoading, onClassify)

**Types:**
- Go structs: PascalCase (Handler, Engine, Validator)
- Go interfaces: PascalCase ending in "Repository" or "Service" (CaseRepository, ChatService)
- TypeScript interfaces: PascalCase with "Props" suffix for component props (ClassifyPageProps)
- TypeScript types: PascalCase (FractureInput, ClassificationResult, Case)

## Where to Add New Code

**New Feature:**
- Primary code: Create new handler in `internal/api/{feature}_handler.go`
- Business logic: Add service in `internal/service/{feature}.go`
- Domain models: Extend types in `internal/domain/{feature}.go`
- Data persistence: Add repository interface in `internal/repository/{feature}.go` and postgres implementation in `internal/repository/postgres/{feature}.go`
- Tests: Create `{filename}_test.go` in same package as source
- Frontend: Add page in `frontend/src/pages/{FeatureName}Page.tsx`, create feature service in `frontend/src/services/{feature}/{featureName}Service.ts`

**New Component/Module:**
- UI Component: `frontend/src/components/{Category}/{ComponentName}.tsx`
- Feature Component: `frontend/src/features/{feature}/components/{ComponentName}.tsx`
- Custom Hook: `frontend/src/hooks/use{HookName}.ts`
- Service: `frontend/src/services/{category}/{serviceName}.ts`
- Type: `frontend/src/types/{category}/{TypeName}.ts`

**Utilities:**
- Go helpers: `internal/{package}/` (e.g., `internal/timeutil/` for date functions)
- Frontend helpers: `frontend/src/lib/{category}/` (e.g., `frontend/src/lib/utils.ts`)
- Validation: Backend in `internal/api/input_validation.go`, frontend in component or custom hook

**Tests:**
- Unit tests: Same directory as source with `_test.go` suffix
- Frontend tests: Co-located with component (`Component.test.tsx`)
- E2E tests: `e2e/tests/{feature}.spec.ts`

## Special Directories

**docs/:**
- Purpose: API documentation generated from Swagger comments
- Generated: Yes (via swag CLI from go swagger comments)
- Committed: Yes (swagger.json checked in for CICD)

**fixtures/:**
- Purpose: Test fixtures and sample data for development/testing
- Generated: No
- Committed: Yes

**e2e/:**
- Purpose: Playwright end-to-end test suite
- Generated: No (test results generated, test files committed)
- Committed: Yes

**frontend/dist/, frontend/coverage/:**
- Purpose: Build outputs and test coverage reports
- Generated: Yes
- Committed: No (in .gitignore)

**frontend/node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (from package.json)
- Committed: No

**.planning/:**
- Purpose: GSD planning and codebase analysis documents
- Generated: Yes (by gsd commands)
- Committed: No (in .gitignore)
