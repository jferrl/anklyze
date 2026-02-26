package logger

import "regexp"

var (
	// jwtPattern matches JWT bearer tokens: three base64url segments separated by dots.
	// JWT header always starts with "eyJ" (base64url of '{"').
	jwtPattern = regexp.MustCompile(`eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`)

	// longCredentialPattern matches long (>=50 char) base64 or base64url strings.
	// Supabase service role keys and API keys are 40-200 chars.
	// Minimum 50 chars avoids matching UUIDs (36 chars) and short encoded values.
	longCredentialPattern = regexp.MustCompile(`[A-Za-z0-9+/=_-]{50,}`)
)

// RedactCredentials replaces credential-like values in s with [REDACTED].
// Detects:
//   - JWT bearer tokens (three dot-separated base64url segments starting with "eyJ")
//   - Long (>=50 char) base64/base64url strings (service role keys, API keys)
//
// Does NOT redact: UUIDs, case IDs, study IDs, classification data, short strings.
// Use this when logging values sourced from HTTP Authorization headers or env vars
// with "key", "secret", or "token" in their names.
func RedactCredentials(s string) string {
	s = jwtPattern.ReplaceAllString(s, "[REDACTED]")
	s = longCredentialPattern.ReplaceAllString(s, "[REDACTED]")
	return s
}
