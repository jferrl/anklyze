import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseMetrics } from '@/types';

import { CASE_LINK, caseReportPath } from './caseLink';
import { LOW_AGREEMENT_PCT, agreementColorClass, formatPercent, type SystemKey } from './systems';

interface CaseMetricCardProps {
  metrics: CaseMetrics;
  activeSystem: SystemKey;
}

export function CaseMetricCard({ metrics, activeSystem }: CaseMetricCardProps) {
  const { t } = useTranslation();
  const agreement = metrics[`${activeSystem}_agreement`];

  return (
    <div className={cn('px-4 py-3', metrics.is_low_agreement && 'bg-warning/10')}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">{metrics.case_order}</span>
          <Link to={caseReportPath(metrics.case_id)} className={cn('truncate', CASE_LINK)}>
            {metrics.case_title}
          </Link>
        </div>
        {metrics.is_low_agreement && (
          <AlertCircle
            role="img"
            aria-label={t('admin.reliability.lowAgreement', { threshold: formatPercent(LOW_AGREEMENT_PCT) })}
            className="h-4 w-4 shrink-0 text-warning"
          />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm tabular-nums text-muted-foreground">{t('admin.analytics.responsesCount', { count: metrics.response_count })}</span>
        <span className={cn('text-base font-semibold tabular-nums', agreementColorClass(agreement))}>
          {agreement != null ? formatPercent(agreement) : '—'}
        </span>
      </div>
    </div>
  );
}
