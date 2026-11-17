import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** MethodNote states, next to published figures, how they were computed. */
export function MethodNote({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('max-w-[90ch] space-y-1 rounded-md border bg-muted px-3 py-2 text-sm text-foreground', className)}>
      <h3 className="font-medium">{t('admin.reliability.method.title')}</h3>
      {children}
    </div>
  );
}
