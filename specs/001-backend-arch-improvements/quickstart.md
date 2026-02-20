# Quickstart: Verifying Backend Architecture Improvements

**Branch**: `001-backend-arch-improvements`

## Prerequisites

- Go 1.21+
- Node.js 20+ (for frontend updates)

## Step 1: Run Classification Regression Tests

```bash
go test -v -run TestClassify ./internal/rules/...
```

**Expected**: All golden snapshot test cases pass. Every `FractureInput`
combination produces the exact same `ClassificationResult` as the baseline.

## Step 2: Run Domain Model Tests

```bash
go test -v ./internal/domain/...
```

**Expected**: All behavioral method tests pass:
- `CanPublish` rejects non-draft cases and cases without images
- `CanClose` rejects non-published cases
- `ValidateResponseSubmission` correctly handles admin bypass, deadline,
  duplicate response, and case state
- `CompareWithReference` returns accurate per-system match results

## Step 3: Run Chat Input Validation Tests

```bash
go test -v ./internal/api/... -run TestInputValidation
```

**Expected**: All validation rules tested: minimum length, repeated chars,
alpha ratio, word count, keyboard smash detection, medical context,
language support.

## Step 4: Verify Classifier Service Removed

```bash
# Should return no results
grep -r "ClassifierService" internal/
```

**Expected**: No references to `ClassifierService` interface or
`classifierService` struct anywhere in the codebase.

## Step 5: Run Full Test Suite

```bash
go test -v -race ./...
```

**Expected**: All tests pass with race detector enabled. No regressions in
existing repository or service tests.

## Step 6: Verify Error Wrapping

```bash
go test -v -run TestError ./internal/...
```

**Expected**: Error chain tests verify that errors from repository layer
carry context through service and can be unwrapped to the original
sentinel error.

## Step 7: Verify No Business Logic in Handlers

Manual review checklist:
- [ ] `case_response_handler.go`: No `if cs.Status ==` or
      `if cs.AllowMultipleResponses` conditionals
- [ ] `case_admin_handler.go`: No inline state transition checks — uses
      `cs.CanPublish()` and `cs.CanClose()`
- [ ] All handler functions: Business decisions delegated to domain
      methods; handlers only parse input + translate domain responses to HTTP

## Step 8: Frontend Smoke Test

```bash
cd frontend && npm run dev
```

Navigate to:
1. Classification flow — verify end-to-end classification works
2. Admin: create → publish → close a case
3. Submit a response to a published case
4. Verify error messages display correctly

## Step 9: Linting

```bash
go vet ./...
cd frontend && npx tsc --noEmit && npm run lint
```

**Expected**: Zero warnings from `go vet`, TypeScript, and ESLint.
