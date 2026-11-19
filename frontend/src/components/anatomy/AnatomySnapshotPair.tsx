import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useSnapshots } from './anatomySnapshots';

/**
 * AnatomySnapshotPair shows the marked AP and Lateral views the figure last drew, for the result
 * screen; it needs no WebGL and renders nothing when the figure never drew them.
 */
export function AnatomySnapshotPair({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { ap, lateral } = useSnapshots();
  if (!ap || !lateral) return null;
  const views = [
    [ap, 'anatomy.model3d.ap'],
    [lateral, 'anatomy.model3d.lateralView'],
  ] as const;
  return (
    <figure className={cn('fig-card space-y-2', className)}>
      <div className="grid grid-cols-2 gap-2">
        {views.map(([src, caption]) => (
          <div key={caption} className="rounded-sm border bg-(--fig-plate) p-1">
            <img src={src} alt={t(caption)} className="block aspect-[5/4] w-full object-contain" />
            <p className="px-1 pt-1 text-xs leading-4 text-muted-foreground lg:text-sm lg:leading-5">{t(caption)}</p>
          </div>
        ))}
      </div>
      <figcaption className="text-xs text-muted-foreground">{t('anatomy.note')}</figcaption>
    </figure>
  );
}
