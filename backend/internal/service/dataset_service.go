package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/normalization"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/lib/pq"
)

// DatasetService orchestrates dataset operations.
type DatasetService struct {
	repo      repository.DatasetRepository
	llmClient normalization.LLMClient
}

// NewDatasetService creates a new dataset service.
func NewDatasetService(repo repository.DatasetRepository, llmClient normalization.LLMClient) *DatasetService {
	return &DatasetService{
		repo:      repo,
		llmClient: llmClient,
	}
}

// CreateDataset creates a new dataset.
func (s *DatasetService) CreateDataset(ctx context.Context, name, description, createdBy string) (*domain.Dataset, error) {
	if name == "" {
		return nil, fmt.Errorf("%w: name is required", domain.ErrInvalidInput)
	}
	if createdBy == "" {
		return nil, fmt.Errorf("%w: created_by is required", domain.ErrInvalidInput)
	}

	ds := domain.NewDataset(name, description, "", createdBy)
	if err := s.repo.CreateDataset(ctx, ds); err != nil {
		return nil, fmt.Errorf("create dataset: %w", err)
	}
	return ds, nil
}

// GetDataset retrieves a dataset by ID.
func (s *DatasetService) GetDataset(ctx context.Context, id uuid.UUID) (*domain.Dataset, error) {
	ds, err := s.repo.GetDataset(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get dataset: %w", err)
	}
	if ds == nil {
		return nil, domain.ErrNotFound
	}
	return ds, nil
}

// ListDatasets lists datasets for a given creator.
func (s *DatasetService) ListDatasets(ctx context.Context, createdBy string) ([]domain.Dataset, error) {
	datasets, err := s.repo.ListDatasets(ctx, createdBy)
	if err != nil {
		return nil, fmt.Errorf("list datasets: %w", err)
	}
	return datasets, nil
}

// DeleteDataset deletes a dataset.
func (s *DatasetService) DeleteDataset(ctx context.Context, id uuid.UUID) error {
	ds, err := s.repo.GetDataset(ctx, id)
	if err != nil {
		return fmt.Errorf("get dataset: %w", err)
	}
	if ds == nil {
		return domain.ErrNotFound
	}
	if err := s.repo.DeleteDataset(ctx, id); err != nil {
		return fmt.Errorf("delete dataset: %w", err)
	}
	return nil
}

// ImportCSV runs the normalization pipeline on CSV data and stores the results.
func (s *DatasetService) ImportCSV(ctx context.Context, datasetID uuid.UUID, csvData []byte, filename string) (*normalization.PipelineResult, error) {
	ds, err := s.repo.GetDataset(ctx, datasetID)
	if err != nil {
		return nil, fmt.Errorf("get dataset: %w", err)
	}
	if ds == nil {
		return nil, domain.ErrNotFound
	}

	// Update status to importing
	ds.Status = domain.DatasetStatusImporting
	ds.OriginalFilename = filename
	if err := s.repo.UpdateDataset(ctx, ds); err != nil {
		return nil, fmt.Errorf("update dataset status: %w", err)
	}

	// Run normalization pipeline
	result, err := normalization.Run(csvData, normalization.PipelineConfig{
		LLMClient: s.llmClient,
		Language:  "es",
	})
	if err != nil {
		ds.Status = domain.DatasetStatusError
		_ = s.repo.UpdateDataset(ctx, ds)
		return nil, fmt.Errorf("normalization pipeline: %w", err)
	}

	// Check for blocking errors
	if len(result.Errors) > 0 {
		ds.Status = domain.DatasetStatusError
		_ = s.repo.UpdateDataset(ctx, ds)

		// Still save logs for inspection
		logEntries := convertLogEntries(datasetID, result.Log)
		if len(logEntries) > 0 {
			_ = s.repo.BulkCreateImportLog(ctx, logEntries)
		}

		return result, nil
	}

	// Convert normalized records to domain records
	records := convertToDatasetRecords(datasetID, result.Records)
	if len(records) > 0 {
		if err := s.repo.BulkCreateRecords(ctx, records); err != nil {
			ds.Status = domain.DatasetStatusError
			_ = s.repo.UpdateDataset(ctx, ds)
			return nil, fmt.Errorf("bulk create records: %w", err)
		}
	}

	// Save import log
	logEntries := convertLogEntries(datasetID, result.Log)
	if len(logEntries) > 0 {
		if err := s.repo.BulkCreateImportLog(ctx, logEntries); err != nil {
			// Non-blocking: log save failure doesn't fail the import
			_ = err
		}
	}

	// Update dataset to ready
	ds.Status = domain.DatasetStatusReady
	ds.RecordCount = len(records)
	if err := s.repo.UpdateDataset(ctx, ds); err != nil {
		return nil, fmt.Errorf("update dataset: %w", err)
	}

	return result, nil
}

