import { useTranslation } from 'react-i18next';
import { Equal, EqualNot } from 'lucide-react';
import type { ComparisonScenario } from '@/types';
import { cn } from '@/lib/utils';
import {
  getFractureDescription,
  getAOOTADisplayName,
  getAOOTASubtypeLabel,
  getDanisWeberDisplayName,
  getBartonicekDisplayName,
  getBartonicekReason,
} from '@/utils/classificationTranslations';

interface ComparisonViewProps {
  scenarios: ComparisonScenario[];
}

interface SystemRow {
  /** Identity colour of the system, e.g. `bg-sys-lh`. */
  swatch: string;
  title: string;
  present: boolean;
  /** Raw code used to detect disagreement between scenarios. */
  raw: (s: ComparisonScenario) => string | undefined;
  value: (s: ComparisonScenario) => string | undefined;
  subtitle?: (s: ComparisonScenario) => string | undefined;
}

export function ComparisonView({ scenarios }: ComparisonViewProps) {
  const { t } = useTranslation();

  if (scenarios.length < 2) {
    return null;
  }

  const isDifferent = (getValue: (s: ComparisonScenario) => string | undefined) => {
    const values = scenarios.map(getValue).filter(Boolean);
    return new Set(values).size > 1;
  };

  const getLaugeHansen = (s: ComparisonScenario) => s.result.lauge_hansen?.type;
  const getDanisWeber = (s: ComparisonScenario) => s.result.danis_weber?.type;
  const getAOOTA = (s: ComparisonScenario) => s.result.ao_ota?.code;
  const getBartonicek = (s: ComparisonScenario) => s.result.bartonicek?.type;

  const rows: SystemRow[] = [
    {
      swatch: 'bg-sys-lh',
      title: t('results.laugeHansen.title'),
      present: scenarios.some(s => s.result.lauge_hansen),
      raw: getLaugeHansen,
      value: (s) => s.result.lauge_hansen?.type === 'not_classifiable'
        ? t('results.classifications.laugeHansen.not_classifiable_name')
        : getLaugeHansen(s),
    },
    {
      swatch: 'bg-sys-dw',
      title: t('results.danisWeber.title'),
      present: scenarios.some(s => s.result.danis_weber),
      raw: getDanisWeber,
      value: (s) => s.result.danis_weber ? getDanisWeberDisplayName(t, s.result.danis_weber.type) : undefined,
    },
    {
      swatch: 'bg-sys-ao',
      title: t('results.aoota.title'),
      present: scenarios.some(s => s.result.ao_ota),
      raw: getAOOTA,
      value: (s) => s.result.ao_ota ? getAOOTADisplayName(t, s.result.ao_ota.code) : undefined,
      subtitle: (s) => s.result.ao_ota ? getAOOTASubtypeLabel(t, s.result.ao_ota.code) ?? undefined : undefined,
    },
    {
      swatch: 'bg-sys-bt',
      title: t('results.bartonicek.title'),
      present: scenarios.some(s => s.result.bartonicek),
      raw: getBartonicek,
      value: (s) => s.result.bartonicek
        ? getBartonicekDisplayName(t, s.result.bartonicek.type, s.result.fracture_type)
        : undefined,
      subtitle: (s) => s.result.bartonicek
        ? getBartonicekReason(t, s.result.bartonicek.type, s.result.fracture_type) ?? undefined
        : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">{t('results.title')}</h2>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <td className="p-4" />
              {scenarios.map((scenario, index) => (
                <th key={scenario.id} scope="col" className="border-l p-4 align-top font-normal">
                  <span className="block font-semibold">
                    {t('comparison.scenario')} {String.fromCharCode(65 + index)}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    {getFractureDescription(t, scenario.result.fracture_type)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.filter(row => row.present).map((row) => {
              const different = isDifferent(row.raw);
              const Mark = different ? EqualNot : Equal;
              return (
                <tr key={row.title} className={cn('border-t', different && 'bg-muted')}>
                  <th scope="row" className="p-4 align-top font-normal text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className={cn('size-2.5 shrink-0', row.swatch)} />
                      {row.title}
                      <Mark
                        role="img"
                        aria-label={t(different ? 'comparison.differ' : 'comparison.agree')}
                        className={cn('ml-auto size-4 shrink-0', different ? 'text-foreground' : 'text-muted-foreground')}
                      />
                    </span>
                  </th>
                  {scenarios.map((scenario) => {
                    const subtitle = row.subtitle?.(scenario);
                    return (
                      <td key={scenario.id} className="border-l p-4 align-top">
                        <p className="font-display text-2xl text-foreground">
                          {row.value(scenario) || '-'}
                        </p>
                        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
