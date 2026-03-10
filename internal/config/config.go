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
	LogLevel        string
	LogFormat       string
	AppEnv          string // Application environment (e.g., "production", "development")
	// Supabase Auth configuration
	SupabaseURL string // Supabase project URL (e.g., https://xxx.supabase.co)
	// Supabase Storage configuration
	SupabaseServiceRoleKey string // Service role key for storage operations
	StudyBucketName        string // Bucket name for study images
	// S3-compatible storage configuration (e.g., RustFS, MinIO)
	S3Endpoint  string // S3 endpoint (host:port, e.g., "rustfs.example.com:9000")
	S3AccessKey string // S3 access key
	S3SecretKey string // S3 secret key
	S3Bucket    string // S3 bucket name (default: "studies")
	S3UseSSL    bool   // Whether to use SSL for S3 connections
}

// Load loads configuration from environment variables.
// Returns an error if configuration is invalid.
func Load() (*Config, error) {
	cfg := &Config{
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            os.Getenv("DATABASE_URL"),
		AuditBufferSize:        getEnvInt("AUDIT_BUFFER_SIZE", 100),
		CORSAllowOrigin:        getEnv("CORS_ALLOW_ORIGIN", "*"),
		LogLevel:               getEnv("LOG_LEVEL", "info"),
		LogFormat:              getEnv("LOG_FORMAT", "text"),
		AppEnv:                 os.Getenv("APP_ENV"),
		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		StudyBucketName:        getEnv("STUDY_BUCKET_NAME", "studies"),
		S3Endpoint:             os.Getenv("S3_ENDPOINT"),
		S3AccessKey:            os.Getenv("S3_ACCESS_KEY"),
		S3SecretKey:            os.Getenv("S3_SECRET_KEY"),
		S3Bucket:               getEnv("S3_BUCKET", "studies"),
		S3UseSSL:               getEnv("S3_USE_SSL", "true") == "true",
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

	// Buffer size validation
	if c.AuditBufferSize < 10 {
		errs = append(errs, fmt.Sprintf("AUDIT_BUFFER_SIZE must be >= 10, got: %d", c.AuditBufferSize))
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

// HasSupabase returns true if Supabase Auth is configured.
func (c *Config) HasSupabase() bool {
	return c.SupabaseURL != ""
}

// HasSupabaseStorage returns true if Supabase Storage is configured.
func (c *Config) HasSupabaseStorage() bool {
	return c.SupabaseURL != "" && c.SupabaseServiceRoleKey != ""
}

// HasS3Storage returns true if S3-compatible storage is configured.
func (c *Config) HasS3Storage() bool {
	return c.S3Endpoint != "" && c.S3AccessKey != "" && c.S3SecretKey != ""
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