// DemographicStats contains demographic statistics for a dataset.
type DemographicStats struct {
	TotalRecords     int                `json:"total_records"`
	AgeStats         *NumericStats      `json:"age_stats,omitempty"`
	SexDistribution  map[string]int     `json:"sex_distribution"`
	BMIStats         *NumericStats      `json:"bmi_stats,omitempty"`
	BMIDistribution  map[string]int     `json:"bmi_distribution"`
	VitaminDStats    *NumericStats      `json:"vitamin_d_stats,omitempty"`
	AgeGroupDist     map[string]int     `json:"age_group_distribution"`
}

// NumericStats holds descriptive statistics for a numeric field.
type NumericStats struct {
	Mean   float64 `json:"mean"`
	Median float64 `json:"median"`
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	StdDev float64 `json:"std_dev"`
	Count  int     `json:"count"`
}

// FractureStats contains fracture-related statistics.
type FractureStats struct {
	TotalRecords            int            `json:"total_records"`
	LateralityDistribution  map[string]int `json:"laterality_distribution"`
	MechanismDistribution   map[string]int `json:"mechanism_distribution"`
	TraumaEnergyDistribution map[string]int `json:"trauma_energy_distribution"`
	OpenClosedDistribution  map[string]int `json:"open_closed_distribution"`
}

// SurgicalStats contains surgical statistics.
type SurgicalStats struct {
	TotalRecords                int            `json:"total_records"`
	EmergencyTreatmentDist      map[string]int `json:"emergency_treatment_distribution"`
	DaysToSurgeryStats          *NumericStats  `json:"days_to_surgery_stats,omitempty"`
	SyndesmosisRepairCount      int            `json:"syndesmosis_repair_count"`
	PreopCTCount                int            `json:"preop_ct_count"`
	ApproachDistribution        map[string]int `json:"approach_distribution"`
}

// OutcomeStats contains outcome statistics.
type OutcomeStats struct {
	TotalRecords              int            `json:"total_records"`
	SecondaryDisplacementCount int            `json:"secondary_displacement_count"`
	ComplicationDistribution  map[string]int `json:"complication_distribution"`
}

// GetDemographicStats computes demographic statistics for a dataset.
func (s *DatasetService) GetDemographicStats(ctx context.Context, datasetID uuid.UUID, filters map[string]interface{}) (*DemographicStats, error) {
	records, total, err := s.repo.GetRecords(ctx, datasetID, filters, 0, math.MaxInt32)
	if err != nil {
		return nil, fmt.Errorf("get records: %w", err)
	}

	stats := &DemographicStats{
		TotalRecords:    int(total),
		SexDistribution: make(map[string]int),
		BMIDistribution: make(map[string]int),
		AgeGroupDist:    make(map[string]int),
	}

	var ages, bmis, vitDs []float64
	for _, r := range records {
		if r.Age != nil {
			ages = append(ages, float64(*r.Age))
		}
		if r.Sex != "" {
			stats.SexDistribution[r.Sex]++
		}
		if r.BMI != nil {
			bmis = append(bmis, *r.BMI)
		}
		if r.BMICategory != "" {
			stats.BMIDistribution[r.BMICategory]++
		}
		if r.VitaminD != nil {
			vitDs = append(vitDs, *r.VitaminD)
		}
		if r.AgeGroup != "" {
			stats.AgeGroupDist[r.AgeGroup]++
		}
	}

	stats.AgeStats = computeNumericStats(ages)
	stats.BMIStats = computeNumericStats(bmis)
	stats.VitaminDStats = computeNumericStats(vitDs)

	return stats, nil
}

