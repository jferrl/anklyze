import { lazy, Suspense, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, ArrowLeft, Target } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatCard, StatGroup } from '../../components/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './components/StatusBadge';
import { SystemTabs } from './components/SystemTabs';
import { SYSTEM_COLOR, SYSTEM_LABEL, SYSTEMS, type SystemKey } from './components/systems';
import { formatDate } from '@/lib/format';

const ClassificationChart = lazy(() =>
  import('../../components/analytics/ClassificationChart')
    .then(m => ({ default: m.ClassificationChart }))
    .catch(() => {
      // Chunk missing after deploy — reload to get fresh index.html
      window.location.reload();
      return { default: () => null! };
    })
);
import { caseApi, downloadCaseResponsesCSV } from '@/services';
import { useRecordTitle } from '@/components/layout/recordTitle';

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function CaseAnalyticsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeSystem, setActiveSystem] = useState<SystemKey>('lauge_hansen');

  const { data: caseData, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getCase(id!),
    enabled: !!id,
  });
  useRecordTitle(caseData?.title);

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['case-analytics', id],
    queryFn: () => caseApi.getCaseAnalytics(id!),
    enabled: !!id,
  });

  const handleExportCSV = useCallback(async () => {
    if (id && caseData) {
      await downloadCaseResponsesCSV(id, `${caseData.title.replace(/\s+/g, '_')}_responses.csv`);
    }
  }, [id, caseData]);

  const distribution = analytics?.[`${activeSystem}_distribution`] ?? {};

  if (isLoadingCase || isLoadingAnalytics) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading', 'Loading analytics...')}</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!caseData || !analytics) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h2 className="text-base font-semibold text-foreground">
          {t('admin.cases.notFound', 'Case not found')}
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {t('admin.cases.notFoundDescription', 'The case you\'re looking for doesn\'t exist or has been removed.')}
        </p>
        <Button variant="outline" onClick={() => navigate('/admin/cases')}>
          <ArrowLeft />
          {t('admin.cases.backToList', 'Back to Cases')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <button
          onClick={() => navigate('/admin/cases')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('admin.cases.backToCases', 'Back to Cases')}
        </button>

        <PageHeader
          title={caseData.title}
          description={
            <span className="flex flex-wrap items-center gap-3">
              <StatusBadge status={caseData.status} label={t(`cases.status.${caseData.status}`)} />
              {caseData.deadline && (
                <span className="tabular-nums">{formatDate(caseData.deadline, i18n.language)}</span>
              )}
            </span>
          }
          actions={
            <>
              <Button onClick={() => navigate(`/admin/cases/${id}/reliability`)} variant="outline">
                <Target />
                {t('admin.analytics.reliabilityMetrics', 'Reliability Metrics')}
              </Button>
              <Button onClick={handleExportCSV}>
                <Download />
                {t('admin.cases.exportCSV', 'Export CSV')}
              </Button>
            </>
          }
        />

        <StatGroup>
          <StatCard
            title={t('admin.analytics.totalResponses', 'Total Responses')}
            value={analytics.response_count}
          />
          <StatCard
            title={t('admin.analytics.uniqueRespondents', 'Unique Respondents')}
            value={analytics.unique_respondents}
          />
          <StatCard
            title={t('admin.analytics.avgResponseTime', 'Avg. Response Time')}
            value={formatDuration(analytics.avg_time_taken_ms)}
          />
          <StatCard
            title={t('admin.analytics.responsesPerUser', 'Responses/User')}
            value={
              analytics.unique_respondents > 0
                ? (analytics.response_count / analytics.unique_respondents).toFixed(1)
                : '0'
            }
          />
        </StatGroup>

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.analytics.classificationDistribution', 'Classification Distribution')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('admin.analytics.distributionDescription', 'How respondents classified this case across different systems')}
            </p>
          </div>

          <SystemTabs systems={SYSTEMS} active={activeSystem} onChange={(key) => setActiveSystem(key as SystemKey)} />

          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ClassificationChart
              data={distribution}
              title={t('admin.analytics.distributionTitle', { system: SYSTEM_LABEL[activeSystem] })}
              systemLabel={SYSTEM_LABEL[activeSystem]}
              color={SYSTEM_COLOR[activeSystem]}
            />
          </Suspense>
        </section>
    </div>
  );
}
