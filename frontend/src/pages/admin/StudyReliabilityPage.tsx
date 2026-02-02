import { useState, useMemo } from 'react';
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
  Target,
  CheckCircle,
  XCircle,
  Percent,
  Info,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatCard, KappaGauge, ConfusionMatrix } from '../../components/analytics';
import { studyApi, downloadDetailedResponsesCSV } from '../../services/studyApi';
import { cn } from '@/lib/utils';
import type { SystemAgreement, ConfidenceInterval } from '../../types/study';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

const CLASSIFICATION_SYSTEM_KEYS = ['danis_weber', 'lauge_hansen', 'ao_ota', 'bartonicek'] as const;

// Helper to format Kappa value with confidence interval
function formatKappaWithCI(kappa: number | undefined, ci?: ConfidenceInterval): string {
  if (kappa === undefined) return '-';
  const kappaStr = kappa.toFixed(3);
  if (ci) {
    return `${kappaStr} [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`;
  }
  return kappaStr;
}

// Helper to get color class based on metric value (0-1 scale)
function getMetricColorClass(value: number): string {
  if (value >= 0.9) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 0.7) return 'text-green-600 dark:text-green-400';
  if (value >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function StudyReliabilityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeSystem, setActiveSystem] = useState('danis_weber');

  const { data: study, isLoading: isLoadingStudy } = useQuery({
    queryKey: ['study', id],
    queryFn: () => studyApi.getStudy(id!),
    enabled: !!id,
  });

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['study-reliability', id],
    queryFn: () => studyApi.getReliabilityMetrics(id!),
    enabled: !!id,
  });

  const handleExportCSV = async () => {
    if (id && study) {
      await downloadDetailedResponsesCSV(
        id,
        `${study.title.replace(/\s+/g, '_')}_detailed_responses.csv`
      );
    }
  };

  const getSystemAgreement = useMemo((): SystemAgreement | undefined => {
    if (!metrics) return undefined;
    switch (activeSystem) {
      case 'danis_weber':
        return metrics.danis_weber_agreement;
      case 'lauge_hansen':
        return metrics.lauge_hansen_agreement;
      case 'ao_ota':
        return metrics.ao_ota_agreement;
      case 'bartonicek':
        return metrics.bartonicek_agreement;
      default:
        return undefined;
    }
  }, [metrics, activeSystem]);

  const getSystemLabel = (key: string) => {
    const keyMap: Record<string, string> = {
      danis_weber: 'danisWeber',
      lauge_hansen: 'laugeHansen',
      ao_ota: 'aoOta',
      bartonicek: 'bartonicek',
    };
    return t(`admin.reliability.systems.${keyMap[key]}`);
  };

  if (isLoadingStudy || isLoadingMetrics) {
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

  if (!study || !metrics) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="chart-card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('admin.studies.notFound')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('admin.studies.notFoundDescription')}
          </p>
          <Button onClick={() => navigate('/admin/studies')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('admin.studies.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  const hasGoldStandard = metrics.gold_standard_accuracy !== undefined;

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/studies')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('admin.studies.backToList')}
              </button>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {t('admin.reliability.title')}
                </h1>
                <p className="text-muted-foreground mt-1">{study.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-medium',
                      study.status === 'published' &&
                        'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                      study.status === 'closed' &&
                        'border-amber-500/50 text-amber-600 dark:text-amber-400',
                      study.status === 'draft' && 'border-muted-foreground/50'
                    )}
                  >
                    {t(`studies.status.${study.status}`)}
                  </Badge>
                  {hasGoldStandard && (
                    <Badge
                      variant="outline"
                      className="border-violet-500/50 text-violet-600 dark:text-violet-400"
                    >
                      <Target className="w-3 h-3 mr-1" />
                      {t('admin.reliability.hasGoldStandard')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {hasGoldStandard && (
                <Button
                  onClick={() => navigate(`/admin/studies/${id}/divergence`)}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  {t('admin.reliability.viewDivergence', 'Divergence Analysis')}
                </Button>
              )}
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
          {hasGoldStandard && metrics.gold_standard_accuracy && (
            <>
              <StatCard
                title={t('admin.reliability.correctResponses')}
                value={metrics.gold_standard_accuracy.correct_responses}
                icon={CheckCircle}
                color="emerald"
                delay={100}
              />
              <StatCard
                title={t('admin.reliability.incorrectResponses')}
                value={metrics.gold_standard_accuracy.incorrect_responses}
                icon={XCircle}
                color="rose"
                delay={150}
              />
            </>
          )}
        </section>

        {/* Gold Standard Accuracy */}
        {hasGoldStandard && metrics.gold_standard_accuracy && (
          <section className="chart-card mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {t('admin.reliability.goldStandardAccuracy')}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-xl">
                <Percent className="w-8 h-8 text-primary mb-2" />
                <span className="text-3xl font-bold text-foreground">
                  {metrics.gold_standard_accuracy.overall_accuracy.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('admin.reliability.overallAccuracy')}
                </span>
              </div>

              {metrics.gold_standard_accuracy.danis_weber_accuracy !== undefined && (
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
                  <span className="text-2xl font-bold text-foreground">
                    {metrics.gold_standard_accuracy.danis_weber_accuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">{t('admin.reliability.systems.danisWeber')}</span>
                </div>
              )}

              {metrics.gold_standard_accuracy.lauge_hansen_accuracy !== undefined && (
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
                  <span className="text-2xl font-bold text-foreground">
                    {metrics.gold_standard_accuracy.lauge_hansen_accuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">{t('admin.reliability.systems.laugeHansen')}</span>
                </div>
              )}

              {metrics.gold_standard_accuracy.ao_ota_accuracy !== undefined && (
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
                  <span className="text-2xl font-bold text-foreground">
                    {metrics.gold_standard_accuracy.ao_ota_accuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">{t('admin.reliability.systems.aoOta')}</span>
                </div>
              )}

              {metrics.gold_standard_accuracy.bartonicek_accuracy !== undefined && (
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
                  <span className="text-2xl font-bold text-foreground">
                    {metrics.gold_standard_accuracy.bartonicek_accuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">{t('admin.reliability.systems.bartonicek')}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Per-Category Diagnostic Metrics */}
        {hasGoldStandard && metrics.gold_standard_accuracy?.per_category_metrics &&
          Object.keys(metrics.gold_standard_accuracy.per_category_metrics).length > 0 && (
          <section className="chart-card mb-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t('admin.reliability.diagnosticMetrics')}
              </h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>{t('admin.reliability.diagnosticMetricsDescription')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Mobile: Card layout */}
            <div className="md:hidden space-y-3">
              {Object.entries(metrics.gold_standard_accuracy.per_category_metrics)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, categoryMetrics]) => (
                  <div key={category} className="p-4 bg-muted/20 rounded-lg space-y-2">
                    <div className="font-medium text-foreground">{category}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('admin.reliability.sensitivity')}</span>
                        <span className={cn('font-semibold', getMetricColorClass(categoryMetrics.sensitivity))}>
                          {(categoryMetrics.sensitivity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('admin.reliability.specificity')}</span>
                        <span className={cn('font-semibold', getMetricColorClass(categoryMetrics.specificity))}>
                          {(categoryMetrics.specificity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('admin.reliability.f1Score')}</span>
                        <span className={cn('font-semibold', getMetricColorClass(categoryMetrics.f1_score))}>
                          {(categoryMetrics.f1_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('admin.reliability.ppv')}</span>
                        <span className={cn('font-semibold', getMetricColorClass(categoryMetrics.ppv))}>
                          {(categoryMetrics.ppv * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('admin.reliability.category')}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center justify-center gap-1">
                            {t('admin.reliability.sensitivity')}
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('admin.reliability.sensitivityDescription')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center justify-center gap-1">
                            {t('admin.reliability.specificity')}
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('admin.reliability.specificityDescription')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center justify-center gap-1">
                            {t('admin.reliability.ppv')}
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('admin.reliability.ppvDescription')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center justify-center gap-1">
                            {t('admin.reliability.npv')}
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('admin.reliability.npvDescription')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center justify-center gap-1">
                            {t('admin.reliability.f1Score')}
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('admin.reliability.f1ScoreDescription')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metrics.gold_standard_accuracy.per_category_metrics)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, categoryMetrics]) => (
                      <tr key={category} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-3 px-4 font-medium text-foreground">{category}</td>
                        <td className={cn('py-3 px-4 text-center font-semibold', getMetricColorClass(categoryMetrics.sensitivity))}>
                          {(categoryMetrics.sensitivity * 100).toFixed(1)}%
                        </td>
                        <td className={cn('py-3 px-4 text-center font-semibold', getMetricColorClass(categoryMetrics.specificity))}>
                          {(categoryMetrics.specificity * 100).toFixed(1)}%
                        </td>
                        <td className={cn('py-3 px-4 text-center font-semibold', getMetricColorClass(categoryMetrics.ppv))}>
                          {(categoryMetrics.ppv * 100).toFixed(1)}%
                        </td>
                        <td className={cn('py-3 px-4 text-center font-semibold hidden lg:table-cell', getMetricColorClass(categoryMetrics.npv))}>
                          {(categoryMetrics.npv * 100).toFixed(1)}%
                        </td>
                        <td className={cn('py-3 px-4 text-center font-semibold', getMetricColorClass(categoryMetrics.f1_score))}>
                          {(categoryMetrics.f1_score * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                {t('admin.reliability.diagnosticMetricsNote')}
              </p>
            </div>
          </section>
        )}

        {/* Kappa Scores Overview */}
        <section className="chart-card mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {t('admin.reliability.kappaScores')}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <KappaGauge
              value={metrics.danis_weber_agreement?.fleiss_kappa ?? metrics.danis_weber_agreement?.cohens_kappa}
              label={t('admin.reliability.systems.danisWeber')}
              description={`${(metrics.danis_weber_agreement?.percent_agreement ?? 0).toFixed(1)}% ${t('admin.reliability.agreement')}`}
              size="md"
            />
            <KappaGauge
              value={metrics.lauge_hansen_agreement?.fleiss_kappa ?? metrics.lauge_hansen_agreement?.cohens_kappa}
              label={t('admin.reliability.systems.laugeHansen')}
              description={`${(metrics.lauge_hansen_agreement?.percent_agreement ?? 0).toFixed(1)}% ${t('admin.reliability.agreement')}`}
              size="md"
            />
            <KappaGauge
              value={metrics.ao_ota_agreement?.fleiss_kappa ?? metrics.ao_ota_agreement?.cohens_kappa}
              label={t('admin.reliability.systems.aoOta')}
              description={`${(metrics.ao_ota_agreement?.percent_agreement ?? 0).toFixed(1)}% ${t('admin.reliability.agreement')}`}
              size="md"
            />
            <KappaGauge
              value={metrics.bartonicek_agreement?.fleiss_kappa ?? metrics.bartonicek_agreement?.cohens_kappa}
              label={t('admin.reliability.systems.bartonicek')}
              description={`${(metrics.bartonicek_agreement?.percent_agreement ?? 0).toFixed(1)}% ${t('admin.reliability.agreement')}`}
              size="md"
            />
          </div>

          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">
              {t('admin.reliability.kappaInterpretation')}
            </h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {`< 0: ${t('admin.reliability.kappaPoor')}`}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                {`0-0.2: ${t('admin.reliability.kappaSlight')}`}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                {`0.21-0.4: ${t('admin.reliability.kappaFair')}`}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {`0.41-0.6: ${t('admin.reliability.kappaModerate')}`}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {`0.61-0.8: ${t('admin.reliability.kappaSubstantial')}`}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {`0.81-1.0: ${t('admin.reliability.kappaAlmostPerfect')}`}
              </span>
            </div>
          </div>
        </section>

        {/* Detailed System Analysis */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('admin.reliability.detailedAnalysis')}
            </h2>
            <p className="text-muted-foreground mt-1">
              {t('admin.reliability.detailedDescription')}
            </p>
          </div>

          {/* Classification System Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-muted/30 rounded-xl w-fit">
            {CLASSIFICATION_SYSTEM_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setActiveSystem(key)}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  activeSystem === key
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {getSystemLabel(key)}
              </button>
            ))}
          </div>

          {/* System Details */}
          {getSystemAgreement ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Metrics */}
              <div className="chart-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {getSystemLabel(activeSystem)} {t('admin.reliability.metrics')}
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      {t('admin.reliability.percentAgreement')}
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                      {getSystemAgreement.percent_agreement.toFixed(1)}%
                    </span>
                  </div>

                  {getSystemAgreement.cohens_kappa !== undefined && (
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t('admin.reliability.cohensKappa')} ({t('admin.reliability.raters2')})
                        </span>
                        {getSystemAgreement.cohens_kappa_ci && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('admin.reliability.confidenceInterval', { level: (getSystemAgreement.cohens_kappa_ci.level * 100).toFixed(0) })}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-lg font-semibold text-foreground">
                        {formatKappaWithCI(getSystemAgreement.cohens_kappa, getSystemAgreement.cohens_kappa_ci)}
                      </span>
                    </div>
                  )}

                  {getSystemAgreement.weighted_kappa !== undefined && (
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t('admin.reliability.weightedKappa')}
                          {getSystemAgreement.weighted_kappa_type && (
                            <span className="text-xs ml-1">({getSystemAgreement.weighted_kappa_type})</span>
                          )}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('admin.reliability.weightedKappaDescription')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="text-lg font-semibold text-foreground">
                        {getSystemAgreement.weighted_kappa.toFixed(3)}
                      </span>
                    </div>
                  )}

                  {getSystemAgreement.fleiss_kappa !== undefined && (
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">
                        {t('admin.reliability.fleissKappa')} ({t('admin.reliability.ratersMulti')})
                      </span>
                      <span className="text-lg font-semibold text-foreground">
                        {getSystemAgreement.fleiss_kappa.toFixed(3)}
                      </span>
                    </div>
                  )}

                  {getSystemAgreement.fleiss_kappa === undefined && getSystemAgreement.fleiss_kappa_note && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                            {t('admin.reliability.fleissKappa')}
                          </span>
                          <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                            {getSystemAgreement.fleiss_kappa_note}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Counts */}
                  <div className="pt-4 border-t border-border/50">
                    <h4 className="text-sm font-medium text-foreground mb-3">
                      {t('admin.reliability.categoryCounts')}
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(getSystemAgreement.category_counts || {})
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, count]) => {
                          const total = Object.values(
                            getSystemAgreement.category_counts || {}
                          ).reduce((sum, c) => sum + c, 0);
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={category} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{category}</span>
                                <span className="font-medium">
                                  {count} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="chart-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {t('admin.reliability.confusionMatrix')}
                </h3>
                <ConfusionMatrix
                  matrix={getSystemAgreement.confusion_matrix}
                  title={getSystemLabel(activeSystem)}
                />
              </div>
            </div>
          ) : (
            <div className="chart-card text-center py-12">
              <p className="text-muted-foreground">
                {t('admin.reliability.noDataForSystem')}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
