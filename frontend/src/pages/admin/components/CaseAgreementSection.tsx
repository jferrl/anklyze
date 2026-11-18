import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReliabilityMetrics } from '@/types';
import { MethodNote } from './MethodNote';
import {
  LOW_AGREEMENT_PCT,
  SYSTEM_COLOR,
  SYSTEM_KEYS,
  SYSTEM_LABEL,
  agreementColorClass,
  formatPercent,
  mostCommon,
} from './systems';

interface CaseAgreementSectionProps {
  metrics: ReliabilityMetrics;
}

/** CaseAgreementSection prints each system's rater agreement in one ruled box, with its method beside it. */
export function CaseAgreementSection({ metrics }: CaseAgreementSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        {t('admin.reliability.percentAgreement')}
      </h2>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        {SYSTEM_KEYS.map((key) => {
          const agreement = metrics[`${key}_agreement`];
          const percent = agreement?.percent_agreement;
          const top = agreement && mostCommon(agreement.category_counts);
          return (
            <div key={key} className="min-w-0 bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="size-2 shrink-0" style={{ backgroundColor: SYSTEM_COLOR[key] }} />
                {SYSTEM_LABEL[key]}
              </p>
              {percent != null && top ? (
                <>
                  <p className="mt-2 font-display text-3xl break-words">
                    {top.answers.map((a) => a || t('admin.analytics.unspecified')).join(' / ')}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm tabular-nums">
                    <span className={cn('inline-flex items-center gap-1.5 font-medium text-foreground', agreementColorClass(percent))}>
                      {formatPercent(percent)}
                      {agreementColorClass(percent) && (
                        <AlertTriangle
                          role="img"
                          aria-label={t('admin.reliability.lowAgreement', { threshold: formatPercent(LOW_AGREEMENT_PCT) })}
                          className="size-4 shrink-0"
                        />
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {t('admin.studies.reliability.nOfM', { n: top.count, m: top.total })}
                    </span>
                  </p>
                </>
              ) : agreement ? (
                <>
                  <p className="mt-2 font-display text-3xl tabular-nums text-muted-foreground">—</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('admin.reliability.singleClassification')}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t('admin.reliability.noSystemData')}</p>
              )}
            </div>
          );
        })}
      </div>

      <MethodNote>
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
