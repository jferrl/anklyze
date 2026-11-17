import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatCard, StatGroup } from '../../components/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './components/StatusBadge';
import { caseApi, downloadDetailedResponsesCSV } from '@/services';
import { KappaScoresSection } from './components/KappaScoresSection';
import { DetailedSystemAnalysis } from './components/DetailedSystemAnalysis';

export function CaseReliabilityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: caseData, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getCase(id!),
    enabled: !!id,
  });

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['case-reliability', id],
    queryFn: () => caseApi.getReliabilityMetrics(id!),
    enabled: !!id,
  });

  const handleExportCSV = useCallback(async () => {
    if (id && caseData) {
      await downloadDetailedResponsesCSV(
        id,
        `${caseData.title.replace(/\s+/g, '_')}_detailed_responses.csv`
      );
    }
  }, [id, caseData]);

  if (isLoadingCase || isLoadingMetrics) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!caseData || !metrics) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h2 className="text-base font-semibold text-foreground">
          {t('admin.cases.notFound')}
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {t('admin.cases.notFoundDescription')}
        </p>
        <Button variant="outline" onClick={() => navigate('/admin/cases')}>
          <ArrowLeft />
          {t('admin.cases.backToList')}
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
          {t('admin.cases.backToList')}
        </button>

        <PageHeader
          title={t('admin.reliability.title')}
          description={
            <span className="flex flex-wrap items-center gap-3">
              {caseData.title}
              <StatusBadge status={caseData.status} label={t(`cases.status.${caseData.status}`)} />
            </span>
          }
          actions={
            <Button onClick={handleExportCSV}>
              <Download />
              {t('admin.reliability.exportDetailed')}
            </Button>
          }
        />

        <StatGroup className="lg:grid-cols-2">
          <StatCard title={t('admin.reliability.totalResponses')} value={metrics.total_responses} />
          <StatCard title={t('admin.reliability.uniqueRaters')} value={metrics.unique_raters} />
        </StatGroup>

        <KappaScoresSection metrics={metrics} />

        <DetailedSystemAnalysis metrics={metrics} />
    </div>
  );
}
