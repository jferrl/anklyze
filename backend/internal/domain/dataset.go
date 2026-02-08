package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/datatypes"
)

// DatasetStatus represents the lifecycle state of a dataset.
type DatasetStatus string

const (
	DatasetStatusDraft     DatasetStatus = "draft"
	DatasetStatusImporting DatasetStatus = "importing"
	DatasetStatusReady     DatasetStatus = "ready"
	DatasetStatusError     DatasetStatus = "error"
)

// BMICategory represents a BMI classification.
type BMICategory string

const (
	BMICategoryUnderweight    BMICategory = "underweight"
	BMICategoryNormal         BMICategory = "normal"
	BMICategoryOverweight     BMICategory = "overweight"
	BMICategoryObesityClass1  BMICategory = "obesity_class_1"
	BMICategoryObesityClass2  BMICategory = "obesity_class_2"
	BMICategoryObesityClass3  BMICategory = "obesity_class_3"
)

// VitaminDCategory represents a vitamin D level classification.
type VitaminDCategory string

const (
	VitaminDSevereDeficiency VitaminDCategory = "severe_deficiency"
	VitaminDDeficiency       VitaminDCategory = "deficiency"
	VitaminDInsufficiency    VitaminDCategory = "insufficiency"
	VitaminDSufficiency      VitaminDCategory = "sufficiency"
)

// AgeGroup represents an age group classification.
type AgeGroup string

const (
	AgeGroupYoungAdult  AgeGroup = "young_adult"
	AgeGroupMiddleAged  AgeGroup = "middle_aged"
	AgeGroupYoungElderly AgeGroup = "young_elderly"
	AgeGroupOldElderly  AgeGroup = "old_elderly"
)

// TraumaEnergy represents the energy level of a trauma.
type TraumaEnergy string

const (
	TraumaEnergyHigh TraumaEnergy = "high"
	TraumaEnergyLow  TraumaEnergy = "low"
)

// ClassificationSource represents the source of a classification.
type ClassificationSource string

const (
	ClassificationSourceAuto   ClassificationSource = "auto"
	ClassificationSourceManual ClassificationSource = "manual"
	ClassificationSourceNone   ClassificationSource = "none"
)

// ImportLogSeverity represents the severity of an import log entry.
type ImportLogSeverity string

const (
	ImportLogSeverityInfo    ImportLogSeverity = "info"
	ImportLogSeverityWarning ImportLogSeverity = "warning"
	ImportLogSeverityError   ImportLogSeverity = "error"
)

