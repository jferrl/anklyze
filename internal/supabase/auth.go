package supabase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// AuthAdmin provides admin operations for Supabase Auth.
// Uses the Supabase Admin API to manage user metadata.
type AuthAdmin struct {
	baseURL        string
	serviceRoleKey string
	httpClient     *http.Client
}

// NewAuthAdmin creates a new Supabase Auth Admin client.
func NewAuthAdmin(supabaseURL, serviceRoleKey string) *AuthAdmin {
	return &AuthAdmin{
		baseURL:        fmt.Sprintf("%s/auth/v1", supabaseURL),
		serviceRoleKey: serviceRoleKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// updateUserRequest is the request body for updating a user.
type updateUserRequest struct {
	AppMetadata map[string]any `json:"app_metadata,omitempty"`
}

// UpdateUserRole updates the role in the user's app_metadata.
// This ensures the role is available in the JWT token.
// Note: Supabase performs a shallow merge on app_metadata, so only the "role"
// field is updated while preserving all other existing metadata fields.
func (a *AuthAdmin) UpdateUserRole(ctx context.Context, userID string, role string) error {
	LogServiceKeyUsage(OpUpdateUserRole, "user_id", userID, "role", role)
	reqBody := updateUserRequest{
		AppMetadata: map[string]any{
			"role": role,
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	updateURL := fmt.Sprintf("%s/admin/users/%s", a.baseURL, userID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, updateURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", a.serviceRoleKey))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", a.serviceRoleKey)

	slog.Debug("syncing role to Supabase", "user_id", userID, "role", role, "url", updateURL)

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			slog.Warn("failed to read error response body", "error", err)
			return fmt.Errorf("update user failed with status %d", resp.StatusCode)
		}
		return fmt.Errorf("update user failed with status %d: %s", resp.StatusCode, string(body))
	}

	slog.Info("role synced to Supabase app_metadata", "user_id", userID, "role", role)
	return nil
}
