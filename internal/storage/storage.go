package storage

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"time"
)

// Storage defines the interface for file storage operations.
type Storage interface {
	// Upload uploads a file to the specified path.
	Upload(ctx context.Context, path string, reader io.Reader, contentType string, size int64) error

	// Delete removes a file at the specified path.
	Delete(ctx context.Context, path string) error

	// GetSignedURL generates a time-limited URL for accessing the file.
	GetSignedURL(ctx context.Context, path string, expiresIn time.Duration) (string, error)
}

// NoOpStorage is a no-op implementation for when storage is not configured.
type NoOpStorage struct{}

// NewNoOpStorage creates a new no-op storage instance.
func NewNoOpStorage() *NoOpStorage {
	return &NoOpStorage{}
}

// Upload is a no-op.
func (s *NoOpStorage) Upload(_ context.Context, _ string, _ io.Reader, _ string, _ int64) error {
	return nil
}

// Delete is a no-op.
func (s *NoOpStorage) Delete(_ context.Context, _ string) error {
	return nil
}

// GetSignedURL returns an empty URL.
func (s *NoOpStorage) GetSignedURL(_ context.Context, _ string, _ time.Duration) (string, error) {
	return "", nil
}

// BuildStoragePath constructs a storage path for a case image.
// Format: cases/{caseID}/{category}/{imageID}{ext}
func BuildStoragePath(caseID, imageID, category, filename string) string {
	ext := filepath.Ext(filename)
	return fmt.Sprintf("cases/%s/%s/%s%s", caseID, category, imageID, ext)
}
