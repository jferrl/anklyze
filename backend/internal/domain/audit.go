package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// AuditEntry represents a classification audit log entry.
type AuditEntry struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time `gorm:"index"`

	// Request metadata
	ClientIP  string `gorm:"size:45"`
	UserAgent string
	Language  string `gorm:"size:10;not null;index"`

	// Classification data (JSONB in PostgreSQL, TEXT in SQLite)
	Input  datatypes.JSON `gorm:"not null"`
	Result datatypes.JSON `gorm:"not null"`

	// Denormalized for analytics queries
	IsImpossible    bool    `gorm:"index"`
	DanisWeberType  *string `gorm:"size:10;index"`
	LaugeHansenType *string `gorm:"size:5;index"`
	AOOTACode       *string `gorm:"size:10;index"`

	// Processing time
	DurationMS int64
}

// TableName specifies the table name for GORM.
func (AuditEntry) TableName() string {
	return "audit_entries"
}

// NewAuditEntry creates a new audit entry from a classification.
func NewAuditEntry(
	clientIP, userAgent, language string,
	input FractureInput,
	result ClassificationResult,
	durationMS int64,
) *AuditEntry {
	inputJSON, _ := json.Marshal(input)
	resultJSON, _ := json.Marshal(result)

	entry := &AuditEntry{
		ID:           uuid.New(),
		CreatedAt:    time.Now(),
		ClientIP:     clientIP,
		UserAgent:    userAgent,
		Language:     language,
		Input:        datatypes.JSON(inputJSON),
		Result:       datatypes.JSON(resultJSON),
		IsImpossible: result.Impossible,
		DurationMS:   durationMS,
	}

	// Extract denormalized fields
	if result.DanisWeber != nil {
		t := string(result.DanisWeber.Type)
		entry.DanisWeberType = &t
	}
	if result.LaugeHansen != nil {
		t := string(result.LaugeHansen.Type)
		entry.LaugeHansenType = &t
	}
	if result.AOOTA != nil {
		t := string(result.AOOTA.Code)
		entry.AOOTACode = &t
	}

	return entry
}
