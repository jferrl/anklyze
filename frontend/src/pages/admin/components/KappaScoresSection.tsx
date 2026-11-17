import { useTranslation } from 'react-i18next';
import { KappaGauge, KappaLegend } from '../../../components/analytics';
import type { ReliabilityMetrics } from '@/types';
import { MethodNote } from './MethodNote';
import { SYSTEM_COLOR, SYSTEM_KEYS, SYSTEM_LABEL, formatPercent, kappaAxisMin } from './systems';

interface KappaScoresSectionProps {
  metrics: ReliabilityMetrics;
}

export function KappaScoresSection({ metrics }: KappaScoresSectionProps) {
  const { t } = useTranslation();

  const rows = SYSTEM_KEYS.map((key) => {
    const agreement = metrics[`${key}_agreement`];
    const fleiss = agreement?.fleiss_kappa;
    return {
      key,
      agreement,
      kappa: fleiss ?? agreement?.cohens_kappa,
      ci: fleiss === undefined ? agreement?.cohens_kappa_ci : undefined,
    };
  });
  const hasKappa = rows.some((r) => r.kappa != null);
  const kappaMissing = rows.some((r) => r.kappa == null);
  const min = kappaAxisMin(rows.flatMap((r) => [r.kappa, r.ci?.lower]));

  return (
    <section className="chart-card">
      <h2 className="text-base font-semibold text-foreground mb-4">
        {hasKappa ? t('admin.reliability.kappaScores') : t('admin.reliability.percentAgreement')}
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(({ key, agreement, kappa, ci }) =>
          kappa != null ? (
            <KappaGauge
              key={key}
              value={kappa}
              ci={ci}
              min={min}
              label={SYSTEM_LABEL[key]}
              description={`${formatPercent(agreement?.percent_agreement ?? 0)} ${t('admin.reliability.agreement')}`}
            />
          ) : (
            // Without a kappa, percent agreement is the figure; an empty gauge would say nothing.
            <div key={key} className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="size-2 shrink-0" style={{ backgroundColor: SYSTEM_COLOR[key] }} />
                {SYSTEM_LABEL[key]}
              </p>
              {agreement ? (
                <>
                  <p className="mt-2 font-display text-4xl tabular-nums">
                    {formatPercent(agreement.percent_agreement)}
                  </p>
                  {hasKappa && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('admin.reliability.percentAgreement')}</p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('common.noData')}. {t('admin.reliability.noSystemData')}
                </p>
              )}
            </div>
          )
        )}
      </div>

      <MethodNote className="mt-6">
        <p className="tabular-nums">
          {t('admin.reliability.method.percentAgreement', {
            responses: metrics.total_responses,
            raters: metrics.unique_raters,
          })}
        </p>
        {hasKappa && <p>{t('admin.reliability.method.cohenSinglePair')}</p>}
        {kappaMissing && <p>{t('admin.reliability.kappaNeedsCases')}</p>}
      </MethodNote>

      {hasKappa && <KappaLegend className="mt-4" />}
    </section>
  );
}
