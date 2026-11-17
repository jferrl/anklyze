import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type Step = 'details' | 'images';

interface CaseEditorStepperProps {
  steps: Step[];
  isEditing: boolean;
  currentStep: Step;
  title: string;
  totalImages: number;
  onStepClick: (step: Step) => void;
}

export function CaseEditorStepper({ steps, currentStep, onStepClick }: CaseEditorStepperProps) {
  const { t } = useTranslation();

  const labels: Record<Step, string> = {
    details: t('admin.cases.details'),
    images: t('admin.cases.images'),
  };

  return (
    <ol className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {steps.map((step, index) => (
        <li key={step}>
          <button
            onClick={() => onStepClick(step)}
            aria-current={step === currentStep ? 'step' : undefined}
            className={cn(
              'flex items-baseline gap-2 transition-colors duration-150',
              step === currentStep
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="tabular-nums">{index + 1}</span>
            {labels[step]}
          </button>
        </li>
      ))}
    </ol>
  );
}
