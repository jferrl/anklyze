// Package auth provides authentication and authorization functionality
// using Supabase Auth JWT tokens.
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

// Role represents user authorization level.
type Role string

const (
	// RoleUser is the default role for regular users.
	RoleUser Role = "user"
	// RoleAdmin is the role for administrators.
	RoleAdmin Role = "admin"
)

// Common errors.
var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrTokenExpired     = errors.New("token expired")
	ErrMissingClaims    = errors.New("missing claims")
	ErrInvalidSignature = errors.New("invalid signature")
)

// Claims represents Supabase JWT claims.
type Claims struct {
	jwt.RegisteredClaims
	Email        string         `json:"email"`
	Role         string         `json:"role"`
	AppMetadata  map[string]any `json:"app_metadata"`
	UserMetadata map[string]any `json:"user_metadata"`
}

// GetRole extracts role from claims.
// It first checks app_metadata.role (Supabase standard),
// then falls back to the direct role claim.
// If no role is found, it returns RoleUser as the default.
func (c *Claims) GetRole() Role {
	if c.AppMetadata != nil {
		if role, ok := c.AppMetadata["role"].(string); ok && role != "" {
			return Role(role)
		}
	}
	if c.Role != "" {
		return Role(c.Role)
	}
	return RoleUser
}

// GetUserID returns the user ID from the subject claim.
func (c *Claims) GetUserID() string {
	return c.Subject
}

// GetEmail returns the user's email.
func (c *Claims) GetEmail() string {
	return c.Email
}

// Validator handles JWT validation against Supabase Auth.
type Validator struct {
	jwks      keyfunc.Keyfunc
	jwtSecret []byte
	issuer    string
}

// ValidatorOption configures a Validator.
type ValidatorOption func(*Validator)

// WithJWTSecret sets a static JWT secret for validation.
// This is useful for testing or when JWKS is not available.
func WithJWTSecret(secret string) ValidatorOption {
	return func(v *Validator) {
		v.jwtSecret = []byte(secret)
	}
}

// NewValidator creates a new JWT validator for Supabase Auth.
// It fetches the JWKS from the Supabase project URL and caches it.
func NewValidator(ctx context.Context, supabaseURL string, opts ...ValidatorOption) (*Validator, error) {
	if supabaseURL == "" {
		return nil, errors.New("supabase URL is required")
	}

	v := &Validator{
		issuer: supabaseURL + "/auth/v1",
	}

	for _, opt := range opts {
		opt(v)
	}

	// If no JWT secret provided, use JWKS
	if len(v.jwtSecret) == 0 {
		jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"

		jwks, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
		if err != nil {
			return nil, fmt.Errorf("failed to create JWKS keyfunc: %w", err)
		}
		v.jwks = jwks
	}

	return v, nil
}

// ValidateToken validates a Supabase JWT and returns the claims.
func (v *Validator) ValidateToken(tokenString string) (*Claims, error) {
	if tokenString == "" {
		return nil, ErrInvalidToken
	}

	claims := &Claims{}

	var keyFunc jwt.Keyfunc
	if v.jwks != nil {
		keyFunc = v.jwks.Keyfunc
	} else if len(v.jwtSecret) > 0 {
		keyFunc = func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return v.jwtSecret, nil
		}
	} else {
		return nil, errors.New("no key function configured")
	}

	// Supabase uses different issuer formats depending on configuration
	// We accept both the full URL format and the simple "supabase" issuer
	token, err := jwt.ParseWithClaims(tokenString, claims, keyFunc,
		jwt.WithValidMethods([]string{"HS256", "RS256", "ES256"}),
		jwt.WithLeeway(30*time.Second),
	)

	// Validate issuer manually to allow multiple formats
	if token != nil && token.Valid {
		iss, _ := claims.GetIssuer()
		if iss != "supabase" && iss != v.issuer {
			return nil, fmt.Errorf("%w: invalid issuer %q", ErrInvalidToken, iss)
		}
	}

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		if errors.Is(err, jwt.ErrSignatureInvalid) {
			return nil, ErrInvalidSignature
		}
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// Close releases resources used by the validator.
// Note: The keyfunc library handles its own cleanup, so this is a no-op
// but kept for interface consistency and future compatibility.
func (v *Validator) Close() error {
	return nil
}
