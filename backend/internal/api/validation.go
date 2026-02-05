package api

// Input validation limits.
// These constants define the maximum allowed sizes for various input fields
// to prevent DoS attacks and ensure data integrity.
const (
	// Text field limits
	MaxTitleLength       = 255
	MaxDescriptionLength = 10000 // 10KB
	MaxNotesLength       = 5000  // 5KB

	// File upload limits
	MaxImageSize     = 10 * 1024 * 1024 // 10MB
	MaxImagesPerCase = 20

	// Request limits
	MaxPageSize     = 100
	DefaultPageSize = 20
)
