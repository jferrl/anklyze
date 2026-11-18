import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard, StatGroup } from '@/components/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecordTitle } from '@/components/layout/recordTitle';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { caseApi, downloadCaseResponsesCSV, downloadDetailedResponsesCSV } from '@/services';
import { formatDate, formatDuration, formatNumber } from '@/lib/format';
import { StatusBadge } from './components/StatusBadge';
import { SystemTabs } from './components/SystemTabs';
import { CaseAgreementSection } from './components/CaseAgreementSection';
import { LoadError } from './components/LoadError';
import { fileDate, fileSlug } from './components/reliabilityCsv';
import { SYSTEM_COLOR, SYSTEM_KEYS, SYSTEM_LABEL, SYSTEMS, useSystemParam } from './components/systems';

const ClassificationChart = lazy(() =>
  import('@/components/analytics/ClassificationChart')
    .then((m) => ({ default: m.ClassificationChart }))
    .catch(() => {
      // Chunk missing after deploy: reload to get the fresh index.html.
      window.location.reload();
      return { default: () => null! };
    })
);

const PANEL_ID = 'case-system-panel';
const BACK_LINK =
  'inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring';

const isNotFound = (err: unknown) => {
  const e = err as { status?: number; code?: string } | null;
  return e?.status === 404 || e?.code === 'NOT_FOUND';
};

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} relative="path" className={BACK_LINK}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

/** CaseReportPage is the one report for a case: response figures, rater agreement and the classification distribution. */
export function CaseReportPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [activeSystem, setActiveSystem] = useSystemParam();

  const caseQuery = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getCase(id!),
    enabled: !!id,
    retry: (count, err) => !isNotFound(err) && count < 1,
  });
  const analyticsQuery = useQuery({
    queryKey: ['case-analytics', id],
    queryFn: () => caseApi.getCaseAnalytics(id!),
    enabled: !!id,
  });
  const metricsQuery = useQuery({
    queryKey: ['case-reliability', id],
    queryFn: () => caseApi.getReliabilityMetrics(id!),
    enabled: !!id,
  });
  const caseData = caseQuery.data;
  useRecordTitle(caseData?.title);
  useDocumentTitle(caseData?.title, t('breadcrumbs.report'));

  const fileStem = fileSlug(caseData?.title ?? '', 'case');
  const exportResponses = useMutation({
    mutationFn: () => downloadCaseResponsesCSV(id!, `${fileStem}_responses_${fileDate()}.csv`),
    onSuccess: () => toast.success(t('admin.report.exported')),
    onError: () => toast.error(t('errors.failedToExportResponses')),
  });
  const exportDetailed = useMutation({
    mutationFn: () => downloadDetailedResponsesCSV(id!, `${fileStem}_detailed_responses_${fileDate()}.csv`),
    onSuccess: () => toast.success(t('admin.report.exported')),
    onError: () => toast.error(t('errors.failedToExportDetailedResponses')),
  });

  // The case query alone decides "not found"; the other two answer 500 or an empty 200 for a missing case.
  if (caseQuery.isLoading) return <CaseReportSkeleton />;
  if (isNotFound(caseQuery.error) || (caseQuery.isSuccess && !caseData)) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h1 className="text-base font-semibold text-foreground">{t('admin.cases.notFound')}</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t('admin.cases.notFoundDescription')}</p>
        <BackLink to="/admin/cases" label={t('admin.cases.backToList')} />
      </div>
    );
  }

  const queries = [caseQuery, analyticsQuery, metricsQuery];
  if (!caseQuery.isError && queries.some((q) => q.isLoading)) return <CaseReportSkeleton />;

  const error = queries.find((q) => q.isError)?.error;
  const analytics = analyticsQuery.data;
  const metrics = metricsQuery.data;
  if (error || !caseData || !analytics || !metrics) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <BackLink to="../edit" label={t('admin.report.backToCase')} />
        <LoadError
          title={t('admin.report.loadFailed')}
          error={error}
          onRetry={() => queries.forEach((q) => q.isError && q.refetch())}
        />
      </div>
    );
  }

  const exportButton = (mutation: typeof exportResponses, label: string, variant: 'default' | 'outline') => (
    <Button variant={variant} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? <Loader2 className="animate-spin" /> : <Download />}
      {label}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <BackLink to="../edit" label={t('admin.report.backToCase')} />

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 break-words">{caseData.title}</span>
            <StatusBadge status={caseData.status} label={t(`cases.status.${caseData.status}`)} />
          </span>
        }
        description={
          caseData.deadline && (
            <span className="tabular-nums">
              {t('admin.report.deadline', { date: formatDate(caseData.deadline, i18n.language) })}
            </span>
          )
        }
        actions={
          <>
            {exportButton(exportResponses, t('admin.report.exportResponses'), 'outline')}
            {exportButton(exportDetailed, t('admin.report.exportDetailed'), 'outline')}
          </>
        }
      />

      <StatGroup className="grid-cols-3 lg:grid-cols-3">
        <StatCard title={t('admin.reliability.totalResponses')} value={formatNumber(analytics.response_count, 0)} />
        <StatCard title={t('admin.reliability.uniqueRaters')} value={formatNumber(analytics.unique_respondents, 0)} />
        <StatCard
          title={t('admin.analytics.meanResponseTime')}
          value={analytics.response_count > 0 ? formatDuration(analytics.avg_time_taken_ms) : '—'}
        />
      </StatGroup>

      {analytics.response_count === 0 ? (
        <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
          {t('admin.report.noResponses')}
        </p>
      ) : (
        <>
          {/* Under two responses the API answers with a message instead of metrics. */}
          {metrics.total_responses == null ? (
            <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
              {t('admin.report.agreementNeedsTwo')}
            </p>
          ) : (
            <CaseAgreementSection metrics={metrics} />
          )}

          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t('admin.analytics.classificationDistribution')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('admin.analytics.distributionDescription')}</p>
            </div>

            <SystemTabs systems={SYSTEMS} active={activeSystem} onChange={setActiveSystem} panelId={PANEL_ID} />

            <div id={PANEL_ID} role="tabpanel" aria-labelledby={`${PANEL_ID}-tab-${activeSystem}`}>
              <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                <ClassificationChart
                  data={analytics[`${activeSystem}_distribution`] ?? {}}
                  title={t('admin.analytics.distributionTitle', { system: SYSTEM_LABEL[activeSystem] })}
                  systemLabel={SYSTEM_LABEL[activeSystem]}
                  color={SYSTEM_COLOR[activeSystem]}
                />
              </Suspense>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** CaseReportSkeleton has the report's shape so nothing jumps when the data lands. */
function CaseReportSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-9 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 bg-card p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        {SYSTEM_KEYS.map((key) => (
          <div key={key} className="space-y-3 bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full max-w-[90ch]" />
      <Skeleton className="h-9 w-96 max-w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
