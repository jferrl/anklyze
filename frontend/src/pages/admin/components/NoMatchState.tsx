import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface NoMatchStateProps {
  query: string;
  /** Label of the active status filter, or undefined when no filter is set. */
  statusLabel?: string;
  onClear: () => void;
}

/** NoMatchState is the list state for a search or filter with no result, as opposed to an empty list. */
export function NoMatchState({ query, statusLabel, onClear }: NoMatchStateProps) {
  const { t } = useTranslation();
  const q = query.trim();
  const message =
    q && statusLabel
      ? t('admin.list.noMatchBoth', { query: q, status: statusLabel })
      : q
        ? t('admin.list.noMatchSearch', { query: q })
        : t('admin.list.noMatchStatus', { status: statusLabel });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-6">
      <p className="text-sm text-foreground" role="status">{message}</p>
      <Button variant="outline" size="sm" onClick={onClear}>
        {t('admin.list.clearSearch')}
      </Button>
    </div>
  );
}
