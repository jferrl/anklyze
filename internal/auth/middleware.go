package auth

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

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

// UserService defines the interface for user operations in auth middleware.
type UserService interface {
	// GetByID retrieves a user by their ID. Returns nil if not found.
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	// SyncOnLogin creates or updates a user from authentication claims.
	// Also syncs the role to external services (e.g., Supabase app_metadata).
	SyncOnLogin(ctx context.Context, userID uuid.UUID, email, provider string) (*domain.User, error)
	// SyncRoleToSupabase syncs the user's role to Supabase app_metadata.
	SyncRoleToSupabase(ctx context.Context, userID uuid.UUID, role domain.UserRole)
}

// Middleware creates a Gin middleware that validates JWT tokens.
// It extracts the Bearer token from the Authorization header and validates it.
// On success, it stores the user ID and claims in the Gin context.
func Middleware(validator *Validator) gin.HandlerFunc {
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
			// Log token prefix for debugging (truncate if too long)
			tokenPrefix := token
			if len(token) > 20 {
				tokenPrefix = token[:20] + "..."
			}
			slog.Debug("JWT validation failed", "error", err, "token_prefix", tokenPrefix)

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
			return
		}

		// Store claims and user ID in context
		c.Set(ContextKeyClaims, claims)
		c.Set(ContextKeyUserID, claims.GetUserID())

		c.Next()
	}
}

// RequireRole creates a Gin middleware that checks if the user has one of the allowed roles.
// It must be used after Middleware and UserSyncMiddleware, and checks the database role only.
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

const (
	roleSyncTTL = 10 * time.Minute
	roleSyncMax = 10_000
)

// roleSyncCache remembers which role was last pushed to Supabase per user, so a
// stale token (role still "authenticated") doesn't trigger a push per request.
type roleSyncCache struct {
	mu sync.Mutex
	m  map[uuid.UUID]roleSyncEntry
}

type roleSyncEntry struct {
	role domain.UserRole
	at   time.Time
}

var roleSyncs = &roleSyncCache{m: make(map[uuid.UUID]roleSyncEntry)}

// shouldSync reports whether role needs pushing and records it if so. The TTL
// retries a push that failed (the sync is fire-and-forget).
func (c *roleSyncCache) shouldSync(id uuid.UUID, role domain.UserRole, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e, ok := c.m[id]; ok && e.role == role && now.Sub(e.at) < roleSyncTTL {
		return false
	}
	if len(c.m) >= roleSyncMax {
		for k, e := range c.m {
			if now.Sub(e.at) >= roleSyncTTL {
				delete(c.m, k)
			}
		}
		if len(c.m) >= roleSyncMax {
			clear(c.m) // shortcut: drops live entries too; worst case is a few extra syncs
		}
	}
	c.m[id] = roleSyncEntry{role: role, at: now}
	return true
}

// UserSyncMiddleware creates a middleware that loads the authenticated user from the database.
// It must be used after Middleware. On each authenticated request it fetches the user, so
// role changes made directly in the database take effect immediately.
// If the user doesn't exist (first login), it creates them via SyncOnLogin.
// The role push to Supabase runs at most once per role per TTL. The cache is process-wide
// because routes.go builds this middleware once per route group.
func UserSyncMiddleware(userSvc UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			c.Next()
			return
		}

		userID, err := uuid.Parse(claims.GetUserID())
		if err != nil {
			slog.Warn("invalid user ID in JWT", "error", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "invalid token"})
			return
		}
		userIDStr := userID.String()

		// Fail closed: without the DB row we cannot know the user's real role.
		user, err := userSvc.GetByID(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to get user", "user_id", userIDStr, "error", err)
			abortUserUnavailable(c)
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

			user, err = userSvc.SyncOnLogin(c.Request.Context(), userID, claims.GetEmail(), provider)
			if err != nil {
				slog.Error("failed to sync user on first login", "user_id", userIDStr, "error", err)
				abortUserUnavailable(c)
				return
			}
			slog.Info("user synced on first login", "user_id", userIDStr)
		} else {
			// For existing users, sync role to Supabase if it differs from JWT.
			// Fire-and-forget: use a detached context so the request isn't blocked.
			jwtRole := claims.GetRole()
			if string(user.Role) != string(jwtRole) && roleSyncs.shouldSync(userID, user.Role, time.Now()) {
				go userSvc.SyncRoleToSupabase(context.WithoutCancel(c.Request.Context()), userID, user.Role)
			}
		}

		// Store the user in context (includes the actual role from DB)
		c.Set(ContextKeyUser, user)

		c.Next()
	}
}

func abortUserUnavailable(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
		"code":    "USER_UNAVAILABLE",
		"message": "could not load user, try again",
	})
}

// ParseUserID extracts and parses the authenticated user's ID from the Gin context.
// Returns an error if the user ID is missing, not a string, or not a valid UUID.
func ParseUserID(c *gin.Context) (uuid.UUID, error) {
	val, exists := c.Get(ContextKeyUserID)
	if !exists {
		return uuid.Nil, errors.New("missing user ID in context")
	}
	str, ok := val.(string)
	if !ok {
		return uuid.Nil, errors.New("user ID is not a string")
	}
	return uuid.Parse(str)
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

// GetUserRole returns the synced user's database role, or "" when no user is
// loaded. Token role claims are never trusted for authorization.
func GetUserRole(c *gin.Context) Role {
	if user := GetUser(c); user != nil {
		return Role(user.Role)
	}
	return ""
}
