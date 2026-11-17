import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { StatusBadge } from './StatusBadge';

interface RecentActivityCase {
  id: string;
  title: string;
  status: string;
  response_count: number;
  updated_at: string;
}

interface RecentActivityCardProps {
  cases: RecentActivityCase[];
}

export function RecentActivityCard({ cases }: RecentActivityCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          {t('admin.dashboard.recentActivity')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('admin.dashboard.recentActivityDesc')}
        </p>
      </div>

      {cases.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {t('admin.dashboard.noRecentActivity')}
        </p>
      ) : (
        <div className="divide-y">
          {cases.map((caseItem) => (
            <button
              key={caseItem.id}
              onClick={() => navigate(`/admin/cases/${caseItem.id}/analytics`)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {caseItem.title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={caseItem.status} label={t(`cases.status.${caseItem.status}`)} />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t('admin.analytics.responsesCount', { count: caseItem.response_count })}
                  </span>
                </div>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatDate(caseItem.updated_at, i18n.language)}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
