package config

import (
	"os"
	"testing"
)

func TestGetEnv(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue string
		envValue     string
		want         string
	}{
		{
			name:         "env var set",
			key:          "TEST_VAR",
			defaultValue: "default",
			envValue:     "custom",
			want:         "custom",
		},
		{
			name:         "env var not set - use default",
			key:          "UNSET_VAR",
			defaultValue: "default",
			envValue:     "",
			want:         "default",
		},
		{
			name:         "env var empty string - use default",
			key:          "EMPTY_VAR",
			defaultValue: "default",
			envValue:     "",
			want:         "default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			}

			// Execute
			got := getEnv(tt.key, tt.defaultValue)

			// Assert
			if got != tt.want {
				t.Errorf("getEnv() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetEnvInt(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue int
		envValue     string
		want         int
		wantWarning  bool
	}{
		{
			name:         "valid integer",
			key:          "TEST_INT",
			defaultValue: 100,
			envValue:     "42",
			want:         42,
			wantWarning:  false,
		},
		{
			name:         "negative integer",
			key:          "TEST_NEG_INT",
			defaultValue: 100,
			envValue:     "-50",
			want:         -50,
			wantWarning:  false,
		},
		{
			name:         "zero value",
			key:          "TEST_ZERO",
			defaultValue: 100,
			envValue:     "0",
			want:         0,
			wantWarning:  false,
		},
		{
			name:         "invalid integer - use default",
			key:          "TEST_INVALID_INT",
			defaultValue: 100,
			envValue:     "not-a-number",
			want:         100,
			wantWarning:  true,
		},
		{
			name:         "float value - use default",
			key:          "TEST_FLOAT_AS_INT",
			defaultValue: 100,
			envValue:     "3.14",
			want:         100,
			wantWarning:  true,
		},
		{
			name:         "empty string - use default",
			key:          "TEST_EMPTY_INT",
			defaultValue: 100,
			envValue:     "",
			want:         100,
			wantWarning:  false,
		},
		{
			name:         "overflow value - use default",
			key:          "TEST_OVERFLOW",
			defaultValue: 100,
			envValue:     "999999999999999999999999999999",
			want:         100,
			wantWarning:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			} else {
				os.Unsetenv(tt.key)
			}

			// Execute
			got := getEnvInt(tt.key, tt.defaultValue)

			// Assert
			if got != tt.want {
				t.Errorf("getEnvInt() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetEnvFloat(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue float64
		envValue     string
		want         float64
		wantWarning  bool
	}{
		{
			name:         "valid float",
			key:          "TEST_FLOAT",
			defaultValue: 1.0,
			envValue:     "3.14",
			want:         3.14,
			wantWarning:  false,
		},
		{
			name:         "integer as float",
			key:          "TEST_INT_AS_FLOAT",
			defaultValue: 1.0,
			envValue:     "42",
			want:         42.0,
			wantWarning:  false,
		},
		{
			name:         "negative float",
			key:          "TEST_NEG_FLOAT",
			defaultValue: 1.0,
			envValue:     "-2.5",
			want:         -2.5,
			wantWarning:  false,
		},
		{
			name:         "zero value",
			key:          "TEST_ZERO_FLOAT",
			defaultValue: 1.0,
			envValue:     "0",
			want:         0.0,
			wantWarning:  false,
		},
		{
			name:         "scientific notation",
			key:          "TEST_SCIENTIFIC",
			defaultValue: 1.0,
			envValue:     "1.5e-3",
			want:         0.0015,
			wantWarning:  false,
		},
		{
			name:         "invalid float - use default",
			key:          "TEST_INVALID_FLOAT",
			defaultValue: 1.0,
			envValue:     "not-a-number",
			want:         1.0,
			wantWarning:  true,
		},
		{
			name:         "empty string - use default",
			key:          "TEST_EMPTY_FLOAT",
			defaultValue: 1.0,
			envValue:     "",
			want:         1.0,
			wantWarning:  false,
		},
		{
			name:         "multiple decimal points - use default",
			key:          "TEST_MULTIPLE_DOTS",
			defaultValue: 1.0,
			envValue:     "3.14.15",
			want:         1.0,
			wantWarning:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
				defer os.Unsetenv(tt.key)
			} else {
				os.Unsetenv(tt.key)
			}

			// Execute
			got := getEnvFloat(tt.key, tt.defaultValue)

			// Assert
			if got != tt.want {
				t.Errorf("getEnvFloat() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestConfigLoad(t *testing.T) {
	tests := []struct {
		name    string
		envVars map[string]string
		check   func(*testing.T, *Config)
	}{
		{
			name: "default values",
			envVars: map[string]string{
				// Clear all env vars
				"PORT":                     "",
				"DATABASE_URL":             "",
				"AUDIT_BUFFER_SIZE":        "",
				"CORS_ALLOW_ORIGIN":        "",
				"GEMINI_API_KEY":           "",
				"GEMINI_MODEL":             "",
				"LOG_LEVEL":                "",
				"LOG_FORMAT":               "",
				"RATE_LIMIT_RATE":          "",
				"RATE_LIMIT_BURST":         "",
				"SESSION_MESSAGE_LIMIT":    "",
				"DAILY_QUOTA_PER_IP":       "",
				"SUPABASE_URL":             "",
				"SUPABASE_JWT_SECRET":      "",
				"SUPABASE_SERVICE_ROLE_KEY": "",
				"STUDY_BUCKET_NAME":        "",
			},
			check: func(t *testing.T, cfg *Config) {
				if cfg.Port != "8080" {
					t.Errorf("Port = %v, want 8080", cfg.Port)
				}
				if cfg.AuditBufferSize != 100 {
					t.Errorf("AuditBufferSize = %v, want 100", cfg.AuditBufferSize)
				}
				if cfg.CORSAllowOrigin != "*" {
					t.Errorf("CORSAllowOrigin = %v, want *", cfg.CORSAllowOrigin)
				}
				if cfg.GeminiModel != "gemini-3-flash-preview" {
					t.Errorf("GeminiModel = %v, want gemini-3-flash-preview", cfg.GeminiModel)
				}
				if cfg.LogLevel != "info" {
					t.Errorf("LogLevel = %v, want info", cfg.LogLevel)
				}
				if cfg.LogFormat != "text" {
					t.Errorf("LogFormat = %v, want text", cfg.LogFormat)
				}
				if cfg.RateLimitRate != 0.5 {
					t.Errorf("RateLimitRate = %v, want 0.5", cfg.RateLimitRate)
				}
				if cfg.RateLimitBurst != 5 {
					t.Errorf("RateLimitBurst = %v, want 5", cfg.RateLimitBurst)
				}
				if cfg.SessionMessageLimit != 20 {
					t.Errorf("SessionMessageLimit = %v, want 20", cfg.SessionMessageLimit)
				}
				if cfg.DailyQuotaPerIP != 100 {
					t.Errorf("DailyQuotaPerIP = %v, want 100", cfg.DailyQuotaPerIP)
				}
				if cfg.StudyBucketName != "studies" {
					t.Errorf("StudyBucketName = %v, want studies", cfg.StudyBucketName)
				}
			},
		},
		{
			name: "custom values",
			envVars: map[string]string{
				"PORT":                 "3000",
				"DATABASE_URL":         "postgres://localhost/test",
				"AUDIT_BUFFER_SIZE":    "200",
				"CORS_ALLOW_ORIGIN":    "https://example.com",
				"GEMINI_API_KEY":       "test-key",
				"GEMINI_MODEL":         "gemini-4",
				"LOG_LEVEL":            "debug",
				"LOG_FORMAT":           "json",
				"RATE_LIMIT_RATE":      "1.5",
				"RATE_LIMIT_BURST":     "10",
				"SESSION_MESSAGE_LIMIT": "50",
				"DAILY_QUOTA_PER_IP":   "500",
				"SUPABASE_URL":         "https://test.supabase.co",
				"SUPABASE_JWT_SECRET":  "secret",
				"STUDY_BUCKET_NAME":    "custom-bucket",
			},
			check: func(t *testing.T, cfg *Config) {
				if cfg.Port != "3000" {
					t.Errorf("Port = %v, want 3000", cfg.Port)
				}
				if cfg.DatabaseURL != "postgres://localhost/test" {
					t.Errorf("DatabaseURL = %v, want postgres://localhost/test", cfg.DatabaseURL)
				}
				if cfg.AuditBufferSize != 200 {
					t.Errorf("AuditBufferSize = %v, want 200", cfg.AuditBufferSize)
				}
				if cfg.CORSAllowOrigin != "https://example.com" {
					t.Errorf("CORSAllowOrigin = %v, want https://example.com", cfg.CORSAllowOrigin)
				}
				if cfg.GeminiAPIKey != "test-key" {
					t.Errorf("GeminiAPIKey = %v, want test-key", cfg.GeminiAPIKey)
				}
				if cfg.GeminiModel != "gemini-4" {
					t.Errorf("GeminiModel = %v, want gemini-4", cfg.GeminiModel)
				}
				if cfg.LogLevel != "debug" {
					t.Errorf("LogLevel = %v, want debug", cfg.LogLevel)
				}
				if cfg.LogFormat != "json" {
					t.Errorf("LogFormat = %v, want json", cfg.LogFormat)
				}
				if cfg.RateLimitRate != 1.5 {
					t.Errorf("RateLimitRate = %v, want 1.5", cfg.RateLimitRate)
				}
				if cfg.RateLimitBurst != 10 {
					t.Errorf("RateLimitBurst = %v, want 10", cfg.RateLimitBurst)
				}
				if cfg.SessionMessageLimit != 50 {
					t.Errorf("SessionMessageLimit = %v, want 50", cfg.SessionMessageLimit)
				}
				if cfg.DailyQuotaPerIP != 500 {
					t.Errorf("DailyQuotaPerIP = %v, want 500", cfg.DailyQuotaPerIP)
				}
				if cfg.SupabaseURL != "https://test.supabase.co" {
					t.Errorf("SupabaseURL = %v, want https://test.supabase.co", cfg.SupabaseURL)
				}
				if cfg.StudyBucketName != "custom-bucket" {
					t.Errorf("StudyBucketName = %v, want custom-bucket", cfg.StudyBucketName)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup environment
			for key, value := range tt.envVars {
				if value == "" {
					os.Unsetenv(key)
				} else {
					os.Setenv(key, value)
				}
			}

			// Cleanup after test
			defer func() {
				for key := range tt.envVars {
					os.Unsetenv(key)
				}
			}()

			// Execute
			cfg := Load()

			// Assert
			tt.check(t, cfg)
		})
	}
}

func TestConfigHelperMethods(t *testing.T) {
	tests := []struct {
		name   string
		config *Config
		checks map[string]bool
	}{
		{
			name: "no services configured",
			config: &Config{
				DatabaseURL:            "",
				GeminiAPIKey:           "",
				SupabaseURL:            "",
				SupabaseServiceRoleKey: "",
			},
			checks: map[string]bool{
				"HasDatabase":        false,
				"HasGemini":          false,
				"HasSupabase":        false,
				"HasSupabaseStorage": false,
			},
		},
		{
			name: "all services configured",
			config: &Config{
				DatabaseURL:            "postgres://localhost/db",
				GeminiAPIKey:           "key",
				SupabaseURL:            "https://test.supabase.co",
				SupabaseServiceRoleKey: "service-key",
			},
			checks: map[string]bool{
				"HasDatabase":        true,
				"HasGemini":          true,
				"HasSupabase":        true,
				"HasSupabaseStorage": true,
			},
		},
		{
			name: "supabase without storage",
			config: &Config{
				DatabaseURL:            "",
				GeminiAPIKey:           "",
				SupabaseURL:            "https://test.supabase.co",
				SupabaseServiceRoleKey: "",
			},
			checks: map[string]bool{
				"HasDatabase":        false,
				"HasGemini":          false,
				"HasSupabase":        true,
				"HasSupabaseStorage": false,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.config.HasDatabase(); got != tt.checks["HasDatabase"] {
				t.Errorf("HasDatabase() = %v, want %v", got, tt.checks["HasDatabase"])
			}
			if got := tt.config.HasGemini(); got != tt.checks["HasGemini"] {
				t.Errorf("HasGemini() = %v, want %v", got, tt.checks["HasGemini"])
			}
			if got := tt.config.HasSupabase(); got != tt.checks["HasSupabase"] {
				t.Errorf("HasSupabase() = %v, want %v", got, tt.checks["HasSupabase"])
			}
			if got := tt.config.HasSupabaseStorage(); got != tt.checks["HasSupabaseStorage"] {
				t.Errorf("HasSupabaseStorage() = %v, want %v", got, tt.checks["HasSupabaseStorage"])
			}
		})
	}
}
