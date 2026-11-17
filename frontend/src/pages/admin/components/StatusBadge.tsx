import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DOT: Record<string, string> = {
  draft: 'bg-input',
  published: 'bg-success',
  active: 'bg-success',
  closed: 'bg-muted-foreground',
};

/** StatusBadge renders a case or study lifecycle status as an outline badge with a status dot. */
export function StatusBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  return (
    // Size, leading and tracking are pinned so the badge looks the same inside a page title as in a table.
    <Badge variant="outline" className={cn('gap-1.5 text-xs font-normal leading-4 tracking-normal', className)}>
      <span className={cn('size-1.5 rounded-full', DOT[status] ?? 'bg-input')} />
      {label}
    </Badge>
  );
}
