import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';
import type { ClassificationResult as Result } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  getFractureDescription,
  getLaugeHansenFullName,
  getAOOTADisplayName,
  getAOOTASubtypeLabel,
  getDanisWeberDisplayName,
  getBartonicekDisplayName,
  getBartonicekReason,
  getBartonicekState,
} from '@/utils/classificationTranslations';

interface ClassificationResultProps {
  result: Result;
}

interface SystemCellProps {
  /** Identity colour of the system, e.g. `bg-sys-lh`. */
  swatch: string;
  name: string;
  code: string;
  /** False for "not classifiable" / "not applicable": a valid result, shown muted. */
  classified: boolean;
  detail?: string | null;
  detailClassName?: string;
}

function SystemCell({ swatch, name, code, classified, detail, detailClassName }: SystemCellProps) {
  return (
    <div className="min-w-0 border-b border-r p-4">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden="true" className={cn('size-2.5 shrink-0', swatch)} />
        {name}
      </dt>
      <dd className="mt-3">
        <p
          className={cn(
            'font-display break-words',
            classified ? 'text-3xl text-foreground' : 'text-2xl text-muted-foreground'
          )}
        >
          {code}
        </p>
        {detail && (
          <p className={cn('mt-2 text-sm text-muted-foreground', detailClassName)}>{detail}</p>
        )}
      </dd>
    </div>
  );
}

export function ClassificationResult({ result }: ClassificationResultProps) {
  const { t } = useTranslation();

  const hasAnyClassification = result.lauge_hansen || result.danis_weber || result.ao_ota || result.bartonicek;

  if (!hasAnyClassification && !result.impossible) {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold">{t('results.title')}</h2>
        <Alert>
          <AlertDescription>{t('results.noClassification')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const bartState = result.bartonicek
    ? getBartonicekState(result.bartonicek.type, result.fracture_type)
    : undefined;

  return (
    <div className="@container w-full space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('results.title')}</h2>
        {result.fracture_type && (
          <p className="mt-1 text-sm text-muted-foreground">
            {getFractureDescription(t, result.fracture_type)}
          </p>
        )}
      </div>

      {result.impossible && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t('results.impossibleBanner.title')}</AlertTitle>
          <AlertDescription>
            {result.impossible_key && t(`results.impossibleReasons.${result.impossible_key}`)}
          </AlertDescription>
        </Alert>
      )}

      {hasAnyClassification && (
        <div className="overflow-hidden rounded-lg border bg-card">
          {/* Negative margins hide the outer cell rules behind the container border. */}
          <dl className="-mb-px -mr-px grid grid-cols-2 @2xl:grid-cols-4">
            {result.lauge_hansen && (
              <SystemCell
                swatch="bg-sys-lh"
                name="Lauge-Hansen"
                classified={result.lauge_hansen.type !== 'not_classifiable'}
                code={
                  result.lauge_hansen.type === 'not_classifiable'
                    ? getLaugeHansenFullName(t, result.lauge_hansen.type)
                    : result.lauge_hansen.type
                }
                detail={
                  result.lauge_hansen.type === 'not_classifiable'
                    ? null
                    : getLaugeHansenFullName(t, result.lauge_hansen.type)
                }
              />
            )}

            {result.danis_weber && (
              <SystemCell
                swatch="bg-sys-dw"
                name="Danis-Weber"
                classified={result.danis_weber.type !== 'not_classifiable'}
                code={getDanisWeberDisplayName(t, result.danis_weber.type)}
              />
            )}

            {result.ao_ota && (
              <SystemCell
                swatch="bg-sys-ao"
                name="AO/OTA"
                classified={result.ao_ota.code !== 'not_classifiable'}
                code={getAOOTADisplayName(t, result.ao_ota.code)}
                detail={getAOOTASubtypeLabel(t, result.ao_ota.code)}
              />
            )}

            {result.bartonicek && (
              <SystemCell
                swatch="bg-sys-bt"
                name="Bartonicek"
                classified={bartState === 'classified'}
                code={getBartonicekDisplayName(t, result.bartonicek.type, result.fracture_type)}
                detail={getBartonicekReason(t, result.bartonicek.type, result.fracture_type)}
                detailClassName={bartState === 'no_ct' ? 'text-warning' : undefined}
              />
            )}
          </dl>
        </div>
      )}

      {result.notes && result.notes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">{t('results.clinicalNotes')}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
