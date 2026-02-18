import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseMetrics } from '@/types';
import { CaseMetricCard, getAgreementColorClass } from './CaseMetricCard';
import type { ClassificationSystem } from './CaseMetricCard';

interface PerCaseAgreementSectionProps {
  perCaseMetrics: CaseMetrics[];
  hasGoldStandard: boolean;
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

export function PerCaseAgreementSection({ perCaseMetrics, hasGoldStandard }: PerCaseAgreementSectionProps) {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<ClassificationSystem>('danis_weber');

  const sortedMetrics = [...perCaseMetrics].sort((a, b) => a.case_order - b.case_order);

  return (
    <section className="chart-card mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            {t('admin.studies.reliability.perCaseAgreement', 'Per-Case Agreement')}
          </h2>
        </div>

        {/* System Tabs */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
          {SYSTEMS.map((system) => (
            <button
              key={system}
              onClick={() => setActiveSystem(system)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeSystem === system
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {getSystemLabel(system)}
            </button>
          ))}
        </div>
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
          <div className="md:hidden space-y-3">
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
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Case</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Responses</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Danis-Weber</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Lauge-Hansen</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">AO/OTA</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Bartonicek</th>
                  {hasGoldStandard && (
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Gold Match</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map((caseMetrics) => (
                  <tr
                    key={caseMetrics.case_id}
                    className={cn(
                      'border-b border-border/30 hover:bg-muted/20',
                      caseMetrics.is_low_agreement && 'bg-amber-500/5'
                    )}
                  >
                    <td className="py-3 px-4 font-medium text-primary">
                      {caseMetrics.case_order}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {caseMetrics.case_title}
                        </span>
                        {caseMetrics.is_low_agreement && (
                          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">
                      {caseMetrics.response_count}
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.danis_weber_agreement))}>
                      {caseMetrics.danis_weber_agreement.toFixed(0)}%
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.lauge_hansen_agreement))}>
                      {caseMetrics.lauge_hansen_agreement.toFixed(0)}%
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.ao_ota_agreement))}>
                      {caseMetrics.ao_ota_agreement.toFixed(0)}%
                    </td>
                    <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.bartonicek_agreement ?? 0))}>
                      {caseMetrics.bartonicek_agreement !== undefined
                        ? `${caseMetrics.bartonicek_agreement.toFixed(0)}%`
                        : '-'}
                    </td>
                    {hasGoldStandard && (
                      <td className={cn('py-3 px-4 text-center font-semibold', getAgreementColorClass(caseMetrics.gold_standard_match_rate ?? 0))}>
                        {caseMetrics.gold_standard_match_rate !== undefined
                          ? `${caseMetrics.gold_standard_match_rate.toFixed(0)}%`
                          : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              {t('admin.studies.reliability.agreementNote', 'Agreement percentage shows how often raters selected the same classification for each case. Cases with low agreement (< 60%) are highlighted.')}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
