# Phase 02: Security - Research

**Researched:** 2026-02-26
**Domain:** Go security hardening — startup validation, JWT enforcement, log sanitization, service key governance
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Auth enforcement (SEC-01)
- Server MUST refuse to start in production if auth configuration is missing or incomplete
- Only `/health` endpoint remains public — all other endpoints (including `/classify`) require authentication in production
- Production detection via explicit environment variable (e.g. `APP_ENV=production` or similar)
- Development mode behavior stays as-is — no changes to current dev workflow

#### Audit data protection (SEC-03)
- No confidential patient data exists in the system — SEC-03 scope narrowed to general log hygiene
- Sanitize tokens and API keys if they appear in audit log payloads (JWT tokens, Supabase service keys)
- Do NOT sanitize or truncate request/response bodies — only redact credential-like values
- Leave case IDs, study IDs, classification data, and all non-credential fields readable

#### JWT & secret handling (SEC-02)
- Server MUST refuse to start in production if JWT_SECRET is missing
- Enforce minimum 32-character length for JWT_SECRET at startup (reject shorter secrets)
- Use local JWT signature verification — no Supabase API calls for token validation
- Return specific `TOKEN_EXPIRED` error code (HTTP 401) on expired tokens so frontend can prompt re-login
- Other auth failures return generic 401

#### Service role key governance (SEC-04)
- Runtime structured logging for every operation that uses the Supabase service role key (action + timestamp)
- Restrict service key usage to known operations only — wrap in a helper that rejects unknown uses
- Document required permissions as code comments/constants next to each service key usage point
- Server MUST refuse to start in production if service role key is missing (consistent with JWT secret policy)

### Claude's Discretion
- Exact middleware implementation pattern (Gin middleware chain ordering)
- Startup validation function structure
- Log format and structured logging field names
- How to detect and redact tokens in log payloads (regex vs field allowlist)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | Authentication is enforced in production environments (REQUIRE_AUTH or equivalent mechanism) | Config.IsProduction() + startup guard in main.go; auth middleware pattern already exists in routes.go |
| SEC-02 | JWT secret absence triggers a warning log and prevents silent fallback in production | Config.ValidateProduction() with 32-char minimum check; TOKEN_EXPIRED error code added to domain/errors.go and middleware.go |
| SEC-03 | Sensitive medical data in audit trail logs is protected with field-level encryption or sanitization | Regex-based redaction helper in internal/logger; used at slog call sites or via custom handler |
| SEC-04 | Service role key usage is audited and restricted with clear documentation of required permissions | ServiceKeyOperation enum + wrapper type in internal/supabase; startup guard mirrors JWT secret pattern |
</phase_requirements>

---

## Summary

This phase adds no new features — it hardens existing functionality for production deployment. The codebase already has all the machinery: auth middleware, JWT validation, structured logging via `log/slog`, and service key usage in two packages (`internal/supabase`, `internal/storage`). The work is entirely about enforcing mandatory presence and logging coverage of existing secrets, plus adding a production-mode gate to startup.

The four requirements map cleanly to four change areas: (1) `internal/config` gains production-mode detection and a `ValidateProduction()` method that the startup routine calls; (2) `internal/auth/middleware.go` adds a `TOKEN_EXPIRED` error code response; (3) `internal/logger` gains a sanitization helper for credential-like values in slog fields; (4) `internal/supabase` gains a typed operation wrapper that logs every service key call.

No new external dependencies are required. All patterns follow the existing codebase conventions: table-driven Go tests in `_test.go` files, sentinel errors in `internal/domain/errors.go`, structured error codes as constants, and `log/slog` for all logging.

**Primary recommendation:** Extend `Config.Validate()` with a `ValidateProduction()` method called from `main.go` when `APP_ENV=production`, add `TOKEN_EXPIRED` to the existing error code registry, create a credential redaction helper in `internal/logger`, and wrap service key usage in `internal/supabase` with a typed operation type.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `log/slog` | Go stdlib (1.21+) | Structured logging | Already used throughout; go.mod declares `go 1.25.0` |
| `github.com/golang-jwt/jwt/v5` | v5.3.1 | JWT parsing and claim extraction | Already in go.mod; `ErrTokenExpired` sentinel already checked |
| `regexp` | Go stdlib | Regex-based credential redaction | No extra dep; sufficient for bearer token / service key patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `os` | Go stdlib | Read `APP_ENV` environment variable | Production detection in config |
| `errors` | Go stdlib | Sentinel error definitions | Consistent with domain/errors.go pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex redaction | Field allowlist pattern (only log known-safe fields) | Allowlist is safer but requires touching every log call site; regex applied at a single helper avoids call-site changes |
| Custom `slog.Handler` wrapper | Per-call redaction helper | Handler wrapper intercepts all logs transparently but adds complexity and may silently swallow errors; per-call helper is explicit and testable |
| `APP_ENV=production` variable | `REQUIRE_AUTH=true` boolean variable | CONTEXT.md selected environment-variable approach; `APP_ENV` is the conventional pattern in Go servers |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure (changes only)

