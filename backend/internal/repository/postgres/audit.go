package postgres

import (
	"errors"
	"log"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"gorm.io/gorm"
)

// ErrBufferFull is returned when the audit buffer is full and cannot accept more entries.
var ErrBufferFull = errors.New("audit buffer full")

// AuditRepository implements repository.AuditRepository with PostgreSQL.
type AuditRepository struct {
	db      *gorm.DB
	writeCh chan *domain.AuditEntry
}

// NewAuditRepository creates a new PostgreSQL audit repository.
// It starts a background goroutine for non-blocking writes.
func NewAuditRepository(db *gorm.DB, bufferSize int) repository.AuditRepository {
	r := &AuditRepository{
		db:      db,
		writeCh: make(chan *domain.AuditEntry, bufferSize),
	}

	go r.backgroundWriter()

	return r
}

// Save queues an audit entry for async persistence.
// This is non-blocking - entries are written in background.
// Returns ErrBufferFull if the write channel is full.
func (r *AuditRepository) Save(entry *domain.AuditEntry) error {
	select {
	case r.writeCh <- entry:
		return nil
	default:
		log.Printf("WARN: audit buffer full, dropping entry %s", entry.ID)
		return ErrBufferFull
	}
}

// backgroundWriter processes the write queue.
func (r *AuditRepository) backgroundWriter() {
	for entry := range r.writeCh {
		if err := r.db.Create(entry).Error; err != nil {
			log.Printf("ERROR: failed to save audit entry %s: %v", entry.ID, err)
		}
	}
}
