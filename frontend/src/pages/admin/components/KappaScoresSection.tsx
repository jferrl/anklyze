import { useTranslation } from 'react-i18next';
import { KappaGauge } from '../../../components/analytics';
import type { ReliabilityMetrics } from '@/types';

interface KappaScoresSectionProps {
  metrics: ReliabilityMetrics;
}

export function KappaScoresSection({ metrics }: KappaScoresSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="chart-card">
      <h2 className="text-base font-semibold text-foreground mb-4">
        {t('admin.reliability.kappaScores')}
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KappaGauge
          value={metrics.danis_weber_agreement?.fleiss_kappa ?? metrics.danis_weber_agreement?.cohens_kappa}
          ci={metrics.danis_weber_agreement?.fleiss_kappa === undefined ? metrics.danis_weber_agreement?.cohens_kappa_ci : undefined}
          label={t('admin.reliability.systems.danisWeber')}
          description={`${(metrics.danis_weber_agreement?.percent_agreement ?? 0).toFixed(1)}% ${t('admin.reliability.agreement')}`}
          size="md"
        />
        <KappaGauge
          value={metrics.lauge_hansen_agreement?.fleiss_kappa ?? metrics.lauge_hansen_agreement?.cohens_kappa}
          ci={metrics.lauge_hansen_agreement?.fleiss_kappa === undefined ? metrics.lauge_hansen_agreement?.cohens_kappa_ci : undefined}
          label={t('admin.reliability.systems.laugeHansen')}
          description={`${(metrics.lauge_hansen_agreement?.percent_agreement ?? 0).toFixed(1)}% ${t('admin.reliability.agreement')}`}
          size="md"
        />
        <KappaGauge
          value={metrics.ao_ota_agreement?.fleiss_kappa ?? metrics.ao_ota_agreement?.cohens_kappa}
          ci={metrics.ao_ota_agreement?.fleiss_kappa === undefined ? metrics.ao_ota_agreement?.cohens_kappa_ci : undefined}
          label={t('admin.reliability.systems.aoOta')}
          description={`${(metrics.ao_ota_agreement?.percent_agreement ?? 0).toFixed(1)}% ${t('admin.reliability.agreement')}`}
          size="md"
        />
        <KappaGauge
          value={metrics.bartonicek_agreement?.fleiss_kappa ?? metrics.bartonicek_agreement?.cohens_kappa}
          ci={metrics.bartonicek_agreement?.fleiss_kappa === undefined ? metrics.bartonicek_agreement?.cohens_kappa_ci : undefined}
          label={t('admin.reliability.systems.bartonicek')}
          description={`${(metrics.bartonicek_agreement?.percent_agreement ?? 0).toFixed(1)}% ${t('admin.reliability.agreement')}`}
          size="md"
        />
      </div>

      <p className="mt-6 border-t pt-3 text-xs tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">{t('admin.reliability.kappaInterpretation')}</span>
        {' '}
        {`< 0 ${t('admin.reliability.kappaPoor')} · 0–0.20 ${t('admin.reliability.kappaSlight')} · 0.21–0.40 ${t('admin.reliability.kappaFair')} · 0.41–0.60 ${t('admin.reliability.kappaModerate')} · 0.61–0.80 ${t('admin.reliability.kappaSubstantial')} · 0.81–1.00 ${t('admin.reliability.kappaAlmostPerfect')} (Landis & Koch, 1977)`}
      </p>
    </section>
  );
}
