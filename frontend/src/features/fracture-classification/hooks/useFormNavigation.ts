import { useState, useCallback, useMemo } from 'react';
import type { FractureInput } from '@/types';

/**
 * Validation function type for step validation
 */
export type StepValidator = (formData: Partial<FractureInput>) => boolean;

/**
 * Configuration for form navigation
 */
export interface FormNavigationConfig {
  /** Total number of steps in the form */
  totalSteps: number;

  /** Optional validator for each step (indexed by step number) */
  validators?: Record<number, StepValidator>;

  /** Initial step (defaults to 1) */
  initialStep?: number;
}

/**
 * Return type for the useFormNavigation hook
 */
export interface FormNavigationResult {
  /** Current step number (1-indexed) */
  currentStep: number;

  /** Total number of steps */
  totalSteps: number;

  /** Whether user can navigate to next step */
  canGoNext: boolean;

  /** Whether user can navigate to previous step */
  canGoBack: boolean;

  /** Navigate to next step */
  nextStep: () => void;

  /** Navigate to previous step */
  prevStep: () => void;

  /** Navigate to specific step */
  goToStep: (step: number) => void;

  /** Check if current step is valid */
  isCurrentStepValid: boolean;

  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Custom hook for managing multi-step form navigation
 *
 * Provides step tracking, navigation functions, and validation support
 * for multi-step forms. Can be used with both linear and dynamic forms.
 *
 * @param formData - Current form data to check for validation
 * @param config - Navigation configuration
 * @returns Object containing navigation state and functions
 *
 * @example
 * ```tsx
 * // Simple usage with auto-calculated steps
 * const navigation = useFormNavigation(formData, {
 *   totalSteps: 5,
 *   validators: {
 *     1: (data) => !!data.involved_malleoli,
 *     2: (data) => !!data.fibular_level,
 *   },
 * });
 *
 * return (
 *   <div>
 *     <div>Step {navigation.currentStep} of {navigation.totalSteps}</div>
 *     <button onClick={navigation.prevStep} disabled={!navigation.canGoBack}>
 *       Back
 *     </button>
 *     <button onClick={navigation.nextStep} disabled={!navigation.canGoNext}>
 *       Next
 *     </button>
 *   </div>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Dynamic steps based on form data
 * const totalSteps = useMemo(() => {
 *   let steps = 1; // Always start with involved_malleoli
 *   if (formData.involved_malleoli?.includes('lateral')) steps++;
 *   if (formData.involved_malleoli?.includes('medial')) steps++;
 *   if (formData.involved_malleoli?.includes('posterior')) steps++;
 *   return steps;
 * }, [formData]);
 *
 * const navigation = useFormNavigation(formData, { totalSteps });
 * ```
 */
export function useFormNavigation(
  formData: Partial<FractureInput>,
  config: FormNavigationConfig
): FormNavigationResult {
  const { totalSteps, validators = {}, initialStep = 1 } = config;

  // Current step state (1-indexed)
  const [currentStep, setCurrentStep] = useState(initialStep);

  /**
   * Check if current step is valid according to validators
   */
  const isCurrentStepValid = useMemo(() => {
    const validator = validators[currentStep];
    if (!validator) return true; // No validator means step is always valid
    return validator(formData);
  }, [currentStep, formData, validators]);

  /**
   * Can navigate to next step if:
   * - Not on last step
   * - Current step is valid
   */
  const canGoNext = useMemo(() => {
    return currentStep < totalSteps && isCurrentStepValid;
  }, [currentStep, totalSteps, isCurrentStepValid]);

  /**
   * Can navigate to previous step if not on first step
   */
  const canGoBack = currentStep > 1;

  /**
   * Navigate to next step
   */
  const nextStep = useCallback(() => {
    if (canGoNext) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  }, [canGoNext, totalSteps]);

  /**
   * Navigate to previous step
   */
  const prevStep = useCallback(() => {
    if (canGoBack) {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  }, [canGoBack]);

  /**
   * Navigate to specific step
   * Validates that target step is within bounds
   */
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  /**
   * Calculate progress percentage
   */
  const progress = useMemo(() => {
    return Math.round((currentStep / totalSteps) * 100);
  }, [currentStep, totalSteps]);

  return {
    currentStep,
    totalSteps,
    canGoNext,
    canGoBack,
    nextStep,
    prevStep,
    goToStep,
    isCurrentStepValid,
    progress,
  };
}

/**
 * Helper function to calculate step based on filled form fields
 *
 * This can be used to determine the current step dynamically based on
 * which fields have been answered in the form.
 *
 * @param formData - Current form data
 * @returns Step number based on filled fields
 *
 * @example
 * ```tsx
 * const currentStep = calculateStepFromFormData(formData);
 * ```
 */
export function calculateStepFromFormData(
  formData: Partial<FractureInput>
): number {
  const filledFields = Object.keys(formData).filter(
    key => formData[key as keyof FractureInput] !== undefined
  );

  // Step 1: Involved malleoli (required)
  if (!formData.involved_malleoli) return 1;

  // Step 2+: Additional fields based on selection
  return Math.min(filledFields.length, 10); // Cap at reasonable max
}
