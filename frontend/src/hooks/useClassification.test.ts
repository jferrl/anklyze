import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClassification } from './useClassification'
import { mockFractureInput, mockClassificationResult } from '@/test/mocks/mockData'
import type { ClassificationResult } from '@/types'

// Mock the services
vi.mock('@/services', () => ({
  classifyFracture: vi.fn(),
}))

// Import the mocked function
import { classifyFracture } from '@/services'

const mockedClassifyFracture = vi.mocked(classifyFracture)

describe('useClassification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('should have null result, no loading, and no error initially', () => {
      const { result } = renderHook(() => useClassification())

      expect(result.current.result).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.scenarios).toEqual([])
    })
  })

  describe('classify', () => {
    it('should classify a fracture successfully', async () => {
      mockedClassifyFracture.mockResolvedValueOnce(mockClassificationResult)

      const { result } = renderHook(() => useClassification())

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      expect(result.current.result).toEqual(mockClassificationResult)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading to true while classifying', async () => {
      // Create a promise that we control
      let resolvePromise: (value: ClassificationResult) => void
      const classifyPromise = new Promise<ClassificationResult>((resolve) => {
        resolvePromise = resolve
      })

      mockedClassifyFracture.mockReturnValueOnce(classifyPromise)

      const { result } = renderHook(() => useClassification())

      // Start classification without awaiting
      act(() => {
        result.current.classify(mockFractureInput)
      })

      // Should be loading
      expect(result.current.loading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockClassificationResult)
        await classifyPromise
      })

      // Should not be loading anymore
      expect(result.current.loading).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const errorMessage = 'Network error'
      mockedClassifyFracture.mockRejectedValueOnce(new Error(errorMessage))

      const { result } = renderHook(() => useClassification())

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      expect(result.current.result).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })

    it('should handle non-Error exceptions', async () => {
      mockedClassifyFracture.mockRejectedValueOnce('Unknown error')

      const { result } = renderHook(() => useClassification())

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      expect(result.current.result).toBeNull()
      expect(result.current.error).toBe('Ha ocurrido un error')
    })

    it('should return the classification result', async () => {
      mockedClassifyFracture.mockResolvedValueOnce(mockClassificationResult)

      const { result } = renderHook(() => useClassification())

      let classificationResult: ClassificationResult | null = null
      await act(async () => {
        classificationResult = await result.current.classify(mockFractureInput)
      })

      expect(classificationResult).toEqual(mockClassificationResult)
    })

    it('should return null when classification fails', async () => {
      mockedClassifyFracture.mockRejectedValueOnce(new Error('Failed'))

      const { result } = renderHook(() => useClassification())

      let classificationResult: ClassificationResult | null = null
      await act(async () => {
        classificationResult = await result.current.classify(mockFractureInput)
      })

      expect(classificationResult).toBeNull()
    })

    it('should clear previous error when classifying again', async () => {
      // First call fails
      mockedClassifyFracture.mockRejectedValueOnce(new Error('First error'))

      const { result } = renderHook(() => useClassification())

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      expect(result.current.error).toBe('First error')

      // Second call succeeds
      mockedClassifyFracture.mockResolvedValueOnce(mockClassificationResult)

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      expect(result.current.error).toBeNull()
      expect(result.current.result).toEqual(mockClassificationResult)
    })
  })

  describe('scenarios', () => {
    it('should add a scenario', () => {
      const { result } = renderHook(() => useClassification())

      act(() => {
        result.current.addScenario(mockFractureInput, mockClassificationResult)
      })

      expect(result.current.scenarios).toHaveLength(1)
      expect(result.current.scenarios[0].input).toEqual(mockFractureInput)
      expect(result.current.scenarios[0].result).toEqual(mockClassificationResult)
      expect(result.current.scenarios[0].id).toBeDefined()
    })

    it('should add multiple scenarios', () => {
      const { result } = renderHook(() => useClassification())

      act(() => {
        result.current.addScenario(mockFractureInput, mockClassificationResult)
        result.current.addScenario(
          { ...mockFractureInput, fibular_level: 'suprasindesmal' },
          { ...mockClassificationResult, fracture_type: 'Different fracture' }
        )
      })

      expect(result.current.scenarios).toHaveLength(2)
    })

    it('should clear all scenarios', () => {
      const { result } = renderHook(() => useClassification())

      act(() => {
        result.current.addScenario(mockFractureInput, mockClassificationResult)
        result.current.addScenario(mockFractureInput, mockClassificationResult)
      })

      expect(result.current.scenarios).toHaveLength(2)

      act(() => {
        result.current.clearScenarios()
      })

      expect(result.current.scenarios).toHaveLength(0)
    })
  })

  describe('reset', () => {
    it('should reset result and error', async () => {
      mockedClassifyFracture.mockResolvedValueOnce(mockClassificationResult)

      const { result } = renderHook(() => useClassification())

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      expect(result.current.result).not.toBeNull()

      act(() => {
        result.current.reset()
      })

      expect(result.current.result).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should not clear scenarios on reset', async () => {
      mockedClassifyFracture.mockResolvedValueOnce(mockClassificationResult)

      const { result } = renderHook(() => useClassification())

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      act(() => {
        result.current.addScenario(mockFractureInput, mockClassificationResult)
        result.current.reset()
      })

      expect(result.current.result).toBeNull()
      expect(result.current.scenarios).toHaveLength(1)
    })
  })

  describe('resetAll', () => {
    it('should reset everything including scenarios', async () => {
      mockedClassifyFracture.mockResolvedValueOnce(mockClassificationResult)

      const { result } = renderHook(() => useClassification())

      await act(async () => {
        await result.current.classify(mockFractureInput)
      })

      act(() => {
        result.current.addScenario(mockFractureInput, mockClassificationResult)
      })

      expect(result.current.result).not.toBeNull()
      expect(result.current.scenarios).toHaveLength(1)

      act(() => {
        result.current.resetAll()
      })

      expect(result.current.result).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.scenarios).toHaveLength(0)
    })
  })
})
