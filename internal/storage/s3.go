package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// S3Storage implements Storage using an S3-compatible API (e.g., RustFS, MinIO).
type S3Storage struct {
	client     *minio.Client
	bucketName string
}

// NewS3Storage creates a new S3-compatible storage client.
// endpoint should be host:port without scheme (e.g., "rustfs.example.com:9000").
func NewS3Storage(endpoint, accessKey, secretKey, bucketName string, useSSL bool) (*S3Storage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create S3 client: %w", err)
	}

	return &S3Storage{
		client:     client,
		bucketName: bucketName,
	}, nil
}

// Upload uploads a file to the specified path in the bucket.
func (s *S3Storage) Upload(ctx context.Context, path string, reader io.Reader, contentType string, size int64) error {
	opts := minio.PutObjectOptions{
		ContentType: contentType,
	}

	_, err := s.client.PutObject(ctx, s.bucketName, path, reader, size, opts)
	if err != nil {
		return fmt.Errorf("failed to upload file to %s: %w", path, err)
	}

	return nil
}

// Delete removes a file at the specified path from the bucket.
func (s *S3Storage) Delete(ctx context.Context, path string) error {
	err := s.client.RemoveObject(ctx, s.bucketName, path, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete file at %s: %w", path, err)
	}

	return nil
}

// GetSignedURL generates a time-limited URL for accessing the file.
func (s *S3Storage) GetSignedURL(ctx context.Context, path string, expiresIn time.Duration) (string, error) {
	if expiresIn < time.Second {
		expiresIn = time.Minute // Default to 1 minute
	}

	reqParams := make(url.Values)
	presignedURL, err := s.client.PresignedGetObject(ctx, s.bucketName, path, expiresIn, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to create signed URL for %s: %w", path, err)
	}

	return presignedURL.String(), nil
}
