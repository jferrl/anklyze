import { useTranslation } from 'react-i18next';
import { Clock, Users, Scan, CalendarClock } from 'lucide-react';
import { Badge } from '../ui/badge';

interface StudyHeaderProps {
  title: string;
  description?: string;
  hasTACImages: boolean;
  myResponseCount: number;
  deadline?: string;
}

export function StudyHeader({
  title,
  description,
  hasTACImages,
  myResponseCount,
  deadline,
}: StudyHeaderProps) {
  const { t } = useTranslation();

  const deadlineDate = deadline ? new Date(deadline) : null;
  const isExpired = deadlineDate && deadlineDate < new Date();

  // Calculate days remaining
  const daysRemaining = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

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
            {t('studies.includesTAC')}
          </Badge>
        )}

        <Badge variant="outline" className="gap-1.5 px-3 py-1">
          <Users className="h-3.5 w-3.5" />
          {myResponseCount} {t('studies.myResponses')}
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
                {t('studies.expired')}
              </>
            ) : (
              <>
                <CalendarClock className="h-3.5 w-3.5" />
                {daysRemaining !== null && daysRemaining > 0
                  ? t('studies.daysLeft', { count: daysRemaining })
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
