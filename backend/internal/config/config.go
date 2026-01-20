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
}

// Load loads configuration from environment variables.
func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		AuditBufferSize: getEnvInt("AUDIT_BUFFER_SIZE", 100),
		CORSAllowOrigin: getEnv("CORS_ALLOW_ORIGIN", "*"),
	}
}

// HasDatabase returns true if database is configured.
func (c *Config) HasDatabase() bool {
	return c.DatabaseURL != ""
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
