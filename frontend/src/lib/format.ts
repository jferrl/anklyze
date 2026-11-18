import i18n from '@/i18n/config';

const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

const fixed = (digits: number, language: string) =>
  new Intl.NumberFormat(language, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** formatKappa prints a kappa or a CI bound with two decimals in the interface language ("0,38" in es), negatives with a true minus ("−0.10"). */
export function formatKappa(value: number, language: string = i18n.language): string {
  return fixed(2, language).format(value).replace('-', '−');
}

/** formatNumber prints a figure with a fixed number of decimals in the interface language. */
export function formatNumber(value: number, digits: number, language: string = i18n.language): string {
  return fixed(digits, language).format(value);
}

/** formatPercent prints a 0-100 percentage with one decimal ("66.7%", "66,7 %" in es). */
export function formatPercent(value: number, language: string = i18n.language): string {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/** formatDuration prints milliseconds as whole seconds under a minute, else minutes with one decimal ("45 sec", "2.5 min"). */
export function formatDuration(ms: number, language: string = i18n.language): string {
  const seconds = ms / 1000;
  const [value, unit, digits] = seconds < 60 ? [Math.round(seconds), 'second', 0] : [seconds / 60, 'minute', 1];
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** formatDate renders a date the same way everywhere, in the interface language. */
export function formatDate(value: string | number | Date, language: string): string {
  return new Intl.DateTimeFormat(language, DATE).format(new Date(value));
}

/** formatDateTime is formatDate plus hours and minutes. */
export function formatDateTime(value: string | number | Date, language: string): string {
  return new Intl.DateTimeFormat(language, { ...DATE, hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
