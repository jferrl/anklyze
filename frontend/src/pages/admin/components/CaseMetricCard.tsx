import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseMetrics } from '@/types';

// eslint-disable-next-line react-refresh/only-export-components
export function getAgreementColorClass(value: number): string {
  if (value >= 60) return 'text-success';
  if (value >= 40) return 'text-warning';
  return 'text-destructive';
}

export type ClassificationSystem = 'danis_weber' | 'lauge_hansen' | 'ao_ota' | 'bartonicek';

interface CaseMetricCardProps {
  metrics: CaseMetrics;
  activeSystem: ClassificationSystem;
}

export function CaseMetricCard({ metrics, activeSystem }: CaseMetricCardProps) {
  const { t } = useTranslation();
  const getAgreementValue = () => {
    switch (activeSystem) {
      case 'danis_weber':
        return metrics.danis_weber_agreement;
      case 'lauge_hansen':
        return metrics.lauge_hansen_agreement;
      case 'ao_ota':
        return metrics.ao_ota_agreement;
      case 'bartonicek':
        return metrics.bartonicek_agreement ?? 0;
    }
  };

  const agreement = getAgreementValue();

  return (
    <div className="py-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">{metrics.case_order}</span>
          <span className="truncate font-medium text-foreground">{metrics.case_title}</span>
        </div>
        {metrics.is_low_agreement && (
          <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm tabular-nums text-muted-foreground">{t('admin.analytics.responsesCount', { count: metrics.response_count })}</span>
        <span className={cn('text-base font-semibold tabular-nums', getAgreementColorClass(agreement))}>
          {agreement.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
