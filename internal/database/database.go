package database

import (
	"fmt"
	"log"
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

// closeGormDB safely closes a gorm.DB connection.
func closeGormDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
