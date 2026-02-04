import type {
  // Case types (individual patient presentations)
  Case,
  CaseWithImages,
  CaseImage,
  UserCaseDetail,
  CaseListResponse,
  UserCaseListResponse,
  CreateCaseRequest,
  UpdateCaseRequest,
  SubmitResponseRequest,
  ImageUploadResponse,
  SignedURLResponse,
  CaseAnalyticsSummary,
  CaseResponseListResponse,
  MyResponsesResponse,
  AdminCaseImagesResponse,
  ImageCategory,
  CaseUsersListResponse,
  AddCaseUserRequest,
  UpdateImageRequest,
  ReliabilityMetricsResponse,
  SubmitResponseResult,
  UserProfile,
  UpdateUserProfileRequest,
  // Study types (research projects)
  Study,
  StudyWithCases,
  StudyListResponse,
  CreateStudyRequest,
  UpdateStudyRequest,
  StudyRater,
  RaterProgressResponse,
  StudyReliabilityResponse,
  StudyStatus,
  // Divergence analysis types
  DivergenceReport,
} from '../types/study';
import { supabase } from '../lib/supabase';
import { AuthRequiredError, ForbiddenError } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Helper to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

// Helper to get auth headers without content-type (for multipart)
async function getAuthHeadersMultipart(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

// Helper to handle auth errors
function handleAuthError(status: number): void {
  if (status === 401) {
    throw new AuthRequiredError();
  }
  if (status === 403) {
    throw new ForbiddenError();
  }
}

// ================================
// User Case Endpoints
// ================================

/**
 * List all published cases
 */
export async function listPublishedCases(
  page: number = 1,
  limit: number = 20
): Promise<UserCaseListResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/cases?${params}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list cases');
  }

  return response.json();
}

/**
 * Get a published case with its images
 */
export async function getPublishedCase(caseId: string): Promise<UserCaseDetail> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Case not found');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to get case');
  }

  return response.json();
}

/**
 * Get a signed URL for viewing an image (for published cases)
 */
export async function getImageSignedURL(
  caseId: string,
  imageId: string
): Promise<SignedURLResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/cases/${caseId}/images/${imageId}/url`,
    { headers }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Image not found');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to get image URL');
  }

  return response.json();
}

/**
 * Get a signed URL for viewing an image (admin - works for any case status)
 */
export async function getAdminImageSignedURL(
  caseId: string,
  imageId: string
): Promise<SignedURLResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/images/${imageId}/url`,
    { headers }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Image not found');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to get image URL');
  }

  return response.json();
}

/**
 * Submit a classification response to a case
 * Returns the response along with gold standard comparison if available
 */
export async function submitCaseResponse(
  caseId: string,
  data: SubmitResponseRequest
): Promise<SubmitResponseResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}/responses`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 409) {
      const error = await response.json();
      throw new Error(error.error || 'You have already submitted a response to this case');
    }
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.error || 'Cannot submit response');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit response');
  }

  return response.json();
}

/**
 * Get the current user's responses for a case
 */
export async function getMyResponses(caseId: string): Promise<MyResponsesResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}/my-responses`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get responses');
  }

  return response.json();
}

// ================================
// Admin Case Endpoints
// ================================

/**
 * Create a new case (admin only)
 */
export async function createCase(data: CreateCaseRequest): Promise<Case> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create case');
  }

  return response.json();
}

/**
 * List all cases (admin only)
 */
export async function listCases(
  status?: string,
  page: number = 1,
  limit: number = 20
): Promise<CaseListResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases?${params}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list cases');
  }

  return response.json();
}

/**
 * Get a case with images (admin only)
 */
export async function getCase(caseId: string): Promise<CaseWithImages> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Case not found');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to get case');
  }

  return response.json();
}

/**
 * Update a case (admin only)
 */
export async function updateCase(
  caseId: string,
  data: UpdateCaseRequest
): Promise<Case> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update case');
  }

  return response.json();
}

/**
 * Delete a draft case (admin only)
 */
export async function deleteCase(caseId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}`, {
    method: 'DELETE',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete case');
  }
}

/**
 * Upload an image to a case (admin only)
 */
export async function uploadCaseImage(
  caseId: string,
  file: File,
  category: ImageCategory,
  displayOrder?: number
): Promise<ImageUploadResponse> {
  const headers = await getAuthHeadersMultipart();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (displayOrder !== undefined) formData.append('display_order', displayOrder.toString());

  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/images`, {
    method: 'POST',
    headers,
    body: formData,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload image');
  }

  return response.json();
}

