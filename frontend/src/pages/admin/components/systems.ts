import type { TFunction } from 'i18next';
import { useSearchParams } from 'react-router-dom';

/** codeLabel is how a stored classification reads: the not-classifiable codes are translated, the rest shown as stored. */
export function codeLabel(t: TFunction, code: string): string {
  if (!code) return t('admin.analytics.unspecified');
  return t(`admin.analytics.codes.${code}`, { defaultValue: code });
}

/** SYSTEM_KEYS is the one display order of the classification systems. */
export const SYSTEM_KEYS = ['lauge_hansen', 'danis_weber', 'ao_ota', 'bartonicek'] as const;

export type SystemKey = (typeof SYSTEM_KEYS)[number];

/** SYSTEM_LABEL holds the proper names of the systems, which are not translated. */
export const SYSTEM_LABEL: Record<SystemKey, string> = {
  lauge_hansen: 'Lauge-Hansen',
  danis_weber: 'Danis-Weber',
  ao_ota: 'AO/OTA',
  bartonicek: 'Bartonicek',
};

/** SYSTEMS pairs each key with its label, in display order, for tab sets. */
export const SYSTEMS = SYSTEM_KEYS.map((key) => ({ key, label: SYSTEM_LABEL[key] }));

/** SYSTEM_COLOR maps a classification system key to its identity colour token. */
export const SYSTEM_COLOR: Record<string, string> = {
  danis_weber: 'var(--sys-dw)',
  lauge_hansen: 'var(--sys-lh)',
  ao_ota: 'var(--sys-ao)',
  bartonicek: 'var(--sys-bt)',
};

export { formatPercent } from '@/lib/format';

/** LOW_AGREEMENT_PCT flags rater agreement below it, as the backend's is_low_agreement does. */
export const LOW_AGREEMENT_PCT = 60;

/** HARD_CASE_ACCURACY_PCT flags gold-standard accuracy below it, as the backend's hard-case rule does. */
export const HARD_CASE_ACCURACY_PCT = 50;

/** accuracyColorClass flags gold-standard accuracy under HARD_CASE_ACCURACY_PCT. */
export function accuracyColorClass(value: number | null | undefined): string {
  return value != null && value < HARD_CASE_ACCURACY_PCT ? 'text-warning' : '';
}

/** SMALL_SAMPLE_CASES is the case count below which a kappa carries a caution line. */
export const SMALL_SAMPLE_CASES = 10;

/** agreementColorClass flags only values under LOW_AGREEMENT_PCT; a normal value stays foreground ink. */
export function agreementColorClass(value: number | null | undefined): string {
  return value != null && value < LOW_AGREEMENT_PCT ? 'text-warning' : '';
}

/**
 * activeColumn fills the table cells of the system selected in the tabs with Selected Wash, so on wide
 * screens, where every system has a column, the tabs still point the eye at one.
 */
export function activeColumn(key: SystemKey, active?: SystemKey): string {
  return key === active ? 'bg-accent' : '';
}

/** useSystemParam keeps the selected system in the URL (?system=), so a reload or a shared link keeps the tab. */
export function useSystemParam(): [SystemKey, (key: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('system');
  const system = SYSTEM_KEYS.find((key) => key === requested) ?? 'lauge_hansen';
  const setSystem = (key: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('system', key);
      return next;
    }, { replace: true });
  return [system, setSystem];
}

/** mostCommon returns the answers given most often (several on a tie), their count and the number of answers. */
export function mostCommon(counts: Record<string, number>): { answers: string[]; count: number; total: number } {
  const entries = Object.entries(counts);
  const count = Math.max(0, ...entries.map(([, n]) => n));
  return {
    answers: entries.filter(([, n]) => n === count && count > 0).map(([answer]) => answer).sort(),
    count,
    total: entries.reduce((sum, [, n]) => sum + n, 0),
  };
}

/** kappaAxisMin gives gauges shown together one axis: -1 if any value or CI bound is negative, else 0. */
export function kappaAxisMin(values: (number | null | undefined)[]): -1 | 0 {
  return values.some((v) => v != null && v < 0) ? -1 : 0;
}
