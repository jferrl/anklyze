import type { FractureInput, ClassificationResult, FormOptions } from '../types/fracture';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function classifyFracture(input: FractureInput): Promise<ClassificationResult> {
  const response = await fetch(`${API_BASE_URL}/api/classify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la clasificación');
  }

  return response.json();
}

export async function getFormOptions(): Promise<FormOptions> {
  const response = await fetch(`${API_BASE_URL}/api/options`);

  if (!response.ok) {
    throw new Error('Error al cargar las opciones del formulario');
  }

  return response.json();
}
