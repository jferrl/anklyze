package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// Config holds application configuration.
type Config struct {
	Port            string
	DatabaseURL     string
	AuditBufferSize int
	CORSAllowOrigin string
	GeminiAPIKey    string
	GeminiModel     string
	LogLevel        string
	LogFormat       string
	AppEnv          string // Application environment (e.g., "production", "development")
	// Rate limiting configuration
	RateLimitRate  float64 // Requests per second (e.g., 0.5 = 1 request per 2 seconds)
	RateLimitBurst int     // Maximum burst size
	// Usage limits
	SessionMessageLimit int // Maximum messages per chat session
	// Supabase Auth configuration
	SupabaseURL       string // Supabase project URL (e.g., https://xxx.supabase.co)
	SupabaseJWTSecret string // Supabase JWT secret for token validation
	// Supabase Storage configuration
	SupabaseServiceRoleKey string // Service role key for storage operations
	StudyBucketName        string // Bucket name for study images
}

// Load loads configuration from environment variables.
// Returns an error if configuration is invalid.
func Load() (*Config, error) {
	cfg := &Config{
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            os.Getenv("DATABASE_URL"),
		AuditBufferSize:        getEnvInt("AUDIT_BUFFER_SIZE", 100),
		CORSAllowOrigin:        getEnv("CORS_ALLOW_ORIGIN", "*"),
		GeminiAPIKey:           os.Getenv("GEMINI_API_KEY"),
		GeminiModel:            getEnv("GEMINI_MODEL", "gemini-3-flash-preview"),
		LogLevel:               getEnv("LOG_LEVEL", "info"),
		LogFormat:              getEnv("LOG_FORMAT", "text"),
		AppEnv:                 os.Getenv("APP_ENV"),
		RateLimitRate:          getEnvFloat("RATE_LIMIT_RATE", 0.5),    // 1 request per 2 seconds
		RateLimitBurst:         getEnvInt("RATE_LIMIT_BURST", 5),       // Allow burst of 5
		SessionMessageLimit:    getEnvInt("SESSION_MESSAGE_LIMIT", 20), // Max messages per session
		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabaseJWTSecret:      os.Getenv("SUPABASE_JWT_SECRET"),
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		StudyBucketName:        getEnv("STUDY_BUCKET_NAME", "studies"),
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks all configuration values for validity.
// Returns an error with all validation failures if any are found.
func (c *Config) Validate() error {
	var errs []string

	// Port validation
	port, err := strconv.Atoi(c.Port)
	if err != nil || port < 1 || port > 65535 {
		errs = append(errs, fmt.Sprintf("PORT must be 1-65535, got: %q", c.Port))
	}

	// Rate limiting validation
	if c.RateLimitRate <= 0 {
		errs = append(errs, fmt.Sprintf("RATE_LIMIT_RATE must be positive, got: %.4f", c.RateLimitRate))
	}
	if c.RateLimitBurst < 1 {
		errs = append(errs, fmt.Sprintf("RATE_LIMIT_BURST must be >= 1, got: %d", c.RateLimitBurst))
	}

	// Buffer size validation
	if c.AuditBufferSize < 10 {
		errs = append(errs, fmt.Sprintf("AUDIT_BUFFER_SIZE must be >= 10, got: %d", c.AuditBufferSize))
	}

	// Session limits
	if c.SessionMessageLimit < 1 {
		errs = append(errs, fmt.Sprintf("SESSION_MESSAGE_LIMIT must be >= 1, got: %d", c.SessionMessageLimit))
	}

	// URL validation (if provided)
	if c.SupabaseURL != "" {
		if _, err := url.Parse(c.SupabaseURL); err != nil {
			errs = append(errs, fmt.Sprintf("SUPABASE_URL is invalid: %v", err))
		}
	}

	// Log level validation
	validLevels := map[string]bool{"debug": true, "info": true, "warn": true, "error": true}
	if !validLevels[strings.ToLower(c.LogLevel)] {
		errs = append(errs, fmt.Sprintf("LOG_LEVEL must be debug|info|warn|error, got: %q", c.LogLevel))
	}

	// Log format validation
	if c.LogFormat != "json" && c.LogFormat != "text" {
		errs = append(errs, fmt.Sprintf("LOG_FORMAT must be json|text, got: %q", c.LogFormat))
	}

	if len(errs) > 0 {
		return fmt.Errorf("configuration validation failed:\n  - %s", strings.Join(errs, "\n  - "))
	}

	return nil
}

// HasDatabase returns true if database is configured.
func (c *Config) HasDatabase() bool {
	return c.DatabaseURL != ""
}

// HasGemini returns true if Gemini API is configured.
func (c *Config) HasGemini() bool {
	return c.GeminiAPIKey != ""
}

// HasSupabase returns true if Supabase Auth is configured.
func (c *Config) HasSupabase() bool {
	return c.SupabaseURL != ""
}

// HasSupabaseStorage returns true if Supabase Storage is configured.
func (c *Config) HasSupabaseStorage() bool {
	return c.SupabaseURL != "" && c.SupabaseServiceRoleKey != ""
}

// IsProduction returns true if the application is running in production mode.
func (c *Config) IsProduction() bool {
	return strings.ToLower(c.AppEnv) == "production"
}

// ValidateProduction checks that all required security secrets are present and valid
// for production deployments. Returns an error listing all violations if any are found.
// This must be called after Load() when IsProduction() is true.
func (c *Config) ValidateProduction() error {
	var errs []string

	if c.SupabaseURL == "" {
		errs = append(errs, "SUPABASE_URL is required in production (SEC-01: auth enforcement)")
	}

	if c.SupabaseJWTSecret == "" {
		errs = append(errs, "SUPABASE_JWT_SECRET is required in production (SEC-02)")
	} else if len(c.SupabaseJWTSecret) < 32 {
		errs = append(errs, fmt.Sprintf("SUPABASE_JWT_SECRET must be >= 32 characters in production, got %d (SEC-02)", len(c.SupabaseJWTSecret)))
	}

	if c.SupabaseServiceRoleKey == "" {
		errs = append(errs, "SUPABASE_SERVICE_ROLE_KEY is required in production (SEC-04)")
	}

	if len(errs) > 0 {
		return fmt.Errorf("production security validation failed:\n  - %s", strings.Join(errs, "\n  - "))
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		intVal, err := strconv.Atoi(value)
		if err != nil {
			// Log to stderr since slog may not be initialized yet during config load
			fmt.Fprintf(os.Stderr, "WARN: invalid integer value for %s=%q, using default %d: %v\n",
				key, value, defaultValue, err)
			return defaultValue
		}
		return intVal
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		floatVal, err := strconv.ParseFloat(value, 64)
		if err != nil {
			// Log to stderr since slog may not be initialized yet during config load
			fmt.Fprintf(os.Stderr, "WARN: invalid float value for %s=%q, using default %.2f: %v\n",
				key, value, defaultValue, err)
			return defaultValue
		}
		return floatVal
	}
	return defaultValue
}
