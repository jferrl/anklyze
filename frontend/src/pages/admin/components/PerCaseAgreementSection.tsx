import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseMetrics } from '@/types';
import { CaseMetricCard, getAgreementColorClass } from './CaseMetricCard';
import type { ClassificationSystem } from './CaseMetricCard';
import { SystemTabs } from './SystemTabs';

interface PerCaseAgreementSectionProps {
  perCaseMetrics: CaseMetrics[];
}

const SYSTEMS: ClassificationSystem[] = ['danis_weber', 'lauge_hansen', 'ao_ota', 'bartonicek'];

function getSystemLabel(key: string): string {
  const labels: Record<string, string> = {
    danis_weber: 'Danis-Weber',
    lauge_hansen: 'Lauge-Hansen',
    ao_ota: 'AO/OTA',
    bartonicek: 'Bartonicek',
  };
  return labels[key] || key;
}

export function PerCaseAgreementSection({ perCaseMetrics }: PerCaseAgreementSectionProps) {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<ClassificationSystem>('danis_weber');

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
          systems={SYSTEMS.map((key) => ({ key, label: getSystemLabel(key) }))}
          active={activeSystem}
          onChange={(key) => setActiveSystem(key as ClassificationSystem)}
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
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-2 bg-sys-dw" />Danis-Weber</span></th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-2 bg-sys-lh" />Lauge-Hansen</span></th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-2 bg-sys-ao" />AO/OTA</span></th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-2 bg-sys-bt" />Bartonicek</span></th>
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
                        <span className="font-medium text-foreground truncate max-w-[200px]">
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
                    <td className={cn('py-3 px-4 text-right font-medium tabular-nums', getAgreementColorClass(caseMetrics.danis_weber_agreement))}>
                      {caseMetrics.danis_weber_agreement.toFixed(0)}%
                    </td>
                    <td className={cn('py-3 px-4 text-right font-medium tabular-nums', getAgreementColorClass(caseMetrics.lauge_hansen_agreement))}>
                      {caseMetrics.lauge_hansen_agreement.toFixed(0)}%
                    </td>
                    <td className={cn('py-3 px-4 text-right font-medium tabular-nums', getAgreementColorClass(caseMetrics.ao_ota_agreement))}>
                      {caseMetrics.ao_ota_agreement.toFixed(0)}%
                    </td>
                    <td className={cn('py-3 px-4 text-right font-medium tabular-nums', getAgreementColorClass(caseMetrics.bartonicek_agreement ?? 0))}>
                      {caseMetrics.bartonicek_agreement !== undefined
                        ? `${caseMetrics.bartonicek_agreement.toFixed(0)}%`
                        : '-'}
                    </td>
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
