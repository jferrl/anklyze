import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { getLocalFormOptions } from '@/utils/formOptions';
import type { FractureInput } from '@/types';
import { getQuestionSteps } from '../utils/questionSteps';

interface BreadcrumbTrailProps {
  formData: Partial<FractureInput>;
  options: ReturnType<typeof getLocalFormOptions>;
  /** `inline` is a one-line chevron trail; `list` is a ruled question-and-answer list. */
  variant?: 'inline' | 'list';
  className?: string;
}

/**
 * BreadcrumbTrail renders the answered path through the decision tree, using the
 * same questions and option labels as the form.
 */
export function BreadcrumbTrail({ formData, options, variant = 'inline', className }: BreadcrumbTrailProps) {
  const { t } = useTranslation();

  const path = getQuestionSteps(formData, options)
    .filter((step) => step.value !== undefined)
    .map((step) => ({
      id: step.id,
      question: step.title,
      answer: step.options.find((opt) => opt.value === step.value)?.label ?? String(step.value),
    }));

  if (path.length === 0) {
    return null;
  }

  if (variant === 'list') {
    return (
      <ol className={cn('@container divide-y rounded-lg border bg-card', className)}>
        {path.map((item, index) => (
          <li key={item.id} className="flex gap-3 px-4 py-3 text-sm">
            <span aria-hidden="true" className="w-5 shrink-0 tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-x-6 gap-y-0.5 @2xl:flex-row">
              <p className="text-muted-foreground @2xl:w-1/2">{item.question}</p>
              <p className="font-medium @2xl:w-1/2">{item.answer}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground', className)}>
      {path.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <span className={index === path.length - 1 ? 'text-foreground' : undefined}>
            {item.id === 'has_ct_scan' ? t('classify.ctAnswer', { answer: item.answer }) : item.answer}
          </span>
          {index < path.length - 1 && <span aria-hidden="true">&rsaquo;</span>}
        </div>
      ))}
    </div>
  );
}
