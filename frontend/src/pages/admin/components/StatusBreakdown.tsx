import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface StatusBreakdownStats {
  totalCases: number;
  draftCases: number;
  publishedCases: number;
  closedCases: number;
}

interface StatusBreakdownProps {
  stats: StatusBreakdownStats;
}

export function StatusBreakdown({ stats }: StatusBreakdownProps) {
  const { t } = useTranslation();

  const statuses = [
    { label: t('cases.status.draft'), value: stats.draftCases, fill: 'bg-border' },
    { label: t('cases.status.published'), value: stats.publishedCases, fill: 'bg-success' },
    { label: t('cases.status.closed'), value: stats.closedCases, fill: 'bg-muted-foreground' },
  ];

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          {t('admin.dashboard.statusBreakdown')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('admin.dashboard.statusBreakdownDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {statuses.map((status) => (
          <div key={status.label} className="p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={cn('size-2 rounded-full', status.fill)} />
              {status.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{status.value}</p>
            {stats.totalCases > 0 && (
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {t('admin.dashboard.percentOfTotal', { percent: ((status.value / stats.totalCases) * 100).toFixed(0) })}
              </p>
            )}
          </div>
        ))}
      </div>

      {stats.totalCases > 0 && (
        <div className="border-t p-4">
          <div className="flex h-2 gap-0.5" aria-hidden="true">
            {statuses.map(
              (status) =>
                status.value > 0 && (
                  <div
                    key={status.label}
                    className={cn('h-full rounded-sm', status.fill)}
                    style={{ width: `${(status.value / stats.totalCases) * 100}%` }}
                  />
                )
            )}
          </div>
        </div>
      )}
    </section>
  );
}
