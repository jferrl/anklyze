// ============================================================================
// Research Dataset Types
// Matching backend responses from /api/admin/research/datasets endpoints
// ============================================================================

export type DatasetStatus = 'draft' | 'importing' | 'ready' | 'error'

export interface Dataset {
  id: string
  name: string
  description?: string
  status: DatasetStatus
  record_count: number
  original_filename?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface DatasetListResponse {
  datasets: Dataset[]
  total: number
}

// ============================================================================
// Import Pipeline Types
// ============================================================================

export interface PipelineStats {
  total_rows: number
  valid_records: number
  partial_records: number
  empty_rows_removed: number
  empty_cols_removed: number
  cells_cleaned: number
  dates_normalized: number
  enums_mapped: number
  ai_extractions: number
  ai_fallbacks: number
  warnings_count: number
  errors_count: number
}

export interface ValidationIssue {
  row: number
  column: string
  message: string
  severity: 'error' | 'warning'
  value?: string
}

export interface LogEntry {
  row: number
  column: string
  original_value: string
  normalized_value: string
  action: string
  severity: string
}

export interface ImportResult {
  stats: PipelineStats
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  ai_used: boolean
}

export interface ImportLogResponse {
  entries: ImportLogEntry[]
  total: number
}

export interface ImportLogEntry {
  row: number
  column: string
  original_value: string
  normalized_value: string
  action: string
  severity: string
  created_at: string
}

// ============================================================================
// Dataset Record Types
// ============================================================================

export interface DatasetRecord {
  id: string
  dataset_id: string
  internal_code: string
  age?: number
  sex: string
  height_cm?: number
  weight_kg?: number
  bmi?: number
  bmi_category: string
  vitamin_d?: number
  vitamin_d_category: string
  age_group: string
  fracture_date?: string
  er_date?: string
  laterality: string
  injury_mechanism: string
  trauma_energy: string
  open_closed: string
  associated_injuries: string[]
  emergency_treatment: string
  pre_surgical_complications: string[]
  definitive_surgery_date?: string
  days_to_surgery?: number
  surgery_reason: string
  approaches: string[]
  syndesmosis_repair: boolean
  syndesmosis_type: string
  preop_ct: boolean
  anticoagulation: boolean
  secondary_displacement: boolean
  displacement_treatment: string
  postop_complications: string[]
  operative_notes: string
  classification_source: string
  created_at: string
  updated_at: string
}

export interface RecordsResponse {
  records: DatasetRecord[]
  total: number
  page: number
  limit: number
}

export interface RecordFilters {
  sex?: string
  trauma_energy?: string
  age_min?: string
  age_max?: string
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface NumericStats {
  mean: number
  median: number
  min: number
  max: number
  std_dev: number
  count: number
}

export interface DemographicStats {
  total_records: number
  age_stats?: NumericStats
  sex_distribution: Record<string, number>
  bmi_stats?: NumericStats
  bmi_distribution: Record<string, number>
  vitamin_d_stats?: NumericStats
  age_group_distribution: Record<string, number>
}

export interface FractureStats {
  total_records: number
  laterality_distribution: Record<string, number>
  mechanism_distribution: Record<string, number>
  trauma_energy_distribution: Record<string, number>
  open_closed_distribution: Record<string, number>
}

export interface SurgicalStats {
  total_records: number
  emergency_treatment_distribution: Record<string, number>
  days_to_surgery_stats?: NumericStats
  syndesmosis_repair_count: number
  preop_ct_count: number
  approach_distribution: Record<string, number>
}

export interface OutcomeStats {
  total_records: number
  secondary_displacement_count: number
  complication_distribution: Record<string, number>
}
