import { Progress } from '@/components/ui';

/**
 * Props for the FormProgress component
 */
export interface FormProgressProps {
  /** Current step number (1-indexed) */
  currentStep: number;

  /** Total number of steps */
  totalSteps: number;

  /** Optional CSS class name */
  className?: string;

  /** Optional label to show instead of default "Step X of Y" */
  label?: string;

  /** Whether to show the progress bar (defaults to true) */
  showProgressBar?: boolean;

  /** Whether to show the step counter (defaults to true) */
  showStepCounter?: boolean;
}

/**
 * FormProgress component
 *
 * Displays progress through a multi-step form with a visual progress bar
 * and step counter. Useful for wizard-style forms or guided workflows.
 *
 * @example
 * ```tsx
 * <FormProgress currentStep={2} totalSteps={5} />
 * // Output: "Step 2 of 5" with progress bar at 40%
 * ```
 *
 * @example
 * ```tsx
 * // Custom label
 * <FormProgress
 *   currentStep={3}
 *   totalSteps={4}
 *   label="Question 3 of 4"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Only progress bar, no counter
 * <FormProgress
 *   currentStep={2}
 *   totalSteps={5}
 *   showStepCounter={false}
 * />
 * ```
 */
export function FormProgress({
  currentStep,
  totalSteps,
  className = '',
  label,
  showProgressBar = true,
  showStepCounter = true,
}: FormProgressProps) {
  // Calculate progress percentage (0-100)
  const progress = totalSteps > 0
    ? Math.round((currentStep / totalSteps) * 100)
    : 0;

  // Default label format
  const defaultLabel = `Step ${currentStep} of ${totalSteps}`;
  const displayLabel = label || defaultLabel;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Step counter */}
      {showStepCounter && (
        <div className="text-sm text-muted-foreground font-medium">
          {displayLabel}
        </div>
      )}

      {/* Progress bar */}
      {showProgressBar && (
        <Progress
          value={progress}
          className="h-2"
          aria-label={displayLabel}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      )}
    </div>
  );
}
