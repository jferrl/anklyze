import type { ClassificationResult, FractureInput } from './fracture';

// Study status lifecycle
export type StudyStatus = 'draft' | 'published' | 'closed';

// Image category
export type ImageCategory = 'xray' | 'tac';

// Study (admin view)
export interface Study {
  id: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  closed_at?: string;
  created_by: string;
  title: string;
  description?: string;
  status: StudyStatus;
  deadline?: string;
  has_tac_images: boolean;
  response_count: number;
  unique_users: number;
  // Validation study fields
  reference_classification?: ClassificationResult;
  reference_input?: FractureInput;
  show_reference_after_submit: boolean;
  allow_multiple_responses: boolean;
  // Cohort membership (optional)
  cohort_id?: string;
  case_order: number;
}

// Study image
export interface StudyImage {
  id: string;
  study_id: string;
  category: ImageCategory;
  display_order: number;
  filename: string;
  content_type: string;
  size_bytes: number;
}

// Study image for user view (no storage path)
export interface StudyImageInfo {
  id: string;
  category: ImageCategory;
  display_order: number;
  filename: string;
}

// Study with images (admin view)
export interface StudyWithImages extends Study {
  images: StudyImage[];
}

// User's view of a study in list
export interface UserStudyItem {
  id: string;
  title: string;
  description?: string;
  status: StudyStatus;
  deadline?: string;
  published_at?: string;
  has_tac_images: boolean;
  response_count: number;
  image_count: number;
  has_responded: boolean;
  my_response_count: number;
}

// User's view of a study detail
export interface UserStudyDetail {
  id: string;
  title: string;
  description?: string;
  status: StudyStatus;
  deadline?: string;
  published_at?: string;
  has_tac_images: boolean;
  images: StudyImageInfo[];
  has_responded: boolean;
  my_response_count: number;
  allow_multiple_responses: boolean;
  is_expired: boolean;
}

// Study response
export interface StudyResponse {
  id: string;
  study_id: string;
  user_id: string;
  created_at: string;
  classification: ClassificationResult;
  time_taken_ms: number;
}

// Signed URL response
export interface SignedURLResponse {
  url: string;
  expires_at: string;
}

// --- Request types ---

export interface CreateStudyRequest {
  title: string;
  description?: string;
  deadline?: string;
  reference_classification?: ClassificationResult;
  reference_input?: FractureInput;
  show_reference_after_submit?: boolean;
  allow_multiple_responses?: boolean;
}

export interface UpdateStudyRequest {
  title?: string;
  description?: string;
  deadline?: string;
  reference_classification?: ClassificationResult;
  reference_input?: FractureInput;
  show_reference_after_submit?: boolean;
  allow_multiple_responses?: boolean;
}

// QuestionAnswer represents a single answer in the user's decision path
export interface QuestionAnswer {
  question: string;
  answer: string;
  timestamp: number;
}

export interface SubmitResponseRequest {
  classification: ClassificationResult;
  time_taken_ms: number;
  // Answer tracking for divergence analysis
  answer_path?: QuestionAnswer[];
  decision_path?: string;
  time_per_question?: Record<string, number>;
  back_clicks?: number;
}

// --- Response types ---

export interface StudyListResponse {
  studies: Study[];
  total: number;
  page: number;
  limit: number;
}

