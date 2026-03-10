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
				t.Setenv(tt.key, tt.envValue)
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
				t.Setenv(tt.key, tt.envValue)
			} else {
				_ = os.Unsetenv(tt.key)
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
				"PORT":                      "",
				"DATABASE_URL":              "",
				"AUDIT_BUFFER_SIZE":         "",
				"CORS_ALLOW_ORIGIN":         "",
				"LOG_LEVEL":                 "",
				"LOG_FORMAT":                "",
				"SUPABASE_URL":              "",
				"SUPABASE_SERVICE_ROLE_KEY": "",
				"STUDY_BUCKET_NAME":         "",
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
				if cfg.LogLevel != "info" {
					t.Errorf("LogLevel = %v, want info", cfg.LogLevel)
				}
				if cfg.LogFormat != "text" {
					t.Errorf("LogFormat = %v, want text", cfg.LogFormat)
				}
				if cfg.StudyBucketName != "studies" {
					t.Errorf("StudyBucketName = %v, want studies", cfg.StudyBucketName)
				}
			},
		},
		{
			name: "custom values",
			envVars: map[string]string{
				"PORT":                      "3000",
				"DATABASE_URL":              "postgres://localhost/test",
				"AUDIT_BUFFER_SIZE":         "200",
				"CORS_ALLOW_ORIGIN":         "https://example.com",
				"LOG_LEVEL":                 "debug",
				"LOG_FORMAT":                "json",
				"SUPABASE_URL":              "https://test.supabase.co",
				"SUPABASE_SERVICE_ROLE_KEY": "service-key",
				"STUDY_BUCKET_NAME":         "custom-bucket",
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
				if cfg.LogLevel != "debug" {
					t.Errorf("LogLevel = %v, want debug", cfg.LogLevel)
				}
				if cfg.LogFormat != "json" {
					t.Errorf("LogFormat = %v, want json", cfg.LogFormat)
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
					_ = os.Unsetenv(key)
				} else {
					t.Setenv(key, value)
				}
			}

			// Execute
			cfg, err := Load()
			if err != nil {
				t.Fatalf("Load() returned error: %v", err)
			}

			// Assert
			tt.check(t, cfg)
		})
	}
}

func TestConfigValidate(t *testing.T) {
	tests := []struct {
		name    string
		config  *Config
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid config",
			config: &Config{
				Port:            "8080",
				AuditBufferSize: 100,
				LogLevel:        "info",
				LogFormat:       "text",
			},
			wantErr: false,
		},
		{
			name: "invalid port - not a number",
			config: &Config{
				Port:            "abc",
				AuditBufferSize: 100,
				LogLevel:        "info",
				LogFormat:       "text",
			},
			wantErr: true,
			errMsg:  "PORT must be 1-65535",
		},
		{
			name: "invalid port - out of range",
			config: &Config{
				Port:            "70000",
				AuditBufferSize: 100,
				LogLevel:        "info",
				LogFormat:       "text",
			},
			wantErr: true,
			errMsg:  "PORT must be 1-65535",
		},
		{
			name: "invalid audit buffer size - too small",
			config: &Config{
				Port:            "8080",
				AuditBufferSize: 5,
				LogLevel:        "info",
				LogFormat:       "text",
			},
			wantErr: true,
			errMsg:  "AUDIT_BUFFER_SIZE must be >= 10",
		},
		{
			name: "invalid log level",
			config: &Config{
				Port:            "8080",
				AuditBufferSize: 100,
				LogLevel:        "invalid",
				LogFormat:       "text",
			},
			wantErr: true,
			errMsg:  "LOG_LEVEL must be debug|info|warn|error",
		},
		{
			name: "invalid log format",
			config: &Config{
				Port:            "8080",
				AuditBufferSize: 100,
				LogLevel:        "info",
				LogFormat:       "yaml",
			},
			wantErr: true,
			errMsg:  "LOG_FORMAT must be json|text",
		},
		{
			name: "multiple errors",
			config: &Config{
				Port:            "invalid",
				AuditBufferSize: 1,
				LogLevel:        "wrong",
				LogFormat:       "bad",
			},
			wantErr: true,
			errMsg:  "configuration validation failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err != nil {
				if !contains(err.Error(), tt.errMsg) {
					t.Errorf("Validate() error = %v, want error containing %q", err, tt.errMsg)
				}
			}
		})
	}
}

