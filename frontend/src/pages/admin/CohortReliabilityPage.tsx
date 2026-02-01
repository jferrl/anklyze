import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Users,
  BarChart3,
  Loader2,
  FolderKanban,
  ArrowLeft,
  Target,
  CheckCircle,
  Percent,
  Info,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatCard, KappaGauge } from '../../components/analytics';
import { studyApi, downloadCohortResponsesCSV } from '../../services/studyApi';
import { cn } from '@/lib/utils';
import type { FleissKappaResult, CaseMetrics } from '../../types/study';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { Progress } from '../../components/ui/progress';

const CLASSIFICATION_SYSTEMS = ['danis_weber', 'lauge_hansen', 'ao_ota', 'bartonicek'] as const;

export function CohortReliabilityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeSystem, setActiveSystem] = useState('danis_weber');

  const { data: cohort, isLoading: isLoadingCohort } = useQuery({
    queryKey: ['cohort', id],
    queryFn: () => studyApi.getCohort(id!),
    enabled: !!id,
  });

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['cohort-reliability', id],
    queryFn: () => studyApi.getCohortReliabilityMetrics(id!),
    enabled: !!id,
  });

  const handleExportCSV = async () => {
    if (id && cohort) {
      await downloadCohortResponsesCSV(
        id,
        `${cohort.title.replace(/\s+/g, '_')}_responses.csv`
      );
    }
  };

  const getFleissKappa = useMemo((): FleissKappaResult | undefined => {
    if (!metrics) return undefined;
    switch (activeSystem) {
      case 'danis_weber':
        return metrics.danis_weber_fleiss;
      case 'lauge_hansen':
        return metrics.lauge_hansen_fleiss;
      case 'ao_ota':
        return metrics.ao_ota_fleiss;
      case 'bartonicek':
        return metrics.bartonicek_fleiss;
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

  const getKappaColor = (kappa: number): string => {
    if (kappa < 0) return 'text-red-600 dark:text-red-400';
    if (kappa <= 0.2) return 'text-orange-600 dark:text-orange-400';
    if (kappa <= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    if (kappa <= 0.6) return 'text-blue-600 dark:text-blue-400';
    if (kappa <= 0.8) return 'text-green-600 dark:text-green-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  // Translate kappa interpretation from backend (snake_case) to localized string
  const getKappaInterpretation = (interpretation?: string): string => {
    if (!interpretation) return '';
    const keyMap: Record<string, string> = {
      poor: 'kappaPoor',
      slight: 'kappaSlight',
      fair: 'kappaFair',
      moderate: 'kappaModerate',
      substantial: 'kappaSubstantial',
      almost_perfect: 'kappaAlmostPerfect',
    };
    const key = keyMap[interpretation];
    return key ? t(`admin.reliability.${key}`) : interpretation;
  };

  if (isLoadingCohort || isLoadingMetrics) {
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

  if (!cohort || !metrics) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="chart-card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Cohort not found
          </h2>
          <p className="text-muted-foreground mb-6">
            The cohort you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/admin/cohorts')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Cohorts
          </Button>
        </div>
      </div>
    );
  }

  const hasGoldStandard = metrics.gold_standard_accuracy !== undefined;
  const hardCases = metrics.per_case_metrics?.filter((c) => c.is_low_agreement) ?? [];

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/cohorts')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Cohorts
              </button>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {t('admin.cohorts.reliability.title')}
                </h1>
                <p className="text-muted-foreground mt-1">{cohort.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-medium',
                      cohort.status === 'active' &&
                        'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                      cohort.status === 'closed' &&
                        'border-amber-500/50 text-amber-600 dark:text-amber-400',
                      cohort.status === 'draft' && 'border-muted-foreground/50'
                    )}
                  >
                    {t(`admin.cohorts.status.${cohort.status}`)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <FileText className="w-3 h-3" />
                    {metrics.total_cases} cases
                  </Badge>
                  {hasGoldStandard && (
                    <Badge
                      variant="outline"
                      className="border-violet-500/50 text-violet-600 dark:text-violet-400"
                    >
                      <Target className="w-3 h-3 mr-1" />
                      Gold Standard Set
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleExportCSV}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </header>

        {/* Overview Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Cases"
            value={metrics.total_cases}
            icon={FileText}
            color="blue"
            delay={0}
          />
          <StatCard
            title="Total Responses"
            value={metrics.total_responses}
            icon={BarChart3}
            color="violet"
            delay={50}
          />
          <StatCard
            title="Unique Raters"
            value={metrics.unique_raters}
            icon={Users}
            color="amber"
            delay={100}
          />
          <StatCard
            title={t('admin.cohorts.completeRaters')}
            value={metrics.complete_raters}
            icon={CheckCircle}
            color="emerald"
            delay={150}
          />
        </section>

        {/* Fleiss' Kappa Scores */}
        <section className="chart-card mb-8">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('admin.cohorts.reliability.fleissKappa')}
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground/60" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>{t('admin.cohorts.reliability.fleissKappaDesc')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <KappaGauge
              value={metrics.danis_weber_fleiss?.kappa}
              label={t('admin.reliability.systems.danisWeber')}
              description={getKappaInterpretation(metrics.danis_weber_fleiss?.interpretation)}
              size="md"
            />
            <KappaGauge
              value={metrics.lauge_hansen_fleiss?.kappa}
              label={t('admin.reliability.systems.laugeHansen')}
              description={getKappaInterpretation(metrics.lauge_hansen_fleiss?.interpretation)}
              size="md"
            />
            <KappaGauge
              value={metrics.ao_ota_fleiss?.kappa}
              label={t('admin.reliability.systems.aoOta')}
              description={getKappaInterpretation(metrics.ao_ota_fleiss?.interpretation)}
              size="md"
            />
            <KappaGauge
              value={metrics.bartonicek_fleiss?.kappa}
              label={t('admin.reliability.systems.bartonicek')}
              description={getKappaInterpretation(metrics.bartonicek_fleiss?.interpretation)}
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

        {/* Gold Standard Accuracy */}
        {hasGoldStandard && metrics.gold_standard_accuracy && (
          <section className="chart-card mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {t('admin.cohorts.reliability.goldStandard')}
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

            <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                {t('admin.cohorts.reliability.casesWithReference')}: {metrics.gold_standard_accuracy.cases_with_reference} / {metrics.total_cases}
              </p>
            </div>
          </section>
        )}

        {/* Hard Cases (Low Agreement) */}
        {hardCases.length > 0 && (
          <section className="chart-card mb-8">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl font-semibold text-foreground">
                {t('admin.cohorts.reliability.hardCases')}
              </h2>
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                {hardCases.length} cases
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('admin.cohorts.reliability.hardCasesDesc')}
            </p>

            <div className="space-y-2">
              {hardCases.map((caseMetric) => (
                <HardCaseItem
                  key={caseMetric.study_id}
                  caseMetric={caseMetric}
                  onView={() => navigate(`/studies/${caseMetric.study_id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Per-Case Agreement */}
        <section className="chart-card">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {t('admin.cohorts.reliability.perCaseMetrics')}
          </h2>

          {/* System Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-muted/30 rounded-xl w-fit">
            {CLASSIFICATION_SYSTEMS.map((key) => (
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

          {/* Fleiss' Kappa Detail for Selected System */}
          {getFleissKappa && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{getSystemLabel(activeSystem)} Fleiss' Kappa</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getFleissKappa.num_raters} raters × {getFleissKappa.num_subjects} cases × {getFleissKappa.num_categories} categories
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn('text-3xl font-bold', getKappaColor(getFleissKappa.kappa))}>
                    {getFleissKappa.kappa.toFixed(3)}
                  </p>
                  <p className="text-sm text-muted-foreground">{getKappaInterpretation(getFleissKappa.interpretation)}</p>
                </div>
              </div>
              {getFleissKappa.confidence_interval && (
                <p className="text-xs text-muted-foreground mt-2">
                  {getFleissKappa.confidence_interval.level * 100}% CI: [{getFleissKappa.confidence_interval.lower.toFixed(3)}, {getFleissKappa.confidence_interval.upper.toFixed(3)}]
                </p>
              )}
              {getFleissKappa.note && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{getFleissKappa.note}</p>
              )}
            </div>
          )}

          {/* Per-Case Table */}
          {metrics.per_case_metrics && metrics.per_case_metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Case</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Responses</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      {getSystemLabel(activeSystem)} Agreement
                    </th>
                    {hasGoldStandard && (
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Gold Match</th>
                    )}
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.per_case_metrics
                    .sort((a, b) => a.case_order - b.case_order)
                    .map((caseMetric) => {
                      const agreement = activeSystem === 'danis_weber' ? caseMetric.danis_weber_agreement :
                                       activeSystem === 'lauge_hansen' ? caseMetric.lauge_hansen_agreement :
                                       activeSystem === 'ao_ota' ? caseMetric.ao_ota_agreement :
                                       caseMetric.bartonicek_agreement ?? 0;
                      return (
                        <tr
                          key={caseMetric.study_id}
                          className={cn(
                            'border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors',
                            caseMetric.is_low_agreement && 'bg-amber-500/5'
                          )}
                          onClick={() => navigate(`/studies/${caseMetric.study_id}`)}
                        >
                          <td className="py-3 px-4 font-medium text-muted-foreground">
                            {caseMetric.case_order + 1}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground">{caseMetric.study_title}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline">{caseMetric.response_count}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Progress
                                value={agreement}
                                className={cn(
                                  'h-2 w-24',
                                  agreement < 60 && '[&>div]:bg-amber-500'
                                )}
                              />
                              <span className={cn(
                                'text-sm font-medium',
                                agreement >= 80 && 'text-emerald-600 dark:text-emerald-400',
                                agreement >= 60 && agreement < 80 && 'text-green-600 dark:text-green-400',
                                agreement < 60 && 'text-amber-600 dark:text-amber-400'
                              )}>
                                {agreement.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          {hasGoldStandard && (
                            <td className="py-3 px-4 text-center">
                              {caseMetric.gold_standard_match_rate !== undefined ? (
                                <span className={cn(
                                  'font-medium',
                                  caseMetric.gold_standard_match_rate >= 80 && 'text-emerald-600 dark:text-emerald-400',
                                  caseMetric.gold_standard_match_rate < 80 && caseMetric.gold_standard_match_rate >= 50 && 'text-yellow-600 dark:text-yellow-400',
                                  caseMetric.gold_standard_match_rate < 50 && 'text-red-600 dark:text-red-400'
                                )}>
                                  {caseMetric.gold_standard_match_rate.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 text-center">
                            {caseMetric.is_low_agreement ? (
                              <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Low
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                                Good
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No case metrics available</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface HardCaseItemProps {
  caseMetric: CaseMetrics;
  onView: () => void;
}

function HardCaseItem({ caseMetric, onView }: HardCaseItemProps) {
  const minAgreement = Math.min(
    caseMetric.danis_weber_agreement,
    caseMetric.lauge_hansen_agreement,
    caseMetric.ao_ota_agreement,
    caseMetric.bartonicek_agreement ?? 100
  );

  return (
    <button
      onClick={onView}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
        {caseMetric.case_order + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{caseMetric.study_title}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {caseMetric.response_count} responses · Lowest agreement: {minAgreement.toFixed(0)}%
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">View Case</p>
      </div>
    </button>
  );
}
