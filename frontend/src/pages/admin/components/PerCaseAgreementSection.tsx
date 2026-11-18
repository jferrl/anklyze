import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseMetrics } from '@/types';
import { CaseMetricCard } from './CaseMetricCard';
import { CASE_LINK, caseReportPath } from './caseLink';
import { SystemColumnHeads, SystemListHead } from './SystemTabs';
import { LOW_AGREEMENT_PCT, SYSTEM_KEYS, agreementColorClass, formatPercent, type SystemKey } from './systems';

interface PerCaseAgreementSectionProps {
  perCaseMetrics: CaseMetrics[];
  /** System shown on narrow screens, where only one fits; wide screens show all four. */
  activeSystem: SystemKey;
}

export function PerCaseAgreementSection({ perCaseMetrics, activeSystem }: PerCaseAgreementSectionProps) {
  const { t } = useTranslation();

  const sortedMetrics = [...perCaseMetrics].sort((a, b) => a.case_order - b.case_order);

  return (
    <section aria-labelledby="per-case-agreement-heading" className="space-y-3">
      <h2 id="per-case-agreement-heading" className="text-base font-semibold text-foreground">
        {t('admin.studies.reliability.perCaseAgreement')}
      </h2>

      {perCaseMetrics.length === 0 ? (
        <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          {t('admin.studies.reliability.noCaseMetrics')}
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="md:hidden">
              <SystemListHead label={t('admin.studies.goldStandard.case')} system={activeSystem} />
              <div key={activeSystem} className="animate-fade-in divide-y">
                {sortedMetrics.map((caseMetrics) => (
                  <CaseMetricCard key={caseMetrics.case_id} metrics={caseMetrics} activeSystem={activeSystem} />
                ))}
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-12 px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('admin.studies.goldStandard.case')}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('admin.studies.table.responses')}</th>
                    <SystemColumnHeads />
                  </tr>
                </thead>
                <tbody>
                  {sortedMetrics.map((caseMetrics) => (
                    <tr
                      key={caseMetrics.case_id}
                      className={cn('border-b last:border-0', caseMetrics.is_low_agreement && 'bg-warning/10')}
                    >
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{caseMetrics.case_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={caseReportPath(caseMetrics.case_id)} className={CASE_LINK}>
                            {caseMetrics.case_title}
                          </Link>
                          {caseMetrics.is_low_agreement && (
                            <AlertCircle
                              role="img"
                              aria-label={t('admin.studies.reliability.lowAgreement')}
                              className="size-4 shrink-0 text-warning"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{caseMetrics.response_count}</td>
                      {SYSTEM_KEYS.map((key) => {
                        // The backend reports 100% for a case nobody answered; it has no agreement to show.
                        const value = caseMetrics.response_count > 0 ? caseMetrics[`${key}_agreement`] : null;
                        return (
                          <td key={key} className={cn('px-4 py-3 text-right font-medium tabular-nums', agreementColorClass(value))}>
                            {value != null ? formatPercent(value) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="max-w-[70ch] text-xs text-muted-foreground">
            {t('admin.studies.reliability.agreementNote', { threshold: LOW_AGREEMENT_PCT })}
          </p>
        </>
      )}
    </section>
  );
}
