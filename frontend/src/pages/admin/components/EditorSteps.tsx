import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StepIndicatorProps<T extends string> {
  steps: { key: T; label: string }[];
  current: T;
  /** Omit when jumping between steps is not allowed; steps then render as plain text. */
  onStepClick?: (step: T) => void;
}

/** StepIndicator lists an editor's steps and rules the current one. */
export function StepIndicator<T extends string>({ steps, current, onStepClick }: StepIndicatorProps<T>) {
  return (
    <ol className="flex flex-wrap gap-x-6 border-b text-sm">
      {steps.map(({ key, label }, index) => {
        const isCurrent = key === current;
        const className = cn(
          '-mb-px flex items-baseline gap-2 border-b-2 pb-2 transition-colors duration-150',
          isCurrent ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground',
          onStepClick && !isCurrent && 'hover:text-foreground'
        );
        const content = (
          <>
            <span className="tabular-nums">{index + 1}</span>
            {label}
          </>
        );
        return (
          <li key={key} className="flex">
            {onStepClick ? (
              <button type="button" onClick={() => onStepClick(key)} aria-current={isCurrent ? 'step' : undefined} className={className}>
                {content}
              </button>
            ) : (
              <span aria-current={isCurrent ? 'step' : undefined} className={className}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface StepFooterProps {
  /** Zero-based index of the current step. */
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

/** StepFooter is the Previous / "Step n of m" / Next row that closes every editor page. */
export function StepFooter({ current, total, onPrev, onNext }: StepFooterProps) {
  const { t } = useTranslation();
  const isLast = current >= total - 1;

  return (
    <div className="grid grid-cols-3 items-center border-t pt-6">
      <Button variant="outline" onClick={onPrev} disabled={current === 0} className="justify-self-start">
        <ChevronLeft />
        {t('common.previous')}
      </Button>
      <p className="text-center text-sm tabular-nums text-muted-foreground">
        {t('admin.editor.stepOf', { current: current + 1, total })}
      </p>
      {!isLast && (
        <Button onClick={onNext} className="justify-self-end">
          {t('common.next')}
          <ChevronRight />
        </Button>
      )}
    </div>
  );
}