// GetFractureStats computes fracture-related statistics.
func (s *DatasetService) GetFractureStats(ctx context.Context, datasetID uuid.UUID, filters map[string]interface{}) (*FractureStats, error) {
	records, total, err := s.repo.GetRecords(ctx, datasetID, filters, 0, math.MaxInt32)
	if err != nil {
		return nil, fmt.Errorf("get records: %w", err)
	}

	stats := &FractureStats{
		TotalRecords:            int(total),
		LateralityDistribution:  make(map[string]int),
		MechanismDistribution:   make(map[string]int),
		TraumaEnergyDistribution: make(map[string]int),
		OpenClosedDistribution:  make(map[string]int),
	}

	for _, r := range records {
		if r.Laterality != "" {
			stats.LateralityDistribution[r.Laterality]++
		}
		if r.InjuryMechanism != "" {
			stats.MechanismDistribution[r.InjuryMechanism]++
		}
		if r.TraumaEnergy != "" {
			stats.TraumaEnergyDistribution[r.TraumaEnergy]++
		}
		if r.OpenClosed != "" {
			stats.OpenClosedDistribution[r.OpenClosed]++
		}
	}

	return stats, nil
}

// GetSurgicalStats computes surgical statistics.
func (s *DatasetService) GetSurgicalStats(ctx context.Context, datasetID uuid.UUID, filters map[string]interface{}) (*SurgicalStats, error) {
	records, total, err := s.repo.GetRecords(ctx, datasetID, filters, 0, math.MaxInt32)
	if err != nil {
		return nil, fmt.Errorf("get records: %w", err)
	}

	stats := &SurgicalStats{
		TotalRecords:           int(total),
		EmergencyTreatmentDist: make(map[string]int),
		ApproachDistribution:   make(map[string]int),
	}

	var daysToSurgery []float64
	for _, r := range records {
		if r.EmergencyTreatment != "" {
			stats.EmergencyTreatmentDist[r.EmergencyTreatment]++
		}
		if r.DaysToSurgery != nil {
			daysToSurgery = append(daysToSurgery, float64(*r.DaysToSurgery))
		}
		if r.SyndesmosisRepair {
			stats.SyndesmosisRepairCount++
		}
		if r.PreopCT {
			stats.PreopCTCount++
		}
		for _, a := range r.Approaches {
			stats.ApproachDistribution[a]++
		}
	}

	stats.DaysToSurgeryStats = computeNumericStats(daysToSurgery)

	return stats, nil
}

// GetOutcomeStats computes outcome statistics.
func (s *DatasetService) GetOutcomeStats(ctx context.Context, datasetID uuid.UUID, filters map[string]interface{}) (*OutcomeStats, error) {
	records, total, err := s.repo.GetRecords(ctx, datasetID, filters, 0, math.MaxInt32)
	if err != nil {
		return nil, fmt.Errorf("get records: %w", err)
	}

	stats := &OutcomeStats{
		TotalRecords:             int(total),
		ComplicationDistribution: make(map[string]int),
	}

	for _, r := range records {
		if r.SecondaryDisplacement {
			stats.SecondaryDisplacementCount++
		}
		for _, c := range r.PostopComplications {
			stats.ComplicationDistribution[c]++
		}
	}

	return stats, nil
}

