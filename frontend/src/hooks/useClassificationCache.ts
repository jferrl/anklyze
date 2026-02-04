import { useCallback } from 'react';
import { db, type ClassificationCache } from '@/lib/db';
import type { FractureInput, ClassificationResult } from '@/types';

/**
 * Cache expiration time (7 days in milliseconds)
 */
const CACHE_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a cache key from fracture input
 * Creates a stable, sorted JSON string to ensure consistent keys
 */
function generateCacheKey(input: FractureInput): string {
  // Sort the keys to ensure consistent ordering
  const sortedInput = Object.keys(input)
    .sort()
    .reduce((acc, key) => {
      acc[key] = input[key as keyof FractureInput];
      return acc;
    }, {} as Record<string, FractureInput[keyof FractureInput]>);

  return JSON.stringify(sortedInput);
}

/**
 * Custom hook for caching classification results in IndexedDB
 *
 * Provides methods to get, set, and clear classification cache.
 * Cached results expire after 7 days.
 *
 * @returns Object with cache management functions
 *
 * @example
 * ```tsx
 * const { getCache, setCache, clearCache } = useClassificationCache();
 *
 * // Check cache before making API call
 * const cached = await getCache(input);
 * if (cached) {
 *   return cached;
 * }
 *
 * // After API call, cache the result
 * await setCache(input, result);
 *
 * // Clear all cached results
 * await clearCache();
 * ```
 */
export function useClassificationCache() {
  /**
   * Get cached classification result for given input
   *
   * @param input - Fracture input to check cache for
   * @returns Cached classification result or null if not found or expired
   */
  const getCache = useCallback(
    async (input: FractureInput): Promise<ClassificationResult | null> => {
      try {
        const inputKey = generateCacheKey(input);
        const cached = await db.classificationCache
          .where('input')
          .equals(inputKey)
          .first();

        if (!cached) {
          return null;
        }

        const now = Date.now();

        // Check if cache entry has expired
        if (now >= cached.expiresAt) {
          // Cache expired, delete it
          await db.classificationCache.delete(cached.id);
          return null;
        }

        return cached.result as ClassificationResult;
      } catch (error) {
        console.warn('Failed to get cached classification:', error);
        return null;
      }
    },
    []
  );

  /**
   * Cache a classification result
   *
   * @param input - Fracture input that was classified
   * @param result - Classification result to cache
   */
  const setCache = useCallback(
    async (input: FractureInput, result: ClassificationResult): Promise<void> => {
      try {
        const inputKey = generateCacheKey(input);
        const now = Date.now();

        const cacheEntry: ClassificationCache = {
          id: inputKey, // Use the input key as ID for uniqueness
          input: inputKey,
          result,
          timestamp: now,
          expiresAt: now + CACHE_EXPIRATION,
        };

        await db.classificationCache.put(cacheEntry);
      } catch (error) {
        console.warn('Failed to cache classification result:', error);
      }
    },
    []
  );

  /**
   * Clear all cached classification results
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await db.classificationCache.clear();
      console.info('Classification cache cleared');
    } catch (error) {
      console.warn('Failed to clear classification cache:', error);
    }
  }, []);

  return {
    getCache,
    setCache,
    clearCache,
  };
}
