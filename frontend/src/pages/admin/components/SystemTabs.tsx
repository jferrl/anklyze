import { cn } from '@/lib/utils';
import { SYSTEM_COLOR } from './systems';

interface SystemTabsProps {
  systems: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/** SystemTabs switches between the four classification systems, each marked with its identity swatch. */
export function SystemTabs({ systems, active, onChange, className }: SystemTabsProps) {
  return (
    <div className={cn('flex w-fit flex-wrap gap-0.5 rounded-md border bg-card p-0.5', className)}>
      {systems.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={active === key}
          className={cn(
            'flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors duration-150',
            active === key
              ? 'bg-accent font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="size-2 shrink-0" style={{ backgroundColor: SYSTEM_COLOR[key] }} />
          {label}
        </button>
      ))}
    </div>
  );
}
