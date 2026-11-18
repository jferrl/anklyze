package postgres

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"gorm.io/gorm"
)

const (
	auditMaxBatch     = 50
	auditWarnInterval = 10 * time.Second
)

// auditDropped counts audit entries that were never persisted, by reason:
// full, closed, write_error or shutdown.
var auditDropped = promauto.NewCounterVec(prometheus.CounterOpts{
	Name: "anklyze_audit_dropped_total",
	Help: "Audit entries dropped instead of persisted, by reason.",
}, []string{"reason"})

// AuditRepository implements audit persistence with PostgreSQL.
type AuditRepository struct {
	db       *gorm.DB
	writeCh  chan *domain.AuditEntry
	wg       sync.WaitGroup
	ctx      context.Context // cancelled by Close when its deadline expires
	cancel   context.CancelFunc
	closed   bool
	mu       sync.RWMutex // held for reading across the send so Close cannot close writeCh mid-send
	lastWarn atomic.Int64 // unix nanos of the last "buffer full" warning
}

// NewAuditRepository creates a new PostgreSQL audit repository.
// It starts a background goroutine that writes entries in batches.
// Call Close to flush pending entries and stop it.
func NewAuditRepository(db *gorm.DB, bufferSize int) *AuditRepository {
	r := &AuditRepository{
		db:      db,
		writeCh: make(chan *domain.AuditEntry, bufferSize),
	}
	r.ctx, r.cancel = context.WithCancel(context.Background())

	r.wg.Add(1)
	go r.backgroundWriter()

	return r
}

// Save queues an audit entry for async persistence without blocking.
// Returns ErrBufferFull if the buffer is full (the entry is dropped and counted)
// and ErrRepositoryClosed if the repository is nil or has been closed.
func (r *AuditRepository) Save(ctx context.Context, entry *domain.AuditEntry) error {
	if r == nil || entry == nil {
		return repository.ErrRepositoryClosed
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.closed {
		auditDropped.WithLabelValues("closed").Inc()
		return repository.ErrRepositoryClosed
	}

	select {
	case r.writeCh <- entry:
		return nil
	default:
		auditDropped.WithLabelValues("full").Inc()
		r.warnBufferFull()
		return repository.ErrBufferFull
	}
}

// warnBufferFull logs at most once per auditWarnInterval; the counter has the exact number.
func (r *AuditRepository) warnBufferFull() {
	now := time.Now().UnixNano()
	last := r.lastWarn.Load()
	if now-last >= int64(auditWarnInterval) && r.lastWarn.CompareAndSwap(last, now) {
		slog.Warn("audit buffer full, dropping entries", "metric", "anklyze_audit_dropped_total")
	}
}

// Close stops accepting entries and flushes the pending ones. If ctx expires
// first, the remaining writes are abandoned and counted as dropped.
func (r *AuditRepository) Close(ctx context.Context) error {
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	close(r.writeCh)
	r.mu.Unlock()

	flushed := make(chan struct{})
	go func() {
		r.wg.Wait()
		close(flushed)
	}()

	select {
	case <-flushed:
		return nil
	case <-ctx.Done():
		r.cancel() // in-flight and queued writes now fail fast
		<-flushed
		return fmt.Errorf("flushing audit entries: %w", ctx.Err())
	}
}

// backgroundWriter writes whatever is queued, up to auditMaxBatch entries at a time.
func (r *AuditRepository) backgroundWriter() {
	defer r.wg.Done()
	defer r.cancel()

	batch := make([]*domain.AuditEntry, 0, auditMaxBatch)
	for entry := range r.writeCh {
		batch = append(batch[:0], entry)
	fill:
		for len(batch) < auditMaxBatch {
			select {
			case e, ok := <-r.writeCh:
				if !ok {
					break fill
				}
				batch = append(batch, e)
			default:
				break fill
			}
		}
		r.write(batch)
	}
}

// write inserts the batch in one statement; if that fails it retries entry by
// entry so a single bad row does not take the rest down with it.
func (r *AuditRepository) write(batch []*domain.AuditEntry) {
	db := r.db.WithContext(r.ctx)
	if err := db.Create(batch).Error; err == nil {
		return
	}
	for _, e := range batch {
		err := db.Create(e).Error
		switch {
		case err == nil:
		case r.ctx.Err() != nil:
			auditDropped.WithLabelValues("shutdown").Inc()
		default:
			auditDropped.WithLabelValues("write_error").Inc()
			slog.Error("failed to save audit entry", "entry_id", e.ID, "error", err)
		}
	}
}
