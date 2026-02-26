# Testing Patterns

**Analysis Date:** 2026-02-26

## Test Framework

**Frontend - Unit & Component Tests:**
- Runner: Vitest 4.0.18
- Config: `frontend/vitest.config.ts`
- Environment: happy-dom (lightweight DOM implementation)
- Setup file: `frontend/src/test/setup.ts`

**Frontend - E2E Tests:**
- Runner: Playwright 1.49.0
- Config: `e2e/playwright.config.ts`
- Browser coverage: Chromium, Firefox, WebKit
- Basepoint: `http://localhost:5173`

**Backend - Unit & Integration Tests:**
- Framework: Go standard `testing` package
- Run with: `go test ./...`
- Race detection: `go test -v -race ./...`
- Single package: `go test ./internal/service/...`

**Assertion Libraries:**
- Frontend: Vitest expect + `@testing-library/jest-dom` matchers
- Backend: Errors package for wrapped error comparison (`errors.Is()`)

## Test Commands

**Frontend:**
```bash
npm run test              # Run tests in watch mode
npm run test:ui          # Open Vitest UI
npm run test:run         # Run tests once
npm run test:coverage    # Generate coverage report
npm run lint             # Check code style
npx tsc --noEmit        # TypeScript typecheck without emit
```

**Backend:**
```bash
go test ./...            # All tests
go test -v -race ./...   # With race detection
go test ./internal/service/...  # Single package
```

**E2E:**
```bash
npm run test             # Run Playwright tests
npm run test:ui          # UI mode
npm run test:headed      # Headed mode (see browser)
npm run test:debug       # Debug mode
npm run test:chromium    # Chromium only
```

## Test File Organization

**Frontend:**
- Location: Co-located with source files
- Pattern: `service.ts` → `service.test.ts` or `service.spec.ts`
- Examples:
  - `src/services/classification/classificationService.test.ts`
  - `src/hooks/useClassification.test.ts`
  - `src/components/ui/button.test.tsx`

**Backend (Go):**
- Location: Same package as source
- Pattern: `user.go` → `user_test.go` in same `internal/service/` directory
- Examples:
  - `internal/service/user.go` → `internal/service/user_test.go`
  - `internal/domain/case.go` → `internal/domain/case_test.go`

**E2E (Playwright):**
- Location: `e2e/tests/`
- Pattern: Feature-based directories
- Structure:
  ```
  e2e/
  ├── tests/
  │   ├── classification/
  │   │   ├── lateral-only.spec.ts
  │   │   ├── lateral-medial.spec.ts
  │   │   └── medial-posterior.spec.ts
  │   ├── landing.spec.ts
  │   ├── form-state.spec.ts
  │   ├── theme.spec.ts
  │   └── i18n.spec.ts
  └── pages/
      └── classify.page.ts (Page Object Model)
  ```

**Vitest Configuration:**
- Include pattern: `src/**/*.{test,spec}.{ts,tsx}`
- Exclude: node_modules, dist, .d.ts files
- Setup: `frontend/src/test/setup.ts` runs before tests
- Global test APIs: Enabled (no import needed for `describe`, `it`, `expect`)

## Test Structure

**Frontend - Service Test Pattern (Vitest):**
```typescript
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { classifyFracture } from './classificationService'
import { mockFractureInput } from '@/test/mocks/mockData'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock external dependencies
vi.mock('../../i18n/config', () => ({
  getCurrentLanguage: () => 'en',
  default: { t: vi.fn() },
}))

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}))

describe('classificationService', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('classifyFracture', () => {
    it('should classify a fracture successfully', async () => {
      const result = await classifyFracture(mockFractureInput)
      expect(result).toEqual(mockClassificationResult)
    })

    it('should handle API errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/classify`, () =>
          HttpResponse.json({ error: 'Server error' }, { status: 500 })
        )
      )
      await expect(classifyFracture(mockFractureInput)).rejects.toThrow()
    })
  })
})
```

**Frontend - Hook Test Pattern:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClassification } from './useClassification'
import { mockFractureInput } from '@/test/mocks/mockData'

vi.mock('@/services', () => ({ classifyFracture: vi.fn() }))
vi.mock('./useClassificationCache', () => ({
  useClassificationCache: () => ({
    getCache: vi.fn().mockResolvedValue(null),
    setCache: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { classifyFracture } from '@/services'
const mockedClassifyFracture = vi.mocked(classifyFracture)

describe('useClassification', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.resetAllMocks() })

  describe('initial state', () => {
    it('should have null result, no loading, and no error initially', () => {
      const { result } = renderHook(() => useClassification())
      expect(result.current.result).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('classify', () => {
    it('should classify a fracture successfully', async () => {
      mockedClassifyFracture.mockResolvedValueOnce(mockClassificationResult)
      const { result } = renderHook(() => useClassification())

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      expect(result.current.result).toEqual(mockClassificationResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })
})
```

