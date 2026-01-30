package auth

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// Context keys for storing auth information.
const (
	ContextKeyUserID = "auth_user_id"
	ContextKeyClaims = "auth_claims"
	ContextKeyUser   = "auth_user"
)

// UserRepository defines the interface for user operations in auth middleware.
type UserRepository interface {
	// GetByID retrieves a user by their ID. Returns nil if not found.
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	// SyncOnLogin creates or updates a user from authentication claims.
	// Should only be called on first login (when user doesn't exist in DB).
	SyncOnLogin(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
}

// AuthMiddleware creates a Gin middleware that validates JWT tokens.
// It extracts the Bearer token from the Authorization header and validates it.
// On success, it stores the user ID and claims in the Gin context.
func AuthMiddleware(validator *Validator) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "missing authorization header",
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "invalid authorization format, expected 'Bearer <token>'",
			})
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := validator.ValidateToken(token)
		if err != nil {
			slog.Debug("JWT validation failed", "error", err, "token_prefix", token[:min(20, len(token))]+"...")

			status := http.StatusUnauthorized
			message := "invalid token"

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
			c.Abort()
			return
		}

		// Store claims and user ID in context
		c.Set(ContextKeyClaims, claims)
		c.Set(ContextKeyUserID, claims.GetUserID())

		c.Next()
	}
}

// RequireRole creates a Gin middleware that checks if the user has one of the allowed roles.
// It must be used after AuthMiddleware and UserSyncMiddleware.
// It checks the database role (via synced user) first, falling back to JWT claims.
func RequireRole(allowedRoles ...Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !IsAuthenticated(c) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "authentication required",
			})
			c.Abort()
			return
		}

		// Use GetUserRole which prioritizes database role over JWT claims
		userRole := GetUserRole(c)
		for _, role := range allowedRoles {
			if userRole == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "insufficient permissions",
		})
		c.Abort()
	}
}

// OptionalAuth creates a Gin middleware that optionally validates JWT tokens.
// If a valid token is present, it stores the claims; otherwise, it continues without error.
// This is useful for endpoints that behave differently for authenticated vs anonymous users.
func OptionalAuth(validator *Validator) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.Next()
			return
		}

		token := parts[1]
		claims, err := validator.ValidateToken(token)
		if err == nil {
			c.Set(ContextKeyClaims, claims)
			c.Set(ContextKeyUserID, claims.GetUserID())
		}

		c.Next()
	}
}

// GetUserID retrieves the user ID from the Gin context.
// Returns an empty string if not authenticated.
func GetUserID(c *gin.Context) string {
	if userID, exists := c.Get(ContextKeyUserID); exists {
		if id, ok := userID.(string); ok {
			return id
		}
	}
	return ""
}

// GetClaims retrieves the JWT claims from the Gin context.
// Returns nil if not authenticated.
func GetClaims(c *gin.Context) *Claims {
	if claims, exists := c.Get(ContextKeyClaims); exists {
		if c, ok := claims.(*Claims); ok {
			return c
		}
	}
	return nil
}

// IsAuthenticated returns true if the request is authenticated.
func IsAuthenticated(c *gin.Context) bool {
	return GetClaims(c) != nil
}

// HasRole returns true if the authenticated user has the specified role.
// It checks the database user role first, then falls back to JWT claims.
func HasRole(c *gin.Context, role Role) bool {
	return GetUserRole(c) == role
}

// IsAdmin returns true if the authenticated user has the admin role.
func IsAdmin(c *gin.Context) bool {
	return HasRole(c, RoleAdmin)
}

// UserSyncMiddleware creates a middleware that loads the authenticated user from the database.
// It must be used after AuthMiddleware. On each authenticated request, it fetches the user.
// If the user doesn't exist (first login), it creates them via SyncOnLogin.
func UserSyncMiddleware(userRepo UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			c.Next()
			return
		}

		userIDStr := claims.GetUserID()
		if userIDStr == "" {
			c.Next()
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			slog.Warn("invalid user ID in JWT", "user_id", userIDStr, "error", err)
			c.Next()
			return
		}

		// First, try to get the user from the database (read-only operation)
		user, err := userRepo.GetByID(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to get user", "user_id", userIDStr, "error", err)
			c.Next()
			return
		}

		// If user doesn't exist, this is their first login - sync them
		if user == nil {
			provider := "email"
			if claims.AppMetadata != nil {
				if p, ok := claims.AppMetadata["provider"].(string); ok && p != "" {
					provider = p
				}
			}

			user, err = userRepo.SyncOnLogin(c.Request.Context(), userID, claims.GetEmail(), provider)
			if err != nil {
				slog.Error("failed to sync user on first login", "user_id", userIDStr, "error", err)
				c.Next()
				return
			}
			slog.Info("user synced on first login", "user_id", userIDStr, "email", claims.GetEmail())
		}

		// Store the user in context (includes the actual role from DB)
		c.Set(ContextKeyUser, user)

		c.Next()
	}
}

// GetUser retrieves the synced user from the Gin context.
// Returns nil if not authenticated or user sync is disabled.
func GetUser(c *gin.Context) *domain.User {
	if user, exists := c.Get(ContextKeyUser); exists {
		if u, ok := user.(*domain.User); ok {
			return u
		}
	}
	return nil
}

// GetUserRole returns the role from the synced user, or the JWT claims as fallback.
// The database role takes precedence over the JWT role.
func GetUserRole(c *gin.Context) Role {
	// First try to get role from synced user (database)
	if user := GetUser(c); user != nil {
		return Role(user.Role)
	}
	// Fall back to JWT claims
	if claims := GetClaims(c); claims != nil {
		return claims.GetRole()
	}
	return RoleUser
}
