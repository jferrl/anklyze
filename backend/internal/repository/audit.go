package repository

import "github.com/jferrl/anklyze/internal/domain"

// AuditRepository defines the interface for audit trail persistence.
type AuditRepository interface {
	Save(entry *domain.AuditEntry) error
}

// NoOpAuditRepository is a no-op implementation for when DB is not configured.
type NoOpAuditRepository struct{}

// Save does nothing and returns nil.
func (r *NoOpAuditRepository) Save(entry *domain.AuditEntry) error {
	return nil
}

// NewNoOpAuditRepository creates a no-op repository.
func NewNoOpAuditRepository() AuditRepository {
	return &NoOpAuditRepository{}
}
