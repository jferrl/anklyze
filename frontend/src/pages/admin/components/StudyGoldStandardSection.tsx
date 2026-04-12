import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, AlertTriangle, Users, FileText, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { StudyGoldStandardResponse } from '@/types';
import { getAgreementColorClass } from './CaseMetricCard';
import type { ClassificationSystem } from './CaseMetricCard';

interface StudyGoldStandardSectionProps {
  metrics: StudyGoldStandardResponse;
}

const SYSTEMS: ClassificationSystem[] = ['danis_weber', 'lauge_hansen', 'ao_ota', 'bartonicek'];

function getSystemLabel(key: string): string {
  const labels: Record<string, string> = {
    danis_weber: 'Danis-Weber',
    lauge_hansen: 'Lauge-Hansen',
    ao_ota: 'AO/OTA',
    bartonicek: 'Bartonicek',
  };
  return labels[key] || key;
}

function getAccuracyForSystem(
  metrics: StudyGoldStandardResponse,
  system: ClassificationSystem
) {
  switch (system) {
    case 'danis_weber':
      return metrics.danis_weber_accuracy;
    case 'lauge_hansen':
      return metrics.lauge_hansen_accuracy;
    case 'ao_ota':
      return metrics.ao_ota_accuracy;
    case 'bartonicek':
      return metrics.bartonicek_accuracy;
  }
}

