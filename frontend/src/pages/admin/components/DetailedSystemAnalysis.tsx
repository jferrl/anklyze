import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { ConfusionMatrix } from '../../../components/analytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import { SystemTabs } from './SystemTabs';
import { SYSTEM_COLOR, SYSTEM_LABEL, SYSTEMS, formatPercent, type SystemKey } from './systems';
import type { ReliabilityMetrics, ConfidenceInterval } from '@/types';

function formatKappaWithCI(kappa: number | undefined, ci?: ConfidenceInterval): string {
  if (kappa === undefined) return '—';
  const kappaStr = kappa.toFixed(3);
  if (ci) {
    return `${kappaStr} [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`;
  }
  return kappaStr;
}

interface DetailedSystemAnalysisProps {
  metrics: ReliabilityMetrics;
}

export function DetailedSystemAnalysis({ metrics }: DetailedSystemAnalysisProps) {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<SystemKey>('lauge_hansen');

  const getSystemAgreement = metrics[`${activeSystem}_agreement`];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          {t('admin.reliability.detailedAnalysis')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('admin.reliability.detailedDescription')}
        </p>
      </div>

      <SystemTabs
        systems={SYSTEMS}
        active={activeSystem}
        onChange={(key) => setActiveSystem(key as SystemKey)}
      />

      {/* System Details */}
      {getSystemAgreement ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metrics */}
          <div className="chart-card">
            <h3 className="text-base font-semibold text-foreground mb-2">
              {t('admin.reliability.systemMetrics', { system: SYSTEM_LABEL[activeSystem] })}
            </h3>

            <div>
              <div className="flex items-center justify-between gap-4 border-b py-3">
                <span className="text-sm text-muted-foreground">
                  {t('admin.reliability.percentAgreement')}
                </span>
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {formatPercent(getSystemAgreement.percent_agreement)}
                </span>
              </div>

              {getSystemAgreement.cohens_kappa !== undefined && (
                <div className="flex items-center justify-between gap-4 border-b py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t('admin.reliability.cohensKappa')} ({t('admin.reliability.raters2')})
                    </span>
                    {getSystemAgreement.cohens_kappa_ci && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('admin.reliability.confidenceInterval', { level: (getSystemAgreement.cohens_kappa_ci.level * 100).toFixed(0) })}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    {formatKappaWithCI(getSystemAgreement.cohens_kappa, getSystemAgreement.cohens_kappa_ci)}
                  </span>
                </div>
              )}

              {getSystemAgreement.weighted_kappa !== undefined && (
                <div className="flex items-center justify-between gap-4 border-b py-3">
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
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('admin.reliability.weightedKappaDescription')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    {getSystemAgreement.weighted_kappa.toFixed(3)}
                  </span>
                </div>
              )}

              {getSystemAgreement.fleiss_kappa !== undefined && (
                <div className="flex items-center justify-between gap-4 border-b py-3">
                  <span className="text-sm text-muted-foreground">
                    {t('admin.reliability.fleissKappa')} ({t('admin.reliability.ratersMulti')})
                  </span>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    {getSystemAgreement.fleiss_kappa.toFixed(3)}
                  </span>
                </div>
              )}

              {/* Category Counts */}
              <div className="pt-4">
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
                            <span className="font-medium tabular-nums">
                              {count} ({formatPercent(percentage)})
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
                            <div
                              className="h-full rounded-sm"
                              style={{ width: `${percentage}%`, backgroundColor: SYSTEM_COLOR[activeSystem] }}
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
            <h3 className="text-base font-semibold text-foreground mb-4">
              {t('admin.reliability.confusionMatrix')}
            </h3>
            <ConfusionMatrix
              matrix={getSystemAgreement.confusion_matrix}
              title={SYSTEM_LABEL[activeSystem]}
            />
          </div>
        </div>
      ) : (
        <div className="chart-card py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t('admin.reliability.noDataForSystem')}
          </p>
        </div>
      )}
    </section>
  );
}