**Backend - Table-Driven Test Pattern (Go):**
```go
package service

import (
  "context"
  "testing"
  "github.com/google/uuid"
)

func TestUserService_GetByID(t *testing.T) {
  t.Parallel()

  testUserID := uuid.New()
  testUser := &domain.User{
    ID:    testUserID,
    Email: "test@example.com",
    Role:  domain.UserRoleUser,
  }

  tests := []struct {
    name      string
    userID    uuid.UUID
    setupRepo func() *mockUserRepository
    wantUser  *domain.User
    wantErr   bool
  }{
    {
      name:   "success - user found",
      userID: testUserID,
      setupRepo: func() *mockUserRepository {
        return &mockUserRepository{
          getByIDFunc: func(_ context.Context, id uuid.UUID) (*domain.User, error) {
            if id == testUserID {
              return testUser, nil
            }
            return nil, errors.New("user not found")
          },
        }
      },
      wantUser: testUser,
      wantErr:  false,
    },
    {
      name:   "error - user not found",
      userID: uuid.New(),
      setupRepo: func() *mockUserRepository {
        return &mockUserRepository{
          getByIDFunc: func(_ context.Context, _ uuid.UUID) (*domain.User, error) {
            return nil, errors.New("user not found")
          },
        }
      },
      wantUser: nil,
      wantErr:  true,
    },
  }

  for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
      t.Parallel()
      repo := tt.setupRepo()
      svc := NewUserService(repo, nil)
      got, err := svc.GetByID(context.Background(), tt.userID)

      if (err != nil) != tt.wantErr {
        t.Errorf("GetByID() error = %v, wantErr %v", err, tt.wantErr)
        return
      }
      if tt.wantUser != nil && got.ID != tt.wantUser.ID {
        t.Errorf("GetByID() got ID = %v, want %v", got.ID, tt.wantUser.ID)
      }
    })
  }
}
```

**E2E - Playwright Test Pattern:**
```typescript
import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Lateral Only Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test('should classify as SA, Weber A when lateral-only infrasindesmal', async () => {
    await classifyPage.selectLateralOnly();
    await classifyPage.selectLateralLevelInfrasindesmal();
    await classifyPage.submitClassification();

    await classifyPage.expectResultsVisible();
    await classifyPage.expectLaugeHansenResult('SA');
    await classifyPage.expectDanisWeberResult('A');
    await classifyPage.expectAOOTAResult('A1');
  });
});
```

## Mocking

**Frontend - MSW (Mock Service Worker):**
- Location: `frontend/src/test/mocks/`
- Configuration file: `server.ts` with `setupServer`
- HTTP handler usage:
  ```typescript
  server.use(
    http.post(`${API_BASE_URL}/api/classify`, async ({ request }) => {
      const body = await request.json()
      return HttpResponse.json(mockClassificationResult)
    })
  )
  ```
- Reset after each test: `afterEach(() => server.resetHandlers())`

**Frontend - Function Mocking (Vitest):**
- Use `vi.mock()` for module mocking
- Use `vi.spyOn()` for spying on implementations
- Example:
  ```typescript
  vi.mock('@/services', () => ({
    classifyFracture: vi.fn(),
  }))
  const mockedClassifyFracture = vi.mocked(classifyFracture)
  mockedClassifyFracture.mockResolvedValueOnce(result)
  ```

**Backend - Manual Mocks:**
- Create mock implementations of interfaces
- Example in `service/user_test.go`:
  ```go
  type mockUserRepository struct {
    getByIDFunc func(ctx context.Context, id uuid.UUID) (*domain.User, error)
  }

  func (m *mockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    if m.getByIDFunc != nil {
      return m.getByIDFunc(ctx, id)
    }
    return nil, errors.New("not implemented")
  }
  ```

**What to Mock:**
- External APIs (HTTP calls)
- Authentication/auth providers
- Database calls (in service layer tests)
- Time-dependent operations (use fixtures or test helpers)

**What NOT to Mock:**
- Core business logic
- Validation functions
- Error handling paths (test real behavior)
- Internal function calls within the same module

## Fixtures and Test Data

**Frontend Test Data:**
- Location: `src/test/mocks/mockData.ts`
- Structure: Export named mock objects
  ```typescript
  export const mockFractureInput: FractureInput = { /* data */ }
  export const mockClassificationResult: ClassificationResult = { /* data */ }
  ```
