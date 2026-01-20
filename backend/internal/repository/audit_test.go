package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

func TestNoOpAuditRepository_Save(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		entry *domain.AuditEntry
	}{
		{
			name: "valid entry",
			entry: &domain.AuditEntry{
				ID:       uuid.New(),
				Language: "en",
			},
		},
		{
			name:  "nil entry",
			entry: nil,
		},
		{
			name: "entry with all fields",
			entry: &domain.AuditEntry{
				ID:           uuid.New(),
				ClientIP:     "192.168.1.1",
				UserAgent:    "Mozilla/5.0",
				Language:     "es",
				IsImpossible: true,
				DurationMS:   100,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewNoOpAuditRepository()

			if err := repo.Save(context.Background(), tt.entry); err != nil {
				t.Errorf("Save() error = %v, want nil", err)
			}
		})
	}
}

func TestNewNoOpAuditRepository(t *testing.T) {
	t.Parallel()

	repo := NewNoOpAuditRepository()

	if repo == nil {
		t.Error("NewNoOpAuditRepository() returned nil")
	}
}
