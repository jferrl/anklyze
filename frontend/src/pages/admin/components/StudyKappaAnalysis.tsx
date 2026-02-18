import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Info } from 'lucide-react';
import { KappaGauge } from '@/components/analytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { StudyReliabilityResponse } from '@/types';

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

  return (
    <>
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

      {/* Detailed Kappa Analysis for Active System */}
      {activeKappa && (
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
                {activeKappa.kappa.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeKappa.interpretation}
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Cases (Subjects)</p>
              <p className="text-2xl font-bold text-foreground">
                {activeKappa.num_subjects}
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Raters</p>
              <p className="text-2xl font-bold text-foreground">
                {activeKappa.num_raters}
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Categories</p>
              <p className="text-2xl font-bold text-foreground">
                {activeKappa.num_categories}
              </p>
            </div>
          </div>

          {activeKappa.confidence_interval && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-medium">95% Confidence Interval:</span>{' '}
                [{activeKappa.confidence_interval.lower.toFixed(3)}, {activeKappa.confidence_interval.upper.toFixed(3)}]
              </p>
            </div>
          )}

          {activeKappa.note && (
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
    </>
  );
}
