package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// UserProfileResponse represents the user profile returned by the API.
type UserProfileResponse struct {
	ID              string `json:"id"`
	Email           string `json:"email"`
	Role            string `json:"role"`
	DisplayName     string `json:"display_name,omitempty"`
	AvatarURL       string `json:"avatar_url,omitempty"`
	Provider        string `json:"provider,omitempty"`
	YearsExperience *int   `json:"years_experience,omitempty"`
	Specialty       string `json:"specialty,omitempty"`
	TrainingLevel   string `json:"training_level,omitempty"`
	Institution     string `json:"institution,omitempty"`
}

// UpdateUserProfileRequest is the request body for updating user profile.
type UpdateUserProfileRequest struct {
	DisplayName     *string `json:"display_name,omitempty"`
	YearsExperience *int    `json:"years_experience,omitempty" binding:"omitempty,min=0,max=70"`
	Specialty       *string `json:"specialty,omitempty"`
	TrainingLevel   *string `json:"training_level,omitempty"`
	Institution     *string `json:"institution,omitempty" binding:"omitempty,max=255"`
}

// UserHandler handles user-related HTTP requests.
type UserHandler struct {
	userRepo repository.UserRepository
}

// NewUserHandler creates a new user handler.
func NewUserHandler(userRepo repository.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

// GetCurrentUser handles GET /api/me
func GetCurrentUser(c *gin.Context) {
	// First try to get the synced user from database (has authoritative role)
	user := auth.GetUser(c)
	if user != nil {
		specialty := ""
		if user.Specialty != nil {
			specialty = *user.Specialty
		}
		trainingLevel := ""
		if user.TrainingLevel != nil {
			trainingLevel = *user.TrainingLevel
		}
		institution := ""
		if user.Institution != nil {
			institution = *user.Institution
		}

		c.JSON(http.StatusOK, UserProfileResponse{
			ID:              user.ID.String(),
			Email:           user.Email,
			Role:            string(user.Role),
			DisplayName:     user.DisplayName,
			AvatarURL:       user.AvatarURL,
			Provider:        user.Provider,
			YearsExperience: user.YearsExperience,
			Specialty:       specialty,
			TrainingLevel:   trainingLevel,
			Institution:     institution,
		})
		return
	}

	// Fall back to JWT claims if user sync failed
	claims := auth.GetClaims(c)
	if claims == nil {
		unauthorized(c)
		return
	}

	c.JSON(http.StatusOK, UserProfileResponse{
		ID:    claims.GetUserID(),
		Email: claims.GetEmail(),
		Role:  string(claims.GetRole()),
	})
}

// GetUserProfile handles GET /api/me/profile
// Returns the user's full profile including expertise fields.
func (h *UserHandler) GetUserProfile(c *gin.Context) {
	user := auth.GetUser(c)
	if user == nil {
		unauthorized(c)
		return
	}

	specialty := ""
	if user.Specialty != nil {
		specialty = *user.Specialty
	}
	trainingLevel := ""
	if user.TrainingLevel != nil {
		trainingLevel = *user.TrainingLevel
	}
	institution := ""
	if user.Institution != nil {
		institution = *user.Institution
	}

	c.JSON(http.StatusOK, UserProfileResponse{
		ID:              user.ID.String(),
		Email:           user.Email,
		Role:            string(user.Role),
		DisplayName:     user.DisplayName,
		AvatarURL:       user.AvatarURL,
		Provider:        user.Provider,
		YearsExperience: user.YearsExperience,
		Specialty:       specialty,
		TrainingLevel:   trainingLevel,
		Institution:     institution,
	})
}

// UpdateUserProfile handles PUT /api/me/profile
// Updates the user's expertise profile fields.
func (h *UserHandler) UpdateUserProfile(c *gin.Context) {
	userID, err := auth.ParseUserID(c)
	if err != nil {
		unauthorized(c)
		return
	}

	var req UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "invalid request", err)
		return
	}

	// Validate specialty if provided
	if req.Specialty != nil && *req.Specialty != "" {
		if !domain.IsValidSpecialty(*req.Specialty) {
			validValues(c, "invalid specialty", domain.ValidSpecialties())
			return
		}
	}

	// Validate training level if provided
	if req.TrainingLevel != nil && *req.TrainingLevel != "" {
		if !domain.IsValidTrainingLevel(*req.TrainingLevel) {
			validValues(c, "invalid training level", domain.ValidTrainingLevels())
			return
		}
	}

	// Build profile update
	profile := domain.UserProfileUpdate{
		DisplayName:     req.DisplayName,
		YearsExperience: req.YearsExperience,
		Specialty:       req.Specialty,
		TrainingLevel:   req.TrainingLevel,
		Institution:     req.Institution,
	}

	if err := h.userRepo.UpdateProfile(c.Request.Context(), userID, profile); err != nil {
		HandleError(c, err, "failed to update profile")
		return
	}

	// Return updated user
	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusOK, gin.H{"message": "profile updated successfully"})
		return
	}

	specialty := ""
	if user.Specialty != nil {
		specialty = *user.Specialty
	}
	trainingLevel := ""
	if user.TrainingLevel != nil {
		trainingLevel = *user.TrainingLevel
	}
	institution := ""
	if user.Institution != nil {
		institution = *user.Institution
	}

	c.JSON(http.StatusOK, UserProfileResponse{
		ID:              user.ID.String(),
		Email:           user.Email,
		Role:            string(user.Role),
		DisplayName:     user.DisplayName,
		AvatarURL:       user.AvatarURL,
		Provider:        user.Provider,
		YearsExperience: user.YearsExperience,
		Specialty:       specialty,
		TrainingLevel:   trainingLevel,
		Institution:     institution,
	})
}

// validValues answers a value outside a closed set, listing the accepted ones.
func validValues[T ~string](c *gin.Context, message string, valid []T) {
	values := make([]string, len(valid))
	for i, v := range valid {
		values[i] = string(v)
	}
	c.JSON(http.StatusBadRequest, ErrorResponse{Code: CodeInvalidInput, Message: message, ValidValues: values})
}
