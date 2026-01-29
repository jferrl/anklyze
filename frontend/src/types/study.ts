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
  caption?: string;
}

// Study image for user view (no storage path)
export interface StudyImageInfo {
  id: string;
  category: ImageCategory;
  display_order: number;
  filename: string;
  caption?: string;
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
}

export interface UpdateStudyRequest {
  title?: string;
  description?: string;
  deadline?: string;
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
