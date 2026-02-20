package postgres

import (
	"context"
	"errors"
	"log/slog"
	"sync"

	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/gorm"
)

// ErrBufferFull is returned when the audit buffer is full and cannot accept more entries.
var ErrBufferFull = errors.New("audit buffer full")

// ErrRepositoryClosed is returned when Save is called after Close.
var ErrRepositoryClosed = errors.New("audit repository closed")

// AuditRepository implements audit persistence with PostgreSQL.
type AuditRepository struct {
	db      *gorm.DB
	writeCh chan *domain.AuditEntry
	done    chan struct{}
	wg      sync.WaitGroup
	closed  bool
	mu      sync.RWMutex
}

// NewAuditRepository creates a new PostgreSQL audit repository.
// It starts a background goroutine for non-blocking writes.
// Call Close() to gracefully shut down the background writer.
func NewAuditRepository(db *gorm.DB, bufferSize int) *AuditRepository {
	r := &AuditRepository{
		db:      db,
		writeCh: make(chan *domain.AuditEntry, bufferSize),
		done:    make(chan struct{}),
	}

	r.wg.Add(1)
	go r.backgroundWriter()

	return r
}

// Save queues an audit entry for async persistence.
// This is non-blocking - entries are written in background.
// Returns ErrBufferFull if the write channel is full.
// Returns ErrRepositoryClosed if the repository has been closed.
func (r *AuditRepository) Save(ctx context.Context, entry *domain.AuditEntry) error {
	r.mu.RLock()
	if r.closed {
		r.mu.RUnlock()
		return ErrRepositoryClosed
	}
	r.mu.RUnlock()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case r.writeCh <- entry:
		return nil
	default:
		slog.Warn("audit buffer full, dropping entry", "entry_id", entry.ID)
		return ErrBufferFull
	}
}

// Close gracefully shuts down the background writer.
// It waits for all pending entries to be written before returning.
func (r *AuditRepository) Close() error {
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	r.mu.Unlock()

	close(r.writeCh)
	r.wg.Wait()
	return nil
}

// backgroundWriter processes the write queue.
func (r *AuditRepository) backgroundWriter() {
	defer r.wg.Done()
	for entry := range r.writeCh {
		if err := r.db.Create(entry).Error; err != nil {
			slog.Error("failed to save audit entry", "entry_id", entry.ID, "error", err)
		}
	}
}
