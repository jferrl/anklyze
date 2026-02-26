package supabase

import (
	"log/slog"
	"time"
)

// ServiceKeyOperation enumerates all permitted uses of the Supabase service role key.
// Each constant includes a comment documenting the required Supabase permission.
// Any use of the service key outside this enum indicates a scope violation.
type ServiceKeyOperation string

const (
	// OpUpdateUserRole syncs a user's role to Supabase app_metadata.
	// Required permission: auth.admin (Supabase Auth admin API: PUT /auth/v1/admin/users/{id})
	OpUpdateUserRole ServiceKeyOperation = "update_user_role"

	// OpUploadImage uploads a case image to Supabase Storage.
	// Required permission: storage.objects.create (INSERT on storage.objects)
	OpUploadImage ServiceKeyOperation = "upload_image"

	// OpDeleteImage removes a case image from Supabase Storage.
	// Required permission: storage.objects.delete (DELETE on storage.objects)
	OpDeleteImage ServiceKeyOperation = "delete_image"

	// OpGetSignedURL creates a time-limited signed URL for image access.
	// Required permission: storage.objects.select (SELECT on storage.objects)
	OpGetSignedURL ServiceKeyOperation = "get_signed_url"
)

// LogServiceKeyUsage emits a structured audit log entry for a service role key operation.
// Call this at the start of every method that uses the Supabase service role key.
//
// IMPORTANT: Never pass the service role key value itself as an attr argument.
// Only pass safe resource identifiers (user IDs, storage paths, operation names).
func LogServiceKeyUsage(op ServiceKeyOperation, attrs ...any) {
	args := []any{
		"service_key_op", string(op),
		"timestamp", time.Now().UTC().Format(time.RFC3339),
	}
	args = append(args, attrs...)
	slog.Info("service key operation", args...)
}
