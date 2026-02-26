# Coding Conventions

**Analysis Date:** 2026-02-26

## Naming Patterns

**Files:**
- Go: Snake case for file names (`user_test.go`, `input_validation_test.go`, `case_admin_handler.go`)
- TypeScript/React: Camel case for files (`classificationService.ts`, `useClassification.ts`, `classifyPage.ts`)
- Component files: PascalCase for React components (`Button.tsx`, `CreateCaseDialog.tsx`)
- Test files: Append `_test.go` for Go, `.test.ts` or `.spec.ts` for TypeScript

**Functions:**
- Go: PascalCase for exported functions, camelCase for private (`NewUserService`, `GetByID`, `syncRoleToSupabase`)
- TypeScript: camelCase for all functions, exported or not (`classifyFracture`, `validateCombination`, `renderHook`)
- React components: PascalCase for component functions (`Button`, `ClassifyPage`)

**Variables:**
- Go: camelCase for local variables and parameters (`testUser`, `userID`, `tt` for table-driven test cases)
- TypeScript: camelCase for all variables (`mockFractureInput`, `classificationResult`, `capturedHeaders`)
- Constants: UPPER_SNAKE_CASE in both languages (`API_BASE_URL`, `RoleAdmin`)

**Types:**
- Go: PascalCase for exported types, used as suffix for interfaces (`UserRepository`, `AuthAdmin`)
- TypeScript: PascalCase for all types and interfaces (`FractureInput`, `ClassificationResult`)
- Go domain types: Located in `internal/domain/` with GORM tags for PostgreSQL (`type User struct`)

**Directories:**
- Go packages: lowercase, single word (`service`, `domain`, `repository`, `auth`, `api`)
- TypeScript modules: lowercase with hyphens for clarity (`classification/classificationService.ts`, `study/caseService.ts`)
- UI components: Lowercase directory `components/ui/`
- Pages: `pages/` for main routes, `pages/admin/` for admin-only pages
- Hooks: `hooks/` directory with `useHookName.ts` pattern

## Code Style

**Formatting:**
- TypeScript: Managed via ESLint configuration (`frontend/eslint.config.js`)
  - Indentation: 2 spaces
  - Semicolons: Enforced
  - Single quotes for strings
  - Trailing commas in objects/arrays
- Go: Standard Go formatting via `go fmt`
  - Tab indentation (Go standard)
  - Semicolons implicit

