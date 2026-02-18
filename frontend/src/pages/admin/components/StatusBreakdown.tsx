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

  return (
    <section className="chart-card">
      <div className="mb-6">
        <h3 className="font-semibold text-foreground">
          {t('admin.dashboard.statusBreakdown')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.dashboard.statusBreakdownDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: t('cases.status.draft'),
            value: stats.draftCases,
            color: 'text-muted-foreground',
            bg: 'bg-muted/50',
            ring: 'ring-muted-foreground/20',
          },
          {
            label: t('cases.status.published'),
            value: stats.publishedCases,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/10',
            ring: 'ring-emerald-500/30',
          },
          {
            label: t('cases.status.closed'),
            value: stats.closedCases,
            color: 'text-muted-foreground',
            bg: 'bg-muted/50',
            ring: 'ring-muted-foreground/20',
          },
        ].map((status, index) => (
          <div
            key={status.label}
            className={cn(
              'relative text-center p-6 rounded-xl',
              status.bg,
              'ring-1',
              status.ring,
              'transition-all duration-300 hover:scale-[1.02]',
              'opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]'
            )}
            style={{ animationDelay: `${index * 100 + 300}ms` }}
          >
            <div className={cn('text-4xl font-bold', status.color)}>
              {status.value}
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              {status.label}
            </p>
            {stats.totalCases > 0 && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                {((status.value / stats.totalCases) * 100).toFixed(0)}% of total
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {stats.totalCases > 0 && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="h-3 rounded-full bg-muted/50 overflow-hidden flex">
            {stats.draftCases > 0 && (
              <div
                className="h-full bg-muted-foreground/30 transition-all duration-500"
                style={{ width: `${(stats.draftCases / stats.totalCases) * 100}%` }}
              />
            )}
            {stats.publishedCases > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(stats.publishedCases / stats.totalCases) * 100}%` }}
              />
            )}
            {stats.closedCases > 0 && (
              <div
                className="h-full bg-muted-foreground/50 transition-all duration-500"
                style={{ width: `${(stats.closedCases / stats.totalCases) * 100}%` }}
              />
            )}
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">{t('cases.status.draft')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">{t('cases.status.published')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-muted-foreground/50" />
              <span className="text-xs text-muted-foreground">{t('cases.status.closed')}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
