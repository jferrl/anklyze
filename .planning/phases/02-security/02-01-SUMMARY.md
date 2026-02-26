---
phase: 02-security
plan: 01
subsystem: auth-config
tags: [security, config, auth, jwt, production]
dependency_graph:
  requires: []
  provides:
    - "Config.IsProduction() bool"
    - "Config.ValidateProduction() error"
    - "domain.ErrCodeTokenExpired constant"
    - "structured TOKEN_EXPIRED JWT error response"
    - "production startup validation gate"
  affects:
    - "internal/auth/middleware.go"
    - "cmd/anklyze-apiserver/main.go"
tech_stack:
  added: []
  patterns:
    - "Production-gate: cfg.IsProduction() guards cfg.ValidateProduction() in main.go"
    - "errors.Is(err, ErrTokenExpired) for sentinel error matching (replaces == switch)"
    - "Structured error codes in JWT responses: {code, message} shape"
key_files:
  created: []
  modified:
    - internal/config/config.go
    - internal/config/config_test.go
    - internal/domain/errors.go
    - internal/auth/middleware.go
    - internal/auth/middleware_test.go
    - cmd/anklyze-apiserver/main.go
decisions:
  - "Use errors.Is instead of == for ErrTokenExpired — safe against wrapping, idiomatic Go"
  - "Expired token returns {code:TOKEN_EXPIRED} with own early return, not a switch fallthrough — clearer control flow"
  - "ValidateProduction() returns all violations simultaneously (same []string pattern as Validate()) — operator sees full picture on startup failure"
  - "IsProduction() gates ValidateProduction() in main.go — dev startup unaffected, no ENV required in non-production"
metrics:
  duration: "3 minutes"
  completed_date: "2026-02-26"
  tasks_completed: 2
  files_modified: 6
requirements:
  - SEC-01
  - SEC-02
---

# Phase 2 Plan 1: Production Auth Config Enforcement and TOKEN_EXPIRED Error Code Summary

JWT token expiry returns structured `{"code":"TOKEN_EXPIRED"}` response; server refuses to start in production without all three Supabase secrets configured.

## Objective

Enforce production auth configuration at startup and return structured TOKEN_EXPIRED error codes on expired JWT tokens. Prevents the server from starting in production when critical auth secrets are absent or too short, and allows the frontend to distinguish expired tokens from other auth failures.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add IsProduction()/ValidateProduction() to Config, ErrCodeTokenExpired to domain | dee33a7 | internal/config/config.go, internal/config/config_test.go, internal/domain/errors.go |
| 2 | Wire production startup validation in main.go and structured TOKEN_EXPIRED in auth middleware | ce161fd | cmd/anklyze-apiserver/main.go, internal/auth/middleware.go, internal/auth/middleware_test.go |

## What Was Built

### Config: Production Startup Gate

`internal/config/config.go` gained:
- `AppEnv string` field populated from `APP_ENV` environment variable
- `IsProduction() bool` — returns true when `strings.ToLower(c.AppEnv) == "production"`
- `ValidateProduction() error` — checks all three required production secrets simultaneously:
  - `SUPABASE_URL` must be non-empty (SEC-01)
  - `SUPABASE_JWT_SECRET` must be non-empty AND >= 32 characters (SEC-02)
  - `SUPABASE_SERVICE_ROLE_KEY` must be non-empty (SEC-04)

Follows the same `[]string errs` accumulation pattern as the existing `Validate()` method. Returns all failures in one error message so operators get a complete picture on startup failure.

### Domain: ErrCodeTokenExpired Constant

`internal/domain/errors.go` gained:
- `ErrCodeTokenExpired = "TOKEN_EXPIRED"` in the existing error code `const` block

### Main: Production Validation Gate

`cmd/anklyze-apiserver/main.go` gained a block immediately after `config.Load()`:

```go
if cfg.IsProduction() {
    if err := cfg.ValidateProduction(); err != nil {
        slog.Error("production security requirements not met — refusing to start", "error", err)
        os.Exit(1)
    }
    slog.Info("production security validation passed")
}
```

Development mode (no `APP_ENV` set) is entirely unaffected.

### Auth Middleware: Structured Error Responses

`internal/auth/middleware.go` replaced the `switch err` block with:

```go
if errors.Is(err, ErrTokenExpired) {
    c.JSON(http.StatusUnauthorized, gin.H{
        "code":    domain.ErrCodeTokenExpired,  // "TOKEN_EXPIRED"
        "message": "token expired",
    })
    c.Abort()
    return
}
c.JSON(http.StatusUnauthorized, gin.H{
    "code":    "UNAUTHORIZED",
    "message": "invalid token",
})
c.Abort()
return
```

The debug log line (token prefix truncation to 20 chars) is preserved. All other middleware functions (RequireRole, OptionalAuth, UserSyncMiddleware) are unchanged.

## Tests Added

### internal/config/config_test.go
- `TestValidateProduction` (5 cases): valid config, missing URL, short JWT secret, missing service key, all three missing
- `TestIsProduction` (6 cases): lowercase "production", uppercase, mixed case, development, empty, staging

### internal/auth/middleware_test.go
- `TestAuthMiddlewareStructuredErrors` (2 cases): expired token returns `code="TOKEN_EXPIRED"`, invalid token returns `code="UNAUTHORIZED"`

## Verification Results

```
ok  github.com/jferrl/anklyze/internal/config  0.249s
ok  github.com/jferrl/anklyze/internal/domain  0.446s
ok  github.com/jferrl/anklyze/internal/auth    0.576s
go vet ./...  — no issues
go build ./. — success
```

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **Use errors.Is instead of ==**: The previous code used `== ErrTokenExpired` comparison which would break if the error were ever wrapped. `errors.Is()` is idiomatic Go and safe against wrapping.

2. **Expired token gets its own early return**: The plan specified an early-return path for TOKEN_EXPIRED rather than a switch fallthrough. This is cleaner control flow and makes the special-casing explicit.

3. **ValidateProduction() accumulates all errors**: Follows the same `[]string errs` pattern as `Validate()` so the operator sees all missing secrets at once rather than fixing them one by one.

4. **IsProduction() gates ValidateProduction() in main.go**: Development startup (empty APP_ENV) is completely unaffected, allowing local dev without Supabase credentials.

## Self-Check: PASSED

Files created/modified:
- FOUND: internal/config/config.go (IsProduction, ValidateProduction, AppEnv)
- FOUND: internal/config/config_test.go (TestValidateProduction, TestIsProduction)
- FOUND: internal/domain/errors.go (ErrCodeTokenExpired)
- FOUND: internal/auth/middleware.go (errors.Is, TOKEN_EXPIRED structured response)
- FOUND: internal/auth/middleware_test.go (TestAuthMiddlewareStructuredErrors)
- FOUND: cmd/anklyze-apiserver/main.go (cfg.IsProduction() + cfg.ValidateProduction())

Commits:
- dee33a7 — present in git log
- ce161fd — present in git log
