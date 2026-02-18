import { useTranslation } from 'react-i18next';
import { KappaGauge } from '../../../components/analytics';
import type { ReliabilityMetrics } from '@/types';

interface KappaScoresSectionProps {
  metrics: ReliabilityMetrics;
}

export function KappaScoresSection({ metrics }: KappaScoresSectionProps) {
  const { t } = useTranslation();

  return (
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
  );
}
