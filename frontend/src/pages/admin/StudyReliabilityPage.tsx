import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatCard, StatGroup } from '../../components/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './components/StatusBadge';
import { studyApi } from '@/services';
import { PerCaseAgreementSection } from './components/PerCaseAgreementSection';
import { StudyKappaAnalysis } from './components/StudyKappaAnalysis';
import { StudyGoldStandardSection } from './components/StudyGoldStandardSection';

export function StudyReliabilityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: study, isLoading: isLoadingStudy } = useQuery({
    queryKey: ['admin-study', id],
    queryFn: () => studyApi.getStudy(id!),
    enabled: !!id,
  });

  const { data: reliability, isLoading: isLoadingReliability } = useQuery({
    queryKey: ['study-reliability', id],
    queryFn: () => studyApi.getStudyReliabilityMetrics(id!),
    enabled: !!id,
  });

  const { data: goldStandard, isLoading: isLoadingGoldStandard } = useQuery({
    queryKey: ['study-gold-standard', id],
    queryFn: () => studyApi.getStudyGoldStandardMetrics(id!),
    enabled: !!id,
  });

  const handleExportCSV = useCallback(async () => {
    if (id && study) {
      await studyApi.downloadStudyResponsesCSV(
        id,
        `${study.title.replace(/\s+/g, '_')}_responses.csv`
      );
    }
  }, [id, study]);

  const isLoading = isLoadingStudy || isLoadingReliability || isLoadingGoldStandard;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!study || !reliability) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h2 className="text-base font-semibold text-foreground">
          {t('admin.studies.notFound', 'Study not found')}
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {t('admin.studies.notFoundDescription', 'The study you are looking for does not exist or has no reliability data.')}
        </p>
        <Button variant="outline" onClick={() => navigate('/admin/studies')}>
          <ArrowLeft />
          {t('admin.studies.backToList', 'Back to Studies')}
        </Button>
      </div>
    );
  }

  const lowAgreementCases = reliability.per_case_metrics.filter((c) => c.is_low_agreement);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <button
          onClick={() => navigate(`/admin/studies/${id}/edit`)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('admin.studies.backToStudy', 'Back to Study')}
        </button>

        <PageHeader
          title={t('admin.reliability.title', 'Reliability Analysis')}
          description={
            <span className="flex flex-wrap items-center gap-3">
              {reliability.study_title}
              <StatusBadge status={study.status} label={t(`studies.status.${study.status}`)} />
              {lowAgreementCases.length > 0 && (
                <Badge variant="outline" className="font-normal tabular-nums">
                  <AlertCircle className="text-warning" />
                  {lowAgreementCases.length} {t('admin.studies.reliability.lowAgreementCases', 'low agreement')}
                </Badge>
              )}
            </span>
          }
          actions={
            <Button onClick={handleExportCSV}>
              <Download />
              {t('admin.reliability.exportDetailed', 'Export CSV')}
            </Button>
          }
        />

        <StatGroup>
          <StatCard
            title={t('admin.studies.reliability.totalCases', 'Total Cases')}
            value={reliability.total_cases}
          />
          <StatCard
            title={t('admin.reliability.totalResponses', 'Total Responses')}
            value={reliability.total_responses}
          />
          <StatCard
            title={t('admin.reliability.uniqueRaters', 'Unique Raters')}
            value={reliability.unique_raters}
          />
          <StatCard
            title={t('admin.studies.reliability.completeRaters', 'Complete Raters')}
            value={reliability.complete_raters}
          />
        </StatGroup>

        <StudyKappaAnalysis reliability={reliability} />

        {goldStandard && (
          <StudyGoldStandardSection metrics={goldStandard} />
        )}

        <PerCaseAgreementSection
          perCaseMetrics={reliability.per_case_metrics}
        />
    </div>
  );
}
