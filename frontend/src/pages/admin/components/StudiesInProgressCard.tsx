import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatNumber } from '@/lib/format';
import type { Study } from '@/types';
import { StatusBadge } from './StatusBadge';

const LINK =
  'rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50';

const RECENTLY_CLOSED_MS = 30 * 24 * 60 * 60 * 1000;

/** StudiesInProgressCard lists active studies, then drafts, then studies closed in the last 30 days. */
export function StudiesInProgressCard({ studies, now }: { studies: Study[]; now: number }) {
  const { t, i18n } = useTranslation();
  // shortcut: a study has no closed_at, so updated_at stands in for the close date; add closed_at if edits after closing become possible.
  const recentlyClosed = (s: Study) =>
    s.status === 'closed' && now - new Date(s.updated_at).getTime() < RECENTLY_CLOSED_MS;
  const rows = [
    ...studies.filter((s) => s.status === 'active'),
    ...studies.filter((s) => s.status === 'draft'),
    ...studies.filter(recentlyClosed),
  ];
  const n = (value: number) => formatNumber(value, 0, i18n.language);

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-end justify-between gap-4 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t('admin.dashboard.currentStudies')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin.dashboard.currentStudiesDesc')}</p>
        </div>
        <Link to="/admin/studies" className="shrink-0 rounded-sm text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
          {t('admin.dashboard.allStudies')}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {t('admin.dashboard.noCurrentStudies')}{' '}
          <Link to="/admin/studies/new" className="text-primary underline-offset-4 hover:underline">
            {t('admin.studies.create')}
          </Link>
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 text-muted-foreground">{t('admin.studies.table.title')}</TableHead>
              <TableHead className="text-right text-muted-foreground">{t('admin.studies.table.cases')}</TableHead>
              <TableHead className="hidden text-right text-muted-foreground sm:table-cell">{t('admin.studies.table.raters')}</TableHead>
              <TableHead className="text-right text-muted-foreground">{t('admin.studies.table.completeRaters')}</TableHead>
              <TableHead className="hidden text-right text-muted-foreground sm:table-cell">{t('admin.studies.table.responses')}</TableHead>
              <TableHead className="hidden pr-4 text-right text-muted-foreground md:table-cell">{t('admin.studies.table.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((study) => (
              <TableRow key={study.id} className="hover:bg-transparent">
                <TableCell className="pl-4 whitespace-normal">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      to={study.status === 'draft' ? `/admin/studies/${study.id}/edit` : `/admin/studies/${study.id}/reliability`}
                      className={LINK}
                    >
                      {study.title}
                    </Link>
                    {study.status !== 'active' && (
                      <StatusBadge status={study.status} label={t(`studies.status.${study.status}`)} />
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{n(study.case_count)}</TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">{n(study.unique_raters)}</TableCell>
                <TableCell className="text-right tabular-nums">{n(study.complete_raters)}</TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">{n(study.total_responses)}</TableCell>
                <TableCell className="hidden pr-4 text-right tabular-nums text-muted-foreground md:table-cell">
                  {formatDate(study.created_at, i18n.language)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