- Used in both unit and hook tests

**Backend Test Helpers:**
- Defined within test files using package scope
- Helper functions in `domain/case_test.go`:
  ```go
  func newDraftCase() Case { /* ... */ }
  func newPublishedCase() Case { /* ... */ }
  func withDeadline(c Case, d time.Time) Case { /* ... */ }
  func ptr[T any](v T) *T { return &v }
  func mustMarshalClassification(r *ClassificationResult) datatypes.JSON { /* ... */ }
  ```

**E2E Page Objects:**
- Location: `e2e/pages/classify.page.ts`
- Pattern: Encapsulate selectors and interactions
- Methods use semantic names: `selectLateralOnly()`, `expectResultsVisible()`

## Coverage

**Frontend Coverage:**
- Requirements: 50% minimum threshold (statements, branches, functions, lines)
- Config: `frontend/vitest.config.ts`
- Providers: v8
- Reporters: text, json, html
- View coverage:
  ```bash
  npm run test:coverage    # Generate coverage report
  # View in: frontend/coverage/index.html
  ```
- Excluded from coverage: test files, node_modules, dist, index.ts files

**Backend Coverage:**
- Use: `go test -cover ./...`
- View detailed coverage: `go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out`
- No enforced minimum in codebase

## Test Types

**Unit Tests (Frontend - Vitest):**
- Scope: Individual functions and services
- Approach: Mock external dependencies, test logic in isolation
- Examples: `classificationService.test.ts` tests API client calls
- Async testing with `await act(async () => { ... })`

**Unit Tests (Backend - Go):**
- Scope: Individual functions and service methods
- Approach: Table-driven tests with mocked repositories
- Example: `user_test.go` tests UserService with mockUserRepository
- Use `t.Parallel()` for parallel test execution

**Component Tests (Frontend):**
- Scope: React component behavior
- Approach: `renderHook()` for hooks, shallow render for components
- Libraries: `@testing-library/react`
- Example: `useClassification.test.ts` tests hook state and side effects

**Integration Tests (Backend - Go):**
- Scope: Multiple components working together (service + repository)
- Approach: Real database or mocked at repository level
- Located in same test files as unit tests

**E2E Tests (Playwright):**
- Scope: Full application workflows
- Approach: Automated browser navigation and assertion
- Framework: Page Object Model for maintainability
- Basepoint: `http://localhost:5173` (frontend dev server)
- Backend: Started via `webServer` in playwright.config.ts
- Retries: 0 local, 2 in CI
- Parallel: Enabled (fullyParallel: true)
- Timeout: 30s local, 60s CI

## Common Patterns

**Async Testing (Frontend):**
```typescript
// Using act() for state updates
await act(async () => {
  await result.current.classify(mockFractureInput)
})

// Resolving controlled promises
let resolvePromise: (value: ClassificationResult) => void
const classifyPromise = new Promise<ClassificationResult>((resolve) => {
  resolvePromise = resolve
})
mockedClassifyFracture.mockReturnValueOnce(classifyPromise)

act(() => {
  result.current.classify(mockFractureInput)  // Start without await
})
expect(result.current.loading).toBe(true)

await act(async () => {
  resolvePromise!(mockClassificationResult)
  await classifyPromise
})
```

**Error Testing:**
```typescript
// Frontend
it('should handle errors gracefully', async () => {
  mockedClassifyFracture.mockRejectedValueOnce(new Error('Network error'))
  const { result } = renderHook(() => useClassification())

  await act(async () => {
    await result.current.classify(mockFractureInput)
  })

  expect(result.current.error).toBe('Network error')
})

// Backend
it('error - repository error', func(t *testing.T) {
  tests := []struct {
    name      string
    setupRepo func() *mockUserRepository
    wantErr   bool
  }{
    {
      name: "error - repository error",
      setupRepo: func() *mockUserRepository {
        return &mockUserRepository{
          getByIDFunc: func(_ context.Context, _ uuid.UUID) (*domain.User, error) {
            return nil, errors.New("database connection failed")
          },
        }
      },
      wantErr: true,
    },
  }
})
```

**State Verification Patterns:**
```typescript
// Before/after pattern
expect(result.current.result).not.toBeNull()
act(() => {
  result.current.reset()
})
expect(result.current.result).toBeNull()

// Spy and verify calls
const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
// ... trigger operation ...
expect(consoleSpy).toHaveBeenCalledWith('expected message')
consoleSpy.mockRestore()
```

---

*Testing analysis: 2026-02-26*