```
internal/
├── config/
│   ├── config.go           # Add IsProduction(), ValidateProduction()
│   └── config_test.go      # Add production validation tests
├── auth/
│   ├── middleware.go        # Add TOKEN_EXPIRED error code response branch
│   └── middleware_test.go   # Add expired token → TOKEN_EXPIRED test
├── logger/
│   ├── logger.go            # Existing; no changes needed
│   └── sanitize.go          # NEW: RedactCredentials(s string) string helper
│   └── sanitize_test.go     # NEW: table-driven tests for redaction
├── domain/
│   └── errors.go            # Add ErrCodeTokenExpired constant
├── supabase/
│   ├── auth.go              # Add ServiceKeyOperation type + logging wrapper
│   └── operation.go         # NEW: typed operation enum + ServiceKeyClient wrapper
└── storage/
    └── supabase.go          # Add per-operation audit log calls
```

### Pattern 1: Production-Mode Startup Validation

**What:** `Config` exposes `IsProduction() bool` based on `APP_ENV` env var. `main.go` calls `cfg.ValidateProduction()` after `config.Load()` succeeds. `ValidateProduction()` returns a multi-error if any production security requirement is unmet.

**When to use:** Called once at startup, before any routes are registered. Only executed when `APP_ENV=production`.

**Example:**
```go
// internal/config/config.go

// IsProduction returns true when APP_ENV=production.
func (c *Config) IsProduction() bool {
    return strings.ToLower(os.Getenv("APP_ENV")) == "production"
}

// ValidateProduction checks that all production-required secrets are present and valid.
// Returns a combined error listing every failure so the operator sees all problems at once.
func (c *Config) ValidateProduction() error {
    var errs []string

    // SEC-01: auth configuration required
    if c.SupabaseURL == "" {
        errs = append(errs, "SUPABASE_URL is required in production (SEC-01)")
    }

    // SEC-02: JWT secret required with minimum length
    if c.SupabaseJWTSecret == "" {
        errs = append(errs, "SUPABASE_JWT_SECRET is required in production (SEC-02)")
    } else if len(c.SupabaseJWTSecret) < 32 {
        errs = append(errs, fmt.Sprintf(
            "SUPABASE_JWT_SECRET must be at least 32 characters in production, got %d (SEC-02)",
            len(c.SupabaseJWTSecret),
        ))
    }

    // SEC-04: service role key required
    if c.SupabaseServiceRoleKey == "" {
        errs = append(errs, "SUPABASE_SERVICE_ROLE_KEY is required in production (SEC-04)")
    }

    if len(errs) > 0 {
        return fmt.Errorf("production security validation failed:\n  - %s", strings.Join(errs, "\n  - "))
    }
    return nil
}
```

```go
// cmd/anklyze-apiserver/main.go — after config.Load()
if cfg.IsProduction() {
    if err := cfg.ValidateProduction(); err != nil {
        slog.Error("production security requirements not met — refusing to start", "error", err)
        os.Exit(1)
    }
    slog.Info("production security validation passed")
}
```

### Pattern 2: TOKEN_EXPIRED Error Code in Middleware

**What:** The middleware already switches on `ErrTokenExpired` to set the message. Add a `CODE` field to the response so the frontend can programmatically detect expiry and prompt re-login — consistent with `INVALID_STATE_TRANSITION` pattern in `internal/api/errors.go`.

**When to use:** In `auth.AuthMiddleware`, replace the existing `gin.H{"error": "unauthorized", "message": "token expired"}` response with a structured `ErrorResponse` that carries `"code": "TOKEN_EXPIRED"`.

