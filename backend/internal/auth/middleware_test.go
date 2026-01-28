package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func init() {
	gin.SetMode(gin.TestMode)
}

const (
	testSecret      = "test-secret-key-for-jwt-signing"
	testSupabaseURL = "https://test.supabase.co"
)

// createTestToken creates a JWT token for testing.
func createTestToken(claims Claims, secret string) string {
	now := time.Now()
	claims.ExpiresAt = jwt.NewNumericDate(now.Add(1 * time.Hour))
	claims.IssuedAt = jwt.NewNumericDate(now)
	claims.Issuer = testSupabaseURL + "/auth/v1"

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte(secret))
	return tokenString
}

// createExpiredToken creates an expired JWT token for testing.
func createExpiredToken(claims Claims, secret string) string {
	now := time.Now()
	claims.ExpiresAt = jwt.NewNumericDate(now.Add(-1 * time.Hour))
	claims.IssuedAt = jwt.NewNumericDate(now.Add(-2 * time.Hour))
	claims.Issuer = testSupabaseURL + "/auth/v1"

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

func TestAuthMiddleware(t *testing.T) {
	validator := createTestValidator(t)
	defer validator.Close()

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
				AppMetadata: map[string]interface{}{
					"role": "user",
				},
			}, testSecret),
			expectedStatus: http.StatusOK,
			checkContext: func(c *gin.Context) bool {
				return GetUserID(c) == "user-123" &&
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
				AppMetadata: map[string]interface{}{
					"role": "admin",
				},
			}, testSecret),
			expectedStatus: http.StatusOK,
			checkContext: func(c *gin.Context) bool {
				return GetUserID(c) == "admin-456" &&
					GetClaims(c).GetRole() == RoleAdmin
			},
		},
		{
			name: "bearer case insensitive",
			authHeader: "bearer " + createTestToken(Claims{
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "user-789",
				},
			}, testSecret),
			expectedStatus: http.StatusOK,
			checkContext: func(c *gin.Context) bool {
				return GetUserID(c) == "user-789"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, router := gin.CreateTestContext(w)

			var contextCheck bool
			router.Use(AuthMiddleware(validator))
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
				var resp map[string]interface{}
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

func TestRequireRole(t *testing.T) {
	validator := createTestValidator(t)
	defer validator.Close()

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

			// Middleware that sets claims (simulating AuthMiddleware)
			router.Use(func(c *gin.Context) {
				if tt.userRole != "" {
					claims := &Claims{
						AppMetadata: map[string]interface{}{
							"role": tt.userRole,
						},
					}
					c.Set(ContextKeyClaims, claims)
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

func TestOptionalAuth(t *testing.T) {
	validator := createTestValidator(t)
	defer validator.Close()

	tests := []struct {
		name             string
		authHeader       string
		expectedStatus   int
		expectClaims     bool
		expectedUserID   string
	}{
		{
			name:           "no auth header proceeds without claims",
			authHeader:     "",
			expectedStatus: http.StatusOK,
			expectClaims:   false,
		},
		{
			name:           "invalid auth format proceeds without claims",
			authHeader:     "Basic sometoken",
			expectedStatus: http.StatusOK,
			expectClaims:   false,
		},
		{
			name:           "invalid token proceeds without claims",
			authHeader:     "Bearer invalid-token",
			expectedStatus: http.StatusOK,
			expectClaims:   false,
		},
		{
			name: "valid token sets claims",
			authHeader: "Bearer " + createTestToken(Claims{
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "user-123",
				},
				Email: "user@example.com",
			}, testSecret),
			expectedStatus: http.StatusOK,
			expectClaims:   true,
			expectedUserID: "user-123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, router := gin.CreateTestContext(w)

			var hasClaims bool
			var userID string

			router.Use(OptionalAuth(validator))
			router.GET("/test", func(c *gin.Context) {
				hasClaims = GetClaims(c) != nil
				userID = GetUserID(c)
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

			if hasClaims != tt.expectClaims {
				t.Errorf("expected claims present = %v, got %v", tt.expectClaims, hasClaims)
			}

			if tt.expectClaims && userID != tt.expectedUserID {
				t.Errorf("expected userID %q, got %q", tt.expectedUserID, userID)
			}
		})
	}
}

func TestHelperFunctions(t *testing.T) {
	t.Run("GetUserID", func(t *testing.T) {
		tests := []struct {
			name     string
			setup    func(*gin.Context)
			expected string
		}{
			{
				name:     "no user ID set",
				setup:    func(c *gin.Context) {},
				expected: "",
			},
			{
				name: "user ID set",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyUserID, "user-123")
				},
				expected: "user-123",
			},
			{
				name: "wrong type set",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyUserID, 123)
				},
				expected: "",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				w := httptest.NewRecorder()
				c, _ := gin.CreateTestContext(w)
				tt.setup(c)

				got := GetUserID(c)
				if got != tt.expected {
					t.Errorf("GetUserID() = %q, want %q", got, tt.expected)
				}
			})
		}
	})

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

	t.Run("HasRole", func(t *testing.T) {
		tests := []struct {
			name     string
			setup    func(*gin.Context)
			role     Role
			expected bool
		}{
			{
				name:     "no claims",
				setup:    func(c *gin.Context) {},
				role:     RoleUser,
				expected: false,
			},
			{
				name: "has user role checking user",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyClaims, &Claims{
						AppMetadata: map[string]interface{}{"role": "user"},
					})
				},
				role:     RoleUser,
				expected: true,
			},
			{
				name: "has user role checking admin",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyClaims, &Claims{
						AppMetadata: map[string]interface{}{"role": "user"},
					})
				},
				role:     RoleAdmin,
				expected: false,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				w := httptest.NewRecorder()
				c, _ := gin.CreateTestContext(w)
				tt.setup(c)

				got := HasRole(c, tt.role)
				if got != tt.expected {
					t.Errorf("HasRole() = %v, want %v", got, tt.expected)
				}
			})
		}
	})

	t.Run("IsAdmin", func(t *testing.T) {
		tests := []struct {
			name     string
			setup    func(*gin.Context)
			expected bool
		}{
			{
				name:     "no claims",
				setup:    func(c *gin.Context) {},
				expected: false,
			},
			{
				name: "user role",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyClaims, &Claims{
						AppMetadata: map[string]interface{}{"role": "user"},
					})
				},
				expected: false,
			},
			{
				name: "admin role",
				setup: func(c *gin.Context) {
					c.Set(ContextKeyClaims, &Claims{
						AppMetadata: map[string]interface{}{"role": "admin"},
					})
				},
				expected: true,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				w := httptest.NewRecorder()
				c, _ := gin.CreateTestContext(w)
				tt.setup(c)

				got := IsAdmin(c)
				if got != tt.expected {
					t.Errorf("IsAdmin() = %v, want %v", got, tt.expected)
				}
			})
		}
	})
}
