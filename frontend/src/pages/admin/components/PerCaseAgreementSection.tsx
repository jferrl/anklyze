import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseMetrics } from '@/types';
import { CaseMetricCard } from './CaseMetricCard';
import { SystemColumnHeads, SystemTabs } from './SystemTabs';
import { SYSTEM_KEYS, SYSTEMS, agreementColorClass, formatPercent, type SystemKey } from './systems';

interface PerCaseAgreementSectionProps {
  perCaseMetrics: CaseMetrics[];
}

export function PerCaseAgreementSection({ perCaseMetrics }: PerCaseAgreementSectionProps) {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<SystemKey>('lauge_hansen');

  const sortedMetrics = [...perCaseMetrics].sort((a, b) => a.case_order - b.case_order);

  return (
    <section className="chart-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {t('admin.studies.reliability.perCaseAgreement', 'Per-Case Agreement')}
          </h2>
        </div>

        <SystemTabs
          className="md:hidden"
          systems={SYSTEMS}
          active={activeSystem}
          onChange={(key) => setActiveSystem(key as SystemKey)}
        />
      </div>

      {perCaseMetrics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t('admin.studies.reliability.noCaseMetrics', 'No case metrics available')}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="divide-y border-t md:hidden">
            {sortedMetrics.map((caseMetrics) => (
              <CaseMetricCard
                key={caseMetrics.case_id}
                metrics={caseMetrics}
                activeSystem={activeSystem}
              />
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('admin.studies.goldStandard.case')}</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('admin.studies.table.responses')}</th>
                  <SystemColumnHeads />
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map((caseMetrics) => (
                  <tr
                    key={caseMetrics.case_id}
                    className={cn(
                      'border-b transition-colors duration-150 hover:bg-muted',
                      caseMetrics.is_low_agreement && 'bg-warning/10'
                    )}
                  >
                    <td className="py-3 px-4 tabular-nums text-muted-foreground">
                      {caseMetrics.case_order}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {caseMetrics.case_title}
                        </span>
                        {caseMetrics.is_low_agreement && (
                          <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                      {caseMetrics.response_count}
                    </td>
                    {SYSTEM_KEYS.map((key) => {
                      const value = caseMetrics[`${key}_agreement`];
                      return (
                        <td key={key} className={cn('py-3 px-4 text-right font-medium tabular-nums', agreementColorClass(value))}>
                          {value != null ? formatPercent(value) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {t('admin.studies.reliability.agreementNote', 'Agreement percentage shows how often raters selected the same classification for each case. Cases with low agreement (< 60%) are highlighted.')}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
