package database

import (
	"fmt"
	"log"
	"log/slog"
	"net/url"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Default connection pool configuration.
const (
	DefaultMaxOpenConns    = 25
	DefaultMaxIdleConns    = 10
	DefaultConnMaxLifetime = time.Hour        // Prevent stale connections
	DefaultConnMaxIdleTime = 15 * time.Minute // Close idle connections
)

// PoolConfig controls the database connection pool.
type PoolConfig struct {
	MaxOpenConns int
	MaxIdleConns int
}

// Connect establishes a connection to PostgreSQL using GORM.
func Connect(databaseURL string, pool PoolConfig) (*gorm.DB, error) {
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             500 * time.Millisecond,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false, // No ANSI overhead in production
		},
	)

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger:      newLogger,
		PrepareStmt: true, // Cache prepared statements for better performance
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		// Close the gorm.DB connection to prevent resource leak
		if closeErr := closeGormDB(db); closeErr != nil {
			return nil, fmt.Errorf("failed to get sql.DB: %w (cleanup error: %w)", err, closeErr)
		}
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	maxOpen := pool.MaxOpenConns
	if maxOpen <= 0 {
		maxOpen = DefaultMaxOpenConns
	}
	maxIdle := pool.MaxIdleConns
	if maxIdle <= 0 {
		maxIdle = DefaultMaxIdleConns
	}

	sqlDB.SetMaxOpenConns(maxOpen)
	sqlDB.SetMaxIdleConns(maxIdle)
	sqlDB.SetConnMaxLifetime(DefaultConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(DefaultConnMaxIdleTime)

	return db, nil
}

// ConnectWithRetry calls Connect up to attempts times with exponential backoff
// (base, doubling, capped at maxDelay), so a database that comes up slightly
// after the server does not fail startup. It returns the last error.
func ConnectWithRetry(databaseURL string, pool PoolConfig, attempts int, base, maxDelay time.Duration) (*gorm.DB, error) {
	return retry(attempts, base, maxDelay, time.Sleep, func() (*gorm.DB, error) {
		return Connect(withConnectTimeout(databaseURL), pool)
	})
}

func retry(attempts int, base, maxDelay time.Duration, sleep func(time.Duration), connect func() (*gorm.DB, error)) (*gorm.DB, error) {
	delay := base
	for i := 1; ; i++ {
		db, err := connect()
		if err == nil {
			return db, nil
		}
		if i >= attempts {
			return nil, fmt.Errorf("database unavailable after %d attempts: %w", attempts, err)
		}
		slog.Warn("database connection failed, retrying", "attempt", i, "retry_in", delay, "error", err)
		sleep(delay)
		delay = min(delay*2, maxDelay)
	}
}

// withConnectTimeout bounds each attempt so an unroutable host cannot stall until the OS TCP timeout.
func withConnectTimeout(databaseURL string) string {
	u, err := url.Parse(databaseURL)
	if err != nil || u.Scheme == "" {
		return databaseURL
	}
	q := u.Query()
	if !q.Has("connect_timeout") {
		q.Set("connect_timeout", "5")
		u.RawQuery = q.Encode()
	}
	return u.String()
}

// closeGormDB safely closes a gorm.DB connection.
func closeGormDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