**Example:**
```go
// internal/domain/errors.go — add constant
const (
    // existing constants ...
    ErrCodeTokenExpired = "TOKEN_EXPIRED"
)

// internal/auth/middleware.go — modify the switch in AuthMiddleware
switch {
case errors.Is(err, ErrTokenExpired):
    c.JSON(http.StatusUnauthorized, gin.H{
        "code":    domain.ErrCodeTokenExpired,
        "message": "token expired",
    })
    c.Abort()
    return
default:
    c.JSON(http.StatusUnauthorized, gin.H{
        "code":    "UNAUTHORIZED",
        "message": "invalid token",
    })
    c.Abort()
    return
}
```

### Pattern 3: Credential Redaction Helper

**What:** A single `RedactCredentials(s string) string` function in `internal/logger` that replaces JWT bearer token patterns and long base64-like strings (typical of Supabase service role keys) with `[REDACTED]`. Applied at slog call sites where token or key values might appear in field values.

**When to use:** Wrap any string value being logged that came from an HTTP header, environment variable with "key"/"secret"/"token" in its name, or request body field named similarly.

**Example:**
```go
// internal/logger/sanitize.go
package logger

import "regexp"

var (
    // Matches JWT bearer tokens (three base64url segments separated by dots)
    jwtPattern = regexp.MustCompile(`eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`)

    // Matches long (>=40 char) base64 or base64url strings (service role keys, API keys)
    longBase64Pattern = regexp.MustCompile(`[A-Za-z0-9+/=_-]{40,}`)
)

// RedactCredentials replaces credential-like values in s with [REDACTED].
// Only applies to the string value itself — does not inspect structured fields.
// Use this when logging values that may contain JWT tokens or service keys.
func RedactCredentials(s string) string {
    s = jwtPattern.ReplaceAllString(s, "[REDACTED]")
    s = longBase64Pattern.ReplaceAllString(s, "[REDACTED]")
    return s
}
```

**Usage at call sites:**
```go
// Only needed where token/key values flow into log fields
// Existing middleware already truncates to 20 chars — this is for other locations
slog.Debug("request header value", "value", logger.RedactCredentials(headerVal))
```

**Important:** The existing middleware in `internal/auth/middleware.go` already truncates the token to 20 chars for the debug log — that approach is fine and does not need to change. The redaction helper is for any new log calls added in SEC-04 or other locations where full credential strings could appear.

### Pattern 4: Service Key Operation Logging Wrapper

**What:** A typed `ServiceKeyOperation` string type enumerating all known operations that use the Supabase service role key. A wrapper method on `AuthAdmin` and `SupabaseStorage` logs each call with `slog.Info` before executing.

**When to use:** Applied in `internal/supabase/auth.go` and `internal/storage/supabase.go` at each method that calls the Supabase API with the service role key.

**Example:**
```go
// internal/supabase/operation.go
package supabase

import (
    "log/slog"
    "time"
)

// ServiceKeyOperation enumerates all permitted uses of the Supabase service role key.
// Any use outside this list indicates a scope violation.
type ServiceKeyOperation string

const (
    // OpUpdateUserRole syncs a user's role to Supabase app_metadata.
    // Required permission: auth.admin (update user)
    OpUpdateUserRole ServiceKeyOperation = "update_user_role"

    // OpUploadImage uploads a case image to Supabase Storage.
    // Required permission: storage.objects.create
    OpUploadImage ServiceKeyOperation = "upload_image"

    // OpDeleteImage removes a case image from Supabase Storage.
    // Required permission: storage.objects.delete
    OpDeleteImage ServiceKeyOperation = "delete_image"

    // OpGetSignedURL creates a time-limited signed URL for image access.
    // Required permission: storage.objects.select
    OpGetSignedURL ServiceKeyOperation = "get_signed_url"
)

// LogServiceKeyUsage logs a structured audit entry for a service role key operation.
// Call this at the start of every method that uses the service role key.
func LogServiceKeyUsage(op ServiceKeyOperation, attrs ...any) {
    args := append([]any{
        "service_key_op", string(op),
        "timestamp", time.Now().UTC().Format(time.RFC3339),
    }, attrs...)
    slog.Info("service key operation", args...)
}
```

```go
// internal/supabase/auth.go — at start of UpdateUserRole
func (a *AuthAdmin) UpdateUserRole(ctx context.Context, userID string, role string) error {
    LogServiceKeyUsage(OpUpdateUserRole, "user_id", userID, "role", role)
    // ... existing implementation
}
```

