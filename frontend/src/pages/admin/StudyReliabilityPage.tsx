import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Users,
  BarChart3,
  Loader2,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatCard } from '../../components/analytics';
import { studyApi } from '@/services';
import { cn } from '@/lib/utils';
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
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 blur-xl mx-auto" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!study || !reliability) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="chart-card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('admin.studies.notFound', 'Study not found')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('admin.studies.notFoundDescription', 'The study you are looking for does not exist or has no reliability data.')}
          </p>
          <Button onClick={() => navigate('/admin/studies')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('admin.studies.backToList', 'Back to Studies')}
          </Button>
        </div>
      </div>
    );
  }

  const lowAgreementCases = reliability.per_case_metrics.filter((c) => c.is_low_agreement);

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/admin/studies/${id}/edit`)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('admin.studies.backToStudy', 'Back to Study')}
              </button>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {t('admin.reliability.title', 'Reliability Analysis')}
                </h1>
                <p className="text-muted-foreground mt-1">{reliability.study_title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-medium',
                      study.status === 'active' &&
                        'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                      study.status === 'closed' &&
                        'border-amber-500/50 text-amber-600 dark:text-amber-400',
                      study.status === 'draft' && 'border-muted-foreground/50'
                    )}
                  >
                    {t(`studies.status.${study.status}`)}
                  </Badge>
                  {lowAgreementCases.length > 0 && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/50 text-amber-600 dark:text-amber-400"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {lowAgreementCases.length} {t('admin.studies.reliability.lowAgreementCases', 'low agreement')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleExportCSV}
                size="lg"
                className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
              >
                <Download className="w-4 h-4" />
                {t('admin.reliability.exportDetailed', 'Export CSV')}
              </Button>
            </div>
          </div>
        </header>

        {/* Overview Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={t('admin.studies.reliability.totalCases', 'Total Cases')}
            value={reliability.total_cases}
            icon={FileText}
            color="blue"
            delay={0}
          />
          <StatCard
            title={t('admin.reliability.totalResponses', 'Total Responses')}
            value={reliability.total_responses}
            icon={BarChart3}
            color="emerald"
            delay={50}
          />
          <StatCard
            title={t('admin.reliability.uniqueRaters', 'Unique Raters')}
            value={reliability.unique_raters}
            icon={Users}
            color="amber"
            delay={100}
          />
          <StatCard
            title={t('admin.studies.reliability.completeRaters', 'Complete Raters')}
            value={reliability.complete_raters}
            icon={CheckCircle2}
            color="violet"
            delay={150}
          />
        </section>

        {/* Fleiss' Kappa Scores + Detailed Kappa Analysis */}
        <StudyKappaAnalysis reliability={reliability} />

        {/* Gold Standard Accuracy */}
        {goldStandard && (
          <StudyGoldStandardSection metrics={goldStandard} />
        )}

        {/* Per-Case Agreement */}
        <PerCaseAgreementSection
          perCaseMetrics={reliability.per_case_metrics}
        />
      </div>
    </div>
  );
}
