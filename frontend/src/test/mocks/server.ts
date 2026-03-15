import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW server for unit/integration tests
 * This intercepts HTTP requests during tests
 */
export const server = setupServer(...handlers)

