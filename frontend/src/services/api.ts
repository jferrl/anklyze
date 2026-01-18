import type { FractureInput, ClassificationResult, FormOptions } from '../types/fracture';
import { getCurrentLanguage } from '../i18n/config';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function classifyFracture(input: FractureInput): Promise<ClassificationResult> {
  const lang = getCurrentLanguage();
  const response = await fetch(`${API_BASE_URL}/api/classify?lang=${lang}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': lang,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Classification error');
  }

  return response.json();
}

export async function getFormOptions(): Promise<FormOptions> {
  const lang = getCurrentLanguage();
  const response = await fetch(`${API_BASE_URL}/api/options?lang=${lang}`, {
    headers: {
      'Accept-Language': lang,
    },
  });

  if (!response.ok) {
    throw new Error('Error loading form options');
  }

  return response.json();
}
