import { useTranslation } from 'react-i18next';
import { Clock, Users } from 'lucide-react';
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        {hasTACImages && (
          <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950">
            {t('studies.includesTAC')}
          </Badge>
        )}
        <Badge variant="outline">
          <Users className="h-3 w-3 mr-1" />
          {myResponseCount} {t('studies.myResponses')}
        </Badge>
        {deadlineDate && (
          <Badge variant={isExpired ? 'destructive' : 'outline'}>
            <Clock className="h-3 w-3 mr-1" />
            {isExpired
              ? t('studies.expired')
              : `${t('studies.deadline')}: ${deadlineDate.toLocaleDateString()}`
            }
          </Badge>
        )}
      </div>
    </div>
  );
}
