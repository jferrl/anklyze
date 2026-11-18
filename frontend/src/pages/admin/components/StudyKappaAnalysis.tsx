import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KappaGauge, KappaLegend } from '@/components/analytics';
import { kappaInterpretationKey, type StudyReliabilityResponse } from '@/types';
import { MethodNote } from './MethodNote';
import { SystemTabs } from './SystemTabs';
import { SYSTEM_KEYS, SYSTEM_LABEL, SYSTEMS, kappaAxisMin, type SystemKey } from './systems';

interface StudyKappaAnalysisProps {
  reliability: StudyReliabilityResponse;
}

export function StudyKappaAnalysis({ reliability }: StudyKappaAnalysisProps) {
  const { t } = useTranslation();
  const [activeSystem, setActiveSystem] = useState<SystemKey>('lauge_hansen');

  const kappas = SYSTEM_KEYS.map((key) => ({ key, fleiss: reliability[`${key}_fleiss`] }));
  const min = kappaAxisMin(kappas.flatMap(({ fleiss }) => [fleiss?.kappa, fleiss?.confidence_interval?.lower]));
  // Cohen's kappa exists only when exactly two raters completed the study.
  const cohens = SYSTEM_KEYS.map((key) => ({ key, cohen: reliability[`${key}_cohen`] }));
  const hasCohen = cohens.some(({ cohen }) => cohen);
  const cohenMin = kappaAxisMin(cohens.flatMap(({ cohen }) => [cohen?.kappa, cohen?.confidence_interval?.lower]));
  const weighted = reliability.ao_ota_cohen?.weighted_kappa;
  const activeKappa = reliability[`${activeSystem}_fleiss`];
  const ciLevel = kappas.find(({ fleiss }) => fleiss?.confidence_interval)?.fleiss?.confidence_interval?.level ?? 0.95;

  return (
    <div className="space-y-6">
      {/* Fleiss' Kappa Scores */}
      <section className="chart-card">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t('admin.studies.reliability.fleissKappa', "Fleiss' Kappa (Inter-Rater Reliability)")}
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kappas.map(({ key, fleiss }) => (
            <KappaGauge
              key={key}
              value={fleiss?.kappa}
              ci={fleiss?.confidence_interval}
              min={min}
              label={SYSTEM_LABEL[key]}
              description={fleiss
                ? [
                    t('admin.reliability.ratersCount', { count: fleiss.num_raters }),
                    t('admin.reliability.casesCount', { count: fleiss.num_subjects }),
                    fleiss.num_cases_excluded > 0 && t('admin.reliability.casesExcluded', { count: fleiss.num_cases_excluded }),
                  ].filter(Boolean).join(', ')
                : t('admin.studies.reliability.notEnoughData')}
            />
          ))}
        </div>

        {hasCohen && (
          <div className="mt-8 border-t pt-6">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {t('admin.reliability.cohensKappa')} ({t('admin.reliability.raters2')})
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cohens.map(({ key, cohen }) => (
                <KappaGauge
                  key={key}
                  value={cohen?.kappa}
                  ci={cohen?.confidence_interval}
                  min={cohenMin}
                  label={SYSTEM_LABEL[key]}
                  description={cohen
                    ? [
                        t('admin.reliability.casesCount', { count: cohen.num_subjects }),
                        cohen.num_cases_excluded > 0 && t('admin.reliability.casesExcluded', { count: cohen.num_cases_excluded }),
                      ].filter(Boolean).join(', ')
                    : t('admin.studies.reliability.notEnoughData')}
                />
              ))}
            </div>

            <div className="mt-6 max-w-sm">
              {weighted ? (
                <KappaGauge
                  size="sm"
                  value={weighted.kappa}
                  label={`${SYSTEM_LABEL.ao_ota} ${t('admin.reliability.weightedKappa').toLowerCase()} (${t(`admin.reliability.weightType.${weighted.type}`)})`}
                  description={[
                    t('admin.reliability.pairsCount', { count: weighted.num_pairs }),
                    weighted.num_pairs_excluded > 0 && t('admin.reliability.pairsExcluded', { count: weighted.num_pairs_excluded }),
                  ].filter(Boolean).join('; ')}
                />
              ) : (
                reliability.ao_ota_cohen && (
                  <p className="text-sm text-muted-foreground">{t('admin.reliability.weightedUnavailable')}</p>
                )
              )}
            </div>
          </div>
        )}

        <MethodNote className="mt-6">
          <p className="tabular-nums">
            {t('admin.reliability.method.fleissRaters', {
              raters: reliability.complete_raters,
              totalRaters: reliability.unique_raters,
              cases: reliability.total_cases,
            })}
          </p>
          <p>{t('admin.reliability.method.fleissCases')}</p>
          <p>{t('admin.reliability.method.interval', { level: (ciLevel * 100).toFixed(0) })}</p>
          {hasCohen && <p>{t('admin.reliability.method.cohen', { level: (ciLevel * 100).toFixed(0) })}</p>}
          {weighted && <p>{t('admin.reliability.method.weighted')}</p>}
        </MethodNote>

        <KappaLegend className="mt-4" />
      </section>

      {/* Detailed Kappa Analysis for the selected system */}
      {kappas.some(({ fleiss }) => fleiss) && (
        <section className="space-y-4">
          <SystemTabs systems={SYSTEMS} active={activeSystem} onChange={(key) => setActiveSystem(key as SystemKey)} />

          <div className="chart-card">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {t('admin.reliability.systemDetail', { system: SYSTEM_LABEL[activeSystem] })}
            </h2>

            {!activeKappa ? (
              <p className="border-t pt-4 text-sm text-muted-foreground">
                {t('admin.studies.reliability.notEnoughData')}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('admin.reliability.fleissKappa')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {activeKappa.kappa.toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(kappaInterpretationKey(activeKappa.interpretation), activeKappa.interpretation)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('admin.reliability.subjects')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {activeKappa.num_subjects}
                    </p>
                    {activeKappa.num_cases_excluded > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admin.reliability.casesExcluded', { count: activeKappa.num_cases_excluded })}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('admin.studies.raters.title')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {activeKappa.num_raters}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('admin.reliability.categories')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {activeKappa.num_categories}
                    </p>
                  </div>
                </div>

                {activeKappa.confidence_interval && (
                  <div className="mt-4 border-t pt-3">
                    <p className="text-sm tabular-nums text-foreground">
                      <span className="font-medium">{t('admin.reliability.confidenceInterval', { level: 95 })}:</span>{' '}
                      [{activeKappa.confidence_interval.lower.toFixed(3)}, {activeKappa.confidence_interval.upper.toFixed(3)}]
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
