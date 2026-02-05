import type {
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
  DivergenceReport,
} from '@/types';
import { apiRequest, getAuthHeaders, API_BASE_URL } from '../core/apiClient';
import i18n from '../../i18n/config';

const t = i18n.t.bind(i18n);

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

  return apiRequest<UserCaseListResponse>(`/api/cases?${params}`, {
    method: 'GET',
  });
}

/**
 * Get a published case with its images
 */
export async function getPublishedCase(caseId: string): Promise<UserCaseDetail> {
  try {
    return await apiRequest<UserCaseDetail>(`/api/cases/${caseId}`, {
      method: 'GET',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(t('errors.caseNotFound'));
    }
    throw error;
  }
}

/**
 * Get a signed URL for viewing an image (for published cases)
 */
export async function getImageSignedURL(
  caseId: string,
  imageId: string
): Promise<SignedURLResponse> {
  try {
    return await apiRequest<SignedURLResponse>(
      `/api/cases/${caseId}/images/${imageId}/url`,
      { method: 'GET' }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(t('errors.imageNotFound'));
    }
    throw error;
  }
}

/**
 * Get a signed URL for viewing an image (admin - works for any case status)
 */
export async function getAdminImageSignedURL(
  caseId: string,
  imageId: string
): Promise<SignedURLResponse> {
  try {
    return await apiRequest<SignedURLResponse>(
      `/api/admin/cases/${caseId}/images/${imageId}/url`,
      { method: 'GET' }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error('Image not found');
    }
    throw error;
  }
}

/**
 * Submit a classification response to a case
 * Returns the response along with gold standard comparison if available
 */
export async function submitCaseResponse(
  caseId: string,
  data: SubmitResponseRequest
): Promise<SubmitResponseResult> {
  try {
    return await apiRequest<SubmitResponseResult>(`/api/cases/${caseId}/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('409')) {
        throw new Error('You have already submitted a response to this case');
      }
      if (error.message.includes('400')) {
        throw new Error('Cannot submit response');
      }
    }
    throw error;
  }
}

/**
 * Get the current user's responses for a case
 */
export async function getMyResponses(caseId: string): Promise<MyResponsesResponse> {
  return apiRequest<MyResponsesResponse>(`/api/cases/${caseId}/my-responses`, {
    method: 'GET',
  });
}

// ================================
// Admin Case Endpoints
// ================================

/**
 * Create a new case (admin only)
 */
export async function createCase(data: CreateCaseRequest): Promise<Case> {
  return apiRequest<Case>('/api/admin/cases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
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

  return apiRequest<CaseListResponse>(`/api/admin/cases?${params}`, {
    method: 'GET',
  });
}

/**
 * Get a case with images (admin only)
 */
export async function getCase(caseId: string): Promise<CaseWithImages> {
  try {
    return await apiRequest<CaseWithImages>(`/api/admin/cases/${caseId}`, {
      method: 'GET',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error('Case not found');
    }
    throw error;
  }
}

/**
 * Update a case (admin only)
 */
export async function updateCase(
  caseId: string,
  data: UpdateCaseRequest
): Promise<Case> {
  return apiRequest<Case>(`/api/admin/cases/${caseId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a draft case (admin only)
 */
export async function deleteCase(caseId: string): Promise<void> {
  await apiRequest<void>(`/api/admin/cases/${caseId}`, {
    method: 'DELETE',
  });
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
  // Get auth headers without Content-Type (browser sets it for FormData)
  const headers = await getAuthHeaders();
  delete headers['Content-Type'];

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (displayOrder !== undefined) {
    formData.append('display_order', displayOrder.toString());
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/images`, {
    method: 'POST',
    headers,
    body: formData,
  });

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
  return apiRequest<AdminCaseImagesResponse>(`/api/admin/cases/${caseId}/images`, {
    method: 'GET',
  });
}

/**
 * Delete an image from a case (admin only)
 */
export async function deleteCaseImage(caseId: string, imageId: string): Promise<void> {
  await apiRequest<void>(`/api/admin/cases/${caseId}/images/${imageId}`, {
    method: 'DELETE',
  });
}

/**
 * Update an image's display order (admin only)
 */
export async function updateCaseImage(
  caseId: string,
  imageId: string,
  data: UpdateImageRequest
): Promise<CaseImage> {
  return apiRequest<CaseImage>(`/api/admin/cases/${caseId}/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Publish a case (admin only)
 */
export async function publishCase(caseId: string): Promise<Case> {
  return apiRequest<Case>(`/api/admin/cases/${caseId}/publish`, {
    method: 'PUT',
  });
}

/**
 * Close a case (admin only)
 */
export async function closeCase(caseId: string): Promise<Case> {
  return apiRequest<Case>(`/api/admin/cases/${caseId}/close`, {
    method: 'PUT',
  });
}

/**
 * Get case analytics (admin only)
 */
export async function getCaseAnalytics(caseId: string): Promise<CaseAnalyticsSummary> {
  return apiRequest<CaseAnalyticsSummary>(`/api/admin/cases/${caseId}/analytics`, {
    method: 'GET',
  });
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

  return apiRequest<CaseResponseListResponse>(
    `/api/admin/cases/${caseId}/responses?${params}`,
    { method: 'GET' }
  );
}

/**
 * Export case responses as CSV (admin only)
 */
export async function exportCaseResponses(caseId: string): Promise<Blob> {
  const headers = await getAuthHeaders();
  delete headers['Content-Type'];

  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/export`, {
    headers,
  });

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
  return apiRequest<ReliabilityMetricsResponse>(`/api/admin/cases/${caseId}/reliability`, {
    method: 'GET',
  });
}

/**
 * Get divergence analysis for a case (admin only)
 * Analyzes where users diverge from the gold standard path
 */
export async function getDivergenceAnalysis(caseId: string): Promise<DivergenceReport> {
  return apiRequest<DivergenceReport>(`/api/admin/cases/${caseId}/divergence`, {
    method: 'GET',
  });
}

/**
 * Export detailed case responses as CSV with expertise and gold standard comparison (admin only)
 */
export async function exportDetailedResponses(caseId: string): Promise<Blob> {
  const headers = await getAuthHeaders();
  delete headers['Content-Type'];

  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}/export/detailed`, {
    headers,
  });

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
 * Basic user information from authentication
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  role: 'user' | 'admin';
  display_name?: string;
  avatar_url?: string;
  provider?: string;
}

/**
 * Get the current authenticated user's basic information
 */
export async function getCurrentUser(): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>('/api/me', {
    method: 'GET',
  });
}

/**
 * Get the current user's profile including expertise fields
 */
export async function getUserProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/me/profile', {
    method: 'GET',
  });
}

/**
 * Update the current user's expertise profile
 */
export async function updateUserProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/me/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ================================
// Case User Management (Admin)
// ================================

/**
 * List users who have access to a case (admin only)
 */
export async function listCaseUsers(caseId: string): Promise<CaseUsersListResponse> {
  return apiRequest<CaseUsersListResponse>(`/api/admin/cases/${caseId}/users`, {
    method: 'GET',
  });
}

/**
 * Add a user to a case (admin only)
 */
export async function addCaseUser(
  caseId: string,
  data: AddCaseUserRequest
): Promise<void> {
  await apiRequest<void>(`/api/admin/cases/${caseId}/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Remove a user from a case (admin only)
 */
export async function removeCaseUser(caseId: string, userId: string): Promise<void> {
  await apiRequest<void>(`/api/admin/cases/${caseId}/users/${userId}`, {
    method: 'DELETE',
  });
}

// ================================
// Helper Functions
// ================================

/**
 * Get image URL helper (for published cases)
 */
export async function getImageUrl(caseId: string, imageId: string): Promise<string> {
  const result = await getImageSignedURL(caseId, imageId);
  return result.url;
}

/**
 * Get image URL helper (admin - works for any case status)
 */
export async function getAdminImageUrl(caseId: string, imageId: string): Promise<string> {
  const result = await getAdminImageSignedURL(caseId, imageId);
  return result.url;
}