/**
 * Get case images with signed URLs (admin only)
 */
export async function getAdminCaseImages(caseId: string): Promise<AdminCaseImagesResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/images`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get images');
  }

  return response.json();
}

/**
 * Delete an image from a case (admin only)
 */
export async function deleteCaseImage(caseId: string, imageId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/images/${imageId}`,
    {
      method: 'DELETE',
      headers,
    }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete image');
  }
}

/**
 * Update an image's display order (admin only)
 */
export async function updateCaseImage(
  caseId: string,
  imageId: string,
  data: UpdateImageRequest
): Promise<CaseImage> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/images/${imageId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update image');
  }

  return response.json();
}

/**
 * Publish a case (admin only)
 */
export async function publishCase(caseId: string): Promise<Case> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/publish`, {
    method: 'PUT',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to publish case');
  }

  return response.json();
}

/**
 * Close a case (admin only)
 */
export async function closeCase(caseId: string): Promise<Case> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/close`, {
    method: 'PUT',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to close case');
  }

  return response.json();
}

/**
 * Get case analytics (admin only)
 */
export async function getCaseAnalytics(caseId: string): Promise<CaseAnalyticsSummary> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/analytics`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get analytics');
  }

  return response.json();
}

/**
 * List case responses (admin only)
 */
export async function listCaseResponses(
  caseId: string,
  page: number = 1,
  limit: number = 20
): Promise<CaseResponseListResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/responses?${params}`,
    { headers }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list responses');
  }

  return response.json();
}

/**
 * Export case responses as CSV (admin only)
 */
export async function exportCaseResponses(caseId: string): Promise<Blob> {
  const headers = await getAuthHeaders();
  // Remove Content-Type for blob response
  delete headers['Content-Type'];

  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/export`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to export responses');
  }

  return response.blob();
}

/**
 * Download the exported CSV
 */
export async function downloadCaseResponsesCSV(caseId: string, filename?: string): Promise<void> {
  const blob = await exportCaseResponses(caseId);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `case_${caseId.slice(0, 8)}_responses.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Get inter-rater reliability metrics for a case (admin only)
 */
export async function getReliabilityMetrics(caseId: string): Promise<ReliabilityMetricsResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/reliability`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get reliability metrics');
  }

  return response.json();
}

/**
 * Get divergence analysis for a case (admin only)
 * Analyzes where users diverge from the gold standard path
 */
export async function getDivergenceAnalysis(caseId: string): Promise<DivergenceReport> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/divergence`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get divergence analysis');
  }

  return response.json();
}

/**
 * Export detailed case responses as CSV with expertise and gold standard comparison (admin only)
 */
export async function exportDetailedResponses(caseId: string): Promise<Blob> {
  const headers = await getAuthHeaders();
  // Remove Content-Type for blob response
  delete headers['Content-Type'];

  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/export/detailed`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to export detailed responses');
  }

  return response.blob();
}

/**
 * Download the detailed export CSV
 */
export async function downloadDetailedResponsesCSV(caseId: string, filename?: string): Promise<void> {
  const blob = await exportDetailedResponses(caseId);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `case_${caseId.slice(0, 8)}_detailed_responses.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ================================
// User Profile Endpoints
// ================================

/**
 * Get the current user's profile including expertise fields
 */
export async function getUserProfile(): Promise<UserProfile> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/me/profile`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get user profile');
  }

  return response.json();
}

/**
 * Update the current user's expertise profile
 */
export async function updateUserProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/me/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user profile');
  }

  return response.json();
}

// ================================
// Case User Management (Admin)
// ================================

/**
 * List users who have access to a case (admin only)
 */
export async function listCaseUsers(caseId: string): Promise<CaseUsersListResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/users`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list case users');
  }

  return response.json();
}

/**
 * Add a user to a case (admin only)
 */
export async function addCaseUser(
  caseId: string,
  data: AddCaseUserRequest
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add user to case');
  }
}

/**
 * Remove a user from a case (admin only)
 */
