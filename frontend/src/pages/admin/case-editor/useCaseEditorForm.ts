import { useState, useCallback } from 'react';
import type { ClassificationResult, FractureInput, CaseWithImages } from '@/types';

export interface CaseFormState {
  title: string;
  description: string;
  deadline: string;
  referenceClassification: ClassificationResult | undefined;
  referenceInput: FractureInput | undefined;
  showReferenceAfterSubmit: boolean;
  allowMultipleResponses: boolean;
}

export function useCaseEditorForm(existingCase?: CaseWithImages) {
  const [form, setForm] = useState<CaseFormState>({
    title: '', description: '', deadline: '',
    referenceClassification: undefined, referenceInput: undefined,
    showReferenceAfterSubmit: false, allowMultipleResponses: true,
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
      referenceClassification: existingCase.reference_classification,
      referenceInput: existingCase.reference_input,
      showReferenceAfterSubmit: existingCase.show_reference_after_submit || false,
      allowMultipleResponses: existingCase.allow_multiple_responses !== false,
    });
  }

  const updateForm = useCallback(<K extends keyof CaseFormState>(
    field: K, value: CaseFormState[K]
  ) => setForm(prev => ({ ...prev, [field]: value })), []);

  return { form, setForm, updateForm };
}
