package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// StudyStatus represents the lifecycle state of a study.
type StudyStatus string

const (
	// StudyStatusDraft indicates the study is being prepared.
	StudyStatusDraft StudyStatus = "draft"
	// StudyStatusPublished indicates the study is open for responses.
	StudyStatusPublished StudyStatus = "published"
	// StudyStatusClosed indicates the study is no longer accepting responses.
	StudyStatusClosed StudyStatus = "closed"
)

// ImageCategory represents the type of medical image.
type ImageCategory string

const (
	// ImageCategoryXRay is a standard X-ray image.
	ImageCategoryXRay ImageCategory = "xray"
	// ImageCategoryTAC is a CT/TAC scan image.
	ImageCategoryTAC ImageCategory = "tac"
)

// Study represents a patient case study created by an admin.
// Users can view published studies and submit classification responses.
type Study struct {
	ID          uuid.UUID   `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt   time.Time   `gorm:"index" json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	PublishedAt *time.Time  `gorm:"index" json:"published_at,omitempty"`
	ClosedAt    *time.Time  `json:"closed_at,omitempty"`

	// Admin who created the study
	CreatedBy uuid.UUID `gorm:"type:uuid;not null;index" json:"created_by"`

	// Study metadata
	Title       string      `gorm:"size:255;not null" json:"title"`
	Description string      `gorm:"type:text" json:"description,omitempty"`
	Status      StudyStatus `gorm:"size:20;not null;default:'draft';index" json:"status"`

	// Optional deadline for responses
	Deadline *time.Time `gorm:"index" json:"deadline,omitempty"`

	// Auto-computed from images - true if any TAC images exist
	HasTACImages bool `gorm:"default:false" json:"has_tac_images"`

	// Denormalized counters for efficient queries
	ResponseCount int `gorm:"default:0" json:"response_count"`
	UniqueUsers   int `gorm:"default:0" json:"unique_users"`

	// Gold Standard / Reference Classification for validation studies
	// Stores the "correct" classification to compare user responses against
	ReferenceClassification  datatypes.JSON `gorm:"type:jsonb" json:"reference_classification,omitempty"`
	ShowReferenceAfterSubmit bool           `json:"show_reference_after_submit"`

	// Reference input (FractureInput) that produced the gold standard classification
	// Used for divergence analysis to compare answer paths
	ReferenceInput datatypes.JSON `gorm:"type:jsonb" json:"reference_input,omitempty"`

	// Single Response Control - when false, users can only submit one response
	// Note: Default is set in NewStudy(), not via GORM tag (GORM omits false values with default tags)
	AllowMultipleResponses bool `json:"allow_multiple_responses"`

	// Cohort membership - if set, this study is part of a cohort for multi-case reliability analysis
	CohortID  *uuid.UUID `gorm:"type:uuid;index" json:"cohort_id,omitempty"`
	CaseOrder int        `gorm:"default:0" json:"case_order"`
}

// TableName returns the table name for GORM.
func (Study) TableName() string {
	return "studies"
}

// NewStudy creates a new study with the given parameters.
func NewStudy(createdBy uuid.UUID, title, description string, deadline *time.Time) *Study {
	return &Study{
		ID:                     uuid.New(),
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
		CreatedBy:              createdBy,
		Title:                  title,
		Description:            description,
		Status:                 StudyStatusDraft,
		Deadline:               deadline,
		AllowMultipleResponses: true, // Default to allowing multiple responses
	}
}

