# Phase 2: Security - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden authentication, JWT handling, audit log hygiene, and service role key governance for production readiness. Covers SEC-01 through SEC-04. No new features, no schema changes — security hardening of existing functionality only.

</domain>

<decisions>
## Implementation Decisions

### Auth enforcement (SEC-01)
- Server MUST refuse to start in production if auth configuration is missing or incomplete
- Only `/health` endpoint remains public — all other endpoints (including `/classify`) require authentication in production
- Production detection via explicit environment variable (e.g. `APP_ENV=production` or similar)
- Development mode behavior stays as-is — no changes to current dev workflow

### Audit data protection (SEC-03)
- No confidential patient data exists in the system — SEC-03 scope narrowed to general log hygiene
- Sanitize tokens and API keys if they appear in audit log payloads (JWT tokens, Supabase service keys)
- Do NOT sanitize or truncate request/response bodies — only redact credential-like values
- Leave case IDs, study IDs, classification data, and all non-credential fields readable

### JWT & secret handling (SEC-02)
- Server MUST refuse to start in production if JWT_SECRET is missing
- Enforce minimum 32-character length for JWT_SECRET at startup (reject shorter secrets)
- Use local JWT signature verification — no Supabase API calls for token validation
- Return specific `TOKEN_EXPIRED` error code (HTTP 401) on expired tokens so frontend can prompt re-login
- Other auth failures return generic 401

### Service role key governance (SEC-04)
- Runtime structured logging for every operation that uses the Supabase service role key (action + timestamp)
- Restrict service key usage to known operations only — wrap in a helper that rejects unknown uses
- Document required permissions as code comments/constants next to each service key usage point
- Server MUST refuse to start in production if service role key is missing (consistent with JWT secret policy)

### Claude's Discretion
- Exact middleware implementation pattern (Gin middleware chain ordering)
- Startup validation function structure
- Log format and structured logging field names
- How to detect and redact tokens in log payloads (regex vs field allowlist)

</decisions>

<specifics>
## Specific Ideas

- All three production startup requirements (auth config, JWT secret, service key) should fail with clear, actionable error messages — not just "missing config"
- Consistent "refuse to start" pattern across all three — consider a single startup validator function
- TOKEN_EXPIRED should follow the same error response pattern established in Phase 1 (structured error codes like INVALID_STATE_TRANSITION)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-security*
*Context gathered: 2026-02-26*
