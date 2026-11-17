import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Users, Scan, CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

interface CaseHeaderProps {
  title: string;
  description?: string;
  hasTACImages: boolean;
  myResponseCount: number;
  deadline?: string;
}

function computeDeadlineInfo(deadline?: string) {
  const now = Date.now();
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isExpired = deadlineDate ? deadlineDate.getTime() < now : false;
  const daysRemaining = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - now) / (1000 * 60 * 60 * 24))
    : null;
  return { deadlineDate, isExpired, daysRemaining };
}

export function CaseHeader({
  title,
  description,
  hasTACImages,
  myResponseCount,
  deadline,
}: CaseHeaderProps) {
  const { t, i18n } = useTranslation();

  const { deadlineDate, isExpired, daysRemaining } = useMemo(
    () => computeDeadlineInfo(deadline),
    [deadline]
  );
  const isUrgent = !isExpired && daysRemaining !== null && daysRemaining <= 3;

  return (
    <PageHeader
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          {hasTACImages && (
            <span className="inline-flex items-center gap-1.5">
              <Scan className="h-3.5 w-3.5" />
              {t('cases.includesTAC')}
            </span>
          )}

          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {myResponseCount === 0
              ? t('cases.myResponsesNone')
              : t('cases.myResponsesCount', { count: myResponseCount })}
          </span>

          {deadlineDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5',
                isExpired && 'text-destructive',
                isUrgent && 'text-warning',
              )}
            >
              {isExpired ? (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  {t('cases.expired')}
                </>
              ) : (
                <>
                  <CalendarClock className="h-3.5 w-3.5" />
                  {daysRemaining !== null && daysRemaining > 0
                    ? t('cases.daysLeft', { count: daysRemaining })
                    : formatDate(deadlineDate, i18n.language)}
                </>
              )}
            </span>
          )}
        </div>
      }
    />
  );
}
