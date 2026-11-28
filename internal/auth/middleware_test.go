package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jferrl/anklyze/internal/domain"
)

func init() {
	gin.SetMode(gin.TestMode)
}

const (
	testSecret      = "test-secret-key-for-jwt-signing"
	testSupabaseURL = "https://test.supabase.co"
)

// createTestToken creates a JWT token for testing.
func createTestToken(claims Claims) string {
	now := time.Now()
	claims.ExpiresAt = jwt.NewNumericDate(now.Add(1 * time.Hour))
	claims.IssuedAt = jwt.NewNumericDate(now)
	claims.Issuer = testSupabaseURL + "/auth/v1"
	claims.Audience = jwt.ClaimStrings{"authenticated"}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte(testSecret))
	return tokenString
}

// createExpiredToken creates an expired JWT token for testing.
func createExpiredToken(claims Claims, secret string) string {
	now := time.Now()
	claims.ExpiresAt = jwt.NewNumericDate(now.Add(-1 * time.Hour))
	claims.IssuedAt = jwt.NewNumericDate(now.Add(-2 * time.Hour))
	claims.Issuer = testSupabaseURL + "/auth/v1"
	claims.Audience = jwt.ClaimStrings{"authenticated"}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte(secret))
	return tokenString
}

func createTestValidator(t *testing.T) *Validator {
	t.Helper()
	v, err := NewValidator(context.Background(), testSupabaseURL, WithJWTSecret(testSecret))
	if err != nil {
		t.Fatalf("failed to create validator: %v", err)
	}
	return v
}

func TestMiddleware(t *testing.T) {
	validator := createTestValidator(t)
	defer func() { _ = validator.Close() }()

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
		expectedError  string
		checkContext   func(*gin.Context) bool
	}{
		{
			name:           "missing authorization header",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "missing authorization header",
		},
		{
			name:           "invalid authorization format - no space",
			authHeader:     "Bearer",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid authorization format, expected 'Bearer <token>'",
		},
		{
			name:           "invalid authorization format - wrong scheme",
			authHeader:     "Basic sometoken",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid authorization format, expected 'Bearer <token>'",
		},
		{
			name:           "invalid token",
			authHeader:     "Bearer invalid-token",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "invalid token",
		},
		{
			name: "expired token",
			authHeader: "Bearer " + createExpiredToken(Claims{
				Email: "user@example.com",
			}, testSecret),
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "token expired",
		},
		{
			name: "valid token with user role",
			authHeader: "Bearer " + createTestToken(Claims{
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "user-123",
				},
				Email: "user@example.com",
				AppMetadata: map[string]any{
					"role": "user",
				},
			}),
			expectedStatus: http.StatusOK,
			checkContext: func(c *gin.Context) bool {
				return c.GetString(ContextKeyUserID) == "user-123" &&
					GetClaims(c).GetEmail() == "user@example.com" &&
					GetClaims(c).GetRole() == RoleUser
			},
		},
		{
			name: "valid token with admin role",
			authHeader: "Bearer " + createTestToken(Claims{
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "admin-456",
				},
				Email: "admin@example.com",
				AppMetadata: map[string]any{
					"role": "admin",
				},
			}),
			expectedStatus: http.StatusOK,
			checkContext: func(c *gin.Context) bool {
				return c.GetString(ContextKeyUserID) == "admin-456" &&
					GetClaims(c).GetRole() == RoleAdmin
			},
		},
		{
			name: "bearer case insensitive",
			authHeader: "bearer " + createTestToken(Claims{
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "user-789",
				},
			}),
			expectedStatus: http.StatusOK,
			checkContext: func(c *gin.Context) bool {
				return c.GetString(ContextKeyUserID) == "user-789"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, router := gin.CreateTestContext(w)

			var contextCheck bool
			router.Use(Middleware(validator))
			router.GET("/test", func(c *gin.Context) {
				if tt.checkContext != nil {
					contextCheck = tt.checkContext(c)
				}
				c.Status(http.StatusOK)
			})

			c.Request = httptest.NewRequest("GET", "/test", nil)
			if tt.authHeader != "" {
				c.Request.Header.Set("Authorization", tt.authHeader)
			}

			router.ServeHTTP(w, c.Request)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				var resp map[string]any
				if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}
				if msg, ok := resp["message"].(string); !ok || msg != tt.expectedError {
					t.Errorf("expected error message %q, got %q", tt.expectedError, msg)
				}
			}

			if tt.checkContext != nil && !contextCheck {
				t.Error("context check failed")
			}
		})
	}
}

// TestMiddlewareStructuredErrors verifies that expired and invalid tokens
// return structured JSON responses with the expected "code" field.
func TestMiddlewareStructuredErrors(t *testing.T) {
	validator := createTestValidator(t)
	defer func() { _ = validator.Close() }()

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
		expectedCode   string
		expectedMsg    string
	}{
		{
			name: "expired token returns TOKEN_EXPIRED code",
			authHeader: "Bearer " + createExpiredToken(Claims{
				Email: "user@example.com",
			}, testSecret),
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "TOKEN_EXPIRED",
			expectedMsg:    "token expired",
		},
		{
			name:           "invalid token returns UNAUTHORIZED code",
			authHeader:     "Bearer invalid-token",
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "UNAUTHORIZED",
			expectedMsg:    "invalid token",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, router := gin.CreateTestContext(w)

			router.Use(Middleware(validator))
			router.GET("/test", func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			c.Request = httptest.NewRequest("GET", "/test", nil)
			c.Request.Header.Set("Authorization", tt.authHeader)

			router.ServeHTTP(w, c.Request)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			var resp map[string]any
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}

			if code, ok := resp["code"].(string); !ok || code != tt.expectedCode {
				t.Errorf("expected code %q, got %q (body: %s)", tt.expectedCode, code, w.Body.String())
			}

			if msg, ok := resp["message"].(string); !ok || msg != tt.expectedMsg {
				t.Errorf("expected message %q, got %q", tt.expectedMsg, msg)
			}
		})
	}
}