export function StudyGoldStandardSection({ metrics }: StudyGoldStandardSectionProps) {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<ClassificationSystem>('danis_weber');

  if (metrics.cases_with_gold === 0) {
    return (
      <section className="chart-card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            {t('admin.studies.goldStandard.title', 'Gold Standard Accuracy')}
          </h2>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">
            {t('admin.studies.goldStandard.noCasesWithGold', 'No cases in this study have a gold standard set. Set gold standard classifications on individual cases to see accuracy metrics.')}
          </p>
        </div>
      </section>
    );
  }

  const sortedCases = [...metrics.per_case_accuracy].sort(
    (a, b) => a.case_order - b.case_order
  );
  const hardCases = sortedCases.filter((c) => c.is_hard_case);

  return (
    <>
      {/* Aggregate Accuracy per System */}
      <section className="chart-card mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            {t('admin.studies.goldStandard.title', 'Gold Standard Accuracy')}
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t('admin.studies.goldStandard.description', 'Measures how often raters match the expert reference classification. Higher accuracy means raters agree with the gold standard.')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t('admin.studies.goldStandard.casesWithGold', '{{count}} of {{total}} cases have gold standard', {
            count: metrics.cases_with_gold,
            total: metrics.total_cases,
          })}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SYSTEMS.map((system) => {
            const agg = getAccuracyForSystem(metrics, system);
            return (
              <div key={system} className="p-4 bg-muted/30 rounded-xl text-center">
                <p className="text-sm text-muted-foreground mb-2">{getSystemLabel(system)}</p>
                {agg ? (
                  <>
                    <p className={cn('text-3xl font-bold', getAgreementColorClass(agg.mean_accuracy))}>
                      {agg.mean_accuracy.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('admin.studies.goldStandard.casesEvaluated', '{{count}} cases', { count: agg.cases_evaluated })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground">
                        {t('admin.studies.goldStandard.consensusRate', 'Consensus: {{rate}}%', {
                          rate: agg.consensus_rate.toFixed(0),
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agg.consensus_correct}/{agg.consensus_total} {t('admin.studies.goldStandard.casesCorrect', 'correct')}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-lg text-muted-foreground/50">-</p>
                )}
              </div>
            );
          })}
        </div>

        {hardCases.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('admin.studies.goldStandard.hardCasesWarning', '{{count}} hard case(s) detected (accuracy < 50% in at least one system)', {
                count: hardCases.length,
              })}
            </p>
          </div>
        )}
      </section>

      {/* Per-Case Accuracy Table */}
      <section className="chart-card mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('admin.studies.goldStandard.perCaseAccuracy', 'Per-Case Accuracy vs. Gold Standard')}
            </h2>
          </div>

          {/* System Tabs */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
            {SYSTEMS.map((system) => (
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

        {/* Desktop: Table layout */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">#</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  {t('admin.studies.goldStandard.case', 'Case')}
                </th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Danis-Weber</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Lauge-Hansen</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">AO/OTA</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Bartonicek</th>
              </tr>
            </thead>
            <tbody>
              {sortedCases.map((pca) => {
                if (!pca.has_gold_standard) {
                  return (
                    <tr key={pca.case_id} className="border-b border-border/30 opacity-50">
                      <td className="py-3 px-4 font-medium text-primary">{pca.case_order}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {pca.case_title}
                        </span>
                      </td>
                      <td colSpan={4} className="py-3 px-4 text-center text-muted-foreground italic">
                        {t('admin.studies.goldStandard.noGoldStandard', 'No gold standard')}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={pca.case_id}
                    className={cn(
                      'border-b border-border/30 hover:bg-muted/20',
                      pca.is_hard_case && 'bg-amber-500/5'
                    )}
                  >
                    <td className="py-3 px-4 font-medium text-primary">{pca.case_order}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {pca.case_title}
                        </span>
                        {pca.is_hard_case && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', pca.danis_weber_accuracy != null ? getAgreementColorClass(pca.danis_weber_accuracy) : '')}>
                      {pca.danis_weber_accuracy != null ? `${pca.danis_weber_accuracy.toFixed(0)}%` : '-'}
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', pca.lauge_hansen_accuracy != null ? getAgreementColorClass(pca.lauge_hansen_accuracy) : '')}>
                      {pca.lauge_hansen_accuracy != null ? `${pca.lauge_hansen_accuracy.toFixed(0)}%` : '-'}
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', pca.ao_ota_accuracy != null ? getAgreementColorClass(pca.ao_ota_accuracy) : '')}>
                      {pca.ao_ota_accuracy != null ? `${pca.ao_ota_accuracy.toFixed(0)}%` : '-'}
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', pca.bartonicek_accuracy != null ? getAgreementColorClass(pca.bartonicek_accuracy) : '')}>
                      {pca.bartonicek_accuracy != null ? `${pca.bartonicek_accuracy.toFixed(0)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: Card layout */}
        <div className="md:hidden space-y-3">
          {sortedCases.map((pca) => {
            if (!pca.has_gold_standard) return null;

            const getAccuracy = (): number | undefined => {
              switch (activeSystem) {
                case 'danis_weber': return pca.danis_weber_accuracy ?? undefined;
                case 'lauge_hansen': return pca.lauge_hansen_accuracy ?? undefined;
                case 'ao_ota': return pca.ao_ota_accuracy ?? undefined;
                case 'bartonicek': return pca.bartonicek_accuracy ?? undefined;
              }
            };

            const accuracy = getAccuracy();

            return (
              <div
                key={pca.case_id}
                className={cn(
                  'p-4 rounded-lg',
                  pca.is_hard_case ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/20'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {pca.case_order}
                    </span>
                    <span className="font-medium text-foreground truncate">{pca.case_title}</span>
                  </div>
                  {pca.is_hard_case && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{getSystemLabel(activeSystem)}</span>
                  <span className={cn('text-lg font-bold', accuracy != null ? getAgreementColorClass(accuracy) : '')}>
                    {accuracy != null ? `${accuracy.toFixed(0)}%` : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            {t('admin.studies.goldStandard.accuracyNote', 'Accuracy shows the percentage of raters who matched the gold standard classification. Cases with < 50% accuracy in any system are flagged as hard cases.')}
          </p>
        </div>
      </section>

      {/* Per-Rater Accuracy Table */}
      {metrics.per_rater_accuracy && metrics.per_rater_accuracy.length > 0 && (
        <section className="chart-card mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('admin.studies.goldStandard.perRaterAccuracy', 'Per-Rater Accuracy vs. Gold Standard')}
            </h2>
          </div>

          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t('admin.studies.goldStandard.rater', 'Rater')}
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    {t('admin.studies.goldStandard.casesCompleted', 'Cases')}
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Danis-Weber</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Lauge-Hansen</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">AO/OTA</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Bartonicek</th>
                </tr>
              </thead>
              <tbody>
                {metrics.per_rater_accuracy.map((rater) => (
                  <tr key={rater.user_id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-3 px-4">
                      <div className="truncate max-w-[200px]">
                        <span className="font-medium text-foreground">
                          {rater.user_display_name || rater.user_email || rater.user_id.slice(0, 8) + '...'}
                        </span>
                        {rater.user_display_name && rater.user_email && (
                          <p className="text-xs text-muted-foreground truncate">{rater.user_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">
                      {rater.cases_completed}
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', rater.danis_weber_accuracy != null ? getAgreementColorClass(rater.danis_weber_accuracy) : '')}>
                      {rater.danis_weber_accuracy != null ? `${rater.danis_weber_accuracy.toFixed(0)}%` : '-'}
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', rater.lauge_hansen_accuracy != null ? getAgreementColorClass(rater.lauge_hansen_accuracy) : '')}>
                      {rater.lauge_hansen_accuracy != null ? `${rater.lauge_hansen_accuracy.toFixed(0)}%` : '-'}
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', rater.ao_ota_accuracy != null ? getAgreementColorClass(rater.ao_ota_accuracy) : '')}>
                      {rater.ao_ota_accuracy != null ? `${rater.ao_ota_accuracy.toFixed(0)}%` : '-'}
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', rater.bartonicek_accuracy != null ? getAgreementColorClass(rater.bartonicek_accuracy) : '')}>
                      {rater.bartonicek_accuracy != null ? `${rater.bartonicek_accuracy.toFixed(0)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Card layout */}
          <div className="md:hidden space-y-3">
            {metrics.per_rater_accuracy.map((rater) => {
              const getAccuracy = (): number | undefined => {
                switch (activeSystem) {
                  case 'danis_weber': return rater.danis_weber_accuracy ?? undefined;
                  case 'lauge_hansen': return rater.lauge_hansen_accuracy ?? undefined;
                  case 'ao_ota': return rater.ao_ota_accuracy ?? undefined;
                  case 'bartonicek': return rater.bartonicek_accuracy ?? undefined;
                }
              };

              const accuracy = getAccuracy();

              return (
                <div key={rater.user_id} className="p-4 rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {rater.user_display_name || rater.user_email || rater.user_id.slice(0, 8) + '...'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {rater.cases_completed} {t('admin.studies.goldStandard.cases', 'cases')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{getSystemLabel(activeSystem)}</span>
                    <span className={cn('text-lg font-bold', accuracy != null ? getAgreementColorClass(accuracy) : '')}>
                      {accuracy != null ? `${accuracy.toFixed(0)}%` : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              {t('admin.studies.goldStandard.raterNote', 'Shows each rater\'s accuracy across all gold standard cases in this study. Only cases with a gold standard set are included.')}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
