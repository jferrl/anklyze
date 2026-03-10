import { useState, useCallback } from 'react';
import type { FractureInput, ClassificationResult, ComparisonScenario } from '@/types';
import { classifyFracture } from '@/services';

export function useClassification() {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ComparisonScenario[]>([]);

  const classify = useCallback(async (input: FractureInput) => {
    setLoading(true);
    setError(null);

    try {
      const classification = await classifyFracture(input);
      setResult(classification);
      return classification;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

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
