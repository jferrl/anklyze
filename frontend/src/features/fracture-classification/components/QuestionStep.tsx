import {
  QuestionCard,
  QuestionCardHeader,
  QuestionCardTitle,
  QuestionCardContent,
  SelectionCard,
} from '@/components/ui';
import type { FormOption } from '@/types';

/**
 * Question data structure
 */
interface Question {
  /** Unique identifier for the question */
  id: string;

  /** Question title/text */
  title: string;

  /** Optional description or help text */
  description?: string;
}

/**
 * Props for the QuestionStep component
 */
interface QuestionStepProps {
  /** Question data */
  question: Question;

  /** Current selected value */
  value?: string | boolean;

  /** Available options for this question */
  options: FormOption[];

  /** Callback when an option is selected */
  onChange: (value: string) => void;

  /** Optional CSS class name */
  className?: string;

  /** Whether the question is disabled */
  disabled?: boolean;

  /** Whether to show keyboard hints on options */
  showKeyboardHints?: boolean;
}

/**
 * QuestionStep component
 *
 * Renders a single form question with selectable options.
 * Uses QuestionCard for the container and SelectionCard for each option.
 *
 * @example
 * ```tsx
 * const question = {
 *   id: 'involved_malleoli',
 *   title: 'Which malleoli are fractured?',
 *   description: 'Select the affected malleoli',
 * };
 *
 * const options = [
 *   { value: 'lateral', label: 'Lateral malleolus' },
 *   { value: 'medial', label: 'Medial malleolus' },
 *   { value: 'posterior', label: 'Posterior malleolus' },
 * ];
 *
 * <QuestionStep
 *   question={question}
 *   value={formData.involved_malleoli}
 *   options={options}
 *   onChange={(value) => updateFormData({ involved_malleoli: value })}
 * />
 * ```
 */
export function QuestionStep({
  question,
  value,
  options,
  onChange,
  className = '',
  disabled = false,
  showKeyboardHints = true,
}: QuestionStepProps) {
  /**
   * Handle option selection
   */
  const handleSelect = (optionValue: string) => {
    if (!disabled) {
      onChange(optionValue);
    }
  };

  /**
   * Check if an option is selected
   */
  const isSelected = (optionValue: string): boolean => {
    // Handle both string and boolean values
    if (typeof value === 'boolean') {
      return String(value) === optionValue;
    }
    return value === optionValue;
  };

  return (
    <QuestionCard questionKey={question.id} className={className}>
      {/* Question Header */}
      <QuestionCardHeader>
        <QuestionCardTitle>{question.title}</QuestionCardTitle>
        {question.description && (
          <p className="text-sm text-muted-foreground">
            {question.description}
          </p>
        )}
      </QuestionCardHeader>

      {/* Options */}
      <QuestionCardContent>
        <div className="grid gap-3">
          {options.map((option, index) => (
            <SelectionCard
              key={option.value}
              value={option.value}
              label={option.label}
              selected={isSelected(option.value)}
              onSelect={() => handleSelect(option.value)}
              keyboardHint={showKeyboardHints ? `${index + 1}` : undefined}
              disabled={disabled || option.disabled}
              id={`${question.id}-${option.value}`}
            />
          ))}
        </div>
      </QuestionCardContent>
    </QuestionCard>
  );
}

