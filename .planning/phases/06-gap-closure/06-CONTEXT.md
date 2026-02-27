# Phase 6: Security & API Gap Closure - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Close gaps identified by milestone audit. Original audit found three gaps; after discussion, scope is reduced to two items: JWKS endpoint validation at startup and removal of unused RedactCredentials code. PATCH retry and JWT secret validation were dropped as not applicable.

</domain>

<decisions>
## Implementation Decisions

### Startup validation (JWKS check)
- Replace the original SUPABASE_JWT_SECRET check with a JWKS endpoint reachability check
- SUPABASE_JWT_SECRET does not exist in the codebase — the app uses JWKS for token validation
- On startup in production, validate that the JWKS endpoint is reachable
- If unreachable: log a warning, start the server anyway, retry JWKS fetch indefinitely with backoff
- Server rejects all auth requests until JWKS succeeds, but doesn't exit
- Wire this into the existing ValidateProduction() flow or as a parallel startup check

### Credential redaction (removal)
- Delete `internal/logger/sanitize.go` and `internal/logger/sanitize_test.go` entirely
- Remove any references to RedactCredentials from the codebase
- User considers this feature unnecessary for the project

### PATCH retry (dropped)
- Original audit flagged missing PATCH in RETRYABLE_METHODS
- User decided this is not a meaningful gap — dropped from scope

### Claude's Discretion
- JWKS retry backoff strategy (exponential, fixed interval, etc.)
- How to surface JWKS unavailability in health check endpoints
- Whether to add a startup log line confirming JWKS is ready

</decisions>

<specifics>
## Specific Ideas

- JWKS validation should not block server startup — start with warning, retry in background
- Existing ValidateProduction() already checks SUPABASE_URL and SERVICE_ROLE_KEY — JWKS check complements this

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-gap-closure*
*Context gathered: 2026-02-27*
