import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFormPersistence } from './useFormPersistence'
import { db } from '@/lib/db'

// Test data types - using Record to satisfy generic constraint
interface TestFormData extends Record<string, unknown> {
  field1?: string
  field2?: number
}

describe('useFormPersistence', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await db.formDrafts.clear()
  })

  afterEach(async () => {
    // Clean up after tests
    await db.formDrafts.clear()
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should return restore and clear functions', () => {
      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      expect(result.current.restore).toBeDefined()
      expect(typeof result.current.restore).toBe('function')
      expect(result.current.clear).toBeDefined()
      expect(typeof result.current.clear).toBe('function')
    })
  })

  describe('saving form data', () => {
    it('should save form data to IndexedDB when it changes', async () => {
      const initialData: TestFormData = { field1: 'test', field2: 42 }
      const initialHistory: TestFormData[] = []

      renderHook(() =>
        useFormPersistence<TestFormData>('fracture', initialData, initialHistory)
      )

      // Wait for debounced save
      await waitFor(async () => {
        const saved = await db.formDrafts.get('fracture')
        expect(saved).not.toBeNull()
        expect(saved?.data).toEqual(initialData)
      }, { timeout: 1000 })
    })

    it('should save history along with form data', async () => {
      const initialData: TestFormData = { field1: 'current' }
      const initialHistory: TestFormData[] = [
        { field1: 'previous1' },
        { field1: 'previous2' },
      ]

      renderHook(() =>
        useFormPersistence<TestFormData>('fracture', initialData, initialHistory)
      )

      await waitFor(async () => {
        const saved = await db.formDrafts.get('fracture')
        expect(saved?.history).toEqual(initialHistory)
      }, { timeout: 1000 })
    })

    it('should not save empty form data', async () => {
      renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      // Give time for potential save
      await new Promise(resolve => setTimeout(resolve, 500))

      const saved = await db.formDrafts.get('fracture')
      expect(saved).toBeUndefined()
    })

    it('should update existing draft when form data changes', async () => {
      const { rerender } = renderHook(
        ({ formData }) =>
          useFormPersistence<TestFormData>('fracture', formData, []),
        { initialProps: { formData: { field1: 'initial' } } }
      )

      await waitFor(async () => {
        const saved = await db.formDrafts.get('fracture')
        expect(saved?.data).toEqual({ field1: 'initial' })
      }, { timeout: 1000 })

      // Update form data
      rerender({ formData: { field1: 'updated' } })

      await waitFor(async () => {
        const saved = await db.formDrafts.get('fracture')
        expect(saved?.data).toEqual({ field1: 'updated' })
      }, { timeout: 1000 })
    })
  })

  describe('restoring form data', () => {
    it('should restore saved form data', async () => {
      // Pre-populate the database
      const savedData: TestFormData = { field1: 'saved', field2: 100 }
      const savedHistory: TestFormData[] = [{ field1: 'old' }]

      await db.formDrafts.put({
        id: 'fracture',
        formType: 'fracture',
        data: savedData,
        history: savedHistory,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      })

      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      let restored: Awaited<ReturnType<typeof result.current.restore>> = null
      await act(async () => {
        restored = await result.current.restore()
      })

      expect(restored).not.toBeNull()
      expect(restored?.data).toEqual(savedData)
      expect(restored?.history).toEqual(savedHistory)
    })

    it('should return null if no draft exists', async () => {
      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      let restored: Awaited<ReturnType<typeof result.current.restore>> = null
      await act(async () => {
        restored = await result.current.restore()
      })

      expect(restored).toBeNull()
    })

    it('should not restore expired drafts', async () => {
      // Create an expired draft
      await db.formDrafts.put({
        id: 'fracture',
        formType: 'fracture',
        data: { field1: 'expired' },
        history: [],
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        expiresAt: Date.now() - 1 * 60 * 60 * 1000, // Expired 1 hour ago
      })

      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      let restored: Awaited<ReturnType<typeof result.current.restore>> = null
      await act(async () => {
        restored = await result.current.restore()
      })

      expect(restored).toBeNull()

      // Verify the expired draft was deleted
      const draft = await db.formDrafts.get('fracture')
      expect(draft).toBeUndefined()
    })

    it('should not restore empty form data', async () => {
      // Create a draft with empty data
      await db.formDrafts.put({
        id: 'fracture',
        formType: 'fracture',
        data: {},
        history: [],
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      })

      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      let restored: Awaited<ReturnType<typeof result.current.restore>> = null
      await act(async () => {
        restored = await result.current.restore()
      })

      expect(restored).toBeNull()
    })
  })

  describe('clearing form data', () => {
    it('should clear saved draft', async () => {
      // Pre-populate the database
      await db.formDrafts.put({
        id: 'fracture',
        formType: 'fracture',
        data: { field1: 'test' },
        history: [],
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      })

      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      await act(async () => {
        await result.current.clear()
      })

      const draft = await db.formDrafts.get('fracture')
      expect(draft).toBeUndefined()
    })

    it('should not throw when clearing non-existent draft', async () => {
      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      await expect(
        act(async () => {
          await result.current.clear()
        })
      ).resolves.not.toThrow()
    })
  })

  describe('form type isolation', () => {
    it('should store and restore different form types separately', async () => {
      // Save fracture form
      await db.formDrafts.put({
        id: 'fracture',
        formType: 'fracture',
        data: { field1: 'fracture data' },
        history: [],
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      })

      // Save case form
      await db.formDrafts.put({
        id: 'case',
        formType: 'case',
        data: { field1: 'case data' },
        history: [],
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      })

      // Restore fracture form
      const { result: fractureResult } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      let fractureRestored: Awaited<ReturnType<typeof fractureResult.current.restore>> = null
      await act(async () => {
        fractureRestored = await fractureResult.current.restore()
      })

      expect(fractureRestored?.data).toEqual({ field1: 'fracture data' })

      // Restore case form
      const { result: caseResult } = renderHook(() =>
        useFormPersistence<TestFormData>('case', {}, [])
      )

      let caseRestored: Awaited<ReturnType<typeof caseResult.current.restore>> = null
      await act(async () => {
        caseRestored = await caseResult.current.restore()
      })

      expect(caseRestored?.data).toEqual({ field1: 'case data' })
    })
  })

  describe('cleanup of expired drafts', () => {
    it('should clean up expired drafts on mount', async () => {
      // Create some expired drafts
      await db.formDrafts.bulkPut([
        {
          id: 'expired1',
          formType: 'fracture',
          data: { field1: 'expired1' },
          history: [],
          timestamp: Date.now() - 48 * 60 * 60 * 1000,
          expiresAt: Date.now() - 24 * 60 * 60 * 1000,
        },
        {
          id: 'expired2',
          formType: 'case',
          data: { field1: 'expired2' },
          history: [],
          timestamp: Date.now() - 48 * 60 * 60 * 1000,
          expiresAt: Date.now() - 24 * 60 * 60 * 1000,
        },
        {
          id: 'valid',
          formType: 'study',
          data: { field1: 'valid' },
          history: [],
          timestamp: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        },
      ])

      // Render the hook (triggers cleanup on mount)
      renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      // Wait for cleanup to complete
      await waitFor(async () => {
        const allDrafts = await db.formDrafts.toArray()
        expect(allDrafts.length).toBe(1)
        expect(allDrafts[0].id).toBe('valid')
      }, { timeout: 1000 })
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully on save', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock db.formDrafts.put to throw an error
      vi.spyOn(db.formDrafts, 'put').mockRejectedValueOnce(new Error('DB Error'))

      renderHook(() =>
        useFormPersistence<TestFormData>('fracture', { field1: 'test' }, [])
      )

      // Wait for the debounced save attempt
      await new Promise(resolve => setTimeout(resolve, 500))

      // Should not throw, just warn
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save form draft:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should handle database errors gracefully on restore', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      vi.spyOn(db.formDrafts, 'get').mockRejectedValueOnce(new Error('DB Error'))

      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      let restored: Awaited<ReturnType<typeof result.current.restore>> = null
      await act(async () => {
        restored = await result.current.restore()
      })

      expect(restored).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to restore form draft:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should handle database errors gracefully on clear', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      vi.spyOn(db.formDrafts, 'delete').mockRejectedValueOnce(new Error('DB Error'))

      const { result } = renderHook(() =>
        useFormPersistence<TestFormData>('fracture', {}, [])
      )

      await act(async () => {
        await result.current.clear()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear form draft:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })
})