```go
// internal/storage/supabase.go — at start of Upload
func (s *SupabaseStorage) Upload(ctx context.Context, path string, ...) error {
    supabase.LogServiceKeyUsage(supabase.OpUploadImage, "path", path)
    // ... existing implementation
}
```

### Anti-Patterns to Avoid

- **Calling `os.Exit(1)` deep in library code:** Production validation must happen in `main.go`, not in config or auth packages. Library code returns errors; `main.go` decides to exit.
- **Logging full JWT strings in new code:** Even for debugging. Use the 20-char truncation pattern already in middleware or `RedactCredentials()`.
- **Rewriting the route setup pattern:** The `authValidator != nil` branch in `SetupRoutes` is correct and sufficient. Production validation ensures `authValidator` is never `nil` in production.
- **Middleware ordering mistakes:** `AuthMiddleware` must always come before `UserSyncMiddleware`. Do not insert production checks as middleware — they belong at startup.
- **Changing `Validate()` to be production-aware:** Keep `Validate()` environment-agnostic. Add `ValidateProduction()` as a separate method. This preserves the ability to run without secrets in development.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT expiry detection | Custom token parsing | `errors.Is(err, jwt.ErrTokenExpired)` — already in auth.go | jwt/v5 already propagates the sentinel; re-detecting it is redundant |
| Log field sanitization framework | Custom `slog.Handler` that strips all fields | `RedactCredentials()` regex helper applied selectively | Full handler replacement affects all logs including safe fields; targeted helper is simpler and more auditable |
| Production secret rotation | Secret management tooling (Vault, etc.) | Out of scope — only validate presence at startup | Phase scope is hardening, not infrastructure |
| Auth bypass detection | Token introspection middleware | Production startup gate makes bypass structurally impossible when `authValidator != nil` | Design-level fix is better than runtime detection |

**Key insight:** Everything needed already exists. The work is wiring up validation checks and adding audit logging calls — not introducing new systems.

---

## Common Pitfalls

### Pitfall 1: Breaking Development Workflow
**What goes wrong:** Production-mode checks run unconditionally, forcing developers to set all secrets locally.
**Why it happens:** Forgetting that `APP_ENV` is only set in production deployment environments.
**How to avoid:** Gate all `ValidateProduction()` calls behind `cfg.IsProduction()` which reads `APP_ENV`. Document the variable name clearly in the error message. Never call `ValidateProduction()` unless `IsProduction()` returns true.
**Warning signs:** Existing `TestConfigLoad` tests fail because `APP_ENV=production` bleeds in from the environment.

