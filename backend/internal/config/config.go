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
	// Rate limiting configuration
	RateLimitRate  float64 // Requests per second (e.g., 0.5 = 1 request per 2 seconds)
	RateLimitBurst int     // Maximum burst size
	// Usage limits
	SessionMessageLimit int // Maximum messages per chat session
	DailyQuotaPerIP     int // Maximum requests per IP per day
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
		RateLimitRate:       getEnvFloat("RATE_LIMIT_RATE", 0.5),    // 1 request per 2 seconds
		RateLimitBurst:      getEnvInt("RATE_LIMIT_BURST", 5),      // Allow burst of 5
		SessionMessageLimit: getEnvInt("SESSION_MESSAGE_LIMIT", 20), // Max messages per session
		DailyQuotaPerIP:     getEnvInt("DAILY_QUOTA_PER_IP", 100),   // Max requests per IP per day
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

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
			return floatVal
		}
	}
	return defaultValue
}
