package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// CaseStatus represents the lifecycle state of a case.
type CaseStatus string

const (
	// CaseStatusDraft indicates the case is being prepared.
	CaseStatusDraft CaseStatus = "draft"
	// CaseStatusPublished indicates the case is open for responses.
	CaseStatusPublished CaseStatus = "published"
	// CaseStatusClosed indicates the case is no longer accepting responses.
	CaseStatusClosed CaseStatus = "closed"
)

// ImageCategory represents the type of medical image.
type ImageCategory string

const (
	// ImageCategoryXRay is a standard X-ray image.
	ImageCategoryXRay ImageCategory = "xray"
	// ImageCategoryTAC is a CT/TAC scan image.
	ImageCategoryTAC ImageCategory = "tac"
)

// Case represents a patient case created by an admin.
// Users can view published cases and submit classification responses.
type Case struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt   time.Time  `gorm:"index" json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	PublishedAt *time.Time `gorm:"index" json:"published_at,omitempty"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`

	// Admin who created the case
	CreatedBy uuid.UUID `gorm:"type:uuid;not null;index" json:"created_by"`

	// Case metadata
	Title       string     `gorm:"size:255;not null" json:"title"`
	Description string     `gorm:"type:text" json:"description,omitempty"`
	Status      CaseStatus `gorm:"size:20;not null;default:'draft';index" json:"status"`

	// Optional deadline for responses
	Deadline *time.Time `gorm:"index" json:"deadline,omitempty"`

	// Auto-computed from images - true if any TAC images exist
	HasTACImages bool `gorm:"default:false" json:"has_tac_images"`

	// Denormalized counters for efficient queries
	ResponseCount int `gorm:"default:0" json:"response_count"`
	UniqueUsers   int `gorm:"default:0" json:"unique_users"`

	// Gold Standard / Reference Classification for validation studies
	// Stores the "correct" classification to compare user responses against
	ReferenceClassification  datatypes.JSON `gorm:"type:jsonb" json:"reference_classification,omitempty" swaggertype:"object"`
	ShowReferenceAfterSubmit bool           `json:"show_reference_after_submit"`

	// Reference input (FractureInput) that produced the gold standard classification
	// Used for divergence analysis to compare answer paths
	ReferenceInput datatypes.JSON `gorm:"type:jsonb" json:"reference_input,omitempty" swaggertype:"object"`

	// Single Response Control - when false, users can only submit one response
	// Note: Default is set in NewCase(), not via GORM tag (GORM omits false values with default tags)
	AllowMultipleResponses bool `json:"allow_multiple_responses"`

	// Study membership - if set, this case is part of a study for multi-case reliability analysis
	StudyID   *uuid.UUID `gorm:"type:uuid;index" json:"study_id,omitempty"`
	CaseOrder int        `gorm:"default:0" json:"case_order"`
}

// TableName returns the table name for GORM.
func (Case) TableName() string {
	return "cases"
}

// NewCase creates a new case with the given parameters.
func NewCase(createdBy uuid.UUID, title, description string, deadline *time.Time) *Case {
	return &Case{
		ID:                     uuid.New(),
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
		CreatedBy:              createdBy,
		Title:                  title,
		Description:            description,
		Status:                 CaseStatusDraft,
		Deadline:               deadline,
		AllowMultipleResponses: true, // Default to allowing multiple responses
	}
}

// GetReferenceClassification parses and returns the reference classification.
func (c *Case) GetReferenceClassification() (*ClassificationResult, error) {
	if len(c.ReferenceClassification) == 0 {
		return nil, nil
	}

	var result ClassificationResult
	if err := json.Unmarshal(c.ReferenceClassification, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// SetReferenceClassification sets the reference classification from a ClassificationResult.
func (c *Case) SetReferenceClassification(result *ClassificationResult) error {
	if result == nil {
		c.ReferenceClassification = nil
		return nil
	}

	data, err := json.Marshal(result)
	if err != nil {
		return err
	}
	c.ReferenceClassification = datatypes.JSON(data)
	return nil
}

// HasReferenceClassification returns true if a reference classification is set.
func (c *Case) HasReferenceClassification() bool {
	return len(c.ReferenceClassification) > 0
}

// GetReferenceInput parses and returns the reference input (FractureInput).
func (c *Case) GetReferenceInput() (*FractureInput, error) {
	if len(c.ReferenceInput) == 0 {
		return nil, nil
	}

	var input FractureInput
	if err := json.Unmarshal(c.ReferenceInput, &input); err != nil {
		return nil, err
	}
	return &input, nil
}

// SetReferenceInput sets the reference input from a FractureInput.
func (c *Case) SetReferenceInput(input *FractureInput) error {
	if input == nil {
		c.ReferenceInput = nil
		return nil
	}

	data, err := json.Marshal(input)
	if err != nil {
		return err
	}
	c.ReferenceInput = datatypes.JSON(data)
	return nil
}

// HasReferenceInput returns true if a reference input is set.
func (c *Case) HasReferenceInput() bool {
	return len(c.ReferenceInput) > 0
}

// CanBeEdited returns true if the case can be modified.
func (c *Case) CanBeEdited() bool {
	return c.Status == CaseStatusDraft
}

// CanAcceptResponses returns true if the case is accepting responses.
func (c *Case) CanAcceptResponses() bool {
	if c.Status != CaseStatusPublished {
		return false
	}
	// Check deadline if set
	if c.Deadline != nil && time.Now().After(*c.Deadline) {
		return false
	}
	return true
}

// IsExpired returns true if the case deadline has passed.
func (c *Case) IsExpired() bool {
	return c.Deadline != nil && time.Now().After(*c.Deadline)
}

// SetStudy assigns this case to a study with a given case order.
func (c *Case) SetStudy(studyID uuid.UUID, caseOrder int) {
	c.StudyID = &studyID
	c.CaseOrder = caseOrder
}

// RemoveFromStudy removes this case from its study.
func (c *Case) RemoveFromStudy() {
	c.StudyID = nil
	c.CaseOrder = 0
}

// IsPublished returns true if the case is currently published.
func (c *Case) IsPublished() bool {
	return c.Status == CaseStatusPublished
}

// CanPublish checks whether this case can be published.
// Returns nil if publishing is allowed, or a domain error explaining why not.
func (c *Case) CanPublish(hasImages bool) error {
	if c.Status != CaseStatusDraft {
		return ErrInvalidStateTransition
	}
	if !hasImages {
		return ErrMissingImages
	}
	return nil
}

// CanClose checks whether this case can be closed.
// Returns nil if closing is allowed, or a domain error explaining why not.
func (c *Case) CanClose() error {
	if c.Status != CaseStatusPublished {
		return ErrInvalidStateTransition
	}
	return nil
}

// ValidateResponseSubmission checks whether a user can submit a response to this case.
// Admins always bypass validation. Returns nil if submission is allowed.
func (c *Case) ValidateResponseSubmission(isAdmin, hasResponded bool) error {
	if isAdmin {
		return nil
	}
	if !c.CanAcceptResponses() {
		if c.IsExpired() {
			return ErrDeadlinePassed
		}
		return ErrCaseNotAcceptingResponses
	}
	if !c.AllowMultipleResponses && hasResponded {
		return ErrAlreadyResponded
	}
	return nil
}

// ComparisonResult holds the comparison between a user's classification and the reference.
type ComparisonResult struct {
	DanisWeberMatch  bool    `json:"danis_weber_match"`
	LaugeHansenMatch bool    `json:"lauge_hansen_match"`
	AOOTAMatch       bool    `json:"ao_ota_match"`
	BartonicekMatch  bool    `json:"bartonicek_match"`
	OverallAccuracy  float64 `json:"overall_accuracy"`
}

// CompareWithReference compares the user's classification against the case's reference.
// Returns nil if there is no reference classification.
func (c *Case) CompareWithReference(userResult *ClassificationResult) *ComparisonResult {
	refClass, err := c.GetReferenceClassification()
	if err != nil || refClass == nil {
		return nil
	}

	result := &ComparisonResult{}
	matched := 0
	total := 0

	if userResult.DanisWeber != nil && refClass.DanisWeber != nil {
		total++
		if userResult.DanisWeber.Type == refClass.DanisWeber.Type {
			result.DanisWeberMatch = true
			matched++
		}
	}
	if userResult.LaugeHansen != nil && refClass.LaugeHansen != nil {
		total++
		if userResult.LaugeHansen.Type == refClass.LaugeHansen.Type {
			result.LaugeHansenMatch = true
			matched++
		}
	}
	if userResult.AOOTA != nil && refClass.AOOTA != nil {
		total++
		if userResult.AOOTA.Code == refClass.AOOTA.Code {
			result.AOOTAMatch = true
			matched++
		}
	}
	if userResult.Bartonicek != nil && refClass.Bartonicek != nil {
		total++
		if userResult.Bartonicek.Type == refClass.Bartonicek.Type {
			result.BartonicekMatch = true
			matched++
		}
	}

	if total > 0 {
		result.OverallAccuracy = float64(matched) / float64(total)
	}

	return result
}

// CaseImage represents an image attached to a case.
type CaseImage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CaseID    uuid.UUID `gorm:"type:uuid;not null;index" json:"case_id"`
	CreatedAt time.Time `json:"created_at"`

	// Image metadata
	Category     ImageCategory `gorm:"size:10;not null;index" json:"category"`
	DisplayOrder int           `gorm:"not null;default:0" json:"display_order"`
	Filename     string        `gorm:"size:255;not null" json:"filename"`
	ContentType  string        `gorm:"size:50;not null" json:"content_type"`
	SizeBytes    int64         `json:"size_bytes"`

	// Supabase Storage path (bucket/case_id/category/filename)
	StoragePath string `gorm:"size:500;not null" json:"-"`
}

// TableName returns the table name for GORM.
func (CaseImage) TableName() string {
	return "case_images"
}

// NewCaseImage creates a new case image.
func NewCaseImage(
	caseID uuid.UUID,
	category ImageCategory,
	displayOrder int,
	filename, contentType string,
	sizeBytes int64,
	storagePath string,
) *CaseImage {
	return &CaseImage{
		ID:           uuid.New(),
		CaseID:       caseID,
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

// CaseResponse represents a user's classification response to a case.
type CaseResponse struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CaseID    uuid.UUID `gorm:"type:uuid;not null;index" json:"case_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`

	// Classification data (JSONB in PostgreSQL)
	Classification datatypes.JSON `gorm:"not null" json:"classification" swaggertype:"object"`

	// Time taken to complete classification in milliseconds
	TimeTakenMS int64 `gorm:"column:time_taken_ms" json:"time_taken_ms"`

	// Denormalized fields for analytics queries
	DanisWeberType  *string `gorm:"column:danis_weber_type;size:10;index" json:"-"`
	LaugeHansenType *string `gorm:"column:lauge_hansen_type;size:20;index" json:"-"`
	AOOTACode       *string `gorm:"column:ao_ota_code;size:20;index" json:"-"`
	BartonicekType  *string `gorm:"column:bartonicek_type;size:15;index" json:"-"`

	// Answer path tracking for divergence analysis
	AnswerPath      datatypes.JSON `gorm:"type:jsonb" json:"answer_path,omitempty" swaggertype:"array,object"` // []QuestionAnswer
	DecisionPath    string         `gorm:"size:500;index" json:"decision_path,omitempty"`                      // "lateral_only→transindesmal→spiral"
	TimePerQuestion datatypes.JSON `gorm:"type:jsonb" json:"time_per_question,omitempty" swaggertype:"object"` // map[string]int64
	BackClicks      int            `gorm:"default:0" json:"back_clicks,omitempty"`                             // Back button usage count
}

