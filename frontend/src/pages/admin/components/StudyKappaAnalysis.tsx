import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { KappaGauge, KappaLegend } from '@/components/analytics';
import type { FleissKappaResult, StudyReliabilityResponse } from '@/types';
import { MethodNote } from './MethodNote';
import { SYSTEM_COLOR, SYSTEM_KEYS, SYSTEM_LABEL, SMALL_SAMPLE_CASES, kappaAxisMin, type SystemKey } from './systems';

interface StudyKappaAnalysisProps {
  reliability: StudyReliabilityResponse;
}

/** RULED_GRID splits one ruled box into gauge cells (DESIGN.md, The Ruled Box Rule). */
const RULED_GRID = 'grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4';

type KappaFacts = Pick<FleissKappaResult, 'num_subjects' | 'confidence_interval' | 'kappa_unavailable_reason'>;

// Under the gauge: why a kappa is undefined, or that a small sample or an interval with no width makes it unstable.
function caution(t: TFunction, result?: KappaFacts) {
  if (!result) return undefined;
  if (result.kappa_unavailable_reason === 'no_variation') return t('admin.reliability.kappaNoVariation');
  const ci = result.confidence_interval;
  return result.num_subjects < SMALL_SAMPLE_CASES || (ci && ci.lower === ci.upper)
    ? t('admin.reliability.smallSample', { count: result.num_subjects })
    : undefined;
}

