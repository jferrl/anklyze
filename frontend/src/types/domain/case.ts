import type { ClassificationResult, FractureInput } from './fracture';

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
  // Gold standard/reference classification
  reference_classification?: ClassificationResult;
  reference_input?: FractureInput;
  show_reference_after_submit: boolean;
  allow_multiple_responses: boolean;
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
  allow_multiple_responses: boolean;
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
 * Used for divergence analysis
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
 * Case user access
 */
export interface CaseUser {
  id: string;
  user_id: string;
  user_email: string;
  created_at: string;
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
 * Per-category diagnostic metrics
 */
export interface CategoryMetrics {
  category: string;
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  f1_score: number;
}

/**
 * Gold standard accuracy metrics
 */
export interface GoldStandardAccuracy {
  danis_weber_accuracy?: number;
  lauge_hansen_accuracy?: number;
  ao_ota_accuracy?: number;
  bartonicek_accuracy?: number;
  overall_accuracy: number;
  total_comparisons: number;
  correct_responses: number;
  incorrect_responses: number;
  per_category_metrics?: Record<string, CategoryMetrics>;
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
  gold_standard_accuracy?: GoldStandardAccuracy;
}

/**
 * Submit response result with gold standard comparison
 */
export interface SubmitResponseResult {
  response: CaseResponse;
  reference_classification?: ClassificationResult;
  matches_danis_weber?: boolean;
  matches_lauge_hansen?: boolean;
  matches_ao_ota?: boolean;
  matches_bartonicek?: boolean;
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
 * Question error statistics for divergence analysis
 */
export interface QuestionErrorStats {
  question: string;
  correct_answer: string;
  total_answers: number;
  correct_answers: number;
  incorrect_answers: number;
  error_rate: number;
  wrong_answer_distribution: Record<string, number>;
  avg_time_ms: number;
}

/**
 * Divergence analysis report
 * Analyzes where users diverge from the correct classification path
 */
export interface DivergenceReport {
  case_id: string;
  case_title: string;
  total_responses: number;
  responses_with_path: number;
  question_stats: QuestionErrorStats[];
  most_confusing_question: string;
  most_confusing_error_rate: number;
  path_distribution: Record<string, number>;
  correct_path: string;
  correct_path_count: number;
  correct_path_percent: number;
  unique_paths_count: number;
  first_divergence_stats: Record<string, number>;
  most_common_first_divergence: string;
  avg_back_clicks: number;
  back_click_correlation: 'positive' | 'negative' | 'none';
  correct_with_high_back_count: number;
  incorrect_with_high_back_count: number;
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