// TableName returns the table name for GORM.
func (CaseResponse) TableName() string {
	return "case_responses"
}

// AnswerTracking contains the answer path tracking data submitted with a response.
type AnswerTracking struct {
	AnswerPath      []QuestionAnswer `json:"answer_path,omitempty"`
	DecisionPath    string           `json:"decision_path,omitempty"`
	TimePerQuestion map[string]int64 `json:"time_per_question,omitempty"`
	BackClicks      int              `json:"back_clicks,omitempty"`
}

// NewCaseResponse creates a new case response with denormalized fields extracted.
func NewCaseResponse(
	caseID, userID uuid.UUID,
	result ClassificationResult,
	timeTakenMS int64,
) (*CaseResponse, error) {
	classificationJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	response := &CaseResponse{
		ID:             uuid.New(),
		CaseID:         caseID,
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

// NewCaseResponseWithTracking creates a new case response with answer tracking data.
func NewCaseResponseWithTracking(
	caseID, userID uuid.UUID,
	result ClassificationResult,
	timeTakenMS int64,
	tracking *AnswerTracking,
) (*CaseResponse, error) {
	response, err := NewCaseResponse(caseID, userID, result, timeTakenMS)
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
func (r *CaseResponse) GetAnswerPath() ([]QuestionAnswer, error) {
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
func (r *CaseResponse) GetTimePerQuestion() (map[string]int64, error) {
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
func (r *CaseResponse) GetClassification() (*ClassificationResult, error) {
	if len(r.Classification) == 0 {
		return nil, nil
	}

	var result ClassificationResult
	if err := json.Unmarshal(r.Classification, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// CaseWithImages represents a case with its associated images.
type CaseWithImages struct {
	Case
	Images []CaseImage `json:"images"`
}

// CaseListItem represents a case in list views with summary info.
type CaseListItem struct {
	ID            uuid.UUID  `json:"id"`
	Title         string     `json:"title"`
	Description   string     `json:"description,omitempty"`
	Status        CaseStatus `json:"status"`
	Deadline      *time.Time `json:"deadline,omitempty"`
	PublishedAt   *time.Time `json:"published_at,omitempty"`
	HasTACImages  bool       `json:"has_tac_images"`
	ResponseCount int        `json:"response_count"`
	UniqueUsers   int        `json:"unique_users"`
	ImageCount    int        `json:"image_count"`
}

// UserCaseView represents how a user sees a published case.
type UserCaseView struct {
	Case
	Images          []CaseImage `json:"images"`
	HasResponded    bool        `json:"has_responded"`
	MyResponseCount int         `json:"my_response_count"`
}

// CaseAnalyticsSummary contains aggregated case response data.
type CaseAnalyticsSummary struct {
	CaseID            uuid.UUID        `json:"case_id"`
	Title             string           `json:"title"`
	Status            CaseStatus       `json:"status"`
	ResponseCount     int64            `json:"response_count"`
	UniqueRespondents int64            `json:"unique_respondents"`
	AvgTimeTakenMS    float64          `json:"avg_time_taken_ms"`
	DanisWeberDist    map[string]int64 `json:"danis_weber_distribution"`
	LaugeHansenDist   map[string]int64 `json:"lauge_hansen_distribution"`
	AOOTADist         map[string]int64 `json:"ao_ota_distribution"`
	BartonicekDist    map[string]int64 `json:"bartonicek_distribution"`
}
