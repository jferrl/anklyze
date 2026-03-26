import type {
  Case,
  CaseImage,
  CaseResponse,
  UserCaseItem,
  AdminCaseImage,
  ReliabilityMetrics,
  QuestionAnswer,
  Specialty,
  TrainingLevel,
} from '../domain/case';
import type { ClassificationResult } from '../domain/fracture';
import type {
  Study,
  StudyReliabilityMetrics,
} from '../domain/study';
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
}

/**
 * Request payload to update an existing case
 */
export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  deadline?: string;
}

/**
 * Request payload to submit a case response
 * Includes classification and metadata for analytics
 */
export interface SubmitResponseRequest {
  classification: ClassificationResult;
  time_taken_ms: number;
  // Answer tracking for analytics
  answer_path?: QuestionAnswer[];
  decision_path?: string;
  time_per_question?: Record<string, number>;
  back_clicks?: number;
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
 * Batch signed URL response — all image URLs for a case in one request
 */
export interface BatchSignedURLResponse {
  urls: Record<string, SignedURLResponse>;
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
  total_completed: number;
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
 * Reliability metrics response with calculation timestamp
 */
export interface ReliabilityMetricsResponse extends ReliabilityMetrics {
  calculated_at: string;
}

// ============================================================================
// Dashboard API Types
// ============================================================================

/**
 * Aggregated statistics for the admin dashboard
 */
export interface DashboardStats {
  total_cases: number;
  draft_cases: number;
  published_cases: number;
  closed_cases: number;
  total_responses: number;
  total_unique_users: number;
  avg_responses_per_case: number;
}

/**
 * Summary of a recently active case
 */
export interface DashboardRecentCase {
  id: string;
  title: string;
  status: string;
  response_count: number;
  updated_at: string;
}

/**
 * A case that needs admin attention
 */
export interface DashboardAttentionCase {
  id: string;
  title: string;
  deadline?: string;
}

/**
 * Full dashboard API response
 */
export interface DashboardResponse {
  stats: DashboardStats;
  recent_active_cases: DashboardRecentCase[];
  cases_needing_attention: DashboardAttentionCase[];
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
 * Study reliability metrics response with calculation timestamp
 */
export interface StudyReliabilityResponse extends StudyReliabilityMetrics {
  calculated_at: string;
}
