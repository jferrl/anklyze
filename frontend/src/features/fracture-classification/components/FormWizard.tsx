import { useTranslation } from 'react-i18next';
import {
  Button,
  QuestionCard,
  QuestionCardHeader,
  QuestionCardTitle,
  QuestionCardContent,
  SelectionCard,
} from '@/components/ui';
import type { FractureInput, FormOptions, FormOption } from '@/types';

/**
 * Step configuration for a form question
 */
export interface FormStep {
  /** Unique identifier for the step */
  id: string;

  /** Field name in FractureInput */
  field: keyof FractureInput;

  /** Question title (can be translation key) */
  title: string;

  /** Optional description */
  description?: string;

  /** Options for this step */
  options: FormOption[];

  /** Whether this step should be shown based on form data */
  shouldShow?: (formData: Partial<FractureInput>) => boolean;
}

/**
 * Props for the FormWizard component
 */
export interface FormWizardProps {
  /** Current step number (1-indexed) */
  currentStep: number;

  /** Current form data */
  formData: Partial<FractureInput>;

  /** Form options containing translations and choices */
  options: FormOptions;

  /** Step configurations */
  steps: FormStep[];

  /** Callback when form data is updated */
  onUpdate: (newData: Partial<FractureInput>) => void;

  /** Callback when user clicks Next */
  onNext?: () => void;

  /** Callback when user clicks Back */
  onPrev?: () => void;

  /** Whether user can go back */
  canGoBack?: boolean;

  /** Whether user can go next */
  canGoNext?: boolean;

  /** Custom CSS class */
  className?: string;

  /** Show navigation buttons */
  showNavigation?: boolean;
}

/**
 * FormWizard component
 *
 * Orchestrates a multi-step form by rendering questions based on the current step,
 * handling user selections, and providing navigation controls.
 *
 * @example
 * ```tsx
 * const steps: FormStep[] = [
 *   {
 *     id: 'involved_malleoli',
 *     field: 'involved_malleoli',
 *     title: 'Which malleoli are fractured?',
 *     options: options.involved_malleoli,
 *   },
 *   {
 *     id: 'fibular_level',
 *     field: 'fibular_level',
 *     title: 'Fibular fracture level?',
 *     options: options.fibular_levels,
 *     shouldShow: (data) => data.involved_malleoli?.includes('lateral'),
 *   },
 * ];
 *
 * <FormWizard
 *   currentStep={1}
 *   formData={formData}
 *   options={options}
 *   steps={steps}
 *   onUpdate={updateFormData}
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 * />
 * ```
 */
export function FormWizard({
  currentStep,
  formData,
  options,
  steps,
  onUpdate,
  onNext,
  onPrev,
  canGoBack = true,
  canGoNext = true,
  className = '',
  showNavigation = true,
}: FormWizardProps) {
  const { t } = useTranslation();

  // Get the current step configuration
  const step = steps[currentStep - 1]; // Convert 1-indexed to 0-indexed

  // If no step or step should not be shown, return null
  if (!step || (step.shouldShow && !step.shouldShow(formData))) {
    return null;
  }

  // Get current value for this field
  const currentValue = formData[step.field];

  /**
   * Handle option selection
   */
  const handleSelect = (value: string) => {
    onUpdate({
      ...formData,
      [step.field]: value,
    });

    // Auto-advance if onNext is provided
    if (onNext) {
      // Small delay to show selection animation
      setTimeout(() => {
        onNext();
      }, 300);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Question Card */}
      <QuestionCard questionKey={step.id}>
        <QuestionCardHeader>
          <QuestionCardTitle>
            {/* Use translation if available, otherwise use title directly */}
            {options.questions[step.id]?.title || step.title}
          </QuestionCardTitle>
          {step.description && (
            <p className="text-sm text-muted-foreground">
              {step.description}
            </p>
          )}
        </QuestionCardHeader>

        <QuestionCardContent>
          {/* Selection Options */}
          <div className="grid gap-3">
            {step.options.map((option, index) => (
              <SelectionCard
                key={option.value}
                value={option.value}
                label={option.label}
                selected={currentValue === option.value}
                onSelect={() => handleSelect(option.value)}
                keyboardHint={`${index + 1}`}
                disabled={option.disabled}
              />
            ))}
          </div>
        </QuestionCardContent>
      </QuestionCard>

      {/* Navigation Buttons */}
      {showNavigation && (
        <div className="flex items-center justify-between gap-4">
          {/* Back Button */}
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={!canGoBack}
            className="min-w-24"
          >
            {t('form.back')}
          </Button>

          {/* Next Button */}
          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className="min-w-24"
          >
            {t('form.next')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to create form steps from field configurations
 *
 * @param fields - Array of field configurations
 * @param options - Form options for translations and choices
 * @returns Array of FormStep configurations
 */
// eslint-disable-next-line react-refresh/only-export-components
export function createStepsFromFields(
  fields: Array<{
    field: keyof FractureInput;
    optionsKey: keyof FormOptions;
    shouldShow?: (formData: Partial<FractureInput>) => boolean;
  }>,
  options: FormOptions
): FormStep[] {
  return fields.map((field) => ({
    id: field.field as string,
    field: field.field,
    title: options.questions[field.field as string]?.title || field.field,
    options: options[field.optionsKey] as FormOption[],
    shouldShow: field.shouldShow,
  }));
}
