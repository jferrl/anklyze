package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/jferrl/anklyze/internal/domain"
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

// NoOpStorage stands in when no storage is configured. Upload and GetSignedURL
// fail with domain.ErrStorageNotConfigured instead of pretending to succeed.
type NoOpStorage struct{}

// NewNoOpStorage creates a new no-op storage instance.
func NewNoOpStorage() *NoOpStorage {
	return &NoOpStorage{}
}

// Upload always fails: accepting the file would lose it.
func (s *NoOpStorage) Upload(_ context.Context, _ string, _ io.Reader, _ string, _ int64) error {
	return domain.ErrStorageNotConfigured
}

// Delete is a no-op: nothing was ever stored.
func (s *NoOpStorage) Delete(_ context.Context, _ string) error {
	return nil
}

// GetSignedURL always fails: an empty URL would render as a broken image.
func (s *NoOpStorage) GetSignedURL(_ context.Context, _ string, _ time.Duration) (string, error) {
	return "", domain.ErrStorageNotConfigured
}

// BuildStoragePath constructs a storage path for a case image.
// Format: cases/{caseID}/{category}/{imageID}{ext}. ext must be trusted
// (derived from sniffed content), never taken from the client's filename.
func BuildStoragePath(caseID, imageID, category, ext string) string {
	return fmt.Sprintf("cases/%s/%s/%s%s", caseID, category, imageID, ext)
}