### Pitfall 2: Minimum Length Check Allows Weak Secrets
**What goes wrong:** Requiring ≥32 chars but not checking entropy — a secret like `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (32 'a's) passes but is trivially weak.
**Why it happens:** Length is easy to check; entropy is harder.
**How to avoid:** Per CONTEXT.md, the requirement is minimum 32 characters — implement exactly this, no more. Entropy checks are out of scope and would add complexity without a clear spec.
**Warning signs:** Tests that use `"secret"` (6 chars) as a JWT secret in non-production tests are fine; they should not suddenly fail.

### Pitfall 3: Redaction Regex Too Greedy
**What goes wrong:** `longBase64Pattern` matches UUIDs (36 chars without hyphens), case IDs, or study IDs in log fields.
**Why it happens:** UUIDs and base64 have similar character sets.
**How to avoid:** UUIDs contain hyphens (`-`) which the standard base64 pattern `[A-Za-z0-9+/=]` does not match (base64url uses `-` but as separator variant). Test the regex against sample case IDs and UUIDs before shipping. Alternatively, set the minimum length higher (≥50 chars) since Supabase service role keys and JWTs are much longer than UUIDs.
**Warning signs:** Case ID log fields show `[REDACTED]` in test output.

### Pitfall 4: Service Key Logging Reveals the Key
**What goes wrong:** Logging "service key operation" accidentally logs the key value itself via `%v` format string.
**Why it happens:** Passing `a.serviceRoleKey` to a log field by accident.
**How to avoid:** `LogServiceKeyUsage` must never receive the key as an argument. Log only the operation name, resource identifiers (user ID, path), and timestamp. Never log `serviceRoleKey`, `SupabaseJWTSecret`, or `jwtSecret`.
**Warning signs:** `grep SUPABASE_SERVICE_ROLE_KEY` or `grep "Bearer "` finds hits in log output during tests.

### Pitfall 5: TOKEN_EXPIRED Response Format Mismatch
**What goes wrong:** The error response for TOKEN_EXPIRED uses a different JSON shape than other error codes, breaking frontend parsing.
**Why it happens:** The existing middleware uses `gin.H{"error": "unauthorized", "message": "..."}` (two keys) while `HandleError` uses `ErrorResponse{Code, Message}` (different field names).
**How to avoid:** Match the `ErrorResponse` shape from `internal/api/errors.go` exactly: `{"code": "TOKEN_EXPIRED", "message": "token expired"}`. The middleware must use the same JSON key names as the `api.ErrorResponse` struct. Consider importing `api.ErrorResponse` from auth middleware (if no circular import) or duplicating the struct definition.
**Warning signs:** Frontend i18n key `tokenExpired` does not trigger on expired token responses.

---

## Code Examples

Verified patterns from existing codebase source:

### Existing Error Code Registration Pattern
```go
// Source: internal/domain/errors.go (verified)
// Add TOKEN_EXPIRED alongside existing codes:
const (
    ErrCodeInvalidStateTransition = "INVALID_STATE_TRANSITION"
    ErrCodeMissingImages          = "MISSING_IMAGES"
    // NEW:
    ErrCodeTokenExpired           = "TOKEN_EXPIRED"
)
```

### Existing Config Validation Pattern (extend, don't replace)
```go
// Source: internal/config/config.go (verified)
// Validate() already collects errors into []string and joins them.
// ValidateProduction() follows the same pattern:
func (c *Config) ValidateProduction() error {
    var errs []string
    if c.SupabaseURL == "" {
        errs = append(errs, "SUPABASE_URL is required in production (SEC-01: auth enforcement)")
    }
    if c.SupabaseJWTSecret == "" {
        errs = append(errs, "SUPABASE_JWT_SECRET is required in production (SEC-02)")
    } else if len(c.SupabaseJWTSecret) < 32 {
        errs = append(errs, fmt.Sprintf(
            "SUPABASE_JWT_SECRET must be >= 32 characters, got %d (SEC-02)",
            len(c.SupabaseJWTSecret),
        ))
    }
    if c.SupabaseServiceRoleKey == "" {
        errs = append(errs, "SUPABASE_SERVICE_ROLE_KEY is required in production (SEC-04)")
    }
    if len(errs) > 0 {
        return fmt.Errorf("production security validation failed:\n  - %s",
            strings.Join(errs, "\n  - "))
    }
    return nil
}
```

### Existing slog.Info Structured Logging Pattern
```go
// Source: internal/supabase/auth.go line 82 (verified)
slog.Info("role synced to Supabase app_metadata", "user_id", userID, "role", role)

// New pattern for service key audit logging — same style:
slog.Info("service key operation",
    "op", string(OpUploadImage),
    "path", path,
    "timestamp", time.Now().UTC().Format(time.RFC3339),
)
```

### Existing Startup Error and Exit Pattern
```go
// Source: cmd/anklyze-apiserver/main.go lines 52-56 (verified)
cfg, err := config.Load()
if err != nil {
    slog.Error("invalid configuration", "error", err)
    os.Exit(1)
}

// New production validation — same pattern, same location:
if cfg.IsProduction() {
    if err := cfg.ValidateProduction(); err != nil {
        slog.Error("production security requirements not met — refusing to start", "error", err)
        os.Exit(1)
    }
}
```

### Existing Auth Middleware Error Switch
```go
// Source: internal/auth/middleware.go lines 70-84 (verified)
// Current pattern:
switch err {
case ErrTokenExpired:
    message = "token expired"
case ErrInvalidSignature:
    message = "invalid token signature"
}
c.JSON(status, gin.H{
    "error":   "unauthorized",
    "message": message,
})

