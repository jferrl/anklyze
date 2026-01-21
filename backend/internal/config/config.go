package config

import (
	"os"
	"strconv"
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
}

// Load loads configuration from environment variables.
func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		AuditBufferSize: getEnvInt("AUDIT_BUFFER_SIZE", 100),
		CORSAllowOrigin: getEnv("CORS_ALLOW_ORIGIN", "*"),
		GeminiAPIKey:    os.Getenv("GEMINI_API_KEY"),
		GeminiModel:     getEnv("GEMINI_MODEL", "gemini-3-flash-preview"),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
		LogFormat:       getEnv("LOG_FORMAT", "text"),
	}
}

// HasDatabase returns true if database is configured.
func (c *Config) HasDatabase() bool {
	return c.DatabaseURL != ""
}

// HasGemini returns true if Gemini API is configured.
func (c *Config) HasGemini() bool {
	return c.GeminiAPIKey != ""
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
