import type { Case } from './case';
import type { ConfidenceInterval, KappaWeightType } from './case';

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
  num_subjects: number;   // Cases used: every complete rater answered them
  num_raters: number;     // Number of complete raters
  num_categories: number;
  num_cases_excluded: number; // Cases left out: a complete rater gave no answer in this system
  confidence_interval?: ConfidenceInterval; // Percentile bootstrap over cases
}

/**
 * Weighted Cohen's Kappa of AO/OTA codes, compared by group (44-B1.2 counts as 44-B1)
 */
export interface WeightedKappaResult {
  kappa: number;
  type: KappaWeightType;
  num_pairs: number;          // Case pairs used
  num_pairs_excluded: number; // Pairs with a code outside the AO/OTA ordering
}

/**
 * Cohen's Kappa between two raters across the cases of a study
 */
export interface CohensKappaResult {
  kappa: number;
  interpretation: string;
  num_subjects: number;       // Cases both raters answered
  num_cases_excluded: number; // Cases where either rater gave no answer
  confidence_interval?: ConfidenceInterval;
  weighted_kappa?: WeightedKappaResult; // AO/OTA only
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
  // Present only when exactly 2 raters completed the study
  danis_weber_cohen?: CohensKappaResult;
  lauge_hansen_cohen?: CohensKappaResult;
  ao_ota_cohen?: CohensKappaResult;
  bartonicek_cohen?: CohensKappaResult;
  per_case_metrics: CaseMetrics[];
}
