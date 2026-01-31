package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Note: Do not use url.JoinPath for signed URLs as it encodes query string characters

// SupabaseStorage implements Storage using Supabase Storage REST API.
type SupabaseStorage struct {
	baseURL        string
	serviceRoleKey string
	bucketName     string
	httpClient     *http.Client
}

// NewSupabaseStorage creates a new Supabase Storage client.
func NewSupabaseStorage(supabaseURL, serviceRoleKey, bucketName string) *SupabaseStorage {
	return &SupabaseStorage{
		baseURL:        fmt.Sprintf("%s/storage/v1", supabaseURL),
		serviceRoleKey: serviceRoleKey,
		bucketName:     bucketName,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Upload uploads a file to the specified path in the bucket.
func (s *SupabaseStorage) Upload(ctx context.Context, path string, reader io.Reader, contentType string, size int64) error {
	// Read all content into memory for the request
	content, err := io.ReadAll(reader)
	if err != nil {
		return fmt.Errorf("failed to read content: %w", err)
	}

	// Check context before making request
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("context cancelled before upload: %w", err)
	}

	uploadURL := fmt.Sprintf("%s/object/%s/%s", s.baseURL, s.bucketName, path)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, bytes.NewReader(content))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.serviceRoleKey))
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true") // Allow overwriting existing files

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to upload file to %s: %w", path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed for %s with status %d: %s", path, resp.StatusCode, string(body))
	}

	return nil
}

// Delete removes a file at the specified path from the bucket.
func (s *SupabaseStorage) Delete(ctx context.Context, path string) error {
	// Check context before making request
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("context cancelled before delete: %w", err)
	}

	deleteURL := fmt.Sprintf("%s/object/%s/%s", s.baseURL, s.bucketName, path)

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, deleteURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create delete request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.serviceRoleKey))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete file at %s: %w", path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete failed for %s with status %d: %s", path, resp.StatusCode, string(body))
	}

	return nil
}

// signedURLRequest is the request body for creating a signed URL.
type signedURLRequest struct {
	ExpiresIn int `json:"expiresIn"`
}

// signedURLResponse is the response from creating a signed URL.
type signedURLResponse struct {
	SignedURL string `json:"signedURL"`
}

// GetSignedURL generates a time-limited URL for accessing the file.
func (s *SupabaseStorage) GetSignedURL(ctx context.Context, path string, expiresIn time.Duration) (string, error) {
	// Check context before making request
	if err := ctx.Err(); err != nil {
		return "", fmt.Errorf("context cancelled before creating signed URL: %w", err)
	}

	// Supabase expects seconds
	expiresInSeconds := int(expiresIn.Seconds())
	if expiresInSeconds < 1 {
		expiresInSeconds = 60 // Default to 1 minute
	}

	signURL := fmt.Sprintf("%s/object/sign/%s/%s", s.baseURL, s.bucketName, path)

	reqBody := signedURLRequest{
		ExpiresIn: expiresInSeconds,
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal signed URL request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, signURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create signed URL request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.serviceRoleKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to create signed URL for %s: %w", path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("signed URL creation failed for %s with status %d: %s", path, resp.StatusCode, string(body))
	}

	var signResp signedURLResponse
	if err := json.NewDecoder(resp.Body).Decode(&signResp); err != nil {
		return "", fmt.Errorf("failed to decode signed URL response: %w", err)
	}

	// The signedURL is a relative path with query params (e.g., /object/sign/bucket/path?token=xxx)
	// We cannot use url.JoinPath as it encodes the ? in query strings
	baseURL := strings.TrimSuffix(s.baseURL, "/")
	signedURL := baseURL + signResp.SignedURL

	return signedURL, nil
}

// GetPublicURL returns the public URL for a file (if bucket is public).
func (s *SupabaseStorage) GetPublicURL(path string) string {
	return fmt.Sprintf("%s/object/public/%s/%s", s.baseURL, s.bucketName, path)
}

// BuildStoragePath constructs the storage path for a study image.
func BuildStoragePath(studyID, imageID, category, filename string) string {
	return fmt.Sprintf("%s/%s/%s_%s", studyID, category, imageID, filename)
}
