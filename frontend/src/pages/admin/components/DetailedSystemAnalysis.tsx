import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemTabs } from './SystemTabs';
import { SYSTEM_COLOR, SYSTEM_LABEL, SYSTEMS, formatPercent, type SystemKey } from './systems';
import type { ReliabilityMetrics } from '@/types';

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

      {getSystemAgreement ? (
        <div className="chart-card">
          <h3 className="text-base font-semibold text-foreground mb-2">
            {t('admin.reliability.systemMetrics', { system: SYSTEM_LABEL[activeSystem] })}
          </h3>

          <div className="flex items-center justify-between gap-4 border-b py-3">
            <span className="text-sm text-muted-foreground">
              {t('admin.reliability.percentAgreement')}
            </span>
            <span className="text-base font-semibold tabular-nums text-foreground">
              {formatPercent(getSystemAgreement.percent_agreement)}
            </span>
          </div>

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
