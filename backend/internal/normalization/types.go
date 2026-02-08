package normalization

import (
	"context"
	"time"
)

// LLMClient defines the interface for AI-based text processing.
// Pass nil in PipelineConfig to use regex-only fallback mode.
type LLMClient interface {
	GenerateJSON(ctx context.Context, systemPrompt, userPrompt string) (string, error)
}

// PipelineConfig configures the pipeline behavior.
type PipelineConfig struct {
	LLMClient LLMClient // optional: nil = regex fallback mode
	Language  string    // "es" or "en" for AI prompts
}

// PipelineResult is the final output of running all pipeline phases.
type PipelineResult struct {
	Records  []NormalizedRecord
	Log      []LogEntry
	Stats    PipelineStats
	Errors   []ValidationIssue
	Warnings []ValidationIssue
	AIUsed   bool
}

// NormalizedRecord represents a fully processed clinical record.
type NormalizedRecord struct {
	RowNumber                int
	InternalCode             string
	Age                      *int
	Sex                      string
	HeightCm                 *float64
	WeightKg                 *float64
	BMI                      *float64
	BMICategory              string
	VitaminD                 *float64
	VitaminDCategory         string
	AgeGroup                 string
	FractureDate             *time.Time
	ERDate                   *time.Time
	Laterality               string
	InjuryMechanism          string
	TraumaEnergy             string
	OpenClosed               string
	AssociatedInjuries       []string
	EmergencyTreatment       string
	PreSurgicalComplications []string
	SurgeryDate              *time.Time
	DaysToSurgery            *int
	SurgeryReason            string
	Approaches               []string
	SyndesmosisRepair        bool
	SyndesmosisType          string
	PreopCT                  bool
	Anticoagulation          bool
	SecondaryDisplacement    bool
	DisplacementTreatment    string
	PostopComplications      []string
	OperativeNotes           string
	ExtractedImplants        []ExtractedImplant
	RawData                  map[string]string
}

// ExtractedImplant represents a structured implant extracted from surgery text.
type ExtractedImplant struct {
	Malleolus string `json:"malleolus"` // "lateral", "medial", "posterior", "syndesmosis"
	Type      string `json:"type"`      // "plate", "cannulated_screw", "cortical_screw", "nail", "suture_button"
	Brand     string `json:"brand"`
	Model     string `json:"model"`
	Size      string `json:"size"` // e.g., "3.5mm", "7H"
	Count     int    `json:"count"`
}

// SurgeryExtraction holds structured data extracted from surgery free text.
type SurgeryExtraction struct {
	Implants    []ExtractedImplant `json:"implants"`
	Approaches  []string           `json:"approaches"`
	Malleoli    []string           `json:"malleoli"`
	Techniques  []string           `json:"techniques"`
	Syndesmosis *SyndesmosisInfo   `json:"syndesmosis,omitempty"`
}

// SyndesmosisInfo holds syndesmosis repair details.
type SyndesmosisInfo struct {
	Repaired bool   `json:"repaired"`
	Type     string `json:"type"`
	Brand    string `json:"brand"`
}

// LogEntry records a single transformation applied during normalization.
type LogEntry struct {
	Row             int    `json:"row"`
	Column          string `json:"column"`
	OriginalValue   string `json:"original_value"`
	NormalizedValue string `json:"normalized_value"`
	Action          string `json:"action"`
	Severity        string `json:"severity"` // "info", "warning", "error"
}

// ValidationIssue represents a problem found during validation.
type ValidationIssue struct {
	Row         int      `json:"row"`
	Column      string   `json:"column"`
	Message     string   `json:"message"`
	Severity    string   `json:"severity"`   // "error", "warning", "info"
	IssueType   string   `json:"issue_type"` // "range", "coherence", "duplicate", "missing"
	Suggestions []string `json:"suggestions,omitempty"`
}

// PipelineStats tracks aggregate statistics for the pipeline run.
type PipelineStats struct {
	TotalRows        int `json:"total_rows"`
	ValidRecords     int `json:"valid_records"`
	PartialRecords   int `json:"partial_records"`
	DroppedRows      int `json:"dropped_rows"`
	EmptyRowsRemoved int `json:"empty_rows_removed"`
	EmptyColsRemoved int `json:"empty_cols_removed"`
	CellsCleaned     int `json:"cells_cleaned"`
	DatesNormalized  int `json:"dates_normalized"`
	EnumsMapped      int `json:"enums_mapped"`
	AIExtractions    int `json:"ai_extractions"`
	AIFallbacks      int `json:"ai_fallbacks"`
	WarningsCount    int `json:"warnings_count"`
	ErrorsCount      int `json:"errors_count"`
}

// Internal phase result types

type parseResult struct {
	records          []map[string]string
	unmappedCols     []string
	log              []LogEntry
	emptyRowsRemoved int
	emptyColsRemoved int
}

type cleanResult struct {
	records      []map[string]string
	log          []LogEntry
	cellsCleaned int
}

type normalizeResult struct {
	records         []map[string]string
	log             []LogEntry
	datesNormalized int
	enumsMapped     int
}

type aiNormalizeResult struct {
	records       []map[string]string
	log           []LogEntry
	aiUsed        bool
	aiExtractions int
	aiFallbacks   int
}

type validateResult struct {
	errors   []ValidationIssue
	warnings []ValidationIssue
}
