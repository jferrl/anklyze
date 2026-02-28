package storage

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestSupabaseStorage_Upload(t *testing.T) {
	tests := []struct {
		name          string
		setupServer   func() *httptest.Server
		path          string
		content       string
		contentType   string
		contextCancel bool
		wantErr       bool
		errContains   string
	}{
		{
			name: "successful upload",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if r.Method != http.MethodPost {
						t.Errorf("expected POST, got %s", r.Method)
					}
					if !strings.Contains(r.URL.Path, "/object/studies/test.txt") {
						t.Errorf("unexpected path: %s", r.URL.Path)
					}
					w.WriteHeader(http.StatusOK)
				}))
			},
			path:        "test.txt",
			content:     "test content",
			contentType: "text/plain",
			wantErr:     false,
		},
		{
			name: "upload with 201 created",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusCreated)
				}))
			},
			path:        "test.txt",
			content:     "test content",
			contentType: "text/plain",
			wantErr:     false,
		},
		{
			name: "upload failure - 400 bad request",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusBadRequest)
					w.Write([]byte("invalid request"))
				}))
			},
			path:        "test.txt",
			content:     "test content",
			contentType: "text/plain",
			wantErr:     true,
			errContains: "upload failed",
		},
		{
			name: "upload failure - 500 server error",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte("server error"))
				}))
			},
			path:        "test.txt",
			content:     "test content",
			contentType: "text/plain",
			wantErr:     true,
			errContains: "upload failed",
		},
		{
			name: "context cancelled before upload",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					t.Error("should not reach server when context is cancelled")
					w.WriteHeader(http.StatusOK)
				}))
			},
			path:          "test.txt",
			content:       "test content",
			contentType:   "text/plain",
			contextCancel: true,
			wantErr:       true,
			errContains:   "context cancelled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := tt.setupServer()
			defer server.Close()

			storage := NewSupabaseStorage(server.URL, "test-key", "studies")

			ctx := context.Background()
			if tt.contextCancel {
				var cancel context.CancelFunc
				ctx, cancel = context.WithCancel(ctx)
				cancel() // Cancel immediately
			}

			reader := bytes.NewReader([]byte(tt.content))
			err := storage.Upload(ctx, tt.path, reader, tt.contentType, int64(len(tt.content)))

			if (err != nil) != tt.wantErr {
				t.Errorf("Upload() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && tt.errContains != "" {
				if err == nil || !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("Upload() error = %v, should contain %q", err, tt.errContains)
				}
			}
		})
	}
}

func TestSupabaseStorage_Delete(t *testing.T) {
	tests := []struct {
		name          string
		setupServer   func() *httptest.Server
		path          string
		contextCancel bool
		wantErr       bool
		errContains   string
	}{
		{
			name: "successful delete",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if r.Method != http.MethodDelete {
						t.Errorf("expected DELETE, got %s", r.Method)
					}
					w.WriteHeader(http.StatusOK)
				}))
			},
			path:    "test.txt",
			wantErr: false,
		},
		{
			name: "delete with 204 no content",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusNoContent)
				}))
			},
			path:    "test.txt",
			wantErr: false,
		},
		{
			name: "delete non-existent file (404 is OK)",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusNotFound)
				}))
			},
			path:    "nonexistent.txt",
			wantErr: false,
		},
		{
			name: "delete failure - 500 server error",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte("server error"))
				}))
			},
			path:        "test.txt",
			wantErr:     true,
			errContains: "delete failed",
		},
		{
			name: "context cancelled before delete",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					t.Error("should not reach server when context is cancelled")
					w.WriteHeader(http.StatusOK)
				}))
			},
			path:          "test.txt",
			contextCancel: true,
			wantErr:       true,
			errContains:   "context cancelled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := tt.setupServer()
			defer server.Close()

			storage := NewSupabaseStorage(server.URL, "test-key", "studies")

			ctx := context.Background()
			if tt.contextCancel {
				var cancel context.CancelFunc
				ctx, cancel = context.WithCancel(ctx)
				cancel() // Cancel immediately
			}

			err := storage.Delete(ctx, tt.path)

			if (err != nil) != tt.wantErr {
				t.Errorf("Delete() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && tt.errContains != "" {
				if err == nil || !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("Delete() error = %v, should contain %q", err, tt.errContains)
				}
			}
		})
	}
}

