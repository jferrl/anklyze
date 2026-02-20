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

// Connection pool configuration defaults.
// These follow database/sql best practices for connection lifecycle management.
const (
	DefaultMaxOpenConns    = 10
	DefaultMaxIdleConns    = 5
	DefaultConnMaxLifetime = time.Hour        // Prevent stale connections
	DefaultConnMaxIdleTime = 15 * time.Minute // Close idle connections
)

// Connect establishes a connection to PostgreSQL using GORM.
func Connect(databaseURL string) (*gorm.DB, error) {
	// Custom logger with higher slow query threshold for remote databases
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             500 * time.Millisecond, // Increased from 200ms for remote DBs
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
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
			return nil, fmt.Errorf("failed to get sql.DB: %w (cleanup error: %v)", err, closeErr)
		}
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(DefaultMaxOpenConns)
	sqlDB.SetMaxIdleConns(DefaultMaxIdleConns)
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