// Dataset represents a research dataset uploaded by a researcher.
type Dataset struct {
	ID               uuid.UUID     `gorm:"type:uuid;primaryKey" json:"id"`
	Name             string        `gorm:"size:255;not null" json:"name"`
	Description      string        `gorm:"type:text" json:"description,omitempty"`
	Status           DatasetStatus `gorm:"size:20;not null;default:'draft';index" json:"status"`
	RecordCount      int           `gorm:"default:0" json:"record_count"`
	OriginalFilename string        `gorm:"size:500" json:"original_filename,omitempty"`
	CreatedBy        string        `gorm:"size:255;not null;index" json:"created_by"`
	CreatedAt        time.Time     `gorm:"index" json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
}

// TableName returns the table name for GORM.
func (Dataset) TableName() string {
	return "datasets"
}

// NewDataset creates a new dataset with the given parameters.
func NewDataset(name, description, originalFilename, createdBy string) *Dataset {
	return &Dataset{
		ID:               uuid.New(),
		Name:             name,
		Description:      description,
		Status:           DatasetStatusDraft,
		OriginalFilename: originalFilename,
		CreatedBy:        createdBy,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
}

// DatasetRecord represents a single anonymized patient record within a dataset.
type DatasetRecord struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	DatasetID    uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:idx_dataset_internal_code" json:"dataset_id"`
	InternalCode string    `gorm:"size:50;not null;uniqueIndex:idx_dataset_internal_code" json:"internal_code"`

	// Demographics
	Age         *int     `json:"age,omitempty"`
	Sex         string   `gorm:"size:10" json:"sex,omitempty"`
	HeightCm    *float64 `json:"height_cm,omitempty"`
	WeightKg    *float64 `json:"weight_kg,omitempty"`
	BMI         *float64 `json:"bmi,omitempty"`
	BMICategory string   `gorm:"size:20" json:"bmi_category,omitempty"`

	// Clinical
	VitaminD         *float64 `json:"vitamin_d,omitempty"`
	VitaminDCategory string   `gorm:"size:30" json:"vitamin_d_category,omitempty"`
	AgeGroup         string   `gorm:"size:20" json:"age_group,omitempty"`

	// Injury details
	FractureDate     *time.Time `json:"fracture_date,omitempty"`
	ERDate           *time.Time `json:"er_date,omitempty"`
	Laterality       string     `gorm:"size:20" json:"laterality,omitempty"`
	InjuryMechanism  string     `gorm:"size:50" json:"injury_mechanism,omitempty"`
	TraumaEnergy     string     `gorm:"size:10" json:"trauma_energy,omitempty"`
	OpenClosed       string     `gorm:"size:30" json:"open_closed,omitempty"`
	AssociatedInjuries pq.StringArray `gorm:"type:text[]" json:"associated_injuries,omitempty"`

	// Treatment
	EmergencyTreatment       string         `gorm:"size:50" json:"emergency_treatment,omitempty"`
	PreSurgicalComplications pq.StringArray `gorm:"type:text[]" json:"pre_surgical_complications,omitempty"`
	DefinitiveSurgeryDate    *time.Time     `json:"definitive_surgery_date,omitempty"`
	DaysToSurgery            *int           `json:"days_to_surgery,omitempty"`
	SurgeryReason            string         `gorm:"size:255" json:"surgery_reason,omitempty"`
	Approaches               pq.StringArray `gorm:"type:text[]" json:"approaches,omitempty"`
	SyndesmosisRepair        bool           `gorm:"default:false" json:"syndesmosis_repair"`
	SyndesmosisType          string         `gorm:"size:50" json:"syndesmosis_type,omitempty"`
	PreopCT                  bool           `gorm:"default:false" json:"preop_ct"`
	Anticoagulation          bool           `gorm:"default:false" json:"anticoagulation"`

	// Outcomes
	SecondaryDisplacement bool           `gorm:"default:false" json:"secondary_displacement"`
	DisplacementTreatment string         `gorm:"size:100" json:"displacement_treatment,omitempty"`
	PostopComplications   pq.StringArray `gorm:"type:text[]" json:"postop_complications,omitempty"`

	// Notes and classification
	OperativeNotes       string               `gorm:"type:text" json:"operative_notes,omitempty"`
	ClassificationSource string               `gorm:"size:10" json:"classification_source,omitempty"`
	RawData              datatypes.JSON       `gorm:"type:jsonb" json:"raw_data,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for GORM.
func (DatasetRecord) TableName() string {
	return "dataset_records"
}

// ImportLogEntry represents a single import log entry tracking data normalization actions.
type ImportLogEntry struct {
	ID              uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	DatasetID       uuid.UUID `gorm:"type:uuid;not null;index" json:"dataset_id"`
	Row             int       `json:"row"`
	Column          string    `gorm:"size:100" json:"column"`
	OriginalValue   string    `gorm:"type:text" json:"original_value"`
	NormalizedValue string    `gorm:"type:text" json:"normalized_value"`
	Action          string    `gorm:"size:50" json:"action"`
	Severity        string    `gorm:"size:10" json:"severity"`
	CreatedAt       time.Time `json:"created_at"`
}

// TableName returns the table name for GORM.
func (ImportLogEntry) TableName() string {
	return "import_log_entries"
}

// DatasetFilter represents a saved filter view for a dataset.
type DatasetFilter struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	DatasetID uuid.UUID      `gorm:"type:uuid;not null;index" json:"dataset_id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Filters   datatypes.JSON `gorm:"type:jsonb" json:"filters"`
	CreatedBy string         `gorm:"size:255;not null" json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
}

// TableName returns the table name for GORM.
func (DatasetFilter) TableName() string {
	return "dataset_filters"
}

// NewDatasetFilter creates a new saved filter.
func NewDatasetFilter(datasetID uuid.UUID, name, createdBy string, filters datatypes.JSON) *DatasetFilter {
	return &DatasetFilter{
		ID:        uuid.New(),
		DatasetID: datasetID,
		Name:      name,
		Filters:   filters,
		CreatedBy: createdBy,
		CreatedAt: time.Now(),
	}
}
