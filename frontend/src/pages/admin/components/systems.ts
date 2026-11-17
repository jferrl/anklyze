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

/** formatPercent prints a percentage result with one decimal, e.g. "66.7%". */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** agreementColorClass flags only values under 60%; a normal value stays foreground ink. */
export function agreementColorClass(value: number | null | undefined): string {
  return value != null && value < 60 ? 'text-warning' : '';
}

/** kappaAxisMin gives gauges shown together one axis: -1 if any value or CI bound is negative, else 0. */
export function kappaAxisMin(values: (number | null | undefined)[]): -1 | 0 {
  return values.some((v) => v != null && v < 0) ? -1 : 0;
}
