import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW server for unit/integration tests
 * This intercepts HTTP requests during tests
 */
export const server = setupServer(...handlers)

/**
 * Setup MSW server for tests
 * Call this in your test setup file or beforeAll hook
 */
export function setupMockServer() {
  // Start server before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

  // Reset handlers after each test (important for test isolation)
  afterEach(() => server.resetHandlers())

  // Clean up after all tests
  afterAll(() => server.close())
}