export async function removeCaseUser(caseId: string, userId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/users/${userId}`,
    {
      method: 'DELETE',
      headers,
    }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove user from case');
  }
}

// ================================
// Study Endpoints (Admin)
// ================================

/**
 * Create a new study (admin only)
 */
export async function createStudy(data: CreateStudyRequest): Promise<Study> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create study');
  }

  return response.json();
}

/**
 * List all studies (admin only)
 */
export async function listStudies(
  status?: StudyStatus,
  page: number = 1,
  limit: number = 20
): Promise<StudyListResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies?${params}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list studies');
  }

  return response.json();
}

/**
 * Get a study with its cases (admin only)
 */
export async function getStudy(studyId: string): Promise<StudyWithCases> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Study not found');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to get study');
  }

  return response.json();
}

/**
 * Update a study (admin only)
 */
export async function updateStudy(
  studyId: string,
  data: UpdateStudyRequest
): Promise<Study> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update study');
  }

  return response.json();
}

/**
 * Delete a study (admin only)
 */
export async function deleteStudy(studyId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}`, {
    method: 'DELETE',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete study');
  }
}

/**
 * Activate a study (admin only)
 */
export async function activateStudy(studyId: string): Promise<Study> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/activate`, {
    method: 'PUT',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to activate study');
  }

  return response.json();
}

/**
 * Close a study (admin only)
 */
export async function closeStudy(studyId: string): Promise<Study> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/close`, {
    method: 'PUT',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to close study');
  }

  return response.json();
}

/**
 * Add a case to a study (admin only)
 */
export async function addCaseToStudy(
  studyId: string,
  caseId: string,
  caseOrder?: number
): Promise<Case> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/cases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ case_id: caseId, case_order: caseOrder }),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add case to study');
  }

  return response.json();
}

/**
 * Remove a case from a study (admin only)
 */
export async function removeCaseFromStudy(studyId: string, caseId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/studies/${studyId}/cases/${caseId}`,
    {
      method: 'DELETE',
      headers,
    }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove case from study');
  }
}

/**
 * Reorder cases in a study (admin only)
 */
export async function reorderStudyCases(
  studyId: string,
  caseIds: string[]
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/studies/${studyId}/cases/reorder`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ case_ids: caseIds }),
    }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reorder cases');
  }
}

/**
 * List raters assigned to a study (admin only)
 */
export async function listStudyRaters(studyId: string): Promise<{ raters: StudyRater[]; total: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/raters`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list study raters');
  }

  return response.json();
}

/**
 * Add a rater to a study (admin only)
 */
export async function addStudyRater(
  studyId: string,
  userEmail: string
): Promise<StudyRater> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/raters`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: userEmail }),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add rater to study');
  }

  return response.json();
}

/**
 * Remove a rater from a study (admin only)
 */
export async function removeStudyRater(studyId: string, userId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/studies/${studyId}/raters/${userId}`,
    {
      method: 'DELETE',
      headers,
    }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove rater from study');
  }
}

/**
 * Get rater progress for a study (admin only)
 */
export async function getStudyRaterProgress(studyId: string): Promise<RaterProgressResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/progress`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get rater progress');
  }

  return response.json();
}

/**
 * Get study reliability metrics (admin only)
 */
export async function getStudyReliabilityMetrics(studyId: string): Promise<StudyReliabilityResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/reliability`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get study reliability metrics');
  }

  return response.json();
}

/**
 * Export study responses as CSV (admin only)
 */
export async function exportStudyResponses(studyId: string): Promise<Blob> {
  const headers = await getAuthHeaders();
  delete headers['Content-Type'];

  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/export`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to export study responses');
  }

  return response.blob();
}

/**
 * Download study responses CSV
 */
