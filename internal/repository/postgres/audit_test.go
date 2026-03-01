package postgres

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	if err := db.AutoMigrate(&domain.AuditEntry{}); err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	return db
}

func createTestEntry() *domain.AuditEntry {
	return &domain.AuditEntry{
		ID:           uuid.New(),
		ClientIP:     "127.0.0.1",
		UserAgent:    "test-agent",
		Language:     "en",
		Input:        []byte(`{"involved_malleoli":"lateral_only"}`),
		Result:       []byte(`{"fracture_description":"test"}`),
		IsImpossible: false,
		DurationMS:   50,
	}
}

func TestNewAuditRepository(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		bufferSize int
	}{
		{
			name:       "small buffer",
			bufferSize: 1,
		},
		{
			name:       "medium buffer",
			bufferSize: 10,
		},
		{
			name:       "large buffer",
			bufferSize: 100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupTestDB(t)
			repo := NewAuditRepository(db, tt.bufferSize)

			if repo == nil {
				t.Error("NewAuditRepository() returned nil")
			}
		})
	}
}

func TestAuditRepository_Save(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		entry   *domain.AuditEntry
		wantErr bool
	}{
		{
			name:    "valid entry",
			entry:   createTestEntry(),
			wantErr: false,
		},
		{
			name: "entry with denormalized fields",
			entry: func() *domain.AuditEntry {
				e := createTestEntry()
				weberType := "Weber A"
				lhType := "SA"
				aootaCode := "44-A1"
				e.DanisWeberType = &weberType
				e.LaugeHansenType = &lhType
				e.AOOTACode = &aootaCode
				return e
			}(),
			wantErr: false,
		},
		{
			name: "entry marked as impossible",
			entry: func() *domain.AuditEntry {
				e := createTestEntry()
				e.IsImpossible = true
				return e
			}(),
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupTestDB(t)
			repo := NewAuditRepository(db, 10)
			t.Cleanup(func() { _ = repo.Close() })

			err := repo.Save(context.Background(), tt.entry)
			if (err != nil) != tt.wantErr {
				t.Errorf("Save() error = %v, wantErr %v", err, tt.wantErr)
			}

			// Wait for background writer to process
			time.Sleep(50 * time.Millisecond)

			// Verify entry was persisted
			var count int64
			db.Model(&domain.AuditEntry{}).Where("id = ?", tt.entry.ID).Count(&count)
			if count != 1 {
				t.Errorf("entry not persisted, count = %d, want 1", count)
			}
		})
	}
}

func TestAuditRepository_Save_BufferFull(t *testing.T) {
	t.Parallel()

	db := setupTestDB(t)

	// Create repository with buffer size 1
	repo := NewAuditRepository(db, 1)
	t.Cleanup(func() { _ = repo.Close() })

	ctx := context.Background()

	// Block the background writer by filling the channel
	// and not letting it process
	entry1 := createTestEntry()
	entry2 := createTestEntry()

	// First save should succeed
	if err := repo.Save(ctx, entry1); err != nil {
		t.Errorf("first Save() error = %v, want nil", err)
	}

	// Second save should return ErrBufferFull (non-blocking)
	if err := repo.Save(ctx, entry2); !errors.Is(err, repository.ErrBufferFull) {
		t.Errorf("second Save() error = %v, want repository.ErrBufferFull", err)
	}
}

func TestAuditRepository_Save_Concurrent(t *testing.T) {
	t.Parallel()

	db := setupTestDB(t)
	repo := NewAuditRepository(db, 100)
	t.Cleanup(func() { _ = repo.Close() })

	ctx := context.Background()
	const numGoroutines = 50
	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	entries := make([]*domain.AuditEntry, numGoroutines)
	for i := range numGoroutines {
		entries[i] = createTestEntry()
	}

	for i := range numGoroutines {
		go func(entry *domain.AuditEntry) {
			defer wg.Done()
			if err := repo.Save(ctx, entry); err != nil {
				t.Errorf("concurrent Save() error = %v", err)
			}
		}(entries[i])
	}

	wg.Wait()

	// Wait for background writer to process all entries
	time.Sleep(200 * time.Millisecond)

	var count int64
	db.Model(&domain.AuditEntry{}).Count(&count)
	if count != numGoroutines {
		t.Errorf("persisted count = %d, want %d", count, numGoroutines)
	}
}

func TestAuditRepository_Save_NonBlocking(t *testing.T) {
	t.Parallel()

	db := setupTestDB(t)
	repo := NewAuditRepository(db, 10)
	t.Cleanup(func() { _ = repo.Close() })

	ctx := context.Background()
	entry := createTestEntry()

	start := time.Now()
	err := repo.Save(ctx, entry)
	elapsed := time.Since(start)

	if err != nil {
		t.Errorf("Save() error = %v, want nil", err)
	}

	// Save should be nearly instant (non-blocking)
	// Use a generous threshold to avoid flaky tests on slow CI systems
	if elapsed > 100*time.Millisecond {
		t.Errorf("Save() took %v, expected < 100ms (should be non-blocking)", elapsed)
	}
}