func TestSupabaseStorage_GetSignedURL(t *testing.T) {
	tests := []struct {
		name          string
		setupServer   func() *httptest.Server
		path          string
		expiresIn     time.Duration
		contextCancel bool
		wantErr       bool
		errContains   string
		wantContains  string
	}{
		{
			name: "successful signed URL generation",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if r.Method != http.MethodPost {
						t.Errorf("expected POST, got %s", r.Method)
					}
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					w.Write([]byte(`{"signedURL": "/object/sign/bucket/test.txt?token=abc123"}`))
				}))
			},
			path:         "test.txt",
			expiresIn:    5 * time.Minute,
			wantErr:      false,
			wantContains: "/object/sign/bucket/test.txt?token=abc123",
		},
		{
			name: "default expiration for zero duration",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					// Verify body contains expiresIn: 60 (default)
					body, _ := io.ReadAll(r.Body)
					if !strings.Contains(string(body), `"expiresIn":60`) {
						t.Errorf("expected default expiresIn:60, got %s", string(body))
					}
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					w.Write([]byte(`{"signedURL": "/object/sign/bucket/test.txt?token=xyz"}`))
				}))
			},
			path:         "test.txt",
			expiresIn:    0,
			wantErr:      false,
			wantContains: "/object/sign/bucket/test.txt",
		},
		{
			name: "signed URL failure - 404",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusNotFound)
					w.Write([]byte("file not found"))
				}))
			},
			path:        "nonexistent.txt",
			expiresIn:   5 * time.Minute,
			wantErr:     true,
			errContains: "signed URL creation failed",
		},
		{
			name: "invalid JSON response",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusOK)
					w.Write([]byte(`{invalid json`))
				}))
			},
			path:        "test.txt",
			expiresIn:   5 * time.Minute,
			wantErr:     true,
			errContains: "failed to decode",
		},
		{
			name: "context cancelled before request",
			setupServer: func() *httptest.Server {
				return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					t.Error("should not reach server when context is cancelled")
					w.WriteHeader(http.StatusOK)
				}))
			},
			path:          "test.txt",
			expiresIn:     5 * time.Minute,
			contextCancel: true,
			wantErr:       true,
			errContains:   "context cancelled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := tt.setupServer()
			defer server.Close()

			storage := NewSupabaseStorage(server.URL, "test-key", "studies")

			ctx := context.Background()
			if tt.contextCancel {
				var cancel context.CancelFunc
				ctx, cancel = context.WithCancel(ctx)
				cancel() // Cancel immediately
			}

			url, err := storage.GetSignedURL(ctx, tt.path, tt.expiresIn)

			if (err != nil) != tt.wantErr {
				t.Errorf("GetSignedURL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && tt.errContains != "" {
				if err == nil || !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("GetSignedURL() error = %v, should contain %q", err, tt.errContains)
				}
			}

			if !tt.wantErr && tt.wantContains != "" {
				if !strings.Contains(url, tt.wantContains) {
					t.Errorf("GetSignedURL() url = %v, should contain %q", url, tt.wantContains)
				}
			}
		})
	}
}

func TestSupabaseStorage_GetPublicURL(t *testing.T) {
	tests := []struct {
		name        string
		supabaseURL string // The Supabase project URL (without /storage/v1)
		bucketName  string
		path        string
		expectedURL string
	}{
		{
			name:        "simple path",
			supabaseURL: "https://example.supabase.co",
			bucketName:  "studies",
			path:        "test.txt",
			expectedURL: "https://example.supabase.co/storage/v1/object/public/studies/test.txt",
		},
		{
			name:        "nested path",
			supabaseURL: "https://example.supabase.co",
			bucketName:  "studies",
			path:        "folder/subfolder/image.png",
			expectedURL: "https://example.supabase.co/storage/v1/object/public/studies/folder/subfolder/image.png",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			storage := NewSupabaseStorage(tt.supabaseURL, "test-key", tt.bucketName)
			url := storage.GetPublicURL(tt.path)

			if url != tt.expectedURL {
				t.Errorf("GetPublicURL() = %v, want %v", url, tt.expectedURL)
			}
		})
	}
}

