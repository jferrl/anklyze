import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { StudyGoldStandardResponse } from '@/types';
import { SystemColumnHeads, SystemTabs } from './SystemTabs';
import { SYSTEM_COLOR, SYSTEM_KEYS, SYSTEM_LABEL, SYSTEMS, agreementColorClass, formatPercent, type SystemKey } from './systems';

interface StudyGoldStandardSectionProps {
  metrics: StudyGoldStandardResponse;
}

export function StudyGoldStandardSection({ metrics }: StudyGoldStandardSectionProps) {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<SystemKey>('lauge_hansen');

  if (metrics.cases_with_gold === 0) {
    return (
      <section className="chart-card">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-foreground">
            {t('admin.studies.goldStandard.title', 'Gold Standard Accuracy')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('admin.studies.goldStandard.noCasesWithGold', 'No cases in this study have a gold standard set. Set gold standard classifications on individual cases to see accuracy metrics.')}
        </p>
      </section>
    );
  }

  const sortedCases = [...metrics.per_case_accuracy].sort(
    (a, b) => a.case_order - b.case_order
  );
  const hardCases = sortedCases.filter((c) => c.is_hard_case);

  return (
    <div className="space-y-6">
      {/* Aggregate Accuracy per System */}
      <section className="chart-card">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-foreground">
            {t('admin.studies.goldStandard.title', 'Gold Standard Accuracy')}
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
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

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 lg:grid-cols-4">
          {SYSTEM_KEYS.map((system) => {
            const agg = metrics[`${system}_accuracy`];
            return (
              <div key={system}>
                <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-2 shrink-0" style={{ backgroundColor: SYSTEM_COLOR[system] }} />
                  {SYSTEM_LABEL[system]}
                </p>
                {agg ? (
                  <>
                    <p className={cn('text-2xl font-semibold tabular-nums', agreementColorClass(agg.mean_accuracy))}>
                      {formatPercent(agg.mean_accuracy)}
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {t('admin.studies.goldStandard.casesEvaluated', '{{count}} cases', { count: agg.cases_evaluated })}
                    </p>
                    <div className="mt-1 tabular-nums">
                      <p className="text-xs text-muted-foreground">
                        {t('admin.studies.goldStandard.consensusRate', 'Consensus: {{rate}}%', {
                          rate: agg.consensus_rate.toFixed(1),
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agg.consensus_correct}/{agg.consensus_total} {t('admin.studies.goldStandard.casesCorrect', 'correct')}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-2xl font-semibold text-muted-foreground">—</p>
                )}
              </div>
            );
          })}
        </div>

        {hardCases.length > 0 && (
          <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              {t('admin.studies.goldStandard.hardCasesWarning', '{{count}} hard case(s) detected (accuracy < 50% in at least one system)', {
                count: hardCases.length,
              })}
            </p>
          </div>
        )}
      </section>

      {/* Per-Case Accuracy Table */}
      <section className="chart-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.studies.goldStandard.perCaseAccuracy', 'Per-Case Accuracy vs. Gold Standard')}
            </h2>
          </div>

          <SystemTabs
            className="md:hidden"
            systems={SYSTEMS}
            active={activeSystem}
            onChange={(key) => setActiveSystem(key as SystemKey)}
          />
        </div>

        {/* Desktop: Table layout */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">#</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  {t('admin.studies.goldStandard.case', 'Case')}
                </th>
                <SystemColumnHeads />
              </tr>
            </thead>
            <tbody>
              {sortedCases.map((pca) => {
                if (!pca.has_gold_standard) {
                  return (
                    <tr key={pca.case_id} className="border-b">
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">{pca.case_order}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">
                          {pca.case_title}
                        </span>
                      </td>
                      <td colSpan={4} className="py-3 px-4 text-center text-muted-foreground">
                        {t('admin.studies.goldStandard.noGoldStandard', 'No gold standard')}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={pca.case_id}
                    className={cn(
                      'border-b transition-colors duration-150 hover:bg-muted',
                      pca.is_hard_case && 'bg-warning/10'
                    )}
                  >
                    <td className="py-3 px-4 tabular-nums text-muted-foreground">{pca.case_order}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {pca.case_title}
                        </span>
                        {pca.is_hard_case && (
                          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                        )}
                      </div>
                    </td>
                    {SYSTEM_KEYS.map((key) => {
                      const value = pca[`${key}_accuracy`];
                      return (
                        <td key={key} className={cn('py-3 px-4 text-right font-medium tabular-nums', agreementColorClass(value))}>
                          {value != null ? formatPercent(value) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: Card layout */}
        <div className="divide-y border-t md:hidden">
          {sortedCases.map((pca) => {
            if (!pca.has_gold_standard) return null;

            const accuracy = pca[`${activeSystem}_accuracy`];

            return (
              <div
                key={pca.case_id}
                className="py-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {pca.case_order}
                    </span>
                    <span className="font-medium text-foreground truncate">{pca.case_title}</span>
                  </div>
                  {pca.is_hard_case && <AlertTriangle className="w-4 h-4 text-warning" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{SYSTEM_LABEL[activeSystem]}</span>
                  <span className={cn('text-base font-semibold tabular-nums', agreementColorClass(accuracy))}>
                    {accuracy != null ? formatPercent(accuracy) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {t('admin.studies.goldStandard.accuracyNote', 'Accuracy shows the percentage of raters who matched the gold standard classification. Cases with < 50% accuracy in any system are flagged as hard cases.')}
          </p>
        </div>
      </section>

      {/* Per-Rater Accuracy Table */}
      {metrics.per_rater_accuracy && metrics.per_rater_accuracy.length > 0 && (
        <section className="chart-card">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.studies.goldStandard.perRaterAccuracy', 'Per-Rater Accuracy vs. Gold Standard')}
            </h2>
          </div>

          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t('admin.studies.goldStandard.rater', 'Rater')}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {t('admin.studies.goldStandard.casesCompleted', 'Cases')}
                  </th>
                  <SystemColumnHeads />
                </tr>
              </thead>
              <tbody>
                {metrics.per_rater_accuracy.map((rater) => (
                  <tr key={rater.user_id} className="border-b transition-colors duration-150 hover:bg-muted">
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
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                      {rater.cases_completed}
                    </td>
                    {SYSTEM_KEYS.map((key) => {
                      const value = rater[`${key}_accuracy`];
                      return (
                        <td key={key} className={cn('py-3 px-4 text-right font-medium tabular-nums', agreementColorClass(value))}>
                          {value != null ? formatPercent(value) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Card layout */}
          <div className="divide-y border-t md:hidden">
            {metrics.per_rater_accuracy.map((rater) => {
              const accuracy = rater[`${activeSystem}_accuracy`];

              return (
                <div key={rater.user_id} className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {rater.user_display_name || rater.user_email || rater.user_id.slice(0, 8) + '...'}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {rater.cases_completed} {t('admin.studies.goldStandard.cases', 'cases')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{SYSTEM_LABEL[activeSystem]}</span>
                    <span className={cn('text-base font-semibold tabular-nums', agreementColorClass(accuracy))}>
                      {accuracy != null ? formatPercent(accuracy) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {t('admin.studies.goldStandard.raterNote', 'Shows each rater\'s accuracy across all gold standard cases in this study. Only cases with a gold standard set are included.')}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