export async function downloadStudyResponsesCSV(studyId: string, filename?: string): Promise<void> {
  const blob = await exportStudyResponses(studyId);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `study_${studyId.slice(0, 8)}_responses.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ================================
// Backwards Compatibility Aliases
// ================================

/** @deprecated Use listPublishedCases instead */
export const listPublishedStudies = listPublishedCases;
/** @deprecated Use getPublishedCase instead */
export const getPublishedStudy = getPublishedCase;
/** @deprecated Use submitCaseResponse instead */
export const submitStudyResponse = submitCaseResponse;
/** @deprecated Use createCase instead */
export const createStudyOld = createCase;
/** @deprecated Use listCases instead */
export const listStudiesOld = listCases;
/** @deprecated Use getCase instead */
export const getStudyOld = getCase;
/** @deprecated Use updateCase instead */
export const updateStudyOld = updateCase;
/** @deprecated Use deleteCase instead */
export const deleteStudyOld = deleteCase;
/** @deprecated Use uploadCaseImage instead */
export const uploadStudyImage = uploadCaseImage;
/** @deprecated Use getAdminCaseImages instead */
export const getAdminStudyImages = getAdminCaseImages;
/** @deprecated Use deleteCaseImage instead */
export const deleteStudyImage = deleteCaseImage;
/** @deprecated Use updateCaseImage instead */
export const updateStudyImage = updateCaseImage;
/** @deprecated Use publishCase instead */
export const publishStudy = publishCase;
/** @deprecated Use closeCase instead */
export const closeStudyOld = closeCase;
/** @deprecated Use getCaseAnalytics instead */
export const getStudyAnalytics = getCaseAnalytics;
/** @deprecated Use listCaseResponses instead */
export const listStudyResponses = listCaseResponses;
/** @deprecated Use exportCaseResponses instead */
export const exportStudyResponsesOld = exportCaseResponses;
/** @deprecated Use listCaseUsers instead */
export const listStudyUsers = listCaseUsers;
/** @deprecated Use addCaseUser instead */
export const addStudyUser = addCaseUser;
/** @deprecated Use removeCaseUser instead */
export const removeStudyUser = removeCaseUser;

// Cohort aliases -> Study
/** @deprecated Use createStudy instead */
export const createCohort = createStudy;
/** @deprecated Use listStudies instead */
export const listCohorts = listStudies;
/** @deprecated Use getStudy instead */
export const getCohort = getStudy;
/** @deprecated Use updateStudy instead */
export const updateCohort = updateStudy;
/** @deprecated Use deleteStudy instead */
export const deleteCohort = deleteStudy;
/** @deprecated Use activateStudy instead */
export const activateCohort = activateStudy;
/** @deprecated Use closeStudy instead */
export const closeCohort = closeStudy;
/** @deprecated Use addCaseToStudy instead */
export const addCaseToCohort = addCaseToStudy;
/** @deprecated Use removeCaseFromStudy instead */
export const removeCaseFromCohort = removeCaseFromStudy;
/** @deprecated Use reorderStudyCases instead */
export const reorderCohortCases = reorderStudyCases;
/** @deprecated Use listStudyRaters instead */
export const listCohortUsers = listStudyRaters;
/** @deprecated Use addStudyRater instead */
export const addUserToCohort = addStudyRater;
/** @deprecated Use removeStudyRater instead */
export const removeUserFromCohort = removeStudyRater;
/** @deprecated Use getStudyRaterProgress instead */
export const getCohortRaterProgress = getStudyRaterProgress;
/** @deprecated Use getStudyReliabilityMetrics instead */
export const getCohortReliabilityMetrics = getStudyReliabilityMetrics;
/** @deprecated Use exportStudyResponses instead */
export const exportCohortResponses = exportStudyResponses;
/** @deprecated Use downloadStudyResponsesCSV instead */
export const downloadCohortResponsesCSV = downloadStudyResponsesCSV;

// Export as a namespace object for convenience
export const caseApi = {
  // User endpoints
  listPublishedCases,
  getPublishedCase,
  getImageSignedURL,
  submitCaseResponse,
  getMyResponses,
  // User profile
  getUserProfile,
  updateUserProfile,
  // Admin case endpoints
  createCase,
  listCases,
  getCase,
  updateCase,
  deleteCase,
  uploadImage: uploadCaseImage,
  getAdminCaseImages,
  updateImage: updateCaseImage,
  deleteImage: deleteCaseImage,
  publishCase,
  closeCase,
  getCaseAnalytics,
  getReliabilityMetrics,
  getDivergenceAnalysis,
  listCaseResponses,
  exportCaseResponses,
  exportDetailedResponses,
  downloadDetailedResponsesCSV,
  getAdminImageSignedURL,
  // Case user management (admin)
  listCaseUsers,
  addCaseUser,
  removeCaseUser,
  // Helpers
  getImageUrl: async (caseId: string, imageId: string) => {
    const result = await getImageSignedURL(caseId, imageId);
    return result.url;
  },
  getAdminImageUrl: async (caseId: string, imageId: string) => {
    const result = await getAdminImageSignedURL(caseId, imageId);
    return result.url;
  },
};

export const studyApi = {
  // Study management (admin)
  createStudy,
  listStudies,
  getStudy,
  updateStudy,
  deleteStudy,
  activateStudy,
  closeStudy,
  addCaseToStudy,
  removeCaseFromStudy,
  reorderStudyCases,
  listStudyRaters,
  addStudyRater,
  removeStudyRater,
  getStudyRaterProgress,
  getStudyReliabilityMetrics,
  exportStudyResponses,
  downloadStudyResponsesCSV,
  // Backwards compatibility (deprecated)
  /** @deprecated Use caseApi instead */
  listPublishedStudies,
  /** @deprecated Use caseApi instead */
  getPublishedStudy,
  /** @deprecated Use caseApi instead */
  submitStudyResponse,
};
