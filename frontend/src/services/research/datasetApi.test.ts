import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest'
import { datasetApi } from './datasetApi'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock i18n
vi.mock('../../i18n/config', () => ({
  getCurrentLanguage: () => 'en',
  default: {
    t: vi.fn((key: string, fallback?: string) => fallback || key),
  },
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
      }),
    },
  },
}))

const API_BASE_URL = 'http://localhost:8080'

describe('datasetApi', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('create', () => {
    it('sends JSON body with name and description', async () => {
      let capturedBody: Record<string, unknown> | undefined

      server.use(
        http.post(`${API_BASE_URL}/api/admin/research/datasets`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(
            { id: 'uuid-1', name: 'Test Dataset', status: 'draft', record_count: 0 },
            { status: 201 },
          )
        }),
      )

      const result = await datasetApi.create('Test Dataset', 'A description')
      expect(result.name).toBe('Test Dataset')
      expect(capturedBody?.name).toBe('Test Dataset')
      expect(capturedBody?.description).toBe('A description')
    })

    it('handles server error', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/admin/research/datasets`, () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 }),
        ),
      )

      await expect(datasetApi.create('Test')).rejects.toThrow()
    })
  })

  describe('list', () => {
    it('returns dataset list', async () => {
      const result = await datasetApi.list()
      expect(result.datasets).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('returns empty list', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/admin/research/datasets`, () =>
          HttpResponse.json({ datasets: [], total: 0 }),
        ),
      )

      const result = await datasetApi.list()
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('get', () => {
    it('returns a single dataset', async () => {
      const result = await datasetApi.get('ds-001')
      expect(result.id).toBe('ds-001')
      expect(result.name).toBe('Ankle Fractures 2024')
    })

    it('handles 404', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/admin/research/datasets/:id`, () =>
          HttpResponse.json({ error: 'Not found' }, { status: 404 }),
        ),
      )

      await expect(datasetApi.get('nonexistent')).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('deletes successfully', async () => {
      await expect(datasetApi.delete('ds-001')).resolves.toBeUndefined()
    })
  })

  describe('importCSV', () => {
    it('sends multipart form data with file', async () => {
      let capturedFormData = false

      server.use(
        http.post(
          `${API_BASE_URL}/api/admin/research/datasets/:id/import`,
          async ({ request }) => {
            const formData = await request.formData()
            capturedFormData = formData.has('file')
            return HttpResponse.json({
              stats: { total_rows: 10, valid_records: 10 },
              errors: [],
              warnings: [],
              ai_used: false,
            })
          },
        ),
      )

      const file = new File(['code,age,sex\nP001,45,M'], 'test.csv', { type: 'text/csv' })
      const result = await datasetApi.importCSV('ds-001', file)
      expect(capturedFormData).toBe(true)
      expect(result.stats.total_rows).toBe(10)
    })

    it('handles import errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/admin/research/datasets/:id/import`, () =>
          HttpResponse.json({ error: 'File too large' }, { status: 400 }),
        ),
      )

      const file = new File([], 'test.csv')
      await expect(datasetApi.importCSV('ds-001', file)).rejects.toThrow()
    })
  })

  describe('getRecords', () => {
    it('returns paginated records', async () => {
      const result = await datasetApi.getRecords('ds-001')
      expect(result.records).toHaveLength(2)
      expect(result.page).toBe(1)
    })
  })

  describe('getDemographicStats', () => {
    it('returns demographic statistics', async () => {
      const result = await datasetApi.getDemographicStats('ds-001')
      expect(result.total_records).toBe(150)
      expect(result.sex_distribution).toBeDefined()
    })

    it('sends filters as query params', async () => {
      let capturedUrl = ''

      server.use(
        http.get(
          `${API_BASE_URL}/api/admin/research/datasets/:id/stats/demographics`,
          ({ request }) => {
            capturedUrl = request.url
            return HttpResponse.json({
              total_records: 82,
              sex_distribution: { female: 82 },
              bmi_distribution: {},
              age_group_distribution: {},
            })
          },
        ),
      )

      await datasetApi.getDemographicStats('ds-001', { sex: 'female' })
      expect(capturedUrl).toContain('sex=female')
    })
  })

  describe('exportCSV', () => {
    it('returns a blob', async () => {
      const result = await datasetApi.exportCSV('ds-001')
      expect(result).toBeInstanceOf(Blob)
      const text = await result.text()
      expect(text).toContain('internal_code')
    })
  })

  describe('getImportLog', () => {
    it('returns import log entries', async () => {
      const result = await datasetApi.getImportLog('ds-001')
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].action).toBe('enum_mapped')
    })
  })
})
