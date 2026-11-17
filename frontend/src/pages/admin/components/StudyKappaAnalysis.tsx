import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { KappaGauge } from '@/components/analytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { kappaInterpretationKey, type StudyReliabilityResponse } from '@/types';

type ClassificationSystem = 'danis_weber' | 'lauge_hansen' | 'ao_ota' | 'bartonicek';

interface StudyKappaAnalysisProps {
  reliability: StudyReliabilityResponse;
}

function getSystemLabel(key: string): string {
  const labels: Record<string, string> = {
    danis_weber: 'Danis-Weber',
    lauge_hansen: 'Lauge-Hansen',
    ao_ota: 'AO/OTA',
    bartonicek: 'Bartonicek',
  };
  return labels[key] || key;
}

function getActiveKappa(reliability: StudyReliabilityResponse, system: ClassificationSystem) {
  switch (system) {
    case 'danis_weber':
      return reliability.danis_weber_fleiss;
    case 'lauge_hansen':
      return reliability.lauge_hansen_fleiss;
    case 'ao_ota':
      return reliability.ao_ota_fleiss;
    case 'bartonicek':
      return reliability.bartonicek_fleiss;
  }
}

export function StudyKappaAnalysis({ reliability }: StudyKappaAnalysisProps) {
  const { t } = useTranslation();
  const [activeSystem] = useState<ClassificationSystem>('danis_weber');

  const activeKappa = getActiveKappa(reliability, activeSystem);
  const ratersAndCases = (k: { num_raters: number; num_subjects: number }) =>
    `${t('admin.reliability.ratersCount', { count: k.num_raters })}, ${t('admin.reliability.casesCount', { count: k.num_subjects })}`;

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
          <KappaGauge
            value={reliability.danis_weber_fleiss?.kappa}
            ci={reliability.danis_weber_fleiss?.confidence_interval}
            label="Danis-Weber"
            description={reliability.danis_weber_fleiss
              ? ratersAndCases(reliability.danis_weber_fleiss)
              : t('admin.studies.reliability.notEnoughData', 'Not enough data')}
            size="md"
          />
          <KappaGauge
            value={reliability.lauge_hansen_fleiss?.kappa}
            ci={reliability.lauge_hansen_fleiss?.confidence_interval}
            label="Lauge-Hansen"
            description={reliability.lauge_hansen_fleiss
              ? ratersAndCases(reliability.lauge_hansen_fleiss)
              : t('admin.studies.reliability.notEnoughData', 'Not enough data')}
            size="md"
          />
          <KappaGauge
            value={reliability.ao_ota_fleiss?.kappa}
            ci={reliability.ao_ota_fleiss?.confidence_interval}
            label="AO/OTA"
            description={reliability.ao_ota_fleiss
              ? ratersAndCases(reliability.ao_ota_fleiss)
              : t('admin.studies.reliability.notEnoughData', 'Not enough data')}
            size="md"
          />
          <KappaGauge
            value={reliability.bartonicek_fleiss?.kappa}
            ci={reliability.bartonicek_fleiss?.confidence_interval}
            label="Bartonicek"
            description={reliability.bartonicek_fleiss
              ? ratersAndCases(reliability.bartonicek_fleiss)
              : t('admin.studies.reliability.notEnoughData', 'Not enough data')}
            size="md"
          />
        </div>

        <p className="mt-6 border-t pt-3 text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{t('admin.reliability.kappaInterpretation', 'Kappa Interpretation')}</span>
          {' '}
          {t('admin.reliability.kappaLegend')} (Landis & Koch, 1977)
        </p>
      </section>

      {/* Detailed Kappa Analysis for Active System */}
      {activeKappa && (
        <section className="chart-card">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.reliability.systemDetail', { system: getSystemLabel(activeSystem) })}
            </h2>
          </div>

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
            <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {t('admin.reliability.fleissKappa')}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('admin.reliability.fleissKappaNote')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
