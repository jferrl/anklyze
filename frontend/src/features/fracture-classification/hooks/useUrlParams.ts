import { useState, useEffect, useRef } from 'react';
import { decodeParamsToInput } from '@/utils/shareUrl';
import type { FractureInput } from '@/types';

/**
 * Custom hook for handling URL parameter loading
 *
 * Checks for URL parameters on mount, decodes them into form input,
 * and calls the provided callback with the decoded data.
 * After loading, it cleans the URL to remove the parameters.
 *
 * This is useful for loading shared classifications from URLs.
 *
 * @param onLoad - Callback function called with decoded input when URL params are found.
 *                 Can be async if classification needs to be performed.
 * @returns Object containing loading state
 *
 * @example
 * ```tsx
 * const { isLoading } = useUrlParams(async (input) => {
 *   // Store the input
 *   lastInputRef.current = input as FractureInput;
 *   // Auto-classify
 *   await classify(input as FractureInput);
 * });
 *
 * if (isLoading) {
 *   return <LoadingSpinner />;
 * }
 * ```
 */
export function useUrlParams(
  onLoad: (input: Partial<FractureInput>) => void | Promise<void>
) {
  // Track if we're currently loading from URL
  const [isLoading, setIsLoading] = useState(() => {
    // Check if URL has params on initial render to avoid flash
    const params = new URLSearchParams(window.location.search);
    const inputFromUrl = decodeParamsToInput(params);
    return !!(inputFromUrl && inputFromUrl.involved_malleoli);
  });

  // Prevent double loading
  const hasLoadedRef = useRef(false);

  /**
   * Load from URL params on mount
   */
  useEffect(() => {
    // Skip if already loaded or not loading from URL
    if (hasLoadedRef.current || !isLoading) {
      return;
    }

    const loadFromUrl = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const inputFromUrl = decodeParamsToInput(params);

        // Only proceed if we have valid input with required field
        if (inputFromUrl && inputFromUrl.involved_malleoli) {
          hasLoadedRef.current = true;

          // Call the provided callback (may be async)
          await onLoad(inputFromUrl);

          // Clean URL without reload
          window.history.replaceState({}, '', window.location.pathname);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFromUrl();
  }, [isLoading, onLoad]);

  return {
    isLoading,
  };
}
