package auth

import (
	"log/slog"
	"sync/atomic"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// DevUserID is the identity every request gets in dev mode.
var DevUserID = uuid.MustParse("00000000-0000-0000-0000-00000000de01")

// DevUserEmail is the mock dev user's email.
const DevUserEmail = "dev@localhost"

// DevMiddleware stands in for Middleware and UserSyncMiddleware when auth is
// disabled (empty SUPABASE_URL), so handlers see the same mock admin on every
// route. Wire it only when the validator is nil; anything but APP_ENV=development
// refuses to start without SUPABASE_URL (config.ValidateProduction).
func DevMiddleware(userSvc UserService) gin.HandlerFunc {
	user := &domain.User{ID: DevUserID, Email: DevUserEmail, Role: domain.UserRoleAdmin, Provider: "dev"}
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{Subject: DevUserID.String()},
		Email:            DevUserEmail,
		Role:             string(RoleAdmin),
	}
	var synced atomic.Bool

	return func(c *gin.Context) {
		// Cases, studies and responses reference users(id), so the row must exist.
		if userSvc != nil && !synced.Load() {
			if _, err := userSvc.SyncOnLogin(c.Request.Context(), DevUserID, DevUserEmail, user.Provider); err != nil {
				slog.Warn("failed to create the dev user row", "error", err)
			} else {
				synced.Store(true)
			}
		}
		c.Set(ContextKeyClaims, claims)
		c.Set(ContextKeyUserID, DevUserID.String())
		c.Set(ContextKeyUser, user)
		c.Next()
	}
}
