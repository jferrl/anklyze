import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { KappaGauge, KappaLegend } from '@/components/analytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { kappaInterpretationKey, type StudyReliabilityResponse } from '@/types';
import { SystemTabs } from './SystemTabs';
import { SYSTEM_KEYS, SYSTEM_LABEL, SYSTEMS, kappaAxisMin, type SystemKey } from './systems';

interface StudyKappaAnalysisProps {
  reliability: StudyReliabilityResponse;
}

export function StudyKappaAnalysis({ reliability }: StudyKappaAnalysisProps) {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<SystemKey>('lauge_hansen');

  const kappas = SYSTEM_KEYS.map((key) => ({ key, fleiss: reliability[`${key}_fleiss`] }));
  const min = kappaAxisMin(kappas.flatMap(({ fleiss }) => [fleiss?.kappa, fleiss?.confidence_interval?.lower]));
  const activeKappa = reliability[`${activeSystem}_fleiss`];

  return (
    <div className="space-y-6">
      {/* Fleiss' Kappa Scores */}
      <section className="chart-card">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-foreground">
            {t('admin.studies.reliability.fleissKappa', "Fleiss' Kappa (Inter-Rater Reliability)")}
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t('admin.studies.reliability.fleissKappaDescription', "Fleiss' Kappa measures agreement among multiple raters across multiple cases. Requires 3+ raters who completed all cases.")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kappas.map(({ key, fleiss }) => (
            <KappaGauge
              key={key}
              value={fleiss?.kappa}
              ci={fleiss?.confidence_interval}
              min={min}
              label={SYSTEM_LABEL[key]}
              description={fleiss
                ? `${t('admin.reliability.ratersCount', { count: fleiss.num_raters })}, ${t('admin.reliability.casesCount', { count: fleiss.num_subjects })}`
                : t('admin.studies.reliability.notEnoughData')}
            />
          ))}
        </div>

        <KappaLegend className="mt-6 border-t pt-3" />
      </section>

      {/* Detailed Kappa Analysis for the selected system */}
      {kappas.some(({ fleiss }) => fleiss) && (
        <section className="space-y-4">
          <SystemTabs systems={SYSTEMS} active={activeSystem} onChange={(key) => setActiveSystem(key as SystemKey)} />

          <div className="chart-card">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {t('admin.reliability.systemDetail', { system: SYSTEM_LABEL[activeSystem] })}
            </h2>

            {!activeKappa ? (
              <p className="border-t pt-4 text-sm text-muted-foreground">
                {t('admin.studies.reliability.notEnoughData')}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('admin.reliability.fleissKappa')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {activeKappa.kappa.toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(kappaInterpretationKey(activeKappa.interpretation), activeKappa.interpretation)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('admin.reliability.subjects')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {activeKappa.num_subjects}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('admin.studies.raters.title')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {activeKappa.num_raters}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('admin.reliability.categories')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {activeKappa.num_categories}
                    </p>
                  </div>
                </div>

                {activeKappa.confidence_interval && (
                  <div className="mt-4 border-t pt-3">
                    <p className="text-sm tabular-nums text-foreground">
                      <span className="font-medium">{t('admin.reliability.confidenceInterval', { level: 95 })}:</span>{' '}
                      [{activeKappa.confidence_interval.lower.toFixed(3)}, {activeKappa.confidence_interval.upper.toFixed(3)}]
                    </p>
                  </div>
                )}

                {activeKappa.note && (
                  <p className="mt-4 rounded-md border bg-muted px-3 py-2 text-sm text-foreground">
                    {t('admin.reliability.fleissKappaNote')}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
