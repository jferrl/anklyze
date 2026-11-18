import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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

// Full-width link row: tonal hover and press, no scale.
const ROW =
  'flex w-full items-center justify-between gap-4 px-4 py-3 text-left outline-none transition-colors duration-150 hover:bg-muted active:bg-accent focus-visible:bg-muted focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring';

/** RecentActivityCard lists the cases with the latest responses, each linking to its report. */
export function RecentActivityCard({ cases }: { cases: RecentActivityCase[] }) {
  const { t, i18n } = useTranslation();

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{t('admin.dashboard.recentActivity')}</h2>
        <p className="text-sm text-muted-foreground">{t('admin.dashboard.recentActivityDesc')}</p>
      </div>

      {cases.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{t('admin.dashboard.noRecentActivity')}</p>
      ) : (
        <ul className="divide-y">
          {cases.map((caseItem) => (
            <li key={caseItem.id}>
              <Link to={`/admin/cases/${caseItem.id}/report`} className={ROW}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{caseItem.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <StatusBadge status={caseItem.status} label={t(`cases.status.${caseItem.status}`)} />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {t('admin.analytics.responsesCount', { count: caseItem.response_count })}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDate(caseItem.updated_at, i18n.language)}
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