/** StudyKappaAnalysis is the headline of the study page: one kappa per system, its legend and its method. */
export function StudyKappaAnalysis({ reliability }: StudyKappaAnalysisProps) {
  const { t } = useTranslation();

  const kappas = SYSTEM_KEYS.map((key) => ({ key, fleiss: reliability[`${key}_fleiss`] }));
  const min = kappaAxisMin(kappas.flatMap(({ fleiss }) => [fleiss?.kappa, fleiss?.confidence_interval?.lower]));
  // Cohen's kappa exists only when exactly two raters completed the study.
  const cohens = SYSTEM_KEYS.map((key) => ({ key, cohen: reliability[`${key}_cohen`] }));
  const hasCohen = cohens.some(({ cohen }) => cohen);
  const cohenMin = kappaAxisMin(cohens.flatMap(({ cohen }) => [cohen?.kappa, cohen?.confidence_interval?.lower]));
  const weighted = reliability.ao_ota_cohen?.weighted_kappa;
  const level = ((kappas.find(({ fleiss }) => fleiss?.confidence_interval)?.fleiss?.confidence_interval?.level ?? 0.95) * 100).toFixed(0);

  return (
    <div className="space-y-4">
      <section aria-labelledby="fleiss-heading" className="space-y-3">
        <h2 id="fleiss-heading" className="text-base font-semibold text-foreground">
          {t('admin.studies.reliability.fleissKappa')}
        </h2>
        <div className={RULED_GRID}>
          {kappas.map(({ key, fleiss }) => (
            <div key={key} className="bg-card p-4">
              <KappaGauge
                value={fleiss?.kappa}
                ci={fleiss?.confidence_interval}
                min={min}
                label={SYSTEM_LABEL[key]}
                swatch={SYSTEM_COLOR[key]}
                description={fleiss
                  ? [
                      t('admin.reliability.ratersCount', { count: fleiss.num_raters }),
                      t('admin.reliability.casesCount', { count: fleiss.num_subjects }),
                      fleiss.num_cases_excluded > 0 && t('admin.reliability.casesExcluded', { count: fleiss.num_cases_excluded }),
                    ].filter(Boolean).join(', ')
                  : t('admin.studies.reliability.notEnoughData')}
                caution={caution(t, fleiss)}
              />
            </div>
          ))}
        </div>
      </section>

      {hasCohen && (
        <section aria-labelledby="cohen-heading" className="space-y-3 pt-2">
          <h2 id="cohen-heading" className="text-base font-semibold text-foreground">
            {t('admin.reliability.cohensKappa')} ({t('admin.reliability.raters2')})
          </h2>
          <div className={RULED_GRID}>
            {cohens.map(({ key, cohen }) => (
              <div key={key} className="bg-card p-4">
                <KappaGauge
                  value={cohen?.kappa}
                  ci={cohen?.confidence_interval}
                  min={cohenMin}
                  label={SYSTEM_LABEL[key]}
                  swatch={SYSTEM_COLOR[key]}
                  description={cohen
                    ? [
                        t('admin.reliability.casesCount', { count: cohen.num_subjects }),
                        cohen.num_cases_excluded > 0 && t('admin.reliability.casesExcluded', { count: cohen.num_cases_excluded }),
                      ].filter(Boolean).join(', ')
                    : t('admin.studies.reliability.notEnoughData')}
                  caution={caution(t, cohen)}
                />
              </div>
            ))}
            {reliability.ao_ota_cohen && (
              <div className="bg-card p-4 sm:col-span-2 lg:col-span-4">
                {weighted ? (
                  <div className="max-w-sm">
                    <KappaGauge
                      size="sm"
                      value={weighted.kappa}
                      swatch={SYSTEM_COLOR.ao_ota}
                      label={`${SYSTEM_LABEL.ao_ota} ${t('admin.reliability.weightedKappa').toLowerCase()} (${t(`admin.reliability.weightType.${weighted.type}`)})`}
                      description={[
                        t('admin.reliability.pairsCount', { count: weighted.num_pairs }),
                        weighted.num_pairs_excluded > 0 && t('admin.reliability.pairsExcluded', { count: weighted.num_pairs_excluded }),
                      ].filter(Boolean).join('; ')}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('admin.reliability.weightedUnavailable')}</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <KappaLegend />

      <MethodNote
        lead={t('admin.reliability.method.fleissLead', {
          raters: reliability.complete_raters,
          totalRaters: reliability.unique_raters,
          level,
        })}
      >
        <p className="tabular-nums">
          {t('admin.reliability.method.fleissRaters', {
            raters: reliability.complete_raters,
            totalRaters: reliability.unique_raters,
            cases: reliability.total_cases,
          })}
        </p>
        <p>{t('admin.reliability.method.fleissCases')}</p>
        <p>{t('admin.reliability.method.noVariation')}</p>
        <p>{t('admin.reliability.method.interval', { level })}</p>
        {hasCohen && <p>{t('admin.reliability.method.cohen', { level })}</p>}
        {weighted && <p>{t('admin.reliability.method.weighted')}</p>}
      </MethodNote>
    </div>
  );
}

interface KappaSystemDetailProps {
  reliability: StudyReliabilityResponse;
  system: SystemKey;
}

/** KappaSystemDetail lists the counts behind one system's kappa; the kappa itself is in the gauge above. */
export function KappaSystemDetail({ reliability, system }: KappaSystemDetailProps) {
  const { t } = useTranslation();
  const fleiss = reliability[`${system}_fleiss`];

  if (!fleiss) {
    return (
      <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
        {t('admin.studies.reliability.notEnoughData')}
      </p>
    );
  }

  const cells = [
    {
      label: t('admin.reliability.subjects'),
      value: fleiss.num_subjects,
      note: fleiss.num_cases_excluded > 0 && t('admin.reliability.casesExcluded', { count: fleiss.num_cases_excluded }),
    },
    { label: t('admin.studies.raters.title'), value: fleiss.num_raters },
    { label: t('admin.reliability.categories'), value: fleiss.num_categories },
  ];

  return (
    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border">
      {cells.map(({ label, value, note }) => (
        <div key={label} className="min-w-0 bg-card p-4">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          {note && <dd className="mt-1 text-xs text-muted-foreground">{note}</dd>}
        </div>
      ))}
    </dl>
  );
}
