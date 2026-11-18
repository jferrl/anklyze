import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MethodNoteProps {
  children: ReactNode;
  /** One sentence shown at all times; when given, children sit behind a disclosure (always printed). */
  lead?: ReactNode;
  className?: string;
}

/** MethodNote states, next to published figures, how they were computed. */
export function MethodNote({ children, lead, className }: MethodNoteProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className={cn('max-w-[70ch] space-y-1 rounded-md border bg-muted px-3 py-2 text-sm text-foreground', className)}>
      <h3 className="font-medium">{t('admin.reliability.method.title')}</h3>
      {lead ? (
        <>
          <p className="tabular-nums">{lead}</p>
          <div id={id} className={cn('space-y-1', open ? 'animate-fade-in' : 'hidden print:block')}>
            {children}
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
            className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring print:hidden"
          >
            {open ? t('admin.reliability.method.less') : t('admin.reliability.method.more')}
            <ChevronDown aria-hidden className={cn('size-4 transition-transform duration-150', open && 'rotate-180')} />
          </button>
        </>
      ) : (
        children
      )}
    </div>
  );
}
