import type {
  Dataset,
  ImportResult,
  DemographicStats,
  FractureStats,
  SurgicalStats,
  OutcomeStats,
  DatasetRecord,
  ImportLogEntry,
} from '@/services/research/types'

// ============================================================================
// Dataset Mock Data
// ============================================================================

export const mockDataset: Dataset = {
  id: 'ds-001',
  name: 'Ankle Fractures 2024',
  description: 'Prospective cohort study dataset',
  status: 'ready',
  record_count: 150,
  original_filename: 'ankle_fractures_2024.csv',
  created_by: 'admin',
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-06-15T00:00:00Z',
}

export const mockDraftDataset: Dataset = {
  id: 'ds-002',
  name: 'New Dataset',
  status: 'draft',
  record_count: 0,
  created_by: 'admin',
  created_at: '2024-07-01T00:00:00Z',
  updated_at: '2024-07-01T00:00:00Z',
}

export const mockDatasets: Dataset[] = [mockDataset, mockDraftDataset]

// ============================================================================
// Import Result Mock Data
// ============================================================================

export const mockImportResult: ImportResult = {
  stats: {
    total_rows: 155,
    valid_records: 150,
    partial_records: 3,
    empty_rows_removed: 2,
    empty_cols_removed: 1,
    cells_cleaned: 45,
    dates_normalized: 150,
    enums_mapped: 120,
    ai_extractions: 5,
    ai_fallbacks: 1,
    warnings_count: 8,
    errors_count: 0,
  },
  errors: [],
  warnings: [
    {
      row: 12,
      column: 'age',
      message: 'Age value seems unusually high (98)',
      severity: 'warning',
      value: '98',
    },
    {
      row: 45,
      column: 'bmi',
      message: 'BMI calculated from height/weight differs from provided value',
      severity: 'warning',
    },
  ],
  ai_used: true,
}

export const mockImportResultWithErrors: ImportResult = {
  stats: {
    total_rows: 10,
    valid_records: 0,
    partial_records: 0,
    empty_rows_removed: 0,
    empty_cols_removed: 0,
    cells_cleaned: 0,
    dates_normalized: 0,
    enums_mapped: 0,
    ai_extractions: 0,
    ai_fallbacks: 0,
    warnings_count: 0,
    errors_count: 2,
  },
  errors: [
    {
      row: 0,
      column: '',
      message: 'Missing required column: internal_code',
      severity: 'error',
    },
    {
      row: 0,
      column: '',
      message: 'Missing required column: sex',
      severity: 'error',
    },
  ],
  warnings: [],
  ai_used: false,
}

// ============================================================================
// Import Log Mock Data
// ============================================================================

export const mockImportLogEntries: ImportLogEntry[] = [
  {
    row: 1,
    column: 'sex',
    original_value: 'M',
    normalized_value: 'male',
    action: 'enum_mapped',
    severity: 'info',
    created_at: '2024-06-15T10:00:00Z',
  },
  {
    row: 2,
    column: 'fracture_date',
    original_value: '15/03/2024',
    normalized_value: '2024-03-15',
    action: 'date_normalized',
    severity: 'info',
    created_at: '2024-06-15T10:00:00Z',
  },
]

// ============================================================================
// Dataset Record Mock Data
// ============================================================================

export const mockRecord: DatasetRecord = {
  id: 'rec-001',
  dataset_id: 'ds-001',
  internal_code: 'P001',
  age: 45,
  sex: 'male',
  height_cm: 175,
  weight_kg: 80,
  bmi: 26.1,
  bmi_category: 'overweight',
  vitamin_d: 32,
  vitamin_d_category: 'sufficient',
  age_group: '40-49',
  fracture_date: '2024-01-15',
  er_date: '2024-01-15',
  laterality: 'right',
  injury_mechanism: 'fall',
  trauma_energy: 'low',
  open_closed: 'closed',
  associated_injuries: [],
  emergency_treatment: 'splint',
  pre_surgical_complications: [],
  definitive_surgery_date: '2024-01-18',
  days_to_surgery: 3,
  surgery_reason: 'displaced_fracture',
  approaches: ['lateral'],
  syndesmosis_repair: false,
  syndesmosis_type: '',
  preop_ct: true,
  anticoagulation: false,
  secondary_displacement: false,
  displacement_treatment: '',
  postop_complications: [],
  operative_notes: '',
  classification_source: 'manual',
  created_at: '2024-06-15T10:00:00Z',
  updated_at: '2024-06-15T10:00:00Z',
}

export const mockRecords: DatasetRecord[] = [
  mockRecord,
  {
    ...mockRecord,
    id: 'rec-002',
    internal_code: 'P002',
    age: 62,
    sex: 'female',
    bmi: 28.5,
    bmi_category: 'overweight',
    age_group: '60-69',
    laterality: 'left',
  },
]

// ============================================================================
// Statistics Mock Data
// ============================================================================

export const mockDemographicStats: DemographicStats = {
  total_records: 150,
  age_stats: {
    mean: 52.3,
    median: 51,
    min: 18,
    max: 89,
    std_dev: 16.8,
    count: 150,
  },
  sex_distribution: { male: 68, female: 82 },
  bmi_stats: {
    mean: 26.4,
    median: 25.8,
    min: 18.2,
    max: 42.1,
    std_dev: 4.8,
    count: 145,
  },
  bmi_distribution: {
    underweight: 5,
    normal: 58,
    overweight: 52,
    obese: 30,
  },
  vitamin_d_stats: {
    mean: 28.5,
    median: 27,
    min: 8,
    max: 65,
    std_dev: 12.3,
    count: 120,
  },
  age_group_distribution: {
    '18-29': 15,
    '30-39': 22,
    '40-49': 30,
    '50-59': 35,
    '60-69': 28,
    '70-79': 15,
    '80+': 5,
  },
}

export const mockFractureStats: FractureStats = {
  total_records: 150,
  laterality_distribution: { right: 78, left: 72 },
  mechanism_distribution: { fall: 85, sports: 30, traffic: 20, other: 15 },
  trauma_energy_distribution: { low: 95, high: 55 },
  open_closed_distribution: { closed: 140, open: 10 },
}

export const mockSurgicalStats: SurgicalStats = {
  total_records: 150,
  emergency_treatment_distribution: { splint: 90, cast: 40, none: 20 },
  days_to_surgery_stats: {
    mean: 4.2,
    median: 3,
    min: 0,
    max: 21,
    std_dev: 3.5,
    count: 130,
  },
  syndesmosis_repair_count: 25,
  preop_ct_count: 85,
  approach_distribution: { lateral: 100, medial: 45, posterior: 30 },
}

export const mockOutcomeStats: OutcomeStats = {
  total_records: 150,
  secondary_displacement_count: 8,
  complication_distribution: { infection: 5, hardware_failure: 3, malunion: 2 },
}
