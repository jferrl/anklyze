import type { ClassificationResult } from './fracture';

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
  show_reference_after_submit: boolean;
  allow_multiple_responses: boolean;
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
  show_reference_after_submit?: boolean;
  allow_multiple_responses?: boolean;
}

export interface UpdateStudyRequest {
  title?: string;
  description?: string;
  deadline?: string;
  reference_classification?: ClassificationResult;
  show_reference_after_submit?: boolean;
  allow_multiple_responses?: boolean;
}

export interface SubmitResponseRequest {
  classification: ClassificationResult;
  time_taken_ms: number;
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

export interface SystemAgreement {
  system: string;
  percent_agreement: number;
  cohens_kappa?: number;
  fleiss_kappa?: number;
  confusion_matrix?: Record<string, Record<string, number>>;
  category_counts: Record<string, number>;
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
