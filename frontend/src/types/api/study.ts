import type {
  Case,
  CaseImage,
  CaseResponse,
  CaseUser,
  UserCaseItem,
  AdminCaseImage,
  ReliabilityMetrics,
  QuestionAnswer,
  Specialty,
  TrainingLevel,
} from '../domain/case';
import type {
  Study,
  StudyReliabilityMetrics,
  RaterProgress,
} from '../domain/study';
import type {
  ClassificationResult,
  FractureInput,
} from '../domain/fracture';

// ============================================================================
// Case API Types
// ============================================================================

// --- Case Request Types ---

/**
 * Request payload to create a new case
 */
export interface CreateCaseRequest {
  title: string;
  description?: string;
  deadline?: string;
  reference_classification?: ClassificationResult;
  reference_input?: FractureInput;
  show_reference_after_submit?: boolean;
  allow_multiple_responses?: boolean;
}

/**
 * Request payload to update an existing case
 */
export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  deadline?: string;
  reference_classification?: ClassificationResult;
  reference_input?: FractureInput;
  show_reference_after_submit?: boolean;
  allow_multiple_responses?: boolean;
}

/**
 * Request payload to submit a case response
 * Includes classification and metadata for divergence analysis
 */
export interface SubmitResponseRequest {
  classification: ClassificationResult;
  time_taken_ms: number;
  // Answer tracking for divergence analysis
  answer_path?: QuestionAnswer[];
  decision_path?: string;
  time_per_question?: Record<string, number>;
  back_clicks?: number;
}

/**
 * Request payload to add a user to a case
 */
export interface AddCaseUserRequest {
  user_email: string;
}

/**
 * Request payload to update image metadata
 */
export interface UpdateImageRequest {
  display_order?: number;
}

/**
 * Request payload to update user profile
 */
export interface UpdateUserProfileRequest {
  display_name?: string;
  years_experience?: number;
  specialty?: Specialty;
  training_level?: TrainingLevel;
  institution?: string;
}

// --- Case Response Types ---

/**
 * Signed URL response for temporary image access
 */
export interface SignedURLResponse {
  url: string;
  expires_at: string;
}

/**
 * Paginated list of cases (admin view)
 */
export interface CaseListResponse {
  cases: Case[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Paginated list of cases (user view)
 */
export interface UserCaseListResponse {
  cases: UserCaseItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Response after uploading an image
 */
export interface ImageUploadResponse {
  image: CaseImage;
}

/**
 * Paginated list of case responses
 */
export interface CaseResponseListResponse {
  responses: CaseResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * User's own responses to cases
 */
export interface MyResponsesResponse {
  responses: CaseResponse[];
}

/**
 * Admin view of case images with signed URLs
 */
export interface AdminCaseImagesResponse {
  images: AdminCaseImage[];
}

/**
 * List of users with access to a case
 */
export interface CaseUsersListResponse {
  users: CaseUser[];
  total: number;
}

/**
 * Reliability metrics response with calculation timestamp
 */
export interface ReliabilityMetricsResponse extends ReliabilityMetrics {
  calculated_at: string;
}

// ============================================================================
// Study API Types
// ============================================================================

// --- Study Request Types ---

/**
 * Request payload to create a new study
 */
export interface CreateStudyRequest {
  title: string;
  description?: string;
}

/**
 * Request payload to update an existing study
 */
export interface UpdateStudyRequest {
  title?: string;
  description?: string;
}

/**
 * Request payload to add a case to a study
 */
export interface AddCaseToStudyRequest {
  case_id: string;
  case_order?: number;
}

/**
 * Request payload to reorder cases in a study
 */
export interface ReorderCasesRequest {
  case_ids: string[];
}

/**
 * Request payload to add a rater to a study
 */
export interface AddStudyRaterRequest {
  email: string;
}

// --- Study Response Types ---

/**
 * Paginated list of studies
 */
export interface StudyListResponse {
  studies: Study[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Rater progress across a study
 */
export interface RaterProgressResponse {
  raters: RaterProgress[];
  total: number;
}

/**
 * Study reliability metrics response with calculation timestamp
 */
export interface StudyReliabilityResponse extends StudyReliabilityMetrics {
  calculated_at: string;
}
