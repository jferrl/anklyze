import { useEffect, useRef } from 'react';

/**
 * Scroll delay in milliseconds to allow animations to start
 */
const SCROLL_DELAY_MS = 100;

/**
 * Custom hook for automatic smooth scrolling when form data changes
 *
 * Creates a ref that can be attached to a target element. When the form data
 * changes (and is non-empty), it automatically scrolls to the target element
 * after a small delay to allow animations to complete.
 *
 * This is useful for multi-step forms where new questions appear as the user
 * answers, keeping the active question visible in the viewport.
 *
 * @param formData - Form data object to watch for changes
 * @returns Ref to attach to the scroll target element
 *
 * @example
 * const formEndRef = useAutoScroll(formData);
 * // Attach the ref to a div at the end of your form
 * // <div ref={formEndRef} />
 */
export function useAutoScroll<T extends Record<string, unknown>>(
  formData: Partial<T>
) {
  // Create ref for the scroll target element
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to target when form data changes
   */
  useEffect(() => {
    // Only scroll if there's at least one answer (not on initial render)
    // This prevents scrolling on mount when the form is empty
    if (Object.keys(formData).length > 0 && scrollTargetRef.current) {
      // Small delay to allow any animations to start
      const timer = setTimeout(() => {
        scrollTargetRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, SCROLL_DELAY_MS);

      // Cleanup: cancel scroll if component unmounts or formData changes again
      return () => clearTimeout(timer);
    }
  }, [formData]);

  return scrollTargetRef;
}
