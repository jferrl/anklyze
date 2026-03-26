import { http, HttpResponse, delay } from 'msw'
import {
  mockClassificationResult,
  mockCase,
  mockCaseWithImages,
  mockUserCaseItem,
  mockUserCaseDetail,
  mockCaseAnalytics,
  mockReliabilityMetrics,
  mockUser,
} from './mockData'

const API_BASE_URL = 'http://localhost:8080'

// ============================================================================
// Classification API Handlers
// ============================================================================

const classificationHandlers = [
  // POST /api/classify - Classify a fracture
  http.post(`${API_BASE_URL}/api/classify`, async ({ request }) => {
    await delay(100) // Simulate network latency

    const body = await request.json() as { involved_malleoli?: string }

    // Return impossible result for certain combinations
    if (body.involved_malleoli === 'lateral_posterior' &&
        (body as Record<string, string>).fibular_level === 'infrasindesmal') {
      return HttpResponse.json({
        fracture_type: 'Impossible combination',
        impossible: true,
        impossible_key: 'IMPOSSIBLE_INFRASINDESMAL_POSTERIOR',
        notes: ['Infrasindesmal fractures cannot involve the posterior malleolus'],
      })
    }

    return HttpResponse.json(mockClassificationResult)
  }),

  // POST /api/validate - Validate fracture combination
  http.post(`${API_BASE_URL}/api/validate`, async () => {
    await delay(50)
    return HttpResponse.json({ valid: true })
  }),
]

// ============================================================================
// Case API Handlers
// ============================================================================

const caseHandlers = [
  // GET /api/admin/cases - List all cases (admin)
  http.get(`${API_BASE_URL}/api/admin/cases`, async () => {
    await delay(100)
    return HttpResponse.json({
      cases: [mockCase],
      total: 1,
    })
  }),

  // GET /api/admin/cases/:id - Get case by ID (admin)
  http.get(`${API_BASE_URL}/api/admin/cases/:id`, async () => {
    await delay(100)
    return HttpResponse.json(mockCaseWithImages)
  }),

  // POST /api/admin/cases - Create case
  http.post(`${API_BASE_URL}/api/admin/cases`, async ({ request }) => {
    await delay(150)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...mockCase,
      ...body,
      id: 'new-case-123',
    }, { status: 201 })
  }),

  // PUT /api/admin/cases/:id - Update case
  http.put(`${API_BASE_URL}/api/admin/cases/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...mockCase,
      ...body,
    })
  }),

  // DELETE /api/admin/cases/:id - Delete case
  http.delete(`${API_BASE_URL}/api/admin/cases/:id`, async () => {
    await delay(100)
    return new HttpResponse(null, { status: 204 })
  }),

  // GET /api/cases - List user's available cases
  http.get(`${API_BASE_URL}/api/cases`, async () => {
    await delay(100)
    return HttpResponse.json({
      cases: [mockUserCaseItem],
      total: 1,
    })
  }),

  // GET /api/cases/:id - Get case detail for user
  http.get(`${API_BASE_URL}/api/cases/:id`, async () => {
    await delay(100)
    return HttpResponse.json(mockUserCaseDetail)
  }),

  // POST /api/cases/:id/responses - Submit case response
  http.post(`${API_BASE_URL}/api/cases/:id/responses`, async () => {
    await delay(150)
    return HttpResponse.json({
      response: {
        id: 'response-new',
        case_id: 'case-123',
        user_id: 'user-123',
        created_at: new Date().toISOString(),
        classification: mockClassificationResult,
        time_taken_ms: 45000,
      },
    }, { status: 201 })
  }),
]

// ============================================================================
// Analytics API Handlers
// ============================================================================

const analyticsHandlers = [
  // GET /api/admin/cases/:id/analytics - Get case analytics
  http.get(`${API_BASE_URL}/api/admin/cases/:id/analytics`, async () => {
    await delay(100)
    return HttpResponse.json(mockCaseAnalytics)
  }),

  // GET /api/admin/cases/:id/reliability - Get case reliability metrics
  http.get(`${API_BASE_URL}/api/admin/cases/:id/reliability`, async () => {
    await delay(100)
    return HttpResponse.json(mockReliabilityMetrics)
  }),
]

// ============================================================================
// User API Handlers
// ============================================================================

const userHandlers = [
  // GET /api/profile - Get current user profile
  http.get(`${API_BASE_URL}/api/profile`, async () => {
    await delay(50)
    return HttpResponse.json(mockUser)
  }),

  // PUT /api/profile - Update user profile
  http.put(`${API_BASE_URL}/api/profile`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...mockUser,
      ...body,
    })
  }),
]

// ============================================================================
// Combined Handlers
// ============================================================================

/**
 * All default handlers for happy path testing
 */
export const handlers = [
  ...classificationHandlers,
  ...caseHandlers,
  ...analyticsHandlers,
  ...userHandlers,
]
