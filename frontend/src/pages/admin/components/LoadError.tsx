import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** LoadError states that a page's data failed to load, with the server's message and a Retry button. */
export function LoadError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-lg border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">
        {error instanceof Error && error.message ? error.message : t('errors.genericError')}
      </p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RotateCw />
        {t('common.retry')}
      </Button>
    </div>
  );
}
