import { API_BASE_URL, getAuthHeaders } from '../core/apiClient'
import { handleApiError } from '../core/errorHandling'
import type {
  Dataset,
  DatasetListResponse,
  ImportResult,
  ImportLogResponse,
  RecordsResponse,
  RecordFilters,
  DemographicStats,
  FractureStats,
  SurgicalStats,
  OutcomeStats,
} from './types'

const BASE = `${API_BASE_URL}/api/admin/research/datasets`

async function authHeaders(): Promise<Record<string, string>> {
  return getAuthHeaders()
}

export const datasetApi = {
  /** Create a new empty dataset. */
  async create(name: string, description?: string): Promise<Dataset> {
    const headers = await authHeaders()
    const res = await fetch(BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description }),
    })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** List datasets for the current user. */
  async list(): Promise<DatasetListResponse> {
    const headers = await authHeaders()
    const res = await fetch(BASE, { headers })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** Get a single dataset by ID. */
  async get(id: string): Promise<Dataset> {
    const headers = await authHeaders()
    const res = await fetch(`${BASE}/${id}`, { headers })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** Delete a dataset. */
  async delete(id: string): Promise<void> {
    const headers = await authHeaders()
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers })
    if (!res.ok) await handleApiError(res)
  },

  /** Import a CSV file into a dataset via the normalization pipeline. */
  async importCSV(id: string, file: File): Promise<ImportResult> {
    const headers = await authHeaders()
    // Remove Content-Type so browser sets multipart boundary
    delete headers['Content-Type']

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${BASE}/${id}/import`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** Get paginated records for a dataset. */
  async getRecords(
    id: string,
    page = 1,
    limit = 20,
    filters?: RecordFilters,
  ): Promise<RecordsResponse> {
    const headers = await authHeaders()
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    })
    if (filters?.sex) params.set('sex', filters.sex)
    if (filters?.trauma_energy) params.set('trauma_energy', filters.trauma_energy)
    if (filters?.age_min) params.set('age_min', filters.age_min)
    if (filters?.age_max) params.set('age_max', filters.age_max)

    const res = await fetch(`${BASE}/${id}/records?${params}`, { headers })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** Get demographic statistics for a dataset. */
  async getDemographicStats(id: string, filters?: RecordFilters): Promise<DemographicStats> {
    const headers = await authHeaders()
    const params = new URLSearchParams()
    if (filters?.sex) params.set('sex', filters.sex)
    if (filters?.trauma_energy) params.set('trauma_energy', filters.trauma_energy)

    const url = params.toString()
      ? `${BASE}/${id}/stats/demographics?${params}`
      : `${BASE}/${id}/stats/demographics`

    const res = await fetch(url, { headers })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** Get fracture statistics for a dataset. */
  async getFractureStats(id: string, filters?: RecordFilters): Promise<FractureStats> {
    const headers = await authHeaders()
    const params = new URLSearchParams()
    if (filters?.sex) params.set('sex', filters.sex)
    if (filters?.trauma_energy) params.set('trauma_energy', filters.trauma_energy)

    const url = params.toString()
      ? `${BASE}/${id}/stats/fractures?${params}`
      : `${BASE}/${id}/stats/fractures`

    const res = await fetch(url, { headers })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** Get surgical statistics for a dataset. */
  async getSurgicalStats(id: string, filters?: RecordFilters): Promise<SurgicalStats> {
    const headers = await authHeaders()
    const params = new URLSearchParams()
    if (filters?.sex) params.set('sex', filters.sex)

    const url = params.toString()
      ? `${BASE}/${id}/stats/surgical?${params}`
      : `${BASE}/${id}/stats/surgical`

    const res = await fetch(url, { headers })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** Get outcome statistics for a dataset. */
  async getOutcomeStats(id: string, filters?: RecordFilters): Promise<OutcomeStats> {
    const headers = await authHeaders()
    const params = new URLSearchParams()
    if (filters?.sex) params.set('sex', filters.sex)

    const url = params.toString()
      ? `${BASE}/${id}/stats/outcomes?${params}`
      : `${BASE}/${id}/stats/outcomes`

    const res = await fetch(url, { headers })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },

  /** Export dataset records as CSV (returns Blob). */
  async exportCSV(id: string): Promise<Blob> {
    const headers = await authHeaders()
    const res = await fetch(`${BASE}/${id}/export`, { headers })
    if (!res.ok) await handleApiError(res)
    return res.blob()
  },

  /** Get import log entries for a dataset. */
  async getImportLog(id: string): Promise<ImportLogResponse> {
    const headers = await authHeaders()
    const res = await fetch(`${BASE}/${id}/import-log`, { headers })
    if (!res.ok) await handleApiError(res)
    return res.json()
  },
}
