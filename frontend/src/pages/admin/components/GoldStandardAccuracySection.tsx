import { useTranslation } from 'react-i18next';
import { Percent } from 'lucide-react';
import type { GoldStandardAccuracy } from '@/types';

interface GoldStandardAccuracySectionProps {
  accuracy: NonNullable<GoldStandardAccuracy>;
}

export function GoldStandardAccuracySection({ accuracy }: GoldStandardAccuracySectionProps) {
  const { t } = useTranslation();

  return (
    <section className="chart-card mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-6">
        {t('admin.reliability.goldStandardAccuracy')}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
        <div className="flex flex-col items-center p-4 bg-primary/5 rounded-xl">
          <Percent className="w-8 h-8 text-primary mb-2" />
          <span className="text-3xl font-bold text-foreground">
            {accuracy.overall_accuracy.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">
            {t('admin.reliability.overallAccuracy')}
          </span>
        </div>

        {accuracy.danis_weber_accuracy !== undefined && (
          <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
            <span className="text-2xl font-bold text-foreground">
              {accuracy.danis_weber_accuracy.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">{t('admin.reliability.systems.danisWeber')}</span>
          </div>
        )}

        {accuracy.lauge_hansen_accuracy !== undefined && (
          <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
            <span className="text-2xl font-bold text-foreground">
              {accuracy.lauge_hansen_accuracy.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">{t('admin.reliability.systems.laugeHansen')}</span>
          </div>
        )}

        {accuracy.ao_ota_accuracy !== undefined && (
          <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
            <span className="text-2xl font-bold text-foreground">
              {accuracy.ao_ota_accuracy.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">{t('admin.reliability.systems.aoOta')}</span>
          </div>
        )}

        {accuracy.bartonicek_accuracy !== undefined && (
          <div className="flex flex-col items-center p-4 bg-muted/30 rounded-xl">
            <span className="text-2xl font-bold text-foreground">
              {accuracy.bartonicek_accuracy.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">{t('admin.reliability.systems.bartonicek')}</span>
          </div>
        )}
      </div>
    </section>
  );
}
