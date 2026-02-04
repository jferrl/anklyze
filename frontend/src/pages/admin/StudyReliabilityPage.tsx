import { useState } from 'react';
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
  CheckCircle2,
  Info,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatCard, KappaGauge } from '../../components/analytics';
import { studyApi } from '../../services/studyApi';
import { cn } from '@/lib/utils';
import type { CaseMetrics } from '../../types/study';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

// Helper to get color class based on agreement value (expects percentages 0-100)
function getAgreementColorClass(value: number): string {
  if (value >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 60) return 'text-green-600 dark:text-green-400';
  if (value >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function StudyReliabilityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeSystem, setActiveSystem] = useState<'danis_weber' | 'lauge_hansen' | 'ao_ota' | 'bartonicek'>('danis_weber');

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

  const handleExportCSV = async () => {
    if (id && study) {
      await studyApi.downloadStudyResponsesCSV(
        id,
        `${study.title.replace(/\s+/g, '_')}_responses.csv`
      );
    }
  };

  const getSystemLabel = (key: string) => {
    const labels: Record<string, string> = {
      danis_weber: 'Danis-Weber',
      lauge_hansen: 'Lauge-Hansen',
      ao_ota: 'AO/OTA',
      bartonicek: 'Bartonicek',
    };
    return labels[key] || key;
  };

  const getActiveKappa = () => {
    if (!reliability) return undefined;
    switch (activeSystem) {
      case 'danis_weber':
        return reliability.danis_weber_fleiss;
      case 'lauge_hansen':
        return reliability.lauge_hansen_fleiss;
      case 'ao_ota':
        return reliability.ao_ota_fleiss;
      case 'bartonicek':
        return reliability.bartonicek_fleiss;
    }
  };

  const isLoading = isLoadingStudy || isLoadingReliability;

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

  const hasGoldStandard = reliability.gold_standard_accuracy !== undefined;
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
                  {hasGoldStandard && (
                    <Badge
                      variant="outline"
                      className="border-violet-500/50 text-violet-600 dark:text-violet-400"
                    >
                      <Target className="w-3 h-3 mr-1" />
                      {t('admin.reliability.hasGoldStandard', 'Gold Standard')}
                    </Badge>
                  )}
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

        {/* Gold Standard Accuracy */}
        {hasGoldStandard && reliability.gold_standard_accuracy && (
          <section className="chart-card mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t('admin.reliability.goldStandardAccuracy', 'Gold Standard Accuracy')}
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-xl">
                <span className="text-3xl font-bold text-foreground">
                  {reliability.gold_standard_accuracy.overall_accuracy.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('admin.reliability.overallAccuracy', 'Overall')}
                </span>
              </div>

              {reliability.gold_standard_accuracy.danis_weber_accuracy !== undefined && (
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
                  <span className="text-2xl font-bold text-foreground">
                    {reliability.gold_standard_accuracy.danis_weber_accuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">Danis-Weber</span>
                </div>
              )}

              {reliability.gold_standard_accuracy.lauge_hansen_accuracy !== undefined && (
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
                  <span className="text-2xl font-bold text-foreground">
                    {reliability.gold_standard_accuracy.lauge_hansen_accuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">Lauge-Hansen</span>
                </div>
              )}

              {reliability.gold_standard_accuracy.ao_ota_accuracy !== undefined && (
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
                  <span className="text-2xl font-bold text-foreground">
                    {reliability.gold_standard_accuracy.ao_ota_accuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">AO/OTA</span>
                </div>
              )}

              {reliability.gold_standard_accuracy.bartonicek_accuracy !== undefined && (
                <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
                  <span className="text-2xl font-bold text-foreground">
                    {reliability.gold_standard_accuracy.bartonicek_accuracy.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">Bartonicek</span>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              {reliability.gold_standard_accuracy.cases_with_reference} {t('admin.studies.reliability.casesWithReference', 'cases with reference')} •{' '}
              {reliability.gold_standard_accuracy.total_comparisons} {t('admin.studies.reliability.totalComparisons', 'total comparisons')}
            </div>
          </section>
        )}

        {/* Fleiss' Kappa Scores */}
        <section className="chart-card mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('admin.studies.reliability.fleissKappa', "Fleiss' Kappa (Inter-Rater Reliability)")}
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground/60" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>{t('admin.studies.reliability.fleissKappaDescription', "Fleiss' Kappa measures agreement among multiple raters across multiple cases. Requires 3+ raters who completed all cases.")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <KappaGauge
              value={reliability.danis_weber_fleiss?.kappa}
              label="Danis-Weber"
              description={reliability.danis_weber_fleiss
                ? `${reliability.danis_weber_fleiss.num_raters} raters, ${reliability.danis_weber_fleiss.num_subjects} cases`
                : t('admin.studies.reliability.notEnoughData', 'Not enough data')}
              size="md"
            />
            <KappaGauge
              value={reliability.lauge_hansen_fleiss?.kappa}
              label="Lauge-Hansen"
              description={reliability.lauge_hansen_fleiss
                ? `${reliability.lauge_hansen_fleiss.num_raters} raters, ${reliability.lauge_hansen_fleiss.num_subjects} cases`
                : t('admin.studies.reliability.notEnoughData', 'Not enough data')}
              size="md"
            />
            <KappaGauge
              value={reliability.ao_ota_fleiss?.kappa}
              label="AO/OTA"
              description={reliability.ao_ota_fleiss
                ? `${reliability.ao_ota_fleiss.num_raters} raters, ${reliability.ao_ota_fleiss.num_subjects} cases`
                : t('admin.studies.reliability.notEnoughData', 'Not enough data')}
              size="md"
            />
            <KappaGauge
              value={reliability.bartonicek_fleiss?.kappa}
              label="Bartonicek"
              description={reliability.bartonicek_fleiss
                ? `${reliability.bartonicek_fleiss.num_raters} raters, ${reliability.bartonicek_fleiss.num_subjects} cases`
                : t('admin.studies.reliability.notEnoughData', 'Not enough data')}
              size="md"
            />
          </div>

          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">
              {t('admin.reliability.kappaInterpretation', 'Kappa Interpretation')}
            </h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {'< 0: Poor'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                {'0-0.2: Slight'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                {'0.21-0.4: Fair'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {'0.41-0.6: Moderate'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {'0.61-0.8: Substantial'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {'0.81-1.0: Almost Perfect'}
              </span>
            </div>
          </div>
        </section>

        {/* Per-Case Agreement */}
        <section className="chart-card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {t('admin.studies.reliability.perCaseAgreement', 'Per-Case Agreement')}
              </h2>
            </div>

            {/* System Tabs */}
            <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
              {(['danis_weber', 'lauge_hansen', 'ao_ota', 'bartonicek'] as const).map((system) => (
                <button
                  key={system}
                  onClick={() => setActiveSystem(system)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    activeSystem === system
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {getSystemLabel(system)}
                </button>
              ))}
            </div>
          </div>

          {reliability.per_case_metrics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {t('admin.studies.reliability.noCaseMetrics', 'No case metrics available')}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Card layout */}
              <div className="md:hidden space-y-3">
                {reliability.per_case_metrics
                  .sort((a, b) => a.case_order - b.case_order)
                  .map((caseMetrics) => (
                    <CaseMetricCard
                      key={caseMetrics.case_id}
                      metrics={caseMetrics}
                      activeSystem={activeSystem}
                      getAgreementColorClass={getAgreementColorClass}
                    />
                  ))}
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">#</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Case</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Responses</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Danis-Weber</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Lauge-Hansen</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">AO/OTA</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Bartonicek</th>
                      {hasGoldStandard && (
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Gold Match</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reliability.per_case_metrics
                      .sort((a, b) => a.case_order - b.case_order)
                      .map((caseMetrics) => (
                        <tr
                          key={caseMetrics.case_id}
                          className={cn(
                            'border-b border-border/30 hover:bg-muted/20',
                            caseMetrics.is_low_agreement && 'bg-amber-500/5'
                          )}
                        >
                          <td className="py-3 px-4 font-medium text-primary">
                            {caseMetrics.case_order}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate max-w-[200px]">
                                {caseMetrics.case_title}
                              </span>
                              {caseMetrics.is_low_agreement && (
                                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center text-muted-foreground">
                            {caseMetrics.response_count}
                          </td>
                          <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.danis_weber_agreement))}>
                            {caseMetrics.danis_weber_agreement.toFixed(0)}%
                          </td>
                          <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.lauge_hansen_agreement))}>
                            {caseMetrics.lauge_hansen_agreement.toFixed(0)}%
                          </td>
                          <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.ao_ota_agreement))}>
                            {caseMetrics.ao_ota_agreement.toFixed(0)}%
                          </td>
                          <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.bartonicek_agreement ?? 0))}>
                            {caseMetrics.bartonicek_agreement !== undefined
                              ? `${caseMetrics.bartonicek_agreement.toFixed(0)}%`
                              : '-'}
                          </td>
                          {hasGoldStandard && (
                            <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.gold_standard_match_rate ?? 0))}>
                              {caseMetrics.gold_standard_match_rate !== undefined
                                ? `${caseMetrics.gold_standard_match_rate.toFixed(0)}%`
                                : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {t('admin.studies.reliability.agreementNote', 'Agreement percentage shows how often raters selected the same classification for each case. Cases with low agreement (< 60%) are highlighted.')}
                </p>
              </div>
            </>
          )}
        </section>

        {/* Detailed Kappa Analysis for Active System */}
        {getActiveKappa() && (
          <section className="chart-card">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                {getSystemLabel(activeSystem)} {t('admin.reliability.detailedAnalysis', 'Detailed Analysis')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Fleiss' Kappa</p>
                <p className="text-2xl font-bold text-foreground">
                  {getActiveKappa()!.kappa.toFixed(3)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getActiveKappa()!.interpretation}
                </p>
              </div>

              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Cases (Subjects)</p>
                <p className="text-2xl font-bold text-foreground">
                  {getActiveKappa()!.num_subjects}
                </p>
              </div>

              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Raters</p>
                <p className="text-2xl font-bold text-foreground">
                  {getActiveKappa()!.num_raters}
                </p>
              </div>

              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Categories</p>
                <p className="text-2xl font-bold text-foreground">
                  {getActiveKappa()!.num_categories}
                </p>
              </div>
            </div>

            {getActiveKappa()!.confidence_interval && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-foreground">
                  <span className="font-medium">95% Confidence Interval:</span>{' '}
                  [{getActiveKappa()!.confidence_interval!.lower.toFixed(3)}, {getActiveKappa()!.confidence_interval!.upper.toFixed(3)}]
                </p>
              </div>
            )}

            {(getActiveKappa()!.requires_multiple_cases || getActiveKappa()!.note) && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {t('admin.reliability.fleissKappa')}
                    </span>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                      {t('admin.reliability.fleissKappaNote')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function CaseMetricCard({
  metrics,
  activeSystem,
  getAgreementColorClass,
}: {
  metrics: CaseMetrics;
  activeSystem: 'danis_weber' | 'lauge_hansen' | 'ao_ota' | 'bartonicek';
  getAgreementColorClass: (value: number) => string;
}) {
  const getAgreementValue = () => {
    switch (activeSystem) {
      case 'danis_weber':
        return metrics.danis_weber_agreement;
      case 'lauge_hansen':
        return metrics.lauge_hansen_agreement;
      case 'ao_ota':
        return metrics.ao_ota_agreement;
      case 'bartonicek':
        return metrics.bartonicek_agreement ?? 0;
    }
  };

  const agreement = getAgreementValue();

  return (
    <div
      className={cn(
        'p-4 rounded-lg',
        metrics.is_low_agreement ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/20'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {metrics.case_order}
          </span>
          <span className="font-medium text-foreground truncate">{metrics.case_title}</span>
        </div>
        {metrics.is_low_agreement && (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{metrics.response_count} responses</span>
        <span className={cn('text-lg font-bold', getAgreementColorClass(agreement))}>
          {agreement.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
