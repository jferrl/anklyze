import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Users, Scan, CalendarClock } from 'lucide-react';
import { Badge } from '../ui/badge';

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
  const { t } = useTranslation();

  const [deadlineInfo, setDeadlineInfo] = useState<{
    deadlineDate: Date | null;
    isExpired: boolean;
    daysRemaining: number | null;
  }>({ deadlineDate: null, isExpired: false, daysRemaining: null });

  useEffect(() => {
    setDeadlineInfo(computeDeadlineInfo(deadline));
  }, [deadline]);

  const { deadlineDate, isExpired, daysRemaining } = deadlineInfo;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {hasTACImages && (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1.5 px-3 py-1">
            <Scan className="h-3.5 w-3.5" />
            {t('cases.includesTAC')}
          </Badge>
        )}

        <Badge variant="outline" className="gap-1.5 px-3 py-1">
          <Users className="h-3.5 w-3.5" />
          {myResponseCount} {t('cases.myResponses')}
        </Badge>

        {deadlineDate && (
          <Badge
            variant={isExpired ? 'destructive' : 'outline'}
            className={
              isExpired
                ? 'gap-1.5 px-3 py-1'
                : daysRemaining !== null && daysRemaining <= 3
                ? 'gap-1.5 px-3 py-1 border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'gap-1.5 px-3 py-1'
            }
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
                  : deadlineDate.toLocaleDateString()
                }
              </>
            )}
          </Badge>
        )}
      </div>
    </div>
  );
}
