import type {
  Study,
  StudyWithImages,
  StudyImage,
  UserStudyDetail,
  StudyListResponse,
  UserStudyListResponse,
  CreateStudyRequest,
  UpdateStudyRequest,
  SubmitResponseRequest,
  ImageUploadResponse,
  SignedURLResponse,
  StudyAnalyticsSummary,
  StudyResponseListResponse,
  MyResponsesResponse,
  AdminStudyImagesResponse,
  ImageCategory,
  StudyUsersListResponse,
  AddStudyUserRequest,
  UpdateImageRequest,
  ReliabilityMetricsResponse,
  SubmitResponseResult,
  UserProfile,
  UpdateUserProfileRequest,
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
// User Endpoints
// ================================

/**
 * List all published studies
 */
export async function listPublishedStudies(
  page: number = 1,
  limit: number = 20
): Promise<UserStudyListResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/studies?${params}`, {
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
 * Get a published study with its images
 */
export async function getPublishedStudy(studyId: string): Promise<UserStudyDetail> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/studies/${studyId}`, {
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
 * Get a signed URL for viewing an image (for published studies)
 */
export async function getImageSignedURL(
  studyId: string,
  imageId: string
): Promise<SignedURLResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/studies/${studyId}/images/${imageId}/url`,
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
 * Get a signed URL for viewing an image (admin - works for any study status)
 */
export async function getAdminImageSignedURL(
  studyId: string,
  imageId: string
): Promise<SignedURLResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/studies/${studyId}/images/${imageId}/url`,
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
 * Submit a classification response to a study
 * Returns the response along with gold standard comparison if available
 */
export async function submitStudyResponse(
  studyId: string,
  data: SubmitResponseRequest
): Promise<SubmitResponseResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/studies/${studyId}/responses`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 409) {
      const error = await response.json();
      throw new Error(error.error || 'You have already submitted a response to this study');
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
 * Get the current user's responses for a study
 */
export async function getMyResponses(studyId: string): Promise<MyResponsesResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/studies/${studyId}/my-responses`, {
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
// Admin Endpoints
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
  status?: string,
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
 * Get a study with images (admin only)
 */
export async function getStudy(studyId: string): Promise<StudyWithImages> {
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
 * Delete a draft study (admin only)
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
 * Upload an image to a study (admin only)
 */
export async function uploadStudyImage(
  studyId: string,
  file: File,
  category: ImageCategory,
  displayOrder?: number
): Promise<ImageUploadResponse> {
  const headers = await getAuthHeadersMultipart();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (displayOrder !== undefined) formData.append('display_order', displayOrder.toString());

  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/images`, {
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
 * Get study images with signed URLs (admin only)
 */
export async function getAdminStudyImages(studyId: string): Promise<AdminStudyImagesResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/images`, {
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
 * Delete an image from a study (admin only)
 */
export async function deleteStudyImage(studyId: string, imageId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/studies/${studyId}/images/${imageId}`,
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
export async function updateStudyImage(
  studyId: string,
  imageId: string,
  data: UpdateImageRequest
): Promise<StudyImage> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/studies/${studyId}/images/${imageId}`,
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
 * Publish a study (admin only)
 */
export async function publishStudy(studyId: string): Promise<Study> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/publish`, {
    method: 'PUT',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to publish study');
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
 * Get study analytics (admin only)
 */
export async function getStudyAnalytics(studyId: string): Promise<StudyAnalyticsSummary> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/analytics`, {
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
 * List study responses (admin only)
 */
export async function listStudyResponses(
  studyId: string,
  page: number = 1,
  limit: number = 20
): Promise<StudyResponseListResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/studies/${studyId}/responses?${params}`,
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
 * Export study responses as CSV (admin only)
 */
export async function exportStudyResponses(studyId: string): Promise<Blob> {
  const headers = await getAuthHeaders();
  // Remove Content-Type for blob response
  delete headers['Content-Type'];

  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/export`, {
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

/**
 * Get inter-rater reliability metrics for a study (admin only)
 */
export async function getReliabilityMetrics(studyId: string): Promise<ReliabilityMetricsResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/reliability`, {
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
 * Export detailed study responses as CSV with expertise and gold standard comparison (admin only)
 */
export async function exportDetailedResponses(studyId: string): Promise<Blob> {
  const headers = await getAuthHeaders();
  // Remove Content-Type for blob response
  delete headers['Content-Type'];

  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/export/detailed`, {
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
export async function downloadDetailedResponsesCSV(studyId: string, filename?: string): Promise<void> {
  const blob = await exportDetailedResponses(studyId);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `study_${studyId.slice(0, 8)}_detailed_responses.csv`;
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
// Study User Management (Admin)
// ================================

/**
 * List users who have access to a study (admin only)
 */
export async function listStudyUsers(studyId: string): Promise<StudyUsersListResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/users`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list study users');
  }

  return response.json();
}

/**
 * Add a user to a study (admin only)
 */
export async function addStudyUser(
  studyId: string,
  data: AddStudyUserRequest
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/admin/studies/${studyId}/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add user to study');
  }
}

/**
 * Remove a user from a study (admin only)
 */
export async function removeStudyUser(studyId: string, userId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/studies/${studyId}/users/${userId}`,
    {
      method: 'DELETE',
      headers,
    }
  );

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove user from study');
  }
}

// Export as a namespace object for convenience
export const studyApi = {
  // User endpoints
  listPublishedStudies,
  getPublishedStudy,
  getImageSignedURL,
  submitStudyResponse,
  getMyResponses,
  // User profile
  getUserProfile,
  updateUserProfile,
  // Admin endpoints
  createStudy,
  listStudies,
  getStudy,
  updateStudy,
  deleteStudy,
  uploadImage: uploadStudyImage,
  getAdminStudyImages,
  updateImage: updateStudyImage,
  deleteImage: deleteStudyImage,
  publishStudy,
  closeStudy,
  getStudyAnalytics,
  getReliabilityMetrics,
  listStudyResponses,
  exportStudyResponses,
  exportDetailedResponses,
  downloadDetailedResponsesCSV,
  getAdminImageSignedURL,
  // Study user management (admin)
  listStudyUsers,
  addStudyUser,
  removeStudyUser,
  // Helpers
  getImageUrl: async (studyId: string, imageId: string) => {
    const result = await getImageSignedURL(studyId, imageId);
    return result.url;
  },
  getAdminImageUrl: async (studyId: string, imageId: string) => {
    const result = await getAdminImageSignedURL(studyId, imageId);
    return result.url;
  },
};
