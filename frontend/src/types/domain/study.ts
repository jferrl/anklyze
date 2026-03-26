import type { Case } from './case';
import type { ConfidenceInterval } from './case';

/**
 * Study status lifecycle
 */
export type StudyStatus = 'draft' | 'active' | 'closed';

/**
 * Study - Research project grouping multiple cases
 * Used for multi-case reliability analysis
 */
export interface Study {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  description?: string;
  status: StudyStatus;
  case_count: number;
  total_responses: number;
  unique_raters: number;
  complete_raters: number;
}

/**
 * Study with its associated cases
 */
export interface StudyWithCases extends Study {
  cases: Case[];
}

/**
 * Fleiss' Kappa result for multi-rater agreement
 */
export interface FleissKappaResult {
  kappa: number;
  interpretation: string;
  num_subjects: number;   // Number of cases
  num_raters: number;     // Number of complete raters
  num_categories: number;
  confidence_interval?: ConfidenceInterval;
  note?: string;
}

/**
 * Metrics for a single case within a study
 */
export interface CaseMetrics {
  case_order: number;
  case_id: string;
  case_title: string;
  response_count: number;
  danis_weber_agreement: number;
  lauge_hansen_agreement: number;
  ao_ota_agreement: number;
  bartonicek_agreement?: number;
  is_low_agreement: boolean;
}

/**
 * Full reliability metrics for a study
 * Includes Fleiss' Kappa for each classification system
 */
export interface StudyReliabilityMetrics {
  study_id: string;
  study_title: string;
  total_cases: number;
  total_responses: number;
  unique_raters: number;
  complete_raters: number;
  danis_weber_fleiss?: FleissKappaResult;
  lauge_hansen_fleiss?: FleissKappaResult;
  ao_ota_fleiss?: FleissKappaResult;
  bartonicek_fleiss?: FleissKappaResult;
  per_case_metrics: CaseMetrics[];
}