export interface UserStudyListResponse {
  studies: UserStudyItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ImageUploadResponse {
  image: StudyImage;
}

export interface StudyResponseListResponse {
  responses: StudyResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface MyResponsesResponse {
  responses: StudyResponse[];
}

// --- Analytics types ---

export interface StudyAnalyticsSummary {
  study_id: string;
  title: string;
  status: StudyStatus;
  response_count: number;
  unique_respondents: number;
  avg_time_taken_ms: number;
  danis_weber_distribution: Record<string, number>;
  lauge_hansen_distribution: Record<string, number>;
  ao_ota_distribution: Record<string, number>;
  bartonicek_distribution: Record<string, number>;
}

// Admin image with signed URL for preview
export interface AdminStudyImage extends StudyImage {
  signed_url?: string;
}

export interface AdminStudyImagesResponse {
  images: AdminStudyImage[];
}

// --- Study user access types ---

export interface StudyUser {
  id: string;
  user_id: string;
  user_email: string;
  created_at: string;
}

export interface StudyUsersListResponse {
  users: StudyUser[];
  total: number;
}

export interface AddStudyUserRequest {
  user_email: string;
}

// --- Image update types ---

export interface UpdateImageRequest {
  display_order?: number;
}

// --- Reliability metrics types ---

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number; // e.g., 0.95 for 95% CI
}

export type KappaWeightType = 'linear' | 'quadratic';

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

export interface CategoryMetrics {
  category: string;
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  f1_score: number;
}

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

export interface ReliabilityMetrics {
  study_id: string;
  total_responses: number;
  unique_raters: number;
  danis_weber_agreement?: SystemAgreement;
  lauge_hansen_agreement?: SystemAgreement;
  ao_ota_agreement?: SystemAgreement;
  bartonicek_agreement?: SystemAgreement;
  gold_standard_accuracy?: GoldStandardAccuracy;
}

export interface ReliabilityMetricsResponse extends ReliabilityMetrics {
  calculated_at: string;
}

// --- Submit response result (with gold standard comparison) ---

export interface SubmitResponseResult {
  response: StudyResponse;
  reference_classification?: ClassificationResult;
  matches_danis_weber?: boolean;
  matches_lauge_hansen?: boolean;
  matches_ao_ota?: boolean;
  matches_bartonicek?: boolean;
}

// --- User profile types ---

export type Specialty = 'traumatology' | 'orthopedics' | 'emergency' | 'radiology' | 'general' | 'other';
export type TrainingLevel = 'resident' | 'fellow' | 'attending' | 'other';

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

export interface UpdateUserProfileRequest {
  display_name?: string;
  years_experience?: number;
  specialty?: Specialty;
  training_level?: TrainingLevel;
  institution?: string;
}

// ============================================================================
// Study Cohort Types (for multi-case reliability studies)
// ============================================================================

// Cohort status lifecycle
export type CohortStatus = 'draft' | 'active' | 'closed';

// Study cohort (groups multiple studies for multi-case reliability analysis)
export interface StudyCohort {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  description?: string;
  status: CohortStatus;
  case_count: number;
  total_responses: number;
  unique_raters: number;
  complete_raters: number;
}

// Cohort with its cases (studies with cohort_id set)
export interface CohortWithCases extends StudyCohort {
  cases: Study[];
}

// Cohort user (pre-assigned rater)
export interface CohortUser {
  id: string;
  cohort_id: string;
  user_id: string;
  user_email: string;
  cases_completed: number;
  last_response_at?: string;
  created_at: string;
}

// Rater progress across a cohort
export interface RaterProgress {
  user_id: string;
  user_email: string;
  display_name?: string;
  cases_completed: number;
  total_cases: number;
  is_complete: boolean;
  last_response_at?: string;
}

// --- Cohort Request Types ---

export interface CreateCohortRequest {
  title: string;
  description?: string;
}

export interface UpdateCohortRequest {
  title?: string;
  description?: string;
}

export interface AddCaseRequest {
  study_id: string;
  case_order?: number;
}

export interface ReorderCasesRequest {
  study_ids: string[];
}

export interface AddCohortUserRequest {
  user_id: string;
  email: string;
}

// --- Cohort Response Types ---

export interface CohortListResponse {
  cohorts: StudyCohort[];
  total: number;
  page: number;
  limit: number;
}

export interface RaterProgressResponse {
  raters: RaterProgress[];
  total: number;
}

// --- Cohort Reliability Metrics ---

// Fleiss' Kappa result (now calculable with multiple cases!)
export interface FleissKappaResult {
  kappa: number;
  interpretation: string;
  num_subjects: number;   // Number of cases
  num_raters: number;     // Number of complete raters
  num_categories: number;
  confidence_interval?: ConfidenceInterval;
  note?: string;
}

// Metrics for a single case within a cohort
export interface CaseMetrics {
  case_order: number;
  study_id: string;
  study_title: string;
  response_count: number;
  danis_weber_agreement: number;
  lauge_hansen_agreement: number;
  ao_ota_agreement: number;
  bartonicek_agreement?: number;
  gold_standard_match_rate?: number;
  is_low_agreement: boolean;
}

// Gold standard accuracy aggregated across a cohort
export interface CohortGoldStandardAccuracy {
  overall_accuracy: number;
  cases_with_reference: number;
  total_comparisons: number;
  danis_weber_accuracy?: number;
  lauge_hansen_accuracy?: number;
  ao_ota_accuracy?: number;
  bartonicek_accuracy?: number;
}

// Full reliability metrics for a cohort
export interface CohortReliabilityMetrics {
  cohort_id: string;
  cohort_title: string;
  total_cases: number;
  total_responses: number;
  unique_raters: number;
  complete_raters: number;
  danis_weber_fleiss?: FleissKappaResult;
  lauge_hansen_fleiss?: FleissKappaResult;
  ao_ota_fleiss?: FleissKappaResult;
  bartonicek_fleiss?: FleissKappaResult;
  per_case_metrics: CaseMetrics[];
  gold_standard_accuracy?: CohortGoldStandardAccuracy;
}

export interface CohortReliabilityResponse extends CohortReliabilityMetrics {
  calculated_at: string;
}

// ============================================================================
// Divergence Analysis Types
// ============================================================================

// QuestionErrorStats tracks error rates for a specific question
export interface QuestionErrorStats {
  question: string;
  total_answers: number;
  correct_answers: number;
  incorrect_answers: number;
  error_rate: number;
  wrong_answer_distribution: Record<string, number>;
  avg_time_ms: number;
}

// DivergenceReport is the complete analysis output
export interface DivergenceReport {
  study_id: string;
  study_title: string;
  total_responses: number;
  responses_with_path: number;
  question_stats: QuestionErrorStats[];
  most_confusing_question: string;
  most_confusing_error_rate: number;
  path_distribution: Record<string, number>;
  correct_path: string;
  avg_back_clicks: number;
  back_click_correlation: 'positive' | 'negative' | 'none';
}

// Helper for Kappa interpretation
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
