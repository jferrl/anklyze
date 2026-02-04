import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Initialize i18n for tests with minimal config
const testI18n = i18n.createInstance()
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['translation'],
  defaultNS: 'translation',
  resources: {
    en: {
      translation: {
        // Add common test translations here
        common: {
          loading: 'Loading...',
          error: 'Error',
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
          edit: 'Edit',
          submit: 'Submit',
          back: 'Back',
          next: 'Next',
        },
        classify: 'Classify',
        classification: {
          title: 'Ankle Fracture Classification',
        },
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
})

// Create a test-specific QueryClient with disabled retries
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface WrapperProps {
  children: ReactNode
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialRoute?: string
  useMemoryRouter?: boolean
}

// Create all providers wrapper
function createWrapper(options: CustomRenderOptions = {}): React.FC<WrapperProps> {
  const { queryClient = createTestQueryClient(), initialRoute = '/', useMemoryRouter = false } = options

  return function Wrapper({ children }: WrapperProps) {
    const Router = useMemoryRouter
      ? ({ children }: { children: ReactNode }) => (
          <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
        )
      : BrowserRouter

    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={testI18n}>
          <Router>{children}</Router>
        </I18nextProvider>
      </QueryClientProvider>
    )
  }
}

// Custom render function with all providers
function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient()

  const result = render(ui, {
    wrapper: createWrapper({ ...options, queryClient }),
    ...options,
  })

  return {
    ...result,
    queryClient,
  }
}

// Render without router for isolated component tests
function renderWithQueryClient(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'initialRoute' | 'useMemoryRouter'> = {}
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient()

  const Wrapper = ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  )

  const result = render(ui, {
    wrapper: Wrapper,
    ...options,
  })

  return {
    ...result,
    queryClient,
  }
}

// Re-export everything from testing-library
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Export custom utilities
export {
  renderWithProviders,
  renderWithQueryClient,
  createTestQueryClient,
  testI18n,
}
