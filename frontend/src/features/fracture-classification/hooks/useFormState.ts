import { useState, useCallback } from 'react';
import type { FractureInput } from '@/types';

/**
 * Return type for the useFormState hook
 */
interface FormStateResult {
  /** Current form data */
  formData: Partial<FractureInput>;

  /** History of form states for undo functionality */
  formHistory: Partial<FractureInput>[];

  /** Update form data and push current state to history */
  updateFormData: (newData: Partial<FractureInput>) => void;

  /** Clear form data and history */
  clearFormData: () => void;

  /** Go back to previous state (undo) */
  goBack: () => void;

  /** Whether user can go back (history is not empty) */
  canGoBack: boolean;
}

/**
 * Custom hook for managing form state with history
 *
 * Provides form data state management with undo/redo capability through
 * history tracking. Each update to form data pushes the current state
 * to history before applying the new data.
 *
 * @returns Object containing form state and management functions
 *
 * @example
 * ```tsx
 * const { formData, updateFormData, goBack, canGoBack, clearFormData } = useFormState();
 *
 * // Update form data (automatically saves current state to history)
 * const handleFieldChange = (value: string) => {
 *   updateFormData({
 *     ...formData,
 *     involved_malleoli: value,
 *   });
 * };
 *
 * // Undo last change
 * const handleUndo = () => {
 *   if (canGoBack) {
 *     goBack();
 *   }
 * };
 *
 * // Reset form
 * const handleReset = () => {
 *   clearFormData();
 * };
 * ```
 */
export function useFormState(): FormStateResult {
  // Form data state
  const [formData, setFormData] = useState<Partial<FractureInput>>({});

  // Form history for undo functionality
  const [formHistory, setFormHistory] = useState<Partial<FractureInput>[]>([]);

  /**
   * Push current form state to history
   * Used internally before updating form data
   */
  const pushToHistory = useCallback(() => {
    setFormHistory(prev => [...prev, { ...formData }]);
  }, [formData]);

  /**
   * Update form data with new values
   * Automatically saves current state to history before updating
   */
  const updateFormData = useCallback((newData: Partial<FractureInput>) => {
    pushToHistory();
    setFormData(newData);
  }, [pushToHistory]);

  /**
   * Go back to previous form state (undo)
   * Restores the last state from history and removes it from the stack
   */
  const goBack = useCallback(() => {
    if (formHistory.length === 0) return;

    const previousState = formHistory[formHistory.length - 1];
    setFormHistory(prev => prev.slice(0, -1));
    setFormData(previousState);
  }, [formHistory]);

  /**
   * Clear form data and history
   * Resets the form to initial empty state
   */
  const clearFormData = useCallback(() => {
    setFormData({});
    setFormHistory([]);
  }, []);

  /**
   * Check if user can go back
   */
  const canGoBack = formHistory.length > 0;

  return {
    formData,
    formHistory,
    updateFormData,
    clearFormData,
    goBack,
    canGoBack,
  };
}
