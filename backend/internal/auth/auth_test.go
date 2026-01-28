package auth

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestClaims_GetRole(t *testing.T) {
	tests := []struct {
		name     string
		claims   Claims
		expected Role
	}{
		{
			name: "role from app_metadata",
			claims: Claims{
				AppMetadata: map[string]interface{}{
					"role": "admin",
				},
			},
			expected: RoleAdmin,
		},
		{
			name: "role from direct claim",
			claims: Claims{
				Role: "admin",
			},
			expected: RoleAdmin,
		},
		{
			name: "app_metadata takes precedence",
			claims: Claims{
				AppMetadata: map[string]interface{}{
					"role": "admin",
				},
				Role: "user",
			},
			expected: RoleAdmin,
		},
		{
			name:     "default to user when no role",
			claims:   Claims{},
			expected: RoleUser,
		},
		{
			name: "default to user when app_metadata empty",
			claims: Claims{
				AppMetadata: map[string]interface{}{},
			},
			expected: RoleUser,
		},
		{
			name: "default to user when app_metadata role is empty string",
			claims: Claims{
				AppMetadata: map[string]interface{}{
					"role": "",
				},
			},
			expected: RoleUser,
		},
		{
			name: "handle non-string role in app_metadata",
			claims: Claims{
				AppMetadata: map[string]interface{}{
					"role": 123,
				},
				Role: "admin",
			},
			expected: RoleAdmin,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.claims.GetRole()
			if got != tt.expected {
				t.Errorf("GetRole() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestClaims_GetUserID(t *testing.T) {
	tests := []struct {
		name     string
		claims   Claims
		expected string
	}{
		{
			name: "returns subject",
			claims: Claims{
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "user-123",
				},
			},
			expected: "user-123",
		},
		{
			name:     "empty when no subject",
			claims:   Claims{},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.claims.GetUserID()
			if got != tt.expected {
				t.Errorf("GetUserID() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestClaims_GetEmail(t *testing.T) {
	tests := []struct {
		name     string
		claims   Claims
		expected string
	}{
		{
			name: "returns email",
			claims: Claims{
				Email: "user@example.com",
			},
			expected: "user@example.com",
		},
		{
			name:     "empty when no email",
			claims:   Claims{},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.claims.GetEmail()
			if got != tt.expected {
				t.Errorf("GetEmail() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestNewValidator(t *testing.T) {
	tests := []struct {
		name        string
		supabaseURL string
		opts        []ValidatorOption
		wantErr     bool
	}{
		{
			name:        "valid with JWT secret",
			supabaseURL: "https://example.supabase.co",
			opts:        []ValidatorOption{WithJWTSecret("test-secret")},
			wantErr:     false,
		},
		{
			name:        "error when supabaseURL is empty",
			supabaseURL: "",
			opts:        []ValidatorOption{WithJWTSecret("test-secret")},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			v, err := NewValidator(ctx, tt.supabaseURL, tt.opts...)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewValidator() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && v == nil {
				t.Error("NewValidator() returned nil validator without error")
			}

			if v != nil {
				v.Close()
			}
		})
	}
}

func TestValidator_ValidateToken(t *testing.T) {
	const testSecret = "test-secret-key-for-jwt-signing"
	const supabaseURL = "https://test.supabase.co"

	// Helper to create a valid token
	createToken := func(claims Claims, expired bool) string {
		now := time.Now()
		if expired {
			claims.ExpiresAt = jwt.NewNumericDate(now.Add(-1 * time.Hour))
			claims.IssuedAt = jwt.NewNumericDate(now.Add(-2 * time.Hour))
		} else {
			claims.ExpiresAt = jwt.NewNumericDate(now.Add(1 * time.Hour))
			claims.IssuedAt = jwt.NewNumericDate(now)
		}
		claims.Issuer = supabaseURL + "/auth/v1"

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(testSecret))
		return tokenString
	}

	tests := []struct {
		name      string
		token     string
		wantErr   error
		wantEmail string
		wantRole  Role
	}{
		{
			name:    "empty token",
			token:   "",
			wantErr: ErrInvalidToken,
		},
		{
			name:    "invalid token format",
			token:   "not-a-valid-jwt",
			wantErr: ErrInvalidToken,
		},
		{
			name: "expired token",
			token: createToken(Claims{
				Email: "user@example.com",
			}, true),
			wantErr: ErrTokenExpired,
		},
		{
			name: "valid token with user role",
			token: createToken(Claims{
				Email: "user@example.com",
				AppMetadata: map[string]interface{}{
					"role": "user",
				},
			}, false),
			wantErr:   nil,
			wantEmail: "user@example.com",
			wantRole:  RoleUser,
		},
		{
			name: "valid token with admin role",
			token: createToken(Claims{
				Email: "admin@example.com",
				AppMetadata: map[string]interface{}{
					"role": "admin",
				},
			}, false),
			wantErr:   nil,
			wantEmail: "admin@example.com",
			wantRole:  RoleAdmin,
		},
	}

	ctx := context.Background()
	v, err := NewValidator(ctx, supabaseURL, WithJWTSecret(testSecret))
	if err != nil {
		t.Fatalf("failed to create validator: %v", err)
	}
	defer v.Close()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := v.ValidateToken(tt.token)

			if tt.wantErr != nil {
				if err == nil {
					t.Errorf("ValidateToken() error = nil, wantErr %v", tt.wantErr)
					return
				}
				// Check if error matches (using errors.Is for wrapped errors)
				if err != tt.wantErr && err.Error() != tt.wantErr.Error() {
					// Allow wrapped errors
					if !containsError(err, tt.wantErr) {
						t.Errorf("ValidateToken() error = %v, wantErr %v", err, tt.wantErr)
					}
				}
				return
			}

			if err != nil {
				t.Errorf("ValidateToken() unexpected error = %v", err)
				return
			}

			if claims.GetEmail() != tt.wantEmail {
				t.Errorf("ValidateToken() email = %v, want %v", claims.GetEmail(), tt.wantEmail)
			}

			if claims.GetRole() != tt.wantRole {
				t.Errorf("ValidateToken() role = %v, want %v", claims.GetRole(), tt.wantRole)
			}
		})
	}
}

func TestValidator_Close(t *testing.T) {
	tests := []struct {
		name    string
		setup   func() *Validator
		wantErr bool
	}{
		{
			name: "close with JWT secret only",
			setup: func() *Validator {
				v, _ := NewValidator(context.Background(), "https://test.supabase.co", WithJWTSecret("secret"))
				return v
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := tt.setup()
			if v == nil {
				t.Skip("validator setup failed")
			}

			err := v.Close()
			if (err != nil) != tt.wantErr {
				t.Errorf("Close() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// containsError checks if an error contains another error (for wrapped errors)
func containsError(err, target error) bool {
	if err == nil || target == nil {
		return err == target
	}
	return err.Error() == target.Error() ||
		(len(err.Error()) > len(target.Error()) &&
		err.Error()[:len(target.Error())] == target.Error())
}
