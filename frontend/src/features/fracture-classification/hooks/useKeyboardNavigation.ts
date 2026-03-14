import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  /** Called when Backspace is pressed and goBack is possible */
  onGoBack: () => void;
  /** Called when Enter is pressed and form is ready to submit */
  onSubmit: () => void;
  /** Whether the form can be submitted */
  canSubmit: boolean;
  /** Whether the user can go back */
  canGoBack: boolean;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
}

/**
 * Hook that adds keyboard shortcuts to the classification form:
 * - 1-9: select the nth option in the current (last unanswered) question
 * - Enter: submit the form
 * - Backspace: go back to the previous question
 *
 * Uses DOM queries on data attributes rendered by QuestionCard and SelectionCard.
 */
export function useKeyboardNavigation({
  onGoBack,
  onSubmit,
  canSubmit,
  canGoBack,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't interfere with inputs, textareas, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Enter → submit the form
      if (e.key === 'Enter') {
        if (canSubmit) {
          e.preventDefault();
          onSubmit();
        }
        return;
      }

      // Backspace → go back
      if (e.key === 'Backspace') {
        if (canGoBack) {
          e.preventDefault();
          onGoBack();
        }
        return;
      }

      // Number keys 1-9 → select option in current question
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        e.preventDefault();

        // Find all visible question cards
        const cards = document.querySelectorAll('[data-slot="question-card"]');
        if (cards.length === 0) return;

        // Find the last card where no option is selected (the current question)
        let targetCard: Element | null = null;
        for (let i = cards.length - 1; i >= 0; i--) {
          const selected = cards[i].querySelector('[data-selected="true"]');
          if (!selected) {
            targetCard = cards[i];
            break;
          }
        }

        // If all questions are answered, target the very last card (allow re-selection)
        if (!targetCard) {
          targetCard = cards[cards.length - 1];
        }

        // Find the nth option button within this card
        const options = targetCard.querySelectorAll<HTMLButtonElement>(
          'button[role="radio"]'
        );
        const index = num - 1;
        if (index < options.length && !options[index].disabled) {
          options[index].click();
        }
      }
    },
    [canGoBack, onGoBack, canSubmit, onSubmit]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
