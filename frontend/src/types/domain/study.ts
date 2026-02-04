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
 * Study rater (pre-assigned participant)
 */
export interface StudyRater {
  id: string;
  study_id: string;
  user_id: string;
  user_email: string;
  cases_completed: number;
  last_response_at?: string;
  created_at: string;
}

/**
 * Rater progress tracking across a study
 */
export interface RaterProgress {
  user_id: string;
  user_email: string;
  display_name?: string;
  cases_completed: number;
  total_cases: number;
  is_complete: boolean;
  last_response_at?: string;
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
  gold_standard_match_rate?: number;
  is_low_agreement: boolean;
}

/**
 * Gold standard accuracy aggregated across a study
 */
export interface StudyGoldStandardAccuracy {
  overall_accuracy: number;
  cases_with_reference: number;
  total_comparisons: number;
  danis_weber_accuracy?: number;
  lauge_hansen_accuracy?: number;
  ao_ota_accuracy?: number;
  bartonicek_accuracy?: number;
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
  gold_standard_accuracy?: StudyGoldStandardAccuracy;
}
