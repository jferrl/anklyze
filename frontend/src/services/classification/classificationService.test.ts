import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest'
import { classifyFracture, validateCombination } from './classificationService'
import { mockFractureInput, mockClassificationResult } from '@/test/mocks/mockData'
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

describe('classificationService', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('classifyFracture', () => {
    it('should classify a fracture successfully', async () => {
      const result = await classifyFracture(mockFractureInput)

      expect(result).toEqual(mockClassificationResult)
    })

    it('should include Accept-Language header in request', async () => {
      let capturedHeaders: Headers | undefined

      server.use(
        http.post(`${API_BASE_URL}/api/classify`, async ({ request }) => {
          capturedHeaders = request.headers
          return HttpResponse.json(mockClassificationResult)
        })
      )

      await classifyFracture(mockFractureInput)

      expect(capturedHeaders?.get('Accept-Language')).toBe('en')
    })

    it('should include Authorization header when authenticated', async () => {
      let capturedHeaders: Headers | undefined

      server.use(
        http.post(`${API_BASE_URL}/api/classify`, async ({ request }) => {
          capturedHeaders = request.headers
          return HttpResponse.json(mockClassificationResult)
        })
      )

      await classifyFracture(mockFractureInput)

      expect(capturedHeaders?.get('Authorization')).toBe('Bearer mock-token')
    })

    it('should send fracture input as JSON body', async () => {
      let capturedBody: unknown

      server.use(
        http.post(`${API_BASE_URL}/api/classify`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json(mockClassificationResult)
        })
      )

      await classifyFracture(mockFractureInput)

      expect(capturedBody).toEqual(mockFractureInput)
    })

    it('should handle API errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/classify`, () => {
          return HttpResponse.json(
            { error: 'Server error', message: 'Internal server error' },
            { status: 500 }
          )
        })
      )

      await expect(classifyFracture(mockFractureInput)).rejects.toThrow()
    })

    it('should handle 401 unauthorized errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/classify`, () => {
          return HttpResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401 }
          )
        })
      )

      await expect(classifyFracture(mockFractureInput)).rejects.toThrow()
    })

    it('should handle 403 forbidden errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/classify`, () => {
          return HttpResponse.json(
            { error: 'Forbidden', message: 'Access denied' },
            { status: 403 }
          )
        })
      )

      await expect(classifyFracture(mockFractureInput)).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/classify`, () => {
          return HttpResponse.error()
        })
      )

      await expect(classifyFracture(mockFractureInput)).rejects.toThrow()
    })

    it('should handle impossible fracture combinations', async () => {
      const impossibleInput = {
        ...mockFractureInput,
        involved_malleoli: 'lateral_posterior' as const,
        fibular_level: 'infrasindesmal' as const,
      }

      // The mock handler returns impossible result for this combination
      const result = await classifyFracture(impossibleInput)

      expect(result.impossible).toBe(true)
      expect(result.impossible_key).toBeDefined()
    })
  })

  describe('validateCombination', () => {
    it('should validate a valid combination', async () => {
      const result = await validateCombination({
        involved_malleoli: mockFractureInput.involved_malleoli,
        fibular_level: mockFractureInput.fibular_level,
      })

      expect(result).toBe(true)
    })

    it('should return true for 404 (endpoint not implemented)', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      server.use(
        http.post(`${API_BASE_URL}/api/validate`, () => {
          // Return a response with 404 in the error message for the catch block to detect
          return HttpResponse.json(
            { error: '404 Not Found', message: 'Endpoint not found' },
            { status: 404 }
          )
        })
      )

      const result = await validateCombination({
        involved_malleoli: 'lateral_only',
      })

      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Validate endpoint not implemented, assuming valid combination'
      )

      consoleSpy.mockRestore()
    })

    it('should throw for other errors', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/validate`, () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          )
        })
      )

      await expect(
        validateCombination({ involved_malleoli: 'lateral_only' })
      ).rejects.toThrow()
    })
  })
})