// GetReferenceClassification parses and returns the reference classification.
func (s *Study) GetReferenceClassification() (*ClassificationResult, error) {
	if len(s.ReferenceClassification) == 0 {
		return nil, nil
	}

	var result ClassificationResult
	if err := json.Unmarshal(s.ReferenceClassification, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// SetReferenceClassification sets the reference classification from a ClassificationResult.
func (s *Study) SetReferenceClassification(result *ClassificationResult) error {
	if result == nil {
		s.ReferenceClassification = nil
		return nil
	}

	data, err := json.Marshal(result)
	if err != nil {
		return err
	}
	s.ReferenceClassification = datatypes.JSON(data)
	return nil
}

// HasReferenceClassification returns true if a reference classification is set.
func (s *Study) HasReferenceClassification() bool {
	return len(s.ReferenceClassification) > 0
}

// GetReferenceInput parses and returns the reference input (FractureInput).
func (s *Study) GetReferenceInput() (*FractureInput, error) {
	if len(s.ReferenceInput) == 0 {
		return nil, nil
	}

	var input FractureInput
	if err := json.Unmarshal(s.ReferenceInput, &input); err != nil {
		return nil, err
	}
	return &input, nil
}

// SetReferenceInput sets the reference input from a FractureInput.
func (s *Study) SetReferenceInput(input *FractureInput) error {
	if input == nil {
		s.ReferenceInput = nil
		return nil
	}

	data, err := json.Marshal(input)
	if err != nil {
		return err
	}
	s.ReferenceInput = datatypes.JSON(data)
	return nil
}

// HasReferenceInput returns true if a reference input is set.
func (s *Study) HasReferenceInput() bool {
	return len(s.ReferenceInput) > 0
}

// CanBeEdited returns true if the study can be modified.
func (s *Study) CanBeEdited() bool {
	return s.Status == StudyStatusDraft
}

// CanBeDeleted returns true if the study can be deleted.
// Admins can delete studies in any status.
func (s *Study) CanBeDeleted() bool {
	return true
}

// CanAcceptResponses returns true if the study is accepting responses.
func (s *Study) CanAcceptResponses() bool {
	if s.Status != StudyStatusPublished {
		return false
	}
	// Check deadline if set
	if s.Deadline != nil && time.Now().After(*s.Deadline) {
		return false
	}
	return true
}

// IsExpired returns true if the study deadline has passed.
func (s *Study) IsExpired() bool {
	return s.Deadline != nil && time.Now().After(*s.Deadline)
}

// BelongsToCohort returns true if the study is part of a cohort.
func (s *Study) BelongsToCohort() bool {
	return s.CohortID != nil
}

// SetCohort assigns this study to a cohort with a given case order.
func (s *Study) SetCohort(cohortID uuid.UUID, caseOrder int) {
	s.CohortID = &cohortID
	s.CaseOrder = caseOrder
}

// RemoveFromCohort removes this study from its cohort.
func (s *Study) RemoveFromCohort() {
	s.CohortID = nil
	s.CaseOrder = 0
}

// StudyImage represents an image attached to a study.
type StudyImage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	StudyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"study_id"`
	CreatedAt time.Time `json:"created_at"`

	// Image metadata
	Category     ImageCategory `gorm:"size:10;not null;index" json:"category"`
	DisplayOrder int           `gorm:"not null;default:0" json:"display_order"`
	Filename     string        `gorm:"size:255;not null" json:"filename"`
	ContentType  string        `gorm:"size:50;not null" json:"content_type"`
	SizeBytes    int64         `json:"size_bytes"`

	// Supabase Storage path (bucket/study_id/category/filename)
	StoragePath string `gorm:"size:500;not null" json:"-"`
}

// TableName returns the table name for GORM.
func (StudyImage) TableName() string {
	return "study_images"
}

// NewStudyImage creates a new study image.
func NewStudyImage(
	studyID uuid.UUID,
	category ImageCategory,
	displayOrder int,
	filename, contentType string,
	sizeBytes int64,
	storagePath string,
) *StudyImage {
	return &StudyImage{
		ID:           uuid.New(),
		StudyID:      studyID,
		CreatedAt:    time.Now(),
		Category:     category,
		DisplayOrder: displayOrder,
		Filename:     filename,
		ContentType:  contentType,
		SizeBytes:    sizeBytes,
		StoragePath:  storagePath,
	}
}

// QuestionAnswer represents a single answer in the user's decision path.
type QuestionAnswer struct {
	Question  string `json:"question"`  // Question key: "involved_malleoli", "fibular_level", etc.
	Answer    string `json:"answer"`    // Answer value: "lateral_only", "transindesmal", etc.
	Timestamp int64  `json:"timestamp"` // Milliseconds since form start
}

// StudyResponse represents a user's classification response to a study.
type StudyResponse struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	StudyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"study_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`

	// Classification data (JSONB in PostgreSQL)
	Classification datatypes.JSON `gorm:"not null" json:"classification"`

	// Time taken to complete classification in milliseconds
	TimeTakenMS int64 `gorm:"column:time_taken_ms" json:"time_taken_ms"`

	// Denormalized fields for analytics queries
	DanisWeberType  *string `gorm:"column:danis_weber_type;size:10;index" json:"-"`
	LaugeHansenType *string `gorm:"column:lauge_hansen_type;size:5;index" json:"-"`
	AOOTACode       *string `gorm:"column:ao_ota_code;size:10;index" json:"-"`
	BartonicekType  *string `gorm:"column:bartonicek_type;size:15;index" json:"-"`

	// Answer path tracking for divergence analysis
	AnswerPath      datatypes.JSON `gorm:"type:jsonb" json:"answer_path,omitempty"`       // []QuestionAnswer
	DecisionPath    string         `gorm:"size:500;index" json:"decision_path,omitempty"` // "lateral_only→transindesmal→spiral"
	TimePerQuestion datatypes.JSON `gorm:"type:jsonb" json:"time_per_question,omitempty"` // map[string]int64
	BackClicks      int            `gorm:"default:0" json:"back_clicks,omitempty"`        // Back button usage count
}

// TableName returns the table name for GORM.
func (StudyResponse) TableName() string {
	return "study_responses"
}

// AnswerTracking contains the answer path tracking data submitted with a response.
type AnswerTracking struct {
	AnswerPath      []QuestionAnswer `json:"answer_path,omitempty"`
	DecisionPath    string           `json:"decision_path,omitempty"`
	TimePerQuestion map[string]int64 `json:"time_per_question,omitempty"`
	BackClicks      int              `json:"back_clicks,omitempty"`
}

// NewStudyResponse creates a new study response with denormalized fields extracted.
func NewStudyResponse(
	studyID, userID uuid.UUID,
	result ClassificationResult,
	timeTakenMS int64,
) (*StudyResponse, error) {
	classificationJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	response := &StudyResponse{
		ID:             uuid.New(),
		StudyID:        studyID,
		UserID:         userID,
		CreatedAt:      time.Now(),
		Classification: datatypes.JSON(classificationJSON),
		TimeTakenMS:    timeTakenMS,
	}

	// Extract denormalized fields for analytics
	if result.DanisWeber != nil {
		t := string(result.DanisWeber.Type)
		response.DanisWeberType = &t
	}
	if result.LaugeHansen != nil {
		t := string(result.LaugeHansen.Type)
		response.LaugeHansenType = &t
	}
	if result.AOOTA != nil {
		t := string(result.AOOTA.Code)
		response.AOOTACode = &t
	}
	if result.Bartonicek != nil {
		t := string(result.Bartonicek.Type)
		response.BartonicekType = &t
	}

	return response, nil
}

// NewStudyResponseWithTracking creates a new study response with answer tracking data.
func NewStudyResponseWithTracking(
	studyID, userID uuid.UUID,
	result ClassificationResult,
	timeTakenMS int64,
	tracking *AnswerTracking,
) (*StudyResponse, error) {
	response, err := NewStudyResponse(studyID, userID, result, timeTakenMS)
	if err != nil {
		return nil, err
	}

	if tracking != nil {
		// Set answer path
		if len(tracking.AnswerPath) > 0 {
			answerPathJSON, err := json.Marshal(tracking.AnswerPath)
			if err != nil {
				return nil, err
			}
			response.AnswerPath = datatypes.JSON(answerPathJSON)
		}

		// Set decision path
		response.DecisionPath = tracking.DecisionPath

		// Set time per question
		if len(tracking.TimePerQuestion) > 0 {
			timePerQJSON, err := json.Marshal(tracking.TimePerQuestion)
			if err != nil {
				return nil, err
			}
			response.TimePerQuestion = datatypes.JSON(timePerQJSON)
		}

		// Set back clicks
		response.BackClicks = tracking.BackClicks
	}

	return response, nil
}

// GetAnswerPath parses and returns the answer path.
func (r *StudyResponse) GetAnswerPath() ([]QuestionAnswer, error) {
	if len(r.AnswerPath) == 0 {
		return nil, nil
	}

	var path []QuestionAnswer
	if err := json.Unmarshal(r.AnswerPath, &path); err != nil {
		return nil, err
	}
	return path, nil
}

// GetTimePerQuestion parses and returns the time per question map.
func (r *StudyResponse) GetTimePerQuestion() (map[string]int64, error) {
	if len(r.TimePerQuestion) == 0 {
		return nil, nil
	}

	var timeMap map[string]int64
	if err := json.Unmarshal(r.TimePerQuestion, &timeMap); err != nil {
		return nil, err
	}
	return timeMap, nil
}

// GetClassification parses and returns the classification result.
func (r *StudyResponse) GetClassification() (*ClassificationResult, error) {
	if len(r.Classification) == 0 {
		return nil, nil
	}

	var result ClassificationResult
	if err := json.Unmarshal(r.Classification, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// StudyWithImages represents a study with its associated images.
type StudyWithImages struct {
	Study
	Images []StudyImage `json:"images"`
}

// StudyListItem represents a study in list views with summary info.
type StudyListItem struct {
	ID            uuid.UUID   `json:"id"`
	Title         string      `json:"title"`
	Description   string      `json:"description,omitempty"`
	Status        StudyStatus `json:"status"`
	Deadline      *time.Time  `json:"deadline,omitempty"`
	PublishedAt   *time.Time  `json:"published_at,omitempty"`
	HasTACImages  bool        `json:"has_tac_images"`
	ResponseCount int         `json:"response_count"`
	UniqueUsers   int         `json:"unique_users"`
	ImageCount    int         `json:"image_count"`
}

// UserStudyView represents how a user sees a published study.
type UserStudyView struct {
	Study
	Images          []StudyImage `json:"images"`
	HasResponded    bool         `json:"has_responded"`
	MyResponseCount int          `json:"my_response_count"`
}

// StudyAnalyticsSummary contains aggregated study response data.
type StudyAnalyticsSummary struct {
	StudyID           uuid.UUID        `json:"study_id"`
	Title             string           `json:"title"`
	Status            StudyStatus      `json:"status"`
	ResponseCount     int64            `json:"response_count"`
	UniqueRespondents int64            `json:"unique_respondents"`
	AvgTimeTakenMS    float64          `json:"avg_time_taken_ms"`
	DanisWeberDist    map[string]int64 `json:"danis_weber_distribution"`
	LaugeHansenDist   map[string]int64 `json:"lauge_hansen_distribution"`
	AOOTADist         map[string]int64 `json:"ao_ota_distribution"`
	BartonicekDist    map[string]int64 `json:"bartonicek_distribution"`
}
