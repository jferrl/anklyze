import type { ClassificationResult, FractureInput } from './fracture';

// ============================================================================
// Case Types (individual patient presentations)
// ============================================================================

// Case status lifecycle
export type CaseStatus = 'draft' | 'published' | 'closed';

// Image category
export type ImageCategory = 'xray' | 'tac';

// Case (admin view) - individual patient presentation
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
  // Validation case fields
  reference_classification?: ClassificationResult;
  reference_input?: FractureInput;
  show_reference_after_submit: boolean;
  allow_multiple_responses: boolean;
  // Study membership (optional)
  study_id?: string;
  case_order: number;
}

// Case image
export interface CaseImage {
  id: string;
  case_id: string;
  category: ImageCategory;
  display_order: number;
  filename: string;
  content_type: string;
  size_bytes: number;
}

// Case image for user view (no storage path)
export interface CaseImageInfo {
  id: string;
  category: ImageCategory;
  display_order: number;
  filename: string;
}

// Case with images (admin view)
export interface CaseWithImages extends Case {
  images: CaseImage[];
}

// User's view of a case in list
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

// User's view of a case detail
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

// Case response
export interface CaseResponse {
  id: string;
  case_id: string;
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

export interface CreateCaseRequest {
  title: string;
  description?: string;
  deadline?: string;
  reference_classification?: ClassificationResult;
  reference_input?: FractureInput;
  show_reference_after_submit?: boolean;
  allow_multiple_responses?: boolean;
}

export interface UpdateCaseRequest {
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

export interface CaseListResponse {
  cases: Case[];
  total: number;
  page: number;
  limit: number;
}

export interface UserCaseListResponse {
  cases: UserCaseItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ImageUploadResponse {
  image: CaseImage;
}

export interface CaseResponseListResponse {
  responses: CaseResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface MyResponsesResponse {
  responses: CaseResponse[];
}

// --- Analytics types ---

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

// Admin image with signed URL for preview
export interface AdminCaseImage extends CaseImage {
  signed_url?: string;
}

export interface AdminCaseImagesResponse {
  images: AdminCaseImage[];
}

// --- Case user access types ---

export interface CaseUser {
  id: string;
  user_id: string;
  user_email: string;
  created_at: string;
}

export interface CaseUsersListResponse {
  users: CaseUser[];
  total: number;
}

export interface AddCaseUserRequest {
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
  case_id: string;
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
  response: CaseResponse;
  reference_classification?: ClassificationResult;
  matches_danis_weber?: boolean;
  matches_lauge_hansen?: boolean;
  matches_ao_ota?: boolean;
  matches_bartonicek?: boolean;
}

// --- User profile types ---

export type Specialty = 'spine' | 'upper_extremity' | 'lower_extremity' | 'pelvis' | 'foot_ankle';
export type TrainingLevel = 'resident' | 'attending';

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
// Study Types (research projects grouping multiple cases)
// ============================================================================

// Study status lifecycle
export type StudyStatus = 'draft' | 'active' | 'closed';

// Study (groups multiple cases for multi-case reliability analysis)
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

// Study with its cases
export interface StudyWithCases extends Study {
  cases: Case[];
}

// Study rater (pre-assigned rater)
export interface StudyRater {
  id: string;
  study_id: string;
  user_id: string;
  user_email: string;
  cases_completed: number;
  last_response_at?: string;
  created_at: string;
}

// Rater progress across a study
export interface RaterProgress {
  user_id: string;
  user_email: string;
  display_name?: string;
  cases_completed: number;
  total_cases: number;
  is_complete: boolean;
  last_response_at?: string;
}

// --- Study Request Types ---

export interface CreateStudyRequest {
  title: string;
  description?: string;
}

export interface UpdateStudyRequest {
  title?: string;
  description?: string;
}

export interface AddCaseToStudyRequest {
  case_id: string;
  case_order?: number;
}

export interface ReorderCasesRequest {
  case_ids: string[];
}

export interface AddStudyRaterRequest {
  email: string;
}

// --- Study Response Types ---

export interface StudyListResponse {
  studies: Study[];
  total: number;
  page: number;
  limit: number;
}

export interface RaterProgressResponse {
  raters: RaterProgress[];
  total: number;
}

// --- Study Reliability Metrics ---

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

// Metrics for a single case within a study
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

// Gold standard accuracy aggregated across a study
export interface StudyGoldStandardAccuracy {
  overall_accuracy: number;
  cases_with_reference: number;
  total_comparisons: number;
  danis_weber_accuracy?: number;
  lauge_hansen_accuracy?: number;
  ao_ota_accuracy?: number;
  bartonicek_accuracy?: number;
}

// Full reliability metrics for a study
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

export interface StudyReliabilityResponse extends StudyReliabilityMetrics {
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
  case_id: string;
  case_title: string;
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

// ============================================================================
// Backwards Compatibility Aliases (for gradual migration)
// ============================================================================

// Old Study types now map to Case
/** @deprecated Use Case instead */
export type StudyOld = Case;
/** @deprecated Use CaseStatus instead */
export type StudyStatusOld = CaseStatus;
/** @deprecated Use CaseImage instead */
export type StudyImage = CaseImage;
/** @deprecated Use CaseImageInfo instead */
export type StudyImageInfo = CaseImageInfo;
/** @deprecated Use CaseWithImages instead */
export type StudyWithImages = CaseWithImages;
/** @deprecated Use UserCaseItem instead */
export type UserStudyItem = UserCaseItem;
/** @deprecated Use UserCaseDetail instead */
export type UserStudyDetail = UserCaseDetail;
/** @deprecated Use CaseResponse instead */
export type StudyResponse = CaseResponse;
/** @deprecated Use CreateCaseRequest instead */
export type CreateStudyRequestOld = CreateCaseRequest;
/** @deprecated Use UpdateCaseRequest instead */
export type UpdateStudyRequestOld = UpdateCaseRequest;
/** @deprecated Use CaseListResponse instead */
export type StudyListResponseOld = CaseListResponse;
/** @deprecated Use UserCaseListResponse instead */
export type UserStudyListResponse = UserCaseListResponse;
/** @deprecated Use CaseResponseListResponse instead */
export type StudyResponseListResponse = CaseResponseListResponse;
/** @deprecated Use CaseAnalyticsSummary instead */
export type StudyAnalyticsSummary = CaseAnalyticsSummary;
/** @deprecated Use AdminCaseImage instead */
export type AdminStudyImage = AdminCaseImage;
// Note: AdminCaseImagesResponse is already defined above, no alias needed
/** @deprecated Use CaseUser instead */
export type StudyUser = CaseUser;
/** @deprecated Use CaseUsersListResponse instead */
export type StudyUsersListResponse = CaseUsersListResponse;
/** @deprecated Use AddCaseUserRequest instead */
export type AddStudyUserRequest = AddCaseUserRequest;

// Old Cohort types now map to Study
/** @deprecated Use StudyStatus instead */
export type CohortStatus = StudyStatus;
/** @deprecated Use Study instead */
export type StudyCohort = Study;
/** @deprecated Use StudyWithCases instead */
export type CohortWithCases = StudyWithCases;
/** @deprecated Use StudyRater instead */
export type CohortUser = StudyRater;
/** @deprecated Use CreateStudyRequest instead */
export type CreateCohortRequest = CreateStudyRequest;
/** @deprecated Use UpdateStudyRequest instead */
export type UpdateCohortRequest = UpdateStudyRequest;
/** @deprecated Use AddStudyRaterRequest instead */
export type AddCohortUserRequest = AddStudyRaterRequest;
/** @deprecated Use StudyListResponse instead */
export type CohortListResponse = StudyListResponse;
/** @deprecated Use StudyGoldStandardAccuracy instead */
export type CohortGoldStandardAccuracy = StudyGoldStandardAccuracy;
/** @deprecated Use StudyReliabilityMetrics instead */
export type CohortReliabilityMetrics = StudyReliabilityMetrics;
/** @deprecated Use StudyReliabilityResponse instead */
export type CohortReliabilityResponse = StudyReliabilityResponse;
