package supabase

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestNewAuthAdmin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		supabaseURL    string
		serviceRoleKey string
		wantBaseURL    string
	}{
		{
			name:           "creates client with correct base URL",
			supabaseURL:    "https://example.supabase.co",
			serviceRoleKey: "test-key",
			wantBaseURL:    "https://example.supabase.co/auth/v1",
		},
		{
			name:           "handles URL without trailing slash",
			supabaseURL:    "https://project.supabase.co",
			serviceRoleKey: "another-key",
			wantBaseURL:    "https://project.supabase.co/auth/v1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			admin := NewAuthAdmin(tt.supabaseURL, tt.serviceRoleKey)

			if admin == nil {
				t.Fatal("NewAuthAdmin returned nil")
			}
			if admin.baseURL != tt.wantBaseURL {
				t.Errorf("baseURL = %q, want %q", admin.baseURL, tt.wantBaseURL)
			}
			if admin.serviceRoleKey != tt.serviceRoleKey {
				t.Errorf("serviceRoleKey = %q, want %q", admin.serviceRoleKey, tt.serviceRoleKey)
			}
			if admin.httpClient == nil {
				t.Error("httpClient is nil")
			}
			if admin.httpClient.Timeout != 10*time.Second {
				t.Errorf("httpClient.Timeout = %v, want %v", admin.httpClient.Timeout, 10*time.Second)
			}
		})
	}
}

func TestAuthAdmin_UpdateUserRole(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		userID         string
		role           string
		serverResponse func(w http.ResponseWriter, r *http.Request)
		wantErr        bool
		errContains    string
	}{
		{
			name:   "successful role update",
			userID: "user-123",
			role:   "admin",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				// Verify request
				if r.Method != http.MethodPut {
					t.Errorf("Method = %s, want PUT", r.Method)
				}
				if !strings.HasSuffix(r.URL.Path, "/admin/users/user-123") {
					t.Errorf("URL path = %s, want suffix /admin/users/user-123", r.URL.Path)
				}
				if r.Header.Get("Content-Type") != "application/json" {
					t.Errorf("Content-Type = %s, want application/json", r.Header.Get("Content-Type"))
				}
				if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
					t.Error("Authorization header missing Bearer prefix")
				}
				if r.Header.Get("apikey") == "" {
					t.Error("apikey header is missing")
				}

				// Verify body
				body, _ := io.ReadAll(r.Body)
				var req updateUserRequest
				if err := json.Unmarshal(body, &req); err != nil {
					t.Errorf("Failed to parse request body: %v", err)
				}
				if req.AppMetadata["role"] != "admin" {
					t.Errorf("role in body = %v, want admin", req.AppMetadata["role"])
				}

				w.WriteHeader(http.StatusOK)
				_, _ = w.Write([]byte(`{"id":"user-123"}`))
			},
			wantErr: false,
		},
		{
			name:   "server returns 404",
			userID: "nonexistent-user",
			role:   "user",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusNotFound)
				_, _ = w.Write([]byte(`{"error":"User not found"}`))
			},
			wantErr:     true,
			errContains: "404",
		},
		{
			name:   "server returns 401 unauthorized",
			userID: "user-456",
			role:   "admin",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"Invalid token"}`))
			},
			wantErr:     true,
			errContains: "401",
		},
		{
			name:   "server returns 500 internal error",
			userID: "user-789",
			role:   "user",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
				_, _ = w.Write([]byte(`{"error":"Internal server error"}`))
			},
			wantErr:     true,
			errContains: "500",
		},
		{
			name:   "error response body included in error",
			userID: "user-error",
			role:   "user",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"message":"Invalid role value"}`))
			},
			wantErr:     true,
			errContains: "Invalid role value",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Create test server
			server := httptest.NewServer(http.HandlerFunc(tt.serverResponse))
			defer server.Close()

			// Create client pointing to test server
			admin := &AuthAdmin{
				baseURL:        server.URL,
				serviceRoleKey: "test-service-key",
				httpClient:     server.Client(),
			}

			err := admin.UpdateUserRole(context.Background(), tt.userID, tt.role)

			if (err != nil) != tt.wantErr {
				t.Errorf("UpdateUserRole() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && tt.errContains != "" {
				if err == nil || !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("error = %v, want error containing %q", err, tt.errContains)
				}
			}
		})
	}
}

func TestAuthAdmin_UpdateUserRole_ContextCancellation(t *testing.T) {
	t.Parallel()

	// Create a server that delays response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	admin := &AuthAdmin{
		baseURL:        server.URL,
		serviceRoleKey: "test-key",
		httpClient:     server.Client(),
	}

	// Create a context that's already cancelled
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := admin.UpdateUserRole(ctx, "user-123", "admin")

	if err == nil {
		t.Error("Expected error for cancelled context, got nil")
	}
}

func TestAuthAdmin_UpdateUserRole_NetworkError(t *testing.T) {
	t.Parallel()

	// Create client pointing to invalid URL
	admin := &AuthAdmin{
		baseURL:        "http://localhost:1", // Invalid port
		serviceRoleKey: "test-key",
		httpClient: &http.Client{
			Timeout: 100 * time.Millisecond,
		},
	}

	err := admin.UpdateUserRole(context.Background(), "user-123", "admin")

	if err == nil {
		t.Error("Expected error for network failure, got nil")
	}
}

func TestUpdateUserRequest_JSONMarshaling(t *testing.T) {
	t.Parallel()

	req := updateUserRequest{
		AppMetadata: map[string]any{
			"role": "admin",
		},
	}

	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	var result map[string]any
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	appMetadata, ok := result["app_metadata"].(map[string]any)
	if !ok {
		t.Fatal("app_metadata not found or wrong type")
	}

	if appMetadata["role"] != "admin" {
		t.Errorf("role = %v, want admin", appMetadata["role"])
	}
}
