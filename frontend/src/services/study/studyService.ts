import type {
  Study,
  StudyWithCases,
  StudyListResponse,
  CreateStudyRequest,
  UpdateStudyRequest,
  StudyReliabilityResponse,
  StudyGoldStandardResponse,
  StudyStatus,
  Case,
} from '@/types';
import { apiRequest, getAuthHeaders, API_BASE_URL } from '../core/apiClient';

// ================================
// Study Management (Admin)
// ================================

/**
 * Create a new study (admin only)
 */
export async function createStudy(data: CreateStudyRequest): Promise<Study> {
  return apiRequest<Study>('/api/admin/studies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
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

  return apiRequest<StudyListResponse>(`/api/admin/studies?${params}`, {
    method: 'GET',
  });
}

/**
 * Get a study with its cases (admin only)
 */
export async function getStudy(studyId: string): Promise<StudyWithCases> {
  try {
    return await apiRequest<StudyWithCases>(`/api/admin/studies/${studyId}`, {
      method: 'GET',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error('Study not found');
    }
    throw error;
  }
}

/**
 * Update a study (admin only)
 */
export async function updateStudy(
  studyId: string,
  data: UpdateStudyRequest
): Promise<Study> {
  return apiRequest<Study>(`/api/admin/studies/${studyId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a study (admin only)
 */
export async function deleteStudy(studyId: string): Promise<void> {
  await apiRequest<void>(`/api/admin/studies/${studyId}`, {
    method: 'DELETE',
  });
}

/**
 * Activate a study (admin only)
 */
export async function activateStudy(studyId: string): Promise<Study> {
  return apiRequest<Study>(`/api/admin/studies/${studyId}/activate`, {
    method: 'PUT',
  });
}

/**
 * Close a study (admin only)
 */
export async function closeStudy(studyId: string): Promise<Study> {
  return apiRequest<Study>(`/api/admin/studies/${studyId}/close`, {
    method: 'PUT',
  });
}

// ================================
// Study Cases Management
// ================================

/**
 * Add a case to a study (admin only)
 */
export async function addCaseToStudy(
  studyId: string,
  caseId: string,
  caseOrder?: number
): Promise<Case> {
  return apiRequest<Case>(`/api/admin/studies/${studyId}/cases`, {
    method: 'POST',
    body: JSON.stringify({ case_id: caseId, case_order: caseOrder }),
  });
}

/**
 * Add all available published cases to a study (admin only)
 */
export async function addAllCasesToStudy(
  studyId: string
): Promise<{ added: number }> {
  return apiRequest<{ added: number }>(`/api/admin/studies/${studyId}/cases/add-all`, {
    method: 'POST',
  });
}

/**
 * Remove a case from a study (admin only)
 */
export async function removeCaseFromStudy(studyId: string, caseId: string): Promise<void> {
  await apiRequest<void>(`/api/admin/studies/${studyId}/cases/${caseId}`, {
    method: 'DELETE',
  });
}

/**
 * Reorder cases in a study (admin only)
 */
export async function reorderStudyCases(
  studyId: string,
  caseIds: string[]
): Promise<void> {
  await apiRequest<void>(`/api/admin/studies/${studyId}/cases/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ case_ids: caseIds }),
  });
}

// ================================
// Study Analytics & Reporting
// ================================

/**
 * Get study reliability metrics (admin only)
 */
export async function getStudyReliabilityMetrics(studyId: string): Promise<StudyReliabilityResponse> {
  return apiRequest<StudyReliabilityResponse>(`/api/admin/studies/${studyId}/reliability`, {
    method: 'GET',
  });
}

/**
 * Get study gold standard accuracy metrics (admin only)
 */
export async function getStudyGoldStandardMetrics(studyId: string): Promise<StudyGoldStandardResponse> {
  return apiRequest<StudyGoldStandardResponse>(`/api/admin/studies/${studyId}/accuracy`, {
    method: 'GET',
  });
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
