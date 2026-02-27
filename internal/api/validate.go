package api

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

// validate is a package-level validator singleton (thread-safe, expensive to create).
var validate = validator.New(validator.WithRequiredStructEnabled())

// validationFieldErrors converts validator.ValidationErrors into a slice of
// field-level error details suitable for API responses.
func validationFieldErrors(err error) []map[string]string {
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return []map[string]string{{"error": err.Error()}}
	}
	var out []map[string]string
	for _, fe := range validationErrors {
		out = append(out, map[string]string{
			"field": fe.Namespace(),
			"error": fmt.Sprintf("failed validation: %s", fe.Tag()),
		})
	}
	return out
}
