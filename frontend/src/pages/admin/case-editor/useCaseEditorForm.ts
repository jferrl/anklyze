import { useState, useCallback } from 'react';
import type { CaseWithImages } from '@/types';

export interface CaseFormState {
  title: string;
  description: string;
  deadline: string;
}

export function useCaseEditorForm(existingCase?: CaseWithImages) {
  const [form, setForm] = useState<CaseFormState>({
    title: '', description: '', deadline: '',
  });

  // Render-time sync with fetched case data — DO NOT convert to useEffect.
  // Conversion changes execution order and causes form values to reset on re-render.
  const [prevCaseId, setPrevCaseId] = useState<string | undefined>();
  if (existingCase && existingCase.id !== prevCaseId) {
    setPrevCaseId(existingCase.id);
    setForm({
      title: existingCase.title,
      description: existingCase.description || '',
      deadline: existingCase.deadline?.split('T')[0] || '',
    });
  }

  const updateForm = useCallback(<K extends keyof CaseFormState>(
    field: K, value: CaseFormState[K]
  ) => setForm(prev => ({ ...prev, [field]: value })), []);

  return { form, setForm, updateForm };
}
