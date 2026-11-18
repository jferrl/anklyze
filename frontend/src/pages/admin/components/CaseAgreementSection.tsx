import { useTranslation } from 'react-i18next';
import type { ReliabilityMetrics } from '@/types';
import { MethodNote } from './MethodNote';
import { SYSTEM_COLOR, SYSTEM_KEYS, SYSTEM_LABEL, formatPercent } from './systems';

interface CaseAgreementSectionProps {
  metrics: ReliabilityMetrics;
}

export function CaseAgreementSection({ metrics }: CaseAgreementSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="chart-card">
      <h2 className="text-base font-semibold text-foreground mb-4">
        {t('admin.reliability.percentAgreement')}
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SYSTEM_KEYS.map((key) => {
          const agreement = metrics[`${key}_agreement`];
          return (
            <div key={key} className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="size-2 shrink-0" style={{ backgroundColor: SYSTEM_COLOR[key] }} />
                {SYSTEM_LABEL[key]}
              </p>
              {agreement ? (
                <p className="mt-2 font-display text-4xl tabular-nums">
                  {formatPercent(agreement.percent_agreement)}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('common.noData')}. {t('admin.reliability.noSystemData')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <MethodNote className="mt-6">
        <p className="tabular-nums">
          {t('admin.reliability.method.percentAgreement', {
            responses: metrics.total_responses,
            raters: metrics.unique_raters,
          })}
        </p>
        <p>{t('admin.reliability.method.noKappaPerCase')}</p>
      </MethodNote>
    </section>
  );
}
