import { useState, useCallback } from 'react';
import type { FractureInput, ClassificationResult, ComparisonScenario } from '@/types';
import { classifyFracture } from '@/services';
import { useClassificationCache } from './useClassificationCache';

export function useClassification() {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ComparisonScenario[]>([]);
  const { getCache, setCache } = useClassificationCache();

  const classify = useCallback(async (input: FractureInput) => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedResult = await getCache(input);
      if (cachedResult) {
        setResult(cachedResult);
        setLoading(false);
        return cachedResult;
      }

      // Cache miss, make API call
      const classification = await classifyFracture(input);
      setResult(classification);

      // Save to cache for future use
      await setCache(input, classification);

      return classification;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getCache, setCache]);

  const addScenario = useCallback((input: FractureInput, result: ClassificationResult) => {
    const scenario: ComparisonScenario = {
      id: crypto.randomUUID(),
      input,
      result,
    };
    setScenarios(prev => [...prev, scenario]);
  }, []);

  const clearScenarios = useCallback(() => {
    setScenarios([]);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const resetAll = useCallback(() => {
    setResult(null);
    setError(null);
    setScenarios([]);
  }, []);

  return {
    result,
    loading,
    error,
    scenarios,
    classify,
    addScenario,
    clearScenarios,
    reset,
    resetAll,
  };
}