func TestRequireRole(t *testing.T) {
	validator := createTestValidator(t)
	defer func() { _ = validator.Close() }()

	tests := []struct {
		name           string
		allowedRoles   []Role
		userRole       string
		expectedStatus int
	}{
		{
			name:           "user allowed when user role required",
			allowedRoles:   []Role{RoleUser},
			userRole:       "user",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "admin allowed when admin role required",
			allowedRoles:   []Role{RoleAdmin},
			userRole:       "admin",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "user allowed when user or admin required",
			allowedRoles:   []Role{RoleUser, RoleAdmin},
			userRole:       "user",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "admin allowed when user or admin required",
			allowedRoles:   []Role{RoleUser, RoleAdmin},
			userRole:       "admin",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "user forbidden when only admin required",
			allowedRoles:   []Role{RoleAdmin},
			userRole:       "user",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "admin token claim without admin DB row is forbidden",
			allowedRoles:   []Role{RoleAdmin},
			userRole:       "claim-only-admin",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "no claims returns unauthorized",
			allowedRoles:   []Role{RoleUser},
			userRole:       "", // Will not set claims
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, router := gin.CreateTestContext(w)

			// Middleware that sets claims (simulating Middleware)
			router.Use(func(c *gin.Context) {
				switch tt.userRole {
				case "":
				case "claim-only-admin":
					c.Set(ContextKeyClaims, &Claims{AppMetadata: map[string]any{"role": "admin"}})
				default:
					c.Set(ContextKeyClaims, &Claims{})
					c.Set(ContextKeyUser, &domain.User{Role: domain.UserRole(tt.userRole)})
				}
				c.Next()
			})

			router.Use(RequireRole(tt.allowedRoles...))
			router.GET("/test", func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			c.Request = httptest.NewRequest("GET", "/test", nil)
			router.ServeHTTP(w, c.Request)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestHelperFunctions(t *testing.T) {
	t.Run("GetClaims", func(t *testing.T) {
		tests := []struct {
			name      string
			setup     func(*gin.Context)
			expectNil bool
		}{
			{
				name:      "no claims set",
				setup:     func(c *gin.Context) {},
				expectNil: true,
			},
			{
				name: "claims set",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyClaims, &Claims{Email: "test@example.com"})
				},
				expectNil: false,
			},
			{
				name: "wrong type set",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyClaims, "not-claims")
				},
				expectNil: true,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				w := httptest.NewRecorder()
				c, _ := gin.CreateTestContext(w)
				tt.setup(c)

				got := GetClaims(c)
				if (got == nil) != tt.expectNil {
					t.Errorf("GetClaims() nil = %v, want nil = %v", got == nil, tt.expectNil)
				}
			})
		}
	})

	t.Run("IsAuthenticated", func(t *testing.T) {
		tests := []struct {
			name     string
			setup    func(*gin.Context)
			expected bool
		}{
			{
				name:     "not authenticated",
				setup:    func(c *gin.Context) {},
				expected: false,
			},
			{
				name: "authenticated",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyClaims, &Claims{})
				},
				expected: true,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				w := httptest.NewRecorder()
				c, _ := gin.CreateTestContext(w)
				tt.setup(c)

				got := IsAuthenticated(c)
				if got != tt.expected {
					t.Errorf("IsAuthenticated() = %v, want %v", got, tt.expected)
				}
			})
		}
	})
}

func TestValidateToken_RejectsAnonymousAndWrongAudience(t *testing.T) {
	v := createTestValidator(t)

	if _, err := v.ValidateToken(createTestToken(Claims{Email: "a@example.test"})); err != nil {
		t.Fatalf("control token rejected: %v", err)
	}
	if _, err := v.ValidateToken(createTestToken(Claims{IsAnonymous: true})); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("anonymous token: err = %v, want ErrInvalidToken", err)
	}

	noAud := Claims{RegisteredClaims: jwt.RegisteredClaims{
		Issuer:    testSupabaseURL + "/auth/v1",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}}
	tok, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, noAud).SignedString([]byte(testSecret))
	if _, err := v.ValidateToken(tok); err == nil {
		t.Error("token without aud=authenticated was accepted")
	}

	noExp := Claims{RegisteredClaims: jwt.RegisteredClaims{
		Issuer:   testSupabaseURL + "/auth/v1",
		Audience: jwt.ClaimStrings{"authenticated"},
	}}
	tok, _ = jwt.NewWithClaims(jwt.SigningMethodHS256, noExp).SignedString([]byte(testSecret))
	if _, err := v.ValidateToken(tok); err == nil {
		t.Error("token without exp was accepted")
	}
}
