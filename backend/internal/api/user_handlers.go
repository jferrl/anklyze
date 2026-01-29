package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/auth"
)

// UserProfileResponse represents the user profile returned by the API.
type UserProfileResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	DisplayName string `json:"display_name,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	Provider    string `json:"provider,omitempty"`
}

// GetCurrentUser handles GET /api/me
// @Summary Get current user profile
// @Description Returns the authenticated user's profile including their role
// @Tags User
// @Produce json
// @Security BearerAuth
// @Success 200 {object} UserProfileResponse "User profile"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /api/me [get]
func GetCurrentUser(c *gin.Context) {
	// First try to get the synced user from database (has authoritative role)
	user := auth.GetUser(c)
	if user != nil {
		c.JSON(http.StatusOK, UserProfileResponse{
			ID:          user.ID.String(),
			Email:       user.Email,
			Role:        string(user.Role),
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
			Provider:    user.Provider,
		})
		return
	}

	// Fall back to JWT claims if user sync failed
	claims := auth.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "authentication required",
		})
		return
	}

	c.JSON(http.StatusOK, UserProfileResponse{
		ID:    claims.GetUserID(),
		Email: claims.GetEmail(),
		Role:  string(claims.GetRole()),
	})
}