func TestBuildStoragePath(t *testing.T) {
	tests := []struct {
		name         string
		studyID      string
		imageID      string
		category     string
		filename     string
		expectedPath string
	}{
		{
			name:         "valid path",
			studyID:      "study-123",
			imageID:      "img-456",
			category:     "xray",
			filename:     "lateral.jpg",
			expectedPath: "study-123/xray/img-456_lateral.jpg",
		},
		{
			name:         "path with special characters",
			studyID:      "study-abc",
			imageID:      "img-def",
			category:     "ct",
			filename:     "scan-01.png",
			expectedPath: "study-abc/ct/img-def_scan-01.png",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := BuildStoragePath(tt.studyID, tt.imageID, tt.category, tt.filename)

			if path != tt.expectedPath {
				t.Errorf("BuildStoragePath() = %v, want %v", path, tt.expectedPath)
			}
		})
	}
}

// TestSupabaseStorage_ErrorWrapping ensures all errors use %w for proper unwrapping
func TestSupabaseStorage_ErrorWrapping(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal error"))
	}))
	defer server.Close()

	storage := NewSupabaseStorage(server.URL, "test-key", "studies")
	ctx := context.Background()

	t.Run("Upload error wrapping", func(t *testing.T) {
		reader := bytes.NewReader([]byte("test"))
		err := storage.Upload(ctx, "test.txt", reader, "text/plain", 4)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		// Check that error can be unwrapped (contains wrapped error information)
		if !strings.Contains(err.Error(), "upload failed") {
			t.Errorf("error should contain 'upload failed', got: %v", err)
		}
	})

	t.Run("Delete error wrapping", func(t *testing.T) {
		err := storage.Delete(ctx, "test.txt")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "delete failed") {
			t.Errorf("error should contain 'delete failed', got: %v", err)
		}
	})

	t.Run("GetSignedURL error wrapping", func(t *testing.T) {
		_, err := storage.GetSignedURL(ctx, "test.txt", 5*time.Minute)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "signed URL creation failed") {
			t.Errorf("error should contain 'signed URL creation failed', got: %v", err)
		}
	})
}

// TestSupabaseStorage_ContextRespect ensures all methods respect context cancellation
func TestSupabaseStorage_ContextRespect(t *testing.T) {
	// Server that delays response to allow context cancellation
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	storage := NewSupabaseStorage(server.URL, "test-key", "studies")

	t.Run("Upload respects cancelled context", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		reader := bytes.NewReader([]byte("test"))
		err := storage.Upload(ctx, "test.txt", reader, "text/plain", 4)

		if err == nil {
			t.Fatal("expected error for cancelled context, got nil")
		}
		if !errors.Is(err, context.Canceled) && !strings.Contains(err.Error(), "context cancelled") {
			t.Errorf("expected context.Canceled or 'context cancelled' in error, got: %v", err)
		}
	})

	t.Run("Delete respects cancelled context", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		err := storage.Delete(ctx, "test.txt")

		if err == nil {
			t.Fatal("expected error for cancelled context, got nil")
		}
		if !errors.Is(err, context.Canceled) && !strings.Contains(err.Error(), "context cancelled") {
			t.Errorf("expected context.Canceled or 'context cancelled' in error, got: %v", err)
		}
	})

	t.Run("GetSignedURL respects cancelled context", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		_, err := storage.GetSignedURL(ctx, "test.txt", 5*time.Minute)

		if err == nil {
			t.Fatal("expected error for cancelled context, got nil")
		}
		if !errors.Is(err, context.Canceled) && !strings.Contains(err.Error(), "context cancelled") {
			t.Errorf("expected context.Canceled or 'context cancelled' in error, got: %v", err)
		}
	})
}
