import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import type { Study } from '@/types';
import { StatusBadge } from './StatusBadge';

const LINK = 'font-medium text-foreground underline-offset-4 hover:underline';

/** StudiesInProgressCard lists active studies, then drafts, in the order given. */
export function StudiesInProgressCard({ studies }: { studies: Study[] }) {
  const { t, i18n } = useTranslation();
  const rows = [
    ...studies.filter((s) => s.status === 'active'),
    ...studies.filter((s) => s.status === 'draft'),
  ];

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-end justify-between gap-4 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('admin.dashboard.studiesInProgress')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.dashboard.studiesInProgressDesc')}
          </p>
        </div>
        <Link to="/admin/studies" className="shrink-0 text-sm text-primary underline-offset-4 hover:underline">
          {t('admin.dashboard.allStudies')}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {t('admin.dashboard.noStudiesInProgress')}{' '}
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
              <TableHead className="text-right text-muted-foreground">{t('admin.studies.table.responses')}</TableHead>
              <TableHead className="hidden pr-4 text-right text-muted-foreground sm:table-cell">{t('admin.studies.table.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((study) => (
              <TableRow key={study.id} className="hover:bg-transparent">
                <TableCell className="pl-4 whitespace-normal">
                  {study.status === 'active' ? (
                    <Link to={`/admin/studies/${study.id}/reliability`} className={LINK}>
                      {study.title}
                    </Link>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/studies/${study.id}/edit`} className={LINK}>
                        {study.title}
                      </Link>
                      <StatusBadge status={study.status} label={t(`studies.status.${study.status}`)} />
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{study.case_count}</TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">{study.unique_raters}</TableCell>
                <TableCell className="text-right tabular-nums">{study.total_responses}</TableCell>
                <TableCell className="hidden pr-4 text-right tabular-nums text-muted-foreground sm:table-cell">
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
