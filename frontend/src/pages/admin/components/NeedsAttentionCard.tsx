import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { Case } from '@/types';

const SHOWN = 5;

// Full-width link row: tonal hover and press, no scale.
const ROW =
  'flex w-full items-center justify-between gap-4 px-4 py-3 text-left outline-none transition-colors duration-150 hover:bg-muted active:bg-accent focus-visible:bg-muted focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50';

const isPastDeadline = (deadline: string | undefined, now: number) =>
  !!deadline && new Date(deadline).getTime() < now;

/**
 * NeedsAttentionCard lists the published cases with no responses or a passed deadline,
 * the dashboard API's rule, and renders nothing when there are none.
 */
export function NeedsAttentionCard({ published, now }: { published: Case[]; now: number }) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const cases = published.filter((c) => c.response_count === 0 || isPastDeadline(c.deadline, now));
  if (cases.length === 0) return null;

  const hidden = cases.length - SHOWN;
  const shown = expanded ? cases : cases.slice(0, SHOWN);

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          {t('admin.dashboard.needsAttention')}{' '}
          <span className="font-normal tabular-nums text-muted-foreground">{cases.length}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{t('admin.dashboard.needsAttentionDesc')}</p>
      </div>

      <ul className="divide-y">
        {shown.map((caseItem) => (
          <li key={caseItem.id}>
            <Link to={`/admin/cases/${caseItem.id}/edit`} className={ROW}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{caseItem.title}</span>
                <span className="mt-1 block text-xs text-warning">
                  {isPastDeadline(caseItem.deadline, now)
                    ? t('admin.dashboard.pastDeadlineOn', { date: formatDate(caseItem.deadline!, i18n.language) })
                    : t('admin.dashboard.noResponses')}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      {!expanded && hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full border-t px-4 py-3 text-left text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          {t('admin.dashboard.moreCount', { count: hidden })}
        </button>
      )}
    </section>
  );
}
