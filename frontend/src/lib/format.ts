const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** formatDate renders a date the same way everywhere, in the interface language. */
export function formatDate(value: string | number | Date, language: string): string {
  return new Intl.DateTimeFormat(language, DATE).format(new Date(value));
}

/** formatDateTime is formatDate plus hours and minutes. */
export function formatDateTime(value: string | number | Date, language: string): string {
  return new Intl.DateTimeFormat(language, { ...DATE, hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