**Linting:**
- TypeScript/React:
  - ESLint with `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
  - Config: `frontend/eslint.config.js`
  - Special rule: `react-refresh/only-export-components: off` for `src/components/ui/**/*`
  - Run with: `npm run lint`
- Go: Use `go vet` for static analysis
  - Follow standard Go conventions

**TypeScript Strict Mode:**
- Enabled in `frontend/tsconfig.json`
- All code must pass strict type checking
- Type imports: Use `import type` for types only

## Import Organization

**TypeScript Order:**
1. React and framework imports (`import React from 'react'`)
2. Third-party library imports (`import { Button } from '@radix-ui/react-button'`, `import { vi } from 'vitest'`)
3. Absolute path imports with aliases (`import { classifyFracture } from '@/services'`, `import type { FractureInput } from '@/types'`)
4. Relative imports (`import { setup } from '../setup'`)
5. Side-effect imports last if needed

**Go Import Organization:**
1. Standard library imports (`"context"`, `"testing"`)
2. Third-party imports (`"github.com/gin-gonic/gin"`, `"gorm.io/gorm"`)
3. Internal package imports (`"github.com/jferrl/anklyze/internal/domain"`)

**Path Aliases (TypeScript):**
- `@` → `src/`
- `@components` → `src/components/`
- `@pages` → `src/pages/`
- `@hooks` → `src/hooks/`
- `@services` → `src/services/`
- `@types` → `src/types/`
- `@utils` → `src/utils/`
- `@lib` → `src/lib/`
- `@/components/ui` → `src/components/ui/index.ts`

**Barrel Files:**
- Use index.ts/index.tsx as barrel files to export grouped modules
- Example: `src/services/study/index.ts` exports from `studyService.ts`, `caseService.ts`

## Error Handling

**TypeScript Patterns:**
- Async functions use try-catch blocks
- Errors are caught and either translated (via i18n), wrapped, or rethrown
- Example from `classificationService.ts`:
  ```typescript
  try {
    return await apiRequest<ClassificationResult>('/api/classify', { ... });
  } catch (error) {
    if (error instanceof Error) {
      const apiError = error as Error & { code?: string; error_code?: string };
      const errorCode = apiError.code || apiError.error_code;
      if (errorCode) {
        const t = i18n.t.bind(i18n);
        throw new Error(t(`errors.${errorCode.toLowerCase()}`, apiError.message));
      }
    }
    throw error;
  }
  ```
- Handling 404 endpoints with fallback: return `true` rather than throwing

**Go Patterns:**
- Return errors as final return value
- Use error wrapping with context: `fmt.Errorf("operation failed: %w", err)`
- Domain-specific errors defined in `internal/domain/errors.go`
- Services return domain errors, not implementation details
- Log warnings for non-critical failures:
  ```go
  slog.Warn("failed to sync role to Supabase", "user_id", userID, "role", role, "error", err)
  ```

## Logging

**Framework:** Go uses `log/slog` (structured logging), TypeScript uses `console` methods

**Patterns:**
- Go:
  - Use `slog.Warn` for recoverable failures
  - Use `slog.Error` for critical failures
  - Include context keys: `"user_id"`, `"error"`, etc.
  - Example: `slog.Warn("failed to sync role to Supabase", "user_id", userID, "role", role, "error", err)`
- TypeScript:
  - Use `console.warn()` for warnings
  - Use `console.error()` for errors
  - Example: `console.warn('Validate endpoint not implemented, assuming valid combination')`

## Comments

**When to Comment:**
- Complex business logic or algorithms
- Workarounds and temporary solutions (use TODO/FIXME)
- Non-obvious type casts or type assertions
- Public API functions and exports

**JSDoc/TSDoc:**
- Document all exported functions in TypeScript services
- Include `@param` and `@returns` tags
- Example from `classificationService.ts`:
  ```typescript
  /**
   * Classify an ankle fracture based on input parameters
   * @param input - Fracture input parameters
   * @returns Promise resolving to classification result
   * @throws {AuthRequiredError} - When authentication is required
   */
  export async function classifyFracture(input: FractureInput): Promise<ClassificationResult>
  ```

**Go Comments:**
- Use line comments (`//`) for explanations
- Use block comments (`/* */`) for package-level documentation
- Comment exported functions/types: "FunctionName does X" format

## Function Design

**Size:**
- Go: Prefer functions under 50 lines of implementation code
- TypeScript: Prefer functions under 40 lines, especially for service functions and hooks
- Table-driven tests can exceed this (they're data-heavy, not logic-heavy)

**Parameters:**
- Go: Use struct types for multiple related parameters
- TypeScript: Destructuring for optional parameters, spread for component props
- Limit to 4-5 parameters; use objects for more

**Return Values:**
- Go: Error handling via multiple returns (`value, error`)
- TypeScript: Promises with async/await for async operations
- Use typed returns, avoid `any` type

## Module Design

**Exports:**
- Go: PascalCase for exported identifiers only; unexported (lowercase) for internal
- TypeScript: Use named exports for services and utilities; default exports for React components
- Services export async functions directly, not classes in new patterns

**Repository Pattern (Go):**
- Interfaces in `internal/repository/`
- Implementations in `internal/repository/postgres/`
- Example: `UserRepository` interface with `GetByID`, `SyncOnLogin`, `UpdateRole`, `GetByEmail` methods
- Services depend on repository interfaces, not implementations

**Service Layer (Go):**
- Located in `internal/service/`
- Orchestrates business logic between handlers and repositories
- Example: `UserService` wraps `UserRepository` and handles Supabase sync

**Domain Models (Go):**
- Located in `internal/domain/`
- Contains only data structures and validation methods
- GORM tags for PostgreSQL mapping
- Error definitions in `internal/domain/errors.go`

## API & Handlers (Go)

**Handler Organization:**
- Split by concern: `case_admin_handler.go`, `case_image_handler.go`, etc.
- Located in `internal/api/`
- Accept context and use dependency injection for services

## i18n/Internationalization

**Frontend:**
- All user-facing strings in JSON files: `src/i18n/en.json`, `src/i18n/es.json`
- Use namespace structure: `errors.INVALID_INPUT`, `messages.CLASSIFICATION_COMPLETE`
- Access via `i18n.t('key')` or `t('key')` with react-i18next
- Language stored in config: `getCurrentLanguage()` returns 'en' or 'es'

---

*Convention analysis: 2026-02-26*