// Updated pattern — split TOKEN_EXPIRED to return structured code:
if errors.Is(err, ErrTokenExpired) {
    c.JSON(http.StatusUnauthorized, gin.H{
        "code":    domain.ErrCodeTokenExpired,
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
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `log` package | `log/slog` (structured) | Go 1.21 | Already adopted; structured fields make redaction targetable |
| Manual JWT parsing | `golang-jwt/jwt/v5` with sentinel errors | Already in use | `ErrTokenExpired` is already detectable via `errors.Is` |
| Global route public-by-default | Conditional auth (`authValidator != nil`) | Existing | Production gate makes public fallback impossible when validator present |

**Deprecated/outdated:**
- `gin.H{"error": "unauthorized"}` raw map responses in auth middleware: these should be replaced with the structured `{"code": "...", "message": "..."}` shape to match `api.ErrorResponse`.

---

## Open Questions

1. **Circular import risk: `internal/auth` importing `internal/domain`**
   - What we know: `internal/auth/middleware.go` already imports `github.com/jferrl/anklyze/internal/domain` (line 12, verified). `domain.ErrCodeTokenExpired` can be added to `domain/errors.go` and used in middleware without any import cycle.
   - What's unclear: Nothing — the import path is already established.
   - Recommendation: Add `ErrCodeTokenExpired` to `domain/errors.go`; use it in `auth/middleware.go`. No circular import risk.

2. **Where exactly does redaction helper get called?**
   - What we know: The existing middleware already truncates the token prefix to 20 chars for the one debug log. New log call sites will be added in SEC-04 (service key operation logging).
   - What's unclear: Whether any existing slog calls elsewhere accidentally log full bearer tokens.
   - Recommendation: Audit `grep -r "serviceRoleKey\|jwtSecret\|JWT_SECRET\|SERVICE_ROLE" internal/` to find any existing log calls that reference secret fields. Apply `RedactCredentials()` only where needed. Do not apply globally via handler wrapper.

3. **Should `IsProduction()` read `APP_ENV` at call time or cache in Config?**
   - What we know: Config is loaded once at startup from environment. All other env reading in `config.go` uses `os.Getenv` at load time (not cached in struct fields). `APP_ENV` is not in the `Config` struct.
   - What's unclear: Whether to add `IsProduction bool` field to `Config` or use `os.Getenv("APP_ENV")` at call time.
   - Recommendation: Add `AppEnv string` field to `Config` struct (populated from `os.Getenv("APP_ENV")` in `Load()`), then `IsProduction()` checks `c.AppEnv == "production"`. This makes it testable via `Config` struct directly without `t.Setenv`.

---

## Sources

### Primary (HIGH confidence)
- `/Users/jferrl/git/anklyze/internal/auth/auth.go` — JWT validation, sentinel errors, `ErrTokenExpired` already defined
- `/Users/jferrl/git/anklyze/internal/auth/middleware.go` — existing switch on `ErrTokenExpired`, `errors.Is` not yet used there (uses `==`), import of `domain` confirmed
- `/Users/jferrl/git/anklyze/internal/config/config.go` — `Validate()` multi-error pattern, `HasSupabase()`, `HasSupabaseStorage()` methods
- `/Users/jferrl/git/anklyze/cmd/anklyze-apiserver/main.go` — startup error handling pattern, auth validator init, `os.Exit(1)` pattern
- `/Users/jferrl/git/anklyze/internal/api/routes.go` — `authValidator != nil` conditional branch, all three SetupXxxRoutes functions
- `/Users/jferrl/git/anklyze/internal/api/errors.go` — `ErrorResponse{Code, Message}` struct, error code constants
- `/Users/jferrl/git/anklyze/internal/domain/errors.go` — all error codes, existing sentinel pattern
- `/Users/jferrl/git/anklyze/internal/supabase/auth.go` — `AuthAdmin.UpdateUserRole`, service key usage location
- `/Users/jferrl/git/anklyze/internal/storage/supabase.go` — `Upload`, `Delete`, `GetSignedURL` service key usage locations
- `/Users/jferrl/git/anklyze/internal/logger/logger.go` — `log/slog` wrapper, `Setup()` pattern
- `/Users/jferrl/git/anklyze/go.mod` — `go 1.25.0`, `golang-jwt/jwt/v5 v5.3.1`, no missing deps

### Secondary (MEDIUM confidence)
- Go 1.21 stdlib documentation for `log/slog` — structured logging handler interface confirmed
- `golang-jwt/jwt/v5` README — `ErrTokenExpired` is a package-level sentinel confirmed

### Tertiary (LOW confidence)
- None — all claims are backed by direct code inspection of the codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all packages already in go.mod and in active use
- Architecture: HIGH — patterns copied directly from verified codebase; no speculation
- Pitfalls: HIGH — identified from direct code reading (e.g., existing `==` vs `errors.Is` in middleware switch)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — stable Go stdlib and existing dep versions)
