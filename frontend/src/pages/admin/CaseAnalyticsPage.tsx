import { lazy, Suspense, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Users,
  Clock,
  BarChart3,
  TrendingUp,
  Loader2,
  FileText,
  ArrowLeft,
  Calendar,
  Target,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatCard } from '../../components/analytics';

const ClassificationChart = lazy(() =>
  import('../../components/analytics/ClassificationChart')
    .then(m => ({ default: m.ClassificationChart }))
    .catch(() => {
      // Chunk missing after deploy — reload to get fresh index.html
      window.location.reload();
      return { default: () => null };
    })
);
import { caseApi, downloadCaseResponsesCSV } from '@/services';
import { cn } from '@/lib/utils';

const CLASSIFICATION_SYSTEMS = [
  { key: 'danis_weber', label: 'Danis-Weber', description: 'Fibula fracture level' },
  { key: 'lauge_hansen', label: 'Lauge-Hansen', description: 'Mechanism of injury' },
  { key: 'ao_ota', label: 'AO/OTA', description: 'Comprehensive classification' },
  { key: 'bartonicek', label: 'Bartonicek', description: 'Posterior malleolus' },
];

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function CaseAnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeSystem, setActiveSystem] = useState('danis_weber');

  const { data: caseData, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getCase(id!),
    enabled: !!id,
  });

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

  const getDistributionData = useMemo(() => {
    if (!analytics) return {};
    switch (activeSystem) {
      case 'danis_weber':
        return analytics.danis_weber_distribution || {};
      case 'lauge_hansen':
        return analytics.lauge_hansen_distribution || {};
      case 'ao_ota':
        return analytics.ao_ota_distribution || {};
      case 'bartonicek':
        return analytics.bartonicek_distribution || {};
      default:
        return {};
    }
  }, [analytics, activeSystem]);

  const activeSystemInfo = useMemo(
    () => CLASSIFICATION_SYSTEMS.find(s => s.key === activeSystem),
    [activeSystem]
  );

  if (isLoadingCase || isLoadingAnalytics) {
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
            {t('common.loading', 'Loading analytics...')}
          </p>
        </div>
      </div>
    );
  }

  if (!caseData || !analytics) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="chart-card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('admin.cases.notFound', 'Case not found')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('admin.cases.notFoundDescription', 'The case you\'re looking for doesn\'t exist or has been removed.')}
          </p>
          <Button onClick={() => navigate('/admin/cases')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('admin.cases.backToList', 'Back to Cases')}
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
                {t('admin.cases.backToCases', 'Back to Cases')}
              </button>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {caseData.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-medium',
                      caseData.status === 'published' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                      caseData.status === 'closed' && 'border-amber-500/50 text-amber-600 dark:text-amber-400',
                      caseData.status === 'draft' && 'border-muted-foreground/50'
                    )}
                  >
                    {t(`cases.status.${caseData.status}`)}
                  </Badge>
                  {caseData.deadline && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(caseData.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/admin/cases/${id}/reliability`)}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Target className="w-4 h-4" />
                {t('admin.analytics.reliabilityMetrics', 'Reliability Metrics')}
              </Button>
              <Button
                onClick={handleExportCSV}
                size="lg"
                className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
              >
                <Download className="w-4 h-4" />
                {t('admin.cases.exportCSV', 'Export CSV')}
              </Button>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={t('admin.analytics.totalResponses', 'Total Responses')}
            value={analytics.response_count}
            icon={BarChart3}
            color="blue"
            delay={0}
          />
          <StatCard
            title={t('admin.analytics.uniqueRespondents', 'Unique Respondents')}
            value={analytics.unique_respondents}
            icon={Users}
            color="emerald"
            delay={50}
          />
          <StatCard
            title={t('admin.analytics.avgResponseTime', 'Avg. Response Time')}
            value={formatDuration(analytics.avg_time_taken_ms)}
            icon={Clock}
            color="amber"
            delay={100}
          />
          <StatCard
            title={t('admin.analytics.responsesPerUser', 'Responses/User')}
            value={
              analytics.unique_respondents > 0
                ? (analytics.response_count / analytics.unique_respondents).toFixed(1)
                : '0'
            }
            icon={TrendingUp}
            color="violet"
            delay={150}
          />
        </section>

        {/* Classification Distribution */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('admin.analytics.classificationDistribution', 'Classification Distribution')}
            </h2>
            <p className="text-muted-foreground mt-1">
              {t('admin.analytics.distributionDescription', 'How respondents classified this case across different systems')}
            </p>
          </div>

          {/* Classification System Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-muted/30 rounded-xl w-fit">
            {CLASSIFICATION_SYSTEMS.map((system) => (
              <button
                key={system.key}
                onClick={() => setActiveSystem(system.key)}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  activeSystem === system.key
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {system.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
            <ClassificationChart
              data={getDistributionData}
              title={t('admin.analytics.distributionTitle', '{{system}} Distribution', {
                system: activeSystemInfo?.label,
              })}
              systemLabel={activeSystemInfo?.label || ''}
            />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
