import { useState, useCallback } from 'react';
import type { DetailsFormData } from '../components/steps/DetailsStep';
import type { SettingsFormData } from '../components/steps/SettingsStep';
import type { ImagesFormData } from '../components/steps/ImagesStep';

/**
 * Step type for the case editor wizard
 */
export type CaseEditorStep = 'details' | 'settings' | 'images' | 'users';

/**
 * Complete case editor form data
 */
export interface CaseEditorFormData {
  details: DetailsFormData;
  settings: SettingsFormData;
  images: ImagesFormData;
}

/**
 * Return type for useCaseEditor hook
 */
export interface UseCaseEditorResult {
  /** Current active step */
  currentStep: CaseEditorStep;

  /** Complete form data */
  formData: CaseEditorFormData;

  /** Navigate to a specific step */
  goToStep: (step: CaseEditorStep) => void;

  /** Navigate to next step */
  nextStep: () => void;

  /** Navigate to previous step */
  prevStep: () => void;

  /** Update form data for a specific step */
  updateFormData: <K extends keyof CaseEditorFormData>(
    step: K,
    data: Partial<CaseEditorFormData[K]>
  ) => void;

  /** Reset form to initial state */
  resetForm: () => void;

  /** Check if a step is valid */
  isStepValid: (step: CaseEditorStep) => boolean;
}

/**
 * Hook for managing case editor state
 *
 * Manages the multi-step wizard state, form data, and navigation
 * for the case editor.
 *
 * @example
 * ```tsx
 * const editor = useCaseEditor();
 *
 * // Update details
 * editor.updateFormData('details', { title: 'New Case' });
 *
 * // Navigate
 * editor.nextStep();
 * ```
 */
export function useCaseEditor(): UseCaseEditorResult {
  const STEPS: CaseEditorStep[] = ['details', 'settings', 'images', 'users'];

  // Current step state
  const [currentStep, setCurrentStep] = useState<CaseEditorStep>('details');

  // Form data state
  const [formData, setFormData] = useState<CaseEditorFormData>({
    details: {
      title: '',
      description: '',
      deadline: '',
    },
    settings: {
      allowMultipleResponses: false,
      showReferenceAfterSubmit: false,
    },
    images: {
      xrayImages: [],
      ctImages: [],
    },
  });

  /**
   * Navigate to a specific step
   */
  const goToStep = useCallback((step: CaseEditorStep) => {
    setCurrentStep(step);
  }, []);

  /**
   * Navigate to next step
   */
  const nextStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  }, [currentStep]);

  /**
   * Navigate to previous step
   */
  const prevStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  }, [currentStep]);

  /**
   * Update form data for a specific step
   */
  const updateFormData = useCallback(
    <K extends keyof CaseEditorFormData>(
      step: K,
      data: Partial<CaseEditorFormData[K]>
    ) => {
      setFormData((prev) => ({
        ...prev,
        [step]: {
          ...prev[step],
          ...data,
        },
      }));
    },
    []
  );

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData({
      details: {
        title: '',
        description: '',
        deadline: '',
      },
      settings: {
        allowMultipleResponses: false,
        showReferenceAfterSubmit: false,
      },
      images: {
        xrayImages: [],
        ctImages: [],
      },
    });
    setCurrentStep('details');
  }, []);

  /**
   * Check if a step is valid
   */
  const isStepValid = useCallback(
    (step: CaseEditorStep): boolean => {
      switch (step) {
        case 'details':
          // Title is required
          return formData.details.title.trim().length > 0;

        case 'settings':
          // Settings are always valid
          return true;

        case 'images':
          // At least one image required
          return (
            formData.images.xrayImages.length > 0 ||
            formData.images.ctImages.length > 0
          );

        case 'users':
          // Users step validation depends on whether case is being edited
          return true;

        default:
          return false;
      }
    },
    [formData]
  );

  return {
    currentStep,
    formData,
    goToStep,
    nextStep,
    prevStep,
    updateFormData,
    resetForm,
    isStepValid,
  };
}
