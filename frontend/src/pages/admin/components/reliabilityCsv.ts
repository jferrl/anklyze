import type { StudyGoldStandardResponse, StudyReliabilityResponse } from '@/types';
import { SYSTEM_KEYS, SYSTEM_LABEL } from './systems';

const HEADER = [
  'system',
  'kappa',
  'ci_lower',
  'ci_upper',
  'ci_level',
  'raters',
  'cases',
  'cases_excluded',
  'mean_agreement_pct',
  'gold_standard_accuracy_pct',
];

type Cell = string | number | null | undefined;

/** csvField quotes a value per RFC 4180 when it holds a comma, quote or line break. */
export function csvField(value: Cell): string {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const mean = (values: (number | null | undefined)[]) => {
  const present = values.filter((v): v is number => v != null);
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
};

/**
 * buildReliabilityFiguresCsv writes one row per system with the figures at full precision.
 * It carries no rater names or emails. Mean agreement is the plain mean of the per-case figures of answered cases.
 */
export function buildReliabilityFiguresCsv(
  reliability: StudyReliabilityResponse,
  goldStandard?: StudyGoldStandardResponse | null
): string {
  const rows = SYSTEM_KEYS.map((key) => {
    const fleiss = reliability[`${key}_fleiss`];
    const ci = fleiss?.confidence_interval;
    return [
      SYSTEM_LABEL[key],
      fleiss?.kappa,
      ci?.lower,
      ci?.upper,
      ci?.level,
      fleiss?.num_raters,
      fleiss?.num_subjects,
      fleiss?.num_cases_excluded,
      mean(reliability.per_case_metrics.filter((c) => c.response_count > 0).map((c) => c[`${key}_agreement`])),
      goldStandard?.[`${key}_accuracy`]?.mean_accuracy,
    ];
  });
  return [HEADER, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}

/** fileSlug turns a study title into a safe, lower-case file name part. */
export function fileSlug(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return slug || 'study';
}

/** downloadText saves text as a file through a temporary object URL. */
export function downloadText(text: string, filename: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
