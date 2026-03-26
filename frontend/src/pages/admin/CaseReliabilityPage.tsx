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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatCard } from '../../components/analytics';
import { caseApi, downloadDetailedResponsesCSV } from '@/services';
import { cn } from '@/lib/utils';
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

  if (!caseData || !metrics) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="chart-card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('admin.cases.notFound')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('admin.cases.notFoundDescription')}
          </p>
          <Button onClick={() => navigate('/admin/cases')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('admin.cases.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/cases')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('admin.cases.backToList')}
              </button>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {t('admin.reliability.title')}
                </h1>
                <p className="text-muted-foreground mt-1">{caseData.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-medium',
                      caseData.status === 'published' &&
                        'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                      caseData.status === 'closed' &&
                        'border-amber-500/50 text-amber-600 dark:text-amber-400',
                      caseData.status === 'draft' && 'border-muted-foreground/50'
                    )}
                  >
                    {t(`cases.status.${caseData.status}`)}
                  </Badge>
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
                {t('admin.reliability.exportDetailed')}
              </Button>
            </div>
          </div>
        </header>

        {/* Overview Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={t('admin.reliability.totalResponses')}
            value={metrics.total_responses}
            icon={BarChart3}
            color="blue"
            delay={0}
          />
          <StatCard
            title={t('admin.reliability.uniqueRaters')}
            value={metrics.unique_raters}
            icon={Users}
            color="emerald"
            delay={50}
          />
        </section>

        {/* Kappa Scores Overview */}
        <KappaScoresSection metrics={metrics} />

        {/* Detailed System Analysis */}
        <DetailedSystemAnalysis metrics={metrics} />
      </div>
    </div>
  );
}