// ExportCSV generates CSV bytes from dataset records.
func (s *DatasetService) ExportCSV(ctx context.Context, datasetID uuid.UUID) ([]byte, error) {
	ds, err := s.repo.GetDataset(ctx, datasetID)
	if err != nil {
		return nil, fmt.Errorf("get dataset: %w", err)
	}
	if ds == nil {
		return nil, domain.ErrNotFound
	}

	records, _, err := s.repo.GetRecords(ctx, datasetID, nil, 0, math.MaxInt32)
	if err != nil {
		return nil, fmt.Errorf("get records: %w", err)
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	headers := []string{
		"internal_code", "age", "sex", "height_cm", "weight_kg", "bmi", "bmi_category",
		"vitamin_d", "vitamin_d_category", "age_group",
		"fracture_date", "er_date", "laterality", "injury_mechanism", "trauma_energy", "open_closed",
		"associated_injuries",
		"emergency_treatment", "pre_surgical_complications",
		"definitive_surgery_date", "days_to_surgery", "surgery_reason",
		"approaches", "syndesmosis_repair", "syndesmosis_type", "preop_ct", "anticoagulation",
		"secondary_displacement", "displacement_treatment", "postop_complications",
		"operative_notes", "classification_source",
	}
	if err := w.Write(headers); err != nil {
		return nil, fmt.Errorf("write CSV headers: %w", err)
	}

	for _, r := range records {
		row := []string{
			r.InternalCode,
			optionalInt(r.Age),
			r.Sex,
			optionalFloat(r.HeightCm),
			optionalFloat(r.WeightKg),
			optionalFloat(r.BMI),
			r.BMICategory,
			optionalFloat(r.VitaminD),
			r.VitaminDCategory,
			r.AgeGroup,
			optionalDate(r.FractureDate),
			optionalDate(r.ERDate),
			r.Laterality,
			r.InjuryMechanism,
			r.TraumaEnergy,
			r.OpenClosed,
			joinStrings(r.AssociatedInjuries),
			r.EmergencyTreatment,
			joinStrings(r.PreSurgicalComplications),
			optionalDate(r.DefinitiveSurgeryDate),
			optionalInt(r.DaysToSurgery),
			r.SurgeryReason,
			joinStrings(r.Approaches),
			strconv.FormatBool(r.SyndesmosisRepair),
			r.SyndesmosisType,
			strconv.FormatBool(r.PreopCT),
			strconv.FormatBool(r.Anticoagulation),
			strconv.FormatBool(r.SecondaryDisplacement),
			r.DisplacementTreatment,
			joinStrings(r.PostopComplications),
			r.OperativeNotes,
			r.ClassificationSource,
		}
		if err := w.Write(row); err != nil {
			return nil, fmt.Errorf("write CSV row: %w", err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("flush CSV: %w", err)
	}

	return buf.Bytes(), nil
}

// GetImportLog returns the import log for a dataset.
func (s *DatasetService) GetImportLog(ctx context.Context, datasetID uuid.UUID) ([]domain.ImportLogEntry, error) {
	ds, err := s.repo.GetDataset(ctx, datasetID)
	if err != nil {
		return nil, fmt.Errorf("get dataset: %w", err)
	}
	if ds == nil {
		return nil, domain.ErrNotFound
	}
	entries, err := s.repo.GetImportLog(ctx, datasetID)
	if err != nil {
		return nil, fmt.Errorf("get import log: %w", err)
	}
	return entries, nil
}

// GetRecords returns paginated records for a dataset.
func (s *DatasetService) GetRecords(ctx context.Context, datasetID uuid.UUID, filters map[string]interface{}, offset, limit int) ([]domain.DatasetRecord, int64, error) {
	ds, err := s.repo.GetDataset(ctx, datasetID)
	if err != nil {
		return nil, 0, fmt.Errorf("get dataset: %w", err)
	}
	if ds == nil {
		return nil, 0, domain.ErrNotFound
	}
	return s.repo.GetRecords(ctx, datasetID, filters, offset, limit)
}

// --- Helpers ---

func convertToDatasetRecords(datasetID uuid.UUID, normalized []normalization.NormalizedRecord) []domain.DatasetRecord {
	records := make([]domain.DatasetRecord, 0, len(normalized))
	now := time.Now()

	for _, nr := range normalized {
		rawJSON, _ := json.Marshal(nr.RawData)

		r := domain.DatasetRecord{
			ID:           uuid.New(),
			DatasetID:    datasetID,
			InternalCode: nr.InternalCode,
			Age:          nr.Age,
			Sex:          nr.Sex,
			HeightCm:     nr.HeightCm,
			WeightKg:     nr.WeightKg,
			BMI:          nr.BMI,
			BMICategory:  nr.BMICategory,
			VitaminD:     nr.VitaminD,
			VitaminDCategory: nr.VitaminDCategory,
			AgeGroup:     nr.AgeGroup,
			FractureDate: nr.FractureDate,
			ERDate:       nr.ERDate,
			Laterality:   nr.Laterality,
			InjuryMechanism:  nr.InjuryMechanism,
			TraumaEnergy:     nr.TraumaEnergy,
			OpenClosed:       nr.OpenClosed,
			AssociatedInjuries: pq.StringArray(nr.AssociatedInjuries),
			EmergencyTreatment:       nr.EmergencyTreatment,
			PreSurgicalComplications: pq.StringArray(nr.PreSurgicalComplications),
			DefinitiveSurgeryDate:    nr.SurgeryDate,
			DaysToSurgery:            nr.DaysToSurgery,
			SurgeryReason:            nr.SurgeryReason,
			Approaches:               pq.StringArray(nr.Approaches),
			SyndesmosisRepair:        nr.SyndesmosisRepair,
			SyndesmosisType:          nr.SyndesmosisType,
			PreopCT:                  nr.PreopCT,
			Anticoagulation:          nr.Anticoagulation,
			SecondaryDisplacement:    nr.SecondaryDisplacement,
			DisplacementTreatment:    nr.DisplacementTreatment,
			PostopComplications:      pq.StringArray(nr.PostopComplications),
			OperativeNotes:           nr.OperativeNotes,
			RawData:                  rawJSON,
			CreatedAt:                now,
			UpdatedAt:                now,
		}

		// Use InternalCode from raw data if not set
		if r.InternalCode == "" {
			if code, ok := nr.RawData["internal_code"]; ok {
				r.InternalCode = code
			} else {
				r.InternalCode = fmt.Sprintf("R%04d", nr.RowNumber)
			}
		}

		records = append(records, r)
	}

	return records
}

func convertLogEntries(datasetID uuid.UUID, entries []normalization.LogEntry) []domain.ImportLogEntry {
	result := make([]domain.ImportLogEntry, 0, len(entries))
	now := time.Now()

	for _, e := range entries {
		result = append(result, domain.ImportLogEntry{
			DatasetID:       datasetID,
			Row:             e.Row,
			Column:          e.Column,
			OriginalValue:   e.OriginalValue,
			NormalizedValue: e.NormalizedValue,
			Action:          e.Action,
			Severity:        e.Severity,
			CreatedAt:       now,
		})
	}

	return result
}

func computeNumericStats(values []float64) *NumericStats {
	if len(values) == 0 {
		return nil
	}

	sort.Float64s(values)
	n := len(values)
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	mean := sum / float64(n)

	var median float64
	if n%2 == 0 {
		median = (values[n/2-1] + values[n/2]) / 2
	} else {
		median = values[n/2]
	}

	variance := 0.0
	for _, v := range values {
		diff := v - mean
		variance += diff * diff
	}
	if n > 1 {
		variance /= float64(n - 1)
	}

	return &NumericStats{
		Mean:   math.Round(mean*100) / 100,
		Median: math.Round(median*100) / 100,
		Min:    values[0],
		Max:    values[n-1],
		StdDev: math.Round(math.Sqrt(variance)*100) / 100,
		Count:  n,
	}
}

func optionalInt(v *int) string {
	if v == nil {
		return ""
	}
	return strconv.Itoa(*v)
}

func optionalFloat(v *float64) string {
	if v == nil {
		return ""
	}
	return strconv.FormatFloat(*v, 'f', -1, 64)
}

func optionalDate(v *time.Time) string {
	if v == nil {
		return ""
	}
	return v.Format("2006-01-02")
}

func joinStrings(ss pq.StringArray) string {
	if len(ss) == 0 {
		return ""
	}
	result := ""
	for i, s := range ss {
		if i > 0 {
			result += ","
		}
		result += s
	}
	return result
}

