import { http, HttpResponse, delay } from 'msw'
import {
  mockDatasets,
  mockDataset,
  mockDraftDataset,
  mockImportResult,
  mockRecords,
  mockDemographicStats,
  mockFractureStats,
  mockSurgicalStats,
  mockOutcomeStats,
  mockImportLogEntries,
} from './researchMockData'

const API_BASE_URL = 'http://localhost:8080'

export const researchHandlers = [
  // GET /api/admin/research/datasets - List datasets
  http.get(`${API_BASE_URL}/api/admin/research/datasets`, async () => {
    await delay(100)
    return HttpResponse.json({
      datasets: mockDatasets,
      total: mockDatasets.length,
    })
  }),

  // POST /api/admin/research/datasets - Create dataset
  http.post(`${API_BASE_URL}/api/admin/research/datasets`, async ({ request }) => {
    await delay(100)
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      {
        ...mockDraftDataset,
        id: 'ds-new',
        name: body.name as string,
        description: (body.description as string) || '',
      },
      { status: 201 },
    )
  }),

  // GET /api/admin/research/datasets/:id - Get dataset
  http.get(`${API_BASE_URL}/api/admin/research/datasets/:id`, async () => {
    await delay(100)
    return HttpResponse.json(mockDataset)
  }),

  // DELETE /api/admin/research/datasets/:id - Delete dataset
  http.delete(`${API_BASE_URL}/api/admin/research/datasets/:id`, async () => {
    await delay(100)
    return new HttpResponse(null, { status: 204 })
  }),

  // POST /api/admin/research/datasets/:id/import - Import CSV
  http.post(`${API_BASE_URL}/api/admin/research/datasets/:id/import`, async () => {
    await delay(200)
    return HttpResponse.json(mockImportResult)
  }),

  // GET /api/admin/research/datasets/:id/records - Get records
  http.get(`${API_BASE_URL}/api/admin/research/datasets/:id/records`, async () => {
    await delay(100)
    return HttpResponse.json({
      records: mockRecords,
      total: mockRecords.length,
      page: 1,
      limit: 20,
    })
  }),

  // GET /api/admin/research/datasets/:id/stats/demographics
  http.get(
    `${API_BASE_URL}/api/admin/research/datasets/:id/stats/demographics`,
    async () => {
      await delay(100)
      return HttpResponse.json(mockDemographicStats)
    },
  ),

  // GET /api/admin/research/datasets/:id/stats/fractures
  http.get(
    `${API_BASE_URL}/api/admin/research/datasets/:id/stats/fractures`,
    async () => {
      await delay(100)
      return HttpResponse.json(mockFractureStats)
    },
  ),

  // GET /api/admin/research/datasets/:id/stats/surgical
  http.get(
    `${API_BASE_URL}/api/admin/research/datasets/:id/stats/surgical`,
    async () => {
      await delay(100)
      return HttpResponse.json(mockSurgicalStats)
    },
  ),

  // GET /api/admin/research/datasets/:id/stats/outcomes
  http.get(
    `${API_BASE_URL}/api/admin/research/datasets/:id/stats/outcomes`,
    async () => {
      await delay(100)
      return HttpResponse.json(mockOutcomeStats)
    },
  ),

  // GET /api/admin/research/datasets/:id/export - Export CSV
  http.get(`${API_BASE_URL}/api/admin/research/datasets/:id/export`, async () => {
    await delay(100)
    return new HttpResponse('internal_code,age,sex\nP001,45,male\nP002,62,female\n', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=dataset_export.csv',
      },
    })
  }),

  // GET /api/admin/research/datasets/:id/import-log
  http.get(`${API_BASE_URL}/api/admin/research/datasets/:id/import-log`, async () => {
    await delay(100)
    return HttpResponse.json({
      entries: mockImportLogEntries,
      total: mockImportLogEntries.length,
    })
  }),
]
