import { useEffect, useCallback } from 'react';

/**
 * Storage key for form draft persistence
 */
export const FORM_STORAGE_KEY = 'anklyze-form-draft';

/**
 * Maximum age for saved drafts (24 hours in milliseconds)
 */
const MAX_DRAFT_AGE = 24 * 60 * 60 * 1000;

/**
 * Stored draft data structure
 */
interface StoredDraft<T> {
  data: T;
  history: T[];
  timestamp: number;
}

/**
 * Restored draft data
 */
export interface RestoredDraft<T> {
  data: T;
  history: T[];
}

/**
 * Custom hook for form persistence using localStorage
 *
 * Automatically saves form data and history to localStorage when they change,
 * and provides functions to restore or clear the saved draft.
 *
 * Drafts expire after 24 hours and are automatically cleaned up.
 *
 * @param formData - Current form data to persist
 * @param history - Form history to persist
 * @returns Object with restore and clear functions
 *
 * @example
 * ```tsx
 * const { restore, clear } = useFormPersistence(formData, formHistory);
 *
 * // On mount, restore saved draft
 * useEffect(() => {
 *   const restored = restore();
 *   if (restored) {
 *     setFormData(restored.data);
 *     setFormHistory(restored.history);
 *   }
 * }, []);
 *
 * // When form is submitted, clear the draft
 * const handleSubmit = () => {
 *   // ... submit logic
 *   clear();
 * };
 * ```
 */
export function useFormPersistence<T extends Record<string, unknown>>(
  formData: T,
  history: T[]
) {
  /**
   * Save form state to localStorage when it changes
   */
  useEffect(() => {
    // Only save if there's actual data
    if (Object.keys(formData).length > 0) {
      try {
        const draft: StoredDraft<T> = {
          data: formData,
          history,
          timestamp: Date.now(),
        };
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Ignore storage errors (quota exceeded, private browsing, etc.)
      }
    }
  }, [formData, history]);

  /**
   * Restore form state from localStorage
   *
   * @returns Restored draft data or null if no valid draft exists
   */
  const restore = useCallback((): RestoredDraft<T> | null => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (!saved) {
        return null;
      }

      const draft: StoredDraft<T> = JSON.parse(saved);

      // Check if draft is still valid (within 24 hours)
      if (Date.now() - draft.timestamp >= MAX_DRAFT_AGE) {
        // Draft expired, remove it
        localStorage.removeItem(FORM_STORAGE_KEY);
        return null;
      }

      // Return restored data only if there's actual content
      if (draft.data && Object.keys(draft.data).length > 0) {
        return {
          data: draft.data,
          history: draft.history || [],
        };
      }

      return null;
    } catch {
      // Ignore parse errors or invalid data
      return null;
    }
  }, []);

  /**
   * Clear saved draft from localStorage
   */
  const clear = useCallback(() => {
    localStorage.removeItem(FORM_STORAGE_KEY);
  }, []);

  return {
    restore,
    clear,
  };
}
