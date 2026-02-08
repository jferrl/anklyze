/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { useDatasetStats } from './useDatasetStats'
import type { ReactNode } from 'react'

const API_BASE_URL = 'http://localhost:8080'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useDatasetStats', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('fetches all four stat types', async () => {
    const { result } = renderHook(
      () => useDatasetStats('ds-001', {}),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.demographic.isSuccess).toBe(true)
      expect(result.current.fracture.isSuccess).toBe(true)
      expect(result.current.surgical.isSuccess).toBe(true)
      expect(result.current.outcome.isSuccess).toBe(true)
    })

    expect(result.current.demographic.data?.total_records).toBe(150)
    expect(result.current.fracture.data?.total_records).toBe(150)
    expect(result.current.surgical.data?.total_records).toBe(150)
    expect(result.current.outcome.data?.total_records).toBe(150)
  })

  it('does not fetch when datasetId is empty', async () => {
    const { result } = renderHook(
      () => useDatasetStats('', {}),
      { wrapper: createWrapper() },
    )

    // Queries should not be enabled
    expect(result.current.demographic.fetchStatus).toBe('idle')
    expect(result.current.fracture.fetchStatus).toBe('idle')
    expect(result.current.surgical.fetchStatus).toBe('idle')
    expect(result.current.outcome.fetchStatus).toBe('idle')
  })

  it('refetches when filters change', async () => {
    const wrapper = createWrapper()

    const { result, rerender } = renderHook(
      ({ filters }) => useDatasetStats('ds-001', filters),
      {
        wrapper,
        initialProps: { filters: {} },
      },
    )

    await waitFor(() => {
      expect(result.current.demographic.isSuccess).toBe(true)
    })

    const firstData = result.current.demographic.dataUpdatedAt

    // Change filters to trigger refetch
    rerender({ filters: { sex: 'female' } })

    await waitFor(() => {
      expect(result.current.demographic.dataUpdatedAt).not.toBe(firstData)
    })
  })

  it('handles demographic API error gracefully', async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/admin/research/datasets/:id/stats/demographics`,
        () => HttpResponse.json({ error: 'Server error' }, { status: 500 }),
      ),
    )

    const { result } = renderHook(
      () => useDatasetStats('ds-001', {}),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.demographic.isError).toBe(true)
    })

    // Other queries should still succeed
    await waitFor(() => {
      expect(result.current.fracture.isSuccess).toBe(true)
    })
  })

  it('handles fracture API error gracefully', async () => {
    server.use(
      http.get(
        `${API_BASE_URL}/api/admin/research/datasets/:id/stats/fractures`,
        () => HttpResponse.json({ error: 'Server error' }, { status: 500 }),
      ),
    )

    const { result } = renderHook(
      () => useDatasetStats('ds-001', {}),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.fracture.isError).toBe(true)
    })
  })

  it('passes filters to all queries', async () => {
    const requestUrls: string[] = []

    server.use(
      http.get(
        `${API_BASE_URL}/api/admin/research/datasets/:id/stats/demographics`,
        ({ request }) => {
          requestUrls.push(request.url)
          return HttpResponse.json({
            total_records: 50,
            sex_distribution: { female: 50 },
            bmi_distribution: {},
            age_group_distribution: {},
          })
        },
      ),
    )

    const { result } = renderHook(
      () => useDatasetStats('ds-001', { sex: 'female', trauma_energy: 'high' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.demographic.isSuccess).toBe(true)
    })

    const url = new URL(requestUrls[0])
    expect(url.searchParams.get('sex')).toBe('female')
    expect(url.searchParams.get('trauma_energy')).toBe('high')
  })
})
