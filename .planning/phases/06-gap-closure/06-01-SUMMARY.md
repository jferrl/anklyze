---
phase: 06-gap-closure
plan: 01
subsystem: auth, api, logger
tags: [jwks, health-check, probe, dead-code, security]
dependency-graph:
  requires: []
  provides: [JWKS probe, health endpoint jwks status, sanitize deletion]
  affects: [internal/auth, internal/api, cmd/anklyze-apiserver]
tech-stack:
  added: [sync/atomic]
  patterns: [atomic bool for probe readiness, exponential backoff retry, context-cancellable goroutine]
key-files:
  created:
    - internal/auth/jwks_probe.go
    - internal/auth/jwks_probe_test.go
  modified:
    - internal/api/handler.go
    - internal/api/routes.go
    - internal/api/handler_test.go
    - internal/api/session_limit_test.go
    - cmd/anklyze-apiserver/main.go
  deleted:
    - internal/logger/sanitize.go
    - internal/logger/sanitize_test.go
decisions:
  - "ProbeJWKS uses http.NewRequestWithContext with 5s timeout — not bare http.Get — to honour context cancellation"
  - "retryJWKSProbeWithBackoff accepts initialBackoff for testability; RetryJWKSProbe calls it with default 5s"
  - "jwksReady nil = not tracked = ready in HealthCheck — preserves backwards compatibility for non-production callers"
  - "JWKS probe fires only when cfg.IsProduction() && authValidator != nil — avoids false noise in dev"
  - "ARCH-03 acknowledged but no work performed — user decision from Phase 5"
metrics:
  duration: 208s
  completed: "2026-02-27"
  tasks: 2
  files: 9
---

# Phase 06 Plan 01: JWKS Probe and Dead Code Removal Summary

**One-liner:** JWKS endpoint probe with exponential-backoff retry surfaced in /health, plus deletion of unused RedactCredentials dead code.

## What Was Built

### Task 1: JWKS Probe with Background Retry

**`internal/auth/jwks_probe.go`** — two exported functions:

- `ProbeJWKS(ctx, jwksURL)` — single HTTP GET with 5-second timeout using `http.NewRequestWithContext`. Returns nil on 2xx, descriptive error otherwise.
- `RetryJWKSProbe(ctx, jwksURL, *atomic.Bool)` — calls internal `retryJWKSProbeWithBackoff` with 5s initial backoff. Exponential backoff up to 5 minutes. Logs warn on each failure, logs info on success, stores true in the atomic bool, returns. Context cancellation exits cleanly without error logging.

**`internal/api/handler.go`** — Handler struct gains `jwksReady *atomic.Bool`. `NewHandler` accepts it as a new parameter after `dbHealthy`. `HealthCheck` returns `{"status":"ok","db":"...","jwks":"ready|pending"}` — nil pointer means not tracked, defaults to "ready".

**`internal/api/routes.go`** — `SetupRoutes` gains `jwksReady *atomic.Bool` parameter, threads it to `NewHandler`.

**`cmd/anklyze-apiserver/main.go`** — After auth validator init, creates `jwksReady := &atomic.Bool{}` defaulting to `true`. In production with active auth validator: calls `ProbeJWKS`, sets false and starts background `go RetryJWKSProbe(probeCtx, ...)` if unreachable, logs info if reachable. Passes `jwksReady` to `SetupRoutes`.

### Task 2: Delete Unused Credential Redaction

Deleted `internal/logger/sanitize.go` and `internal/logger/sanitize_test.go`. `RedactCredentials` was defined in Phase 2 but never wired to any call site. Zero external references confirmed before deletion.

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

- `go test ./internal/auth/... -run TestProbe` — 4/4 ProbeJWKS tests pass
- `go test ./internal/auth/... -run TestRetry` — 2/2 RetryJWKSProbe tests pass
- `go test ./internal/api/... -count=1` — all API tests pass (including health check with new jwks field)
- `go test ./...` — all packages pass
- `go vet ./...` — no issues
- `go build ./cmd/anklyze-apiserver/` — clean build

## Self-Check: PASSED

- FOUND: internal/auth/jwks_probe.go
- FOUND: internal/auth/jwks_probe_test.go
- CONFIRMED DELETED: internal/logger/sanitize.go
- CONFIRMED DELETED: internal/logger/sanitize_test.go
- FOUND commit 1804e0a: feat(06-01): add JWKS endpoint probe with background retry
- FOUND commit 86f5329: feat(06-01): delete unused credential redaction dead code
