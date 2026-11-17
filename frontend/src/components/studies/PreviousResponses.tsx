import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { CaseResponse } from '@/types';
import { formatDateTime } from '@/lib/format';
import {
  getDanisWeberDisplayName,
  getLaugeHansenFullName,
  getAOOTADisplayName,
  getAOOTASubtypeLabel,
  getBartonicekDisplayName,
} from '@/utils/classificationTranslations';

interface PreviousResponsesProps {
  responses: CaseResponse[];
}

export function PreviousResponses({ responses }: PreviousResponsesProps) {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  if (responses.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border bg-card">
      <h2>
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-left text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>
            {t('studies.previousResponses')}{' '}
            <span className="font-normal text-muted-foreground tabular-nums">({responses.length})</span>
          </span>
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
      </h2>
      {isExpanded && (
        <div className="divide-y border-t">
          {responses.map((response, index) => {
            const c = response.classification;
            const aoSubtype = c.ao_ota && getAOOTASubtypeLabel(t, c.ao_ota.code);
            const systems = [
              c.lauge_hansen && {
                swatch: 'bg-sys-lh',
                label: 'Lauge-Hansen',
                value: getLaugeHansenFullName(t, c.lauge_hansen.type),
              },
              c.danis_weber && {
                swatch: 'bg-sys-dw',
                label: 'Danis-Weber',
                value: getDanisWeberDisplayName(t, c.danis_weber.type),
              },
              c.ao_ota && {
                swatch: 'bg-sys-ao',
                label: 'AO/OTA',
                value: getAOOTADisplayName(t, c.ao_ota.code),
              },
              c.bartonicek && {
                swatch: 'bg-sys-bt',
                label: 'Bartonicek',
                value: getBartonicekDisplayName(t, c.bartonicek.type, c.fracture_type),
              },
            ].filter((s) => !!s);

            return (
              <div key={response.id} className="px-4 py-3">
                <div className="text-xs text-muted-foreground tabular-nums">
                  {t('studies.response')} #{responses.length - index} ·{' '}
                  {formatDateTime(response.created_at, i18n.language)}
                </div>
                <dl className="mt-2 divide-y text-sm">
                  {systems.map((s) => (
                    <div key={s.label} className="flex items-baseline justify-between gap-4 py-1.5">
                      <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
                        <span className={`h-2 w-2 ${s.swatch}`} aria-hidden="true" />
                        {s.label}
                      </dt>
                      <dd className="flex flex-wrap items-center justify-end gap-2 text-right font-medium">
                        {s.value}
                        {s.label === 'AO/OTA' && aoSubtype && (
                          <Badge variant="outline">{aoSubtype}</Badge>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