func TestLoadWithInvalidConfig(t *testing.T) {
	tests := []struct {
		name    string
		envVars map[string]string
		wantErr bool
		errMsg  string
	}{
		{
			name: "invalid port",
			envVars: map[string]string{
				"PORT": "abc",
			},
			wantErr: true,
			errMsg:  "PORT must be 1-65535",
		},
		{
			name: "invalid log level",
			envVars: map[string]string{
				"LOG_LEVEL": "invalid",
			},
			wantErr: true,
			errMsg:  "LOG_LEVEL must be debug|info|warn|error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup environment
			for key, value := range tt.envVars {
				t.Setenv(key, value)
			}

			// Execute
			_, err := Load()
			if (err != nil) != tt.wantErr {
				t.Errorf("Load() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err != nil {
				if !contains(err.Error(), tt.errMsg) {
					t.Errorf("Load() error = %v, want error containing %q", err, tt.errMsg)
				}
			}
		})
	}
}

func TestValidateProduction(t *testing.T) {
	const validURL = "https://abc.supabase.co"
	const validKey = "service-role-key"

	tests := []struct {
		name    string
		config  *Config
		wantErr bool
		errMsgs []string
	}{
		{
			name: "valid production config",
			config: &Config{
				SupabaseURL:            validURL,
				SupabaseServiceRoleKey: validKey,
			},
			wantErr: false,
		},
		{
			name: "missing SUPABASE_URL",
			config: &Config{
				SupabaseURL:            "",
				SupabaseServiceRoleKey: validKey,
			},
			wantErr: true,
			errMsgs: []string{"SUPABASE_URL"},
		},
		{
			name: "missing SUPABASE_SERVICE_ROLE_KEY",
			config: &Config{
				SupabaseURL:            validURL,
				SupabaseServiceRoleKey: "",
			},
			wantErr: true,
			errMsgs: []string{"SUPABASE_SERVICE_ROLE_KEY"},
		},
		{
			name: "both missing",
			config: &Config{
				SupabaseURL:            "",
				SupabaseServiceRoleKey: "",
			},
			wantErr: true,
			errMsgs: []string{"SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.ValidateProduction()
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateProduction() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err != nil {
				for _, msg := range tt.errMsgs {
					if !contains(err.Error(), msg) {
						t.Errorf("ValidateProduction() error = %v, want error containing %q", err, msg)
					}
				}
			}
		})
	}
}

func TestIsProduction(t *testing.T) {
	tests := []struct {
		name   string
		appEnv string
		want   bool
	}{
		{name: "production lowercase", appEnv: "production", want: true},
		{name: "PRODUCTION uppercase", appEnv: "PRODUCTION", want: true},
		{name: "Production mixed case", appEnv: "Production", want: true},
		{name: "development", appEnv: "development", want: false},
		{name: "empty string", appEnv: "", want: false},
		{name: "staging", appEnv: "staging", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Config{AppEnv: tt.appEnv}
			if got := c.IsProduction(); got != tt.want {
				t.Errorf("IsProduction() = %v, want %v", got, tt.want)
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsAt(s, substr))
}

func containsAt(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
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
				SupabaseURL:            "",
				SupabaseServiceRoleKey: "",
			},
			checks: map[string]bool{
				"HasDatabase":        false,
				"HasSupabase":        false,
				"HasSupabaseStorage": false,
			},
		},
		{
			name: "all services configured",
			config: &Config{
				DatabaseURL:            "postgres://localhost/db",
				SupabaseURL:            "https://test.supabase.co",
				SupabaseServiceRoleKey: "service-key",
			},
			checks: map[string]bool{
				"HasDatabase":        true,
				"HasSupabase":        true,
				"HasSupabaseStorage": true,
			},
		},
		{
			name: "supabase without storage",
			config: &Config{
				DatabaseURL:            "",
				SupabaseURL:            "https://test.supabase.co",
				SupabaseServiceRoleKey: "",
			},
			checks: map[string]bool{
				"HasDatabase":        false,
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
			if got := tt.config.HasSupabase(); got != tt.checks["HasSupabase"] {
				t.Errorf("HasSupabase() = %v, want %v", got, tt.checks["HasSupabase"])
			}
			if got := tt.config.HasSupabaseStorage(); got != tt.checks["HasSupabaseStorage"] {
				t.Errorf("HasSupabaseStorage() = %v, want %v", got, tt.checks["HasSupabaseStorage"])
			}
		})
	}
}
