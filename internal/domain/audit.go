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
	IsImpossible    bool    `gorm:"column:is_impossible;index"`
	DanisWeberType  *string `gorm:"column:danis_weber_type;size:20;index"`
	LaugeHansenType *string `gorm:"column:lauge_hansen_type;size:20;index"`
	AOOTACode       *string `gorm:"column:ao_ota_code;size:20;index"`

	// Processing time
	DurationMS int64
}

// TableName specifies the table name for GORM.
func (AuditEntry) TableName() string {
	return "audit_entries"
}

// NewAuditEntry creates a new audit entry from a classification.
// Returns an error if JSON marshaling fails.
func NewAuditEntry(
	clientIP, userAgent, language string,
	input FractureInput,
	result ClassificationResult,
	durationMS int64,
) (*AuditEntry, error) {
	inputJSON, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

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

	return entry, nil
}
