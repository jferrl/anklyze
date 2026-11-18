import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { PerRaterAccuracy, StudyGoldStandardResponse } from '@/types';
import { formatNumber } from '@/lib/format';
import { MethodNote } from './MethodNote';
import { CASE_LINK, caseReportPath } from './caseLink';
import { SystemColumnHeads, SystemListHead } from './SystemTabs';
import {
  HARD_CASE_ACCURACY_PCT,
  SYSTEM_COLOR,
  SYSTEM_KEYS,
  SYSTEM_LABEL,
  accuracyColorClass,
  activeColumn,
  formatPercent,
  type SystemKey,
} from './systems';

interface StudyGoldStandardSectionProps {
  studyId: string;
  metrics?: StudyGoldStandardResponse;
  isError: boolean;
  onRetry: () => void;
  /** System shown on narrow screens, where only one fits; wide screens show all four. */
  activeSystem: SystemKey;
}

const ROW = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border bg-card px-4 py-3';
const TH = 'px-4 py-3 font-medium text-muted-foreground';
const percentOrDash = (value: number | null | undefined) => (value != null ? formatPercent(value) : '—');

export function StudyGoldStandardSection({ studyId, metrics, isError, onRetry, activeSystem }: StudyGoldStandardSectionProps) {
  const { t } = useTranslation();

  if (isError) {
    return (
      <section aria-labelledby="gold-heading" className={ROW}>
        <div className="min-w-0">
          <h2 id="gold-heading" className="text-base font-semibold text-foreground">{t('admin.studies.goldStandard.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin.studies.goldStandard.loadFailed')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>{t('admin.studies.reliability.retry')}</Button>
      </section>
    );
  }

  if (!metrics) return null;

  if (metrics.cases_with_gold === 0) {
    return (
      <section aria-labelledby="gold-heading" className={ROW}>
        <div className="min-w-0">
          <h2 id="gold-heading" className="text-base font-semibold text-foreground">{t('admin.studies.goldStandard.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin.studies.goldStandard.noCasesWithGold')}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/studies/${studyId}/edit`}>{t('admin.studies.goldStandard.setGoldStandards')}</Link>
        </Button>
      </section>
    );
  }

  const sortedCases = [...metrics.per_case_accuracy].sort((a, b) => a.case_order - b.case_order);
  const hardCases = sortedCases.filter((c) => c.is_hard_case).length;
  const hardCaseLabel = t('admin.reliability.hardCase');

  return (
    <section aria-labelledby="gold-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="gold-heading" className="text-base font-semibold text-foreground">{t('admin.studies.goldStandard.title')}</h2>
        <p className="text-sm tabular-nums text-muted-foreground">
          {t('admin.studies.goldStandard.casesWithGold', { count: metrics.cases_with_gold, total: metrics.total_cases })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        {SYSTEM_KEYS.map((system) => {
          const agg = metrics[`${system}_accuracy`];
          return (
            <div key={system} className="min-w-0 bg-card p-4">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2 shrink-0" style={{ backgroundColor: SYSTEM_COLOR[system] }} />
                {SYSTEM_LABEL[system]}
              </p>
              {agg ? (
                <>
                  <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accuracyColorClass(agg.mean_accuracy))}>
                    {formatPercent(agg.mean_accuracy)}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {t('admin.studies.goldStandard.casesEvaluated', { count: agg.cases_evaluated })}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {t('admin.studies.goldStandard.consensus', {
                      rate: formatPercent(agg.consensus_rate),
                      correct: agg.consensus_correct,
                      total: agg.consensus_total,
                    })}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-2xl font-semibold text-muted-foreground">—</p>
              )}
            </div>
          );
        })}
      </div>

      {hardCases > 0 && (
        <p className="flex items-start gap-2 text-sm text-foreground">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {t('admin.studies.goldStandard.hardCases', { count: hardCases, threshold: HARD_CASE_ACCURACY_PCT })}
        </p>
      )}

      <MethodNote lead={t('admin.studies.goldStandard.method.lead')}>
        <p>{t('admin.studies.goldStandard.method.consensus')}</p>
        <p>{t('admin.studies.goldStandard.method.hardCase', { threshold: HARD_CASE_ACCURACY_PCT })}</p>
        <p>{t('admin.studies.goldStandard.method.perRater')}</p>
      </MethodNote>

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-foreground">{t('admin.studies.goldStandard.perCaseAccuracy')}</h3>
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="md:hidden">
            <SystemListHead label={t('admin.studies.goldStandard.case')} system={activeSystem} />
            <div className="divide-y">
              {sortedCases.map((pca) => (
                <div key={pca.case_id} className={cn('flex items-center justify-between gap-3 px-4 py-3', pca.is_hard_case && 'bg-warning/10')}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">{formatNumber(pca.case_order, 0)}</span>
                    <Link to={caseReportPath(pca.case_id)} className={cn('truncate', CASE_LINK)}>{pca.case_title}</Link>
                    {pca.is_hard_case && (
                      <AlertTriangle role="img" aria-label={hardCaseLabel} className="size-4 shrink-0 text-warning" />
                    )}
                  </div>
                  {pca.has_gold_standard ? (
                    <span className={cn('shrink-0 text-base font-semibold tabular-nums', accuracyColorClass(pca[`${activeSystem}_accuracy`]))}>
                      {percentOrDash(pca[`${activeSystem}_accuracy`])}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">{t('admin.studies.goldStandard.noGoldStandard')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className={cn(TH, 'w-12 text-left')}>#</th>
                  <th className={cn(TH, 'text-left')}>{t('admin.studies.goldStandard.case')}</th>
                  <SystemColumnHeads active={activeSystem} />
                </tr>
              </thead>
              <tbody>
                {sortedCases.map((pca) => (
                  <tr key={pca.case_id} className={cn('border-b last:border-0', pca.is_hard_case && 'bg-warning/10')}>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatNumber(pca.case_order, 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={caseReportPath(pca.case_id)} className={CASE_LINK}>{pca.case_title}</Link>
                        {pca.is_hard_case && (
                          <AlertTriangle role="img" aria-label={hardCaseLabel} className="size-4 shrink-0 text-warning" />
                        )}
                      </div>
                    </td>
                    {pca.has_gold_standard ? (
                      SYSTEM_KEYS.map((key) => (
                        <td key={key} className={cn('px-4 py-3 text-right font-medium tabular-nums', accuracyColorClass(pca[`${key}_accuracy`]), activeColumn(key, activeSystem))}>
                          {percentOrDash(pca[`${key}_accuracy`])}
                        </td>
                      ))
                    ) : (
                      <td colSpan={4} className="px-4 py-3 text-right text-muted-foreground">
                        {t('admin.studies.goldStandard.noGoldStandard')}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {metrics.per_rater_accuracy && metrics.per_rater_accuracy.length > 0 && (
        <PerRaterAccuracyTable raters={metrics.per_rater_accuracy} activeSystem={activeSystem} />
      )}
    </section>
  );
}

function PerRaterAccuracyTable({ raters, activeSystem }: { raters: PerRaterAccuracy[]; activeSystem: SystemKey }) {
  const { t } = useTranslation();
  const [anonymous, setAnonymous] = useState(false);
  const switchId = useId();

  // The backend returns raters in map order; sort by id so "Rater n" stays the same rater and leaks no name order.
  const sorted = [...raters].sort((a, b) => a.user_id.localeCompare(b.user_id));
  const name = (rater: PerRaterAccuracy, i: number) =>
    anonymous
      ? t('admin.studies.goldStandard.raterN', { n: i + 1 })
      : rater.user_display_name || rater.user_email || `${rater.user_id.slice(0, 8)}…`;
  const email = (rater: PerRaterAccuracy) => !anonymous && rater.user_display_name && rater.user_email;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="text-sm font-semibold text-foreground">{t('admin.studies.goldStandard.perRaterAccuracy')}</h3>
        <label htmlFor={switchId} className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
          <Switch id={switchId} checked={anonymous} onCheckedChange={setAnonymous} className="transition-colors" />
          {t('admin.studies.goldStandard.anonymise')}
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="md:hidden">
          <SystemListHead label={t('admin.studies.goldStandard.rater')} system={activeSystem} />
          <div className="divide-y">
            {sorted.map((rater, i) => (
              <div key={rater.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{name(rater, i)}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {t('admin.reliability.casesCount', { count: rater.cases_completed })}
                  </p>
                </div>
                <span className={cn('shrink-0 text-base font-semibold tabular-nums', accuracyColorClass(rater[`${activeSystem}_accuracy`]))}>
                  {percentOrDash(rater[`${activeSystem}_accuracy`])}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className={cn(TH, 'text-left')}>{t('admin.studies.goldStandard.rater')}</th>
                <th className={cn(TH, 'text-right')}>{t('admin.studies.goldStandard.casesCompleted')}</th>
                <SystemColumnHeads active={activeSystem} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((rater, i) => (
                <tr key={rater.user_id} className="border-b last:border-0">
                  <td className="max-w-[16rem] px-4 py-3">
                    <p className="truncate font-medium text-foreground">{name(rater, i)}</p>
                    {email(rater) && <p className="truncate text-xs text-muted-foreground">{rater.user_email}</p>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(rater.cases_completed, 0)}</td>
                  {SYSTEM_KEYS.map((key) => (
                    <td key={key} className={cn('px-4 py-3 text-right font-medium tabular-nums', accuracyColorClass(rater[`${key}_accuracy`]), activeColumn(key, activeSystem))}>
                      {percentOrDash(rater[`${key}_accuracy`])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
