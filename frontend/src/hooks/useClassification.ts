import { useState, useCallback } from 'react';
import type { FractureInput, ClassificationResult } from '../types/fracture';
import { classifyFracture } from '../services/api';

export function useClassification() {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classify = useCallback(async (input: FractureInput) => {
    setLoading(true);
    setError(null);

    try {
      const classification = await classifyFracture(input);
      setResult(classification);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, classify, reset };
}
