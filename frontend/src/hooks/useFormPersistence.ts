import { useEffect, useCallback } from 'react';
import { db, type FormDraft } from '@/lib/db';

/**
 * Maximum age for saved drafts (24 hours in milliseconds)
 */
const MAX_DRAFT_AGE = 24 * 60 * 60 * 1000;

/**
 * Restored draft data
 */
export interface RestoredDraft<T> {
  data: T;
  history: T[];
}

/**
 * Custom hook for form persistence using IndexedDB
 *
 * Automatically saves form data and history to IndexedDB when they change,
 * and provides functions to restore or clear the saved draft.
 *
 * Drafts expire after 24 hours and are automatically cleaned up.
 *
 * @param formType - Type of form being persisted ('fracture', 'case', or 'study')
 * @param formData - Current form data to persist
 * @param history - Form history to persist
 * @returns Object with restore and clear functions
 *
 * @example
 * ```tsx
 * const { restore, clear } = useFormPersistence('fracture', formData, formHistory);
 *
 * // On mount, restore saved draft
 * useEffect(() => {
 *   const restored = await restore();
 *   if (restored) {
 *     setFormData(restored.data);
 *     setFormHistory(restored.history);
 *   }
 * }, []);
 *
 * // When form is submitted, clear the draft
 * const handleSubmit = async () => {
 *   // ... submit logic
 *   await clear();
 * };
 * ```
 */
export function useFormPersistence<T extends Record<string, unknown>>(
  formType: 'fracture' | 'case' | 'study',
  formData: T,
  history: T[]
) {
  /**
   * Clean up expired drafts on mount
   */
  useEffect(() => {
    const cleanupExpiredDrafts = async () => {
      try {
        const now = Date.now();
        const expiredDrafts = await db.formDrafts
          .where('expiresAt')
          .below(now)
          .toArray();

        if (expiredDrafts.length > 0) {
          await db.formDrafts.bulkDelete(expiredDrafts.map((d: FormDraft) => d.id));
          console.info(`Cleaned up ${expiredDrafts.length} expired form drafts`);
        }
      } catch (error) {
        console.warn('Failed to cleanup expired drafts:', error);
      }
    };

    cleanupExpiredDrafts();
  }, []);

  /**
   * Save form state to IndexedDB when it changes
   */
  useEffect(() => {
    // Only save if there's actual data
    if (Object.keys(formData).length > 0) {
      const saveDraft = async () => {
        try {
          const now = Date.now();
          const draft: FormDraft = {
            id: formType, // Use formType as ID to have one draft per form type
            formType,
            data: formData,
            history,
            timestamp: now,
            expiresAt: now + MAX_DRAFT_AGE,
          };

          await db.formDrafts.put(draft);
        } catch (error) {
          // Ignore storage errors (quota exceeded, etc.)
          console.warn('Failed to save form draft:', error);
        }
      };

      // Use a small delay to debounce rapid changes
      const timeoutId = setTimeout(saveDraft, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [formType, formData, history]);

  /**
   * Restore form state from IndexedDB
   *
   * @returns Restored draft data or null if no valid draft exists
   */
  const restore = useCallback(async (): Promise<RestoredDraft<T> | null> => {
    try {
      const draft = await db.formDrafts.get(formType);

      if (!draft) {
        return null;
      }

      const now = Date.now();

      // Check if draft is still valid (not expired)
      if (now >= draft.expiresAt) {
        // Draft expired, remove it
        await db.formDrafts.delete(formType);
        return null;
      }

      // Return restored data only if there's actual content
      if (draft.data && Object.keys(draft.data).length > 0) {
        return {
          data: draft.data as T,
          history: (draft.history || []) as T[],
        };
      }

      return null;
    } catch (error) {
      // Ignore parse errors or invalid data
      console.warn('Failed to restore form draft:', error);
      return null;
    }
  }, [formType]);

  /**
   * Clear saved draft from IndexedDB
   */
  const clear = useCallback(async () => {
    try {
      await db.formDrafts.delete(formType);
    } catch (error) {
      console.warn('Failed to clear form draft:', error);
    }
  }, [formType]);

  return {
    restore,
    clear,
  };
}
