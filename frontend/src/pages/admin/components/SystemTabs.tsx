import { useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SYSTEM_COLOR, SYSTEM_KEYS, SYSTEM_LABEL, activeColumn, type SystemKey } from './systems';

interface SystemTabsProps {
  systems: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
  /** Id of the tabpanel the tabs control; tab ids become `${panelId}-tab-${key}`. */
  panelId?: string;
}

/** SystemColumnHeads renders one right-aligned table header per system, in display order; active is highlighted. */
export function SystemColumnHeads({ active }: { active?: SystemKey }) {
  return SYSTEM_KEYS.map((key) => (
    <th
      key={key}
      className={cn('py-3 px-4 text-right font-medium', key === active ? 'text-foreground' : 'text-muted-foreground', activeColumn(key, active))}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2" style={{ backgroundColor: SYSTEM_COLOR[key] }} />
        {SYSTEM_LABEL[key]}
      </span>
    </th>
  ));
}

/** SystemListHead heads a one-system list on narrow screens: what the rows are, and which system the figure is for. */
export function SystemListHead({ label, system }: { label: string; system: SystemKey }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2" style={{ backgroundColor: SYSTEM_COLOR[system] }} />
        {SYSTEM_LABEL[system]}
      </span>
    </div>
  );
}

/** SystemTabs is a tablist of the four classification systems, each marked with its identity swatch. */
export function SystemTabs({ systems, active, onChange, className, panelId }: SystemTabsProps) {
  const { t } = useTranslation();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move and select (automatic activation); only the selected tab is in the tab order.
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const n = systems.length;
    const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(systems[next].key);
    tabs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t('admin.reliability.classificationSystem')}
      className={cn('grid grid-cols-2 gap-0.5 rounded-md border bg-card p-0.5 sm:flex sm:w-fit sm:max-w-full sm:flex-wrap', className)}
    >
      {systems.map(({ key, label }, i) => (
        <button
          key={key}
          ref={(el) => { tabs.current[i] = el; }}
          type="button"
          role="tab"
          id={panelId && `${panelId}-tab-${key}`}
          aria-controls={panelId}
          aria-selected={active === key}
          tabIndex={active === key ? 0 : -1}
          onClick={() => onChange(key)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className={cn(
            'flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring',
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
