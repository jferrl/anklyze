/** CASE_LINK is the quiet underlined link used for case titles in study tables. */
export const CASE_LINK =
  'rounded-sm font-medium text-foreground underline decoration-border underline-offset-4 outline-none transition-colors duration-150 hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** caseAnalyticsPath is where a case title in a study table leads. */
export const caseAnalyticsPath = (caseId: string) => `/admin/cases/${caseId}/analytics`;
