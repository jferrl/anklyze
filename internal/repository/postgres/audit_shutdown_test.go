package postgres

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	dto "github.com/prometheus/client_model/go"
	"gorm.io/gorm"
)

func droppedCount(t *testing.T, reason string) float64 {
	t.Helper()
	var m dto.Metric
	if err := auditDropped.WithLabelValues(reason).Write(&m); err != nil {
		t.Fatalf("reading counter: %v", err)
	}
	return m.GetCounter().GetValue()
}

func countEntries(db *gorm.DB) int64 {
	var n int64
	db.Model(&domain.AuditEntry{}).Count(&n)
	return n
}

// Not parallel: it reads a process-wide counter, so it must run while parallel tests are paused.
func TestAuditRepository_Save_BufferFullCountsDrops(t *testing.T) {
	repo := &AuditRepository{db: setupTestDB(t), writeCh: make(chan *domain.AuditEntry, 1)}
	before := droppedCount(t, "full")

	_ = repo.Save(context.Background(), createTestEntry())
	for range 5 {
		if err := repo.Save(context.Background(), createTestEntry()); !errors.Is(err, repository.ErrBufferFull) {
			t.Fatalf("Save() error = %v, want ErrBufferFull", err)
		}
	}

	if got := droppedCount(t, "full") - before; got != 5 {
		t.Errorf("dropped counter delta = %v, want 5", got)
	}
}

func TestAuditRepository_Save_NilReceiverAndEntry(t *testing.T) {
	t.Parallel()

	var nilRepo *AuditRepository
	if err := nilRepo.Save(context.Background(), createTestEntry()); !errors.Is(err, repository.ErrRepositoryClosed) {
		t.Errorf("nil receiver: Save() error = %v, want ErrRepositoryClosed", err)
	}

	repo := NewAuditRepository(setupTestDB(t), 10)
	t.Cleanup(func() { _ = repo.Close(context.Background()) })
	if err := repo.Save(context.Background(), nil); err == nil {
		t.Error("nil entry: Save() error = nil, want error")
	}
}

func TestAuditRepository_Save_AfterClose(t *testing.T) {
	t.Parallel()

	repo := NewAuditRepository(setupTestDB(t), 10)
	if err := repo.Close(context.Background()); err != nil {
		t.Fatalf("Close() error = %v", err)
	}
	if err := repo.Save(context.Background(), createTestEntry()); !errors.Is(err, repository.ErrRepositoryClosed) {
		t.Errorf("Save() after Close error = %v, want ErrRepositoryClosed", err)
	}
	if err := repo.Close(context.Background()); err != nil {
		t.Errorf("second Close() error = %v, want nil", err)
	}
}

// Save racing Close used to send on a closed channel (a data race, and a
// panic when the close landed first). Run under -race.
func TestAuditRepository_Save_ConcurrentWithClose(t *testing.T) {
	t.Parallel()

	for range 200 {
		repo := NewAuditRepository(setupTestDB(t), 10)
		var wg sync.WaitGroup
		for range 4 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for range 20 {
					_ = repo.Save(context.Background(), createTestEntry())
				}
			}()
		}
		_ = repo.Close(context.Background())
		wg.Wait()
	}
}

func TestAuditRepository_Close_FlushesPending(t *testing.T) {
	t.Parallel()

	db := setupTestDB(t)
	repo := NewAuditRepository(db, 200)

	const n = 150
	for range n {
		if err := repo.Save(context.Background(), createTestEntry()); err != nil {
			t.Fatalf("Save() error = %v", err)
		}
	}
	if err := repo.Close(context.Background()); err != nil {
		t.Fatalf("Close() error = %v", err)
	}

	if got := countEntries(db); got != n {
		t.Errorf("persisted = %d, want %d", got, n)
	}
}

func TestAuditRepository_Close_DeadlineAbandonsWrites(t *testing.T) {
	db := setupTestDB(t)
	// A hung database: every insert blocks until its context is cancelled.
	if err := db.Callback().Create().Before("gorm:create").Register("test:block", func(tx *gorm.DB) {
		<-tx.Statement.Context.Done()
		_ = tx.AddError(tx.Statement.Context.Err())
	}); err != nil {
		t.Fatalf("register callback: %v", err)
	}
	repo := NewAuditRepository(db, 10)
	before := droppedCount(t, "shutdown")

	const n = 3
	for range n {
		if err := repo.Save(context.Background(), createTestEntry()); err != nil {
			t.Fatalf("Save() error = %v", err)
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := repo.Close(ctx); !errors.Is(err, context.Canceled) {
		t.Fatalf("Close() error = %v, want context.Canceled", err)
	}
	if got := droppedCount(t, "shutdown") - before; got != n {
		t.Errorf("shutdown drops = %v, want %d", got, n)
	}
}

func TestAuditRepository_WritesInBatches(t *testing.T) {
	t.Parallel()

	db := setupTestDB(t)
	var statements atomic.Int32
	if err := db.Callback().Create().After("gorm:create").Register("test:count", func(*gorm.DB) {
		statements.Add(1)
	}); err != nil {
		t.Fatalf("register callback: %v", err)
	}

	// Fill the channel before the writer starts so batching is deterministic.
	const n = 2*auditMaxBatch + 20
	repo := &AuditRepository{db: db, writeCh: make(chan *domain.AuditEntry, n)}
	repo.ctx, repo.cancel = context.WithCancel(context.Background())
	for range n {
		repo.writeCh <- createTestEntry()
	}
	close(repo.writeCh)
	repo.wg.Add(1)
	repo.backgroundWriter()

	if got := countEntries(db); got != n {
		t.Errorf("persisted = %d, want %d", got, n)
	}
	if got := statements.Load(); got != 3 {
		t.Errorf("insert statements = %d, want 3", got)
	}
}
