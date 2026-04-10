import type { ClassificationResult } from './fracture';

/**
 * Case status lifecycle
 */
export type CaseStatus = 'draft' | 'published' | 'closed';

/**
 * Image category types
 */
export type ImageCategory = 'xray' | 'tac';

/**
 * Case - Individual patient presentation
 * Core domain entity representing a clinical case
 */
export interface Case {
  id: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  closed_at?: string;
  created_by: string;
  title: string;
  description?: string;
  status: CaseStatus;
  deadline?: string;
  has_tac_images: boolean;
  response_count: number;
  unique_users: number;
  // Gold standard classification (admin-only, optional)
  gold_standard?: ClassificationResult;
  // Study membership (optional)
  study_id?: string;
  case_order: number;
}

/**
 * Case image metadata
 */
export interface CaseImage {
  id: string;
  case_id: string;
  category: ImageCategory;
  display_order: number;
  filename: string;
  content_type: string;
  size_bytes: number;
}

/**
 * Case image info for user view (no storage details)
 */
export interface CaseImageInfo {
  id: string;
  category: ImageCategory;
  display_order: number;
  filename: string;
}

/**
 * Case with images (admin view)
 */
export interface CaseWithImages extends Case {
  images: CaseImage[];
}

/**
 * User's view of a case in list
 */
export interface UserCaseItem {
  id: string;
  title: string;
  description?: string;
  status: CaseStatus;
  deadline?: string;
  published_at?: string;
  has_tac_images: boolean;
  response_count: number;
  image_count: number;
  has_responded: boolean;
  my_response_count: number;
}

/**
 * User's detailed view of a case
 */
export interface UserCaseDetail {
  id: string;
  title: string;
  description?: string;
  status: CaseStatus;
  deadline?: string;
  published_at?: string;
  has_tac_images: boolean;
  images: CaseImageInfo[];
  has_responded: boolean;
  my_response_count: number;
  is_expired: boolean;
}

/**
 * Case response - A user's classification of a case
 */
export interface CaseResponse {
  id: string;
  case_id: string;
  user_id: string;
  created_at: string;
  classification: ClassificationResult;
  time_taken_ms: number;
}

/**
 * Question-answer pair in user's decision path
 * Used for analytics
 */
export interface QuestionAnswer {
  question: string;
  answer: string;
  timestamp: number;
}

/**
 * Admin case image with signed URL for preview
 */
export interface AdminCaseImage extends CaseImage {
  signed_url?: string;
}

/**
 * Case analytics summary
 */
export interface CaseAnalyticsSummary {
  case_id: string;
  title: string;
  status: CaseStatus;
  response_count: number;
  unique_respondents: number;
  avg_time_taken_ms: number;
  danis_weber_distribution: Record<string, number>;
  lauge_hansen_distribution: Record<string, number>;
  ao_ota_distribution: Record<string, number>;
  bartonicek_distribution: Record<string, number>;
}

/**
 * Confidence interval for statistical metrics
 */
export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number; // e.g., 0.95 for 95% CI
}

/**
 * Kappa weight type for weighted agreement
 */
export type KappaWeightType = 'linear' | 'quadratic';

/**
 * Agreement metrics for a classification system
 */
export interface SystemAgreement {
  system: string;
  percent_agreement: number;
  cohens_kappa?: number;
  cohens_kappa_ci?: ConfidenceInterval;
  weighted_kappa?: number;
  weighted_kappa_type?: KappaWeightType;
  fleiss_kappa?: number;
  fleiss_kappa_note?: string;
  confusion_matrix?: Record<string, Record<string, number>>;
  category_counts: Record<string, number>;
}

/**
 * Reliability metrics for a case
 */
export interface ReliabilityMetrics {
  case_id: string;
  total_responses: number;
  unique_raters: number;
  danis_weber_agreement?: SystemAgreement;
  lauge_hansen_agreement?: SystemAgreement;
  ao_ota_agreement?: SystemAgreement;
  bartonicek_agreement?: SystemAgreement;
}

/**
 * Submit response result
 */
export interface SubmitResponseResult {
  response: CaseResponse;
}

/**
 * User profile specialty
 */
export type Specialty = 'foot_ankle' | 'other';

/**
 * User training level
 */
export type TrainingLevel = 'resident' | 'attending';

/**
 * User profile
 */
export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  display_name?: string;
  avatar_url?: string;
  provider?: string;
  years_experience?: number;
  specialty?: Specialty;
  training_level?: TrainingLevel;
  institution?: string;
}

/**
 * Request to set gold standard classification on a case
 */
export interface SetGoldStandardRequest {
  danis_weber?: string;
  lauge_hansen?: string;
  ao_ota?: string;
  bartonicek?: string;
  impossible?: boolean;
}

/**
 * System accuracy against gold standard
 */
export interface SystemAccuracyResult {
  system: string;
  gold_value: string;
  accuracy: number;
  total_raters: number;
  correct_raters: number;
  majority_value: string;
  majority_matches_gold: boolean;
  majority_percentage: number;
  response_distribution: Record<string, number>;
}

/**
 * Gold standard accuracy for a single case
 */
export interface GoldStandardAccuracy {
  case_id: string;
  has_gold_standard: boolean;
  total_raters: number;
  gold_standard?: ClassificationResult;
  danis_weber_accuracy?: SystemAccuracyResult;
  lauge_hansen_accuracy?: SystemAccuracyResult;
  ao_ota_accuracy?: SystemAccuracyResult;
  bartonicek_accuracy?: SystemAccuracyResult;
}

/**
 * Aggregate accuracy across study cases
 */
export interface AggregateAccuracy {
  system: string;
  mean_accuracy: number;
  cases_evaluated: number;
  consensus_correct: number;
  consensus_total: number;
  consensus_rate: number;
}

/**
 * Per-case accuracy within a study
 */
export interface PerCaseAccuracy {
  case_order: number;
  case_id: string;
  case_title: string;
  has_gold_standard: boolean;
  danis_weber_accuracy?: number;
  lauge_hansen_accuracy?: number;
  ao_ota_accuracy?: number;
  bartonicek_accuracy?: number;
  is_hard_case: boolean;
}

/**
 * Per-rater accuracy within a study
 */
export interface PerRaterAccuracy {
  user_id: string;
  cases_completed: number;
  danis_weber_accuracy?: number;
  lauge_hansen_accuracy?: number;
  ao_ota_accuracy?: number;
  bartonicek_accuracy?: number;
}

/**
 * Study-level gold standard metrics
 */
export interface StudyGoldStandardMetrics {
  study_id: string;
  study_title: string;
  total_cases: number;
  cases_with_gold: number;
  danis_weber_accuracy?: AggregateAccuracy;
  lauge_hansen_accuracy?: AggregateAccuracy;
  ao_ota_accuracy?: AggregateAccuracy;
  bartonicek_accuracy?: AggregateAccuracy;
  per_case_accuracy: PerCaseAccuracy[];
  per_rater_accuracy?: PerRaterAccuracy[];
}

/**
 * Helper function to interpret Kappa values
 */
export function getKappaInterpretation(kappa: number): {
  label: string;
  color: string;
} {
  if (kappa < 0) return { label: 'Poor', color: 'red' };
  if (kappa <= 0.2) return { label: 'Slight', color: 'orange' };
  if (kappa <= 0.4) return { label: 'Fair', color: 'yellow' };
  if (kappa <= 0.6) return { label: 'Moderate', color: 'blue' };
  if (kappa <= 0.8) return { label: 'Substantial', color: 'green' };
  return { label: 'Almost Perfect', color: 'emerald' };
}
