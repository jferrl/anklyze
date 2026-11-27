import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { FractureInput } from '@/types';
import { AnatomyView } from './AnatomyView';
import { useSnapshots } from './anatomySnapshots';

/**
 * AnatomySnapshotPair shows the marked AP and Lateral views the figure last drew, for the result
 * screen; it needs no WebGL and renders nothing when the figure never drew them. A view opens the
 * 3D model on it, which redraws sharp at any zoom where the pictures would blur.
 */
export function AnatomySnapshotPair({ formData, fracture = false, className }: { formData: Partial<FractureInput>; fracture?: boolean; className?: string }) {
  const { t } = useTranslation();
  const { ap, lateral, fractured } = useSnapshots();
  const [open, setOpen] = useState<'ap' | 'lateral'>();
  if (!ap || !lateral) return null;
  const views = [
    ['ap', ap, 'anatomy.model3d.ap'],
    ['lateral', lateral, 'anatomy.model3d.lateralView'],
  ] as const;
  return (
    <figure className={cn('fig-card space-y-2', className)}>
      <div className="grid grid-cols-2 gap-2">
        {views.map(([view, src, caption]) => (
          <button
            key={view}
            type="button"
            onClick={() => setOpen(view)}
            aria-label={t('anatomy.model3d.enlarge', { view: t(caption) })}
            className="cursor-zoom-in rounded-sm border bg-(--fig-plate) p-1 text-left outline-none transition-[border-color] hover:border-input focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <img src={src} alt="" className="block aspect-[5/4] w-full object-contain" />
            <span className="block px-1 pt-1 text-xs leading-4 text-muted-foreground lg:text-sm lg:leading-5">{t(caption)}</span>
          </button>
        ))}
      </div>
      <figcaption className="text-xs text-muted-foreground">{t(fractured ? 'anatomy.fractureNote' : 'anatomy.note')}</figcaption>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(undefined)}>
        {/* As wide as the screen's height allows, so the square model fits without scrolling. */}
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[min(64rem,calc(100vw-2rem),calc(100dvh+2rem))]">
          <DialogTitle>{t('anatomy.model3d.enlargeTitle')}</DialogTitle>
          {open && <AnatomyView formData={formData} showReading={false} compact view={open} fracture={fracture} className="border-0 p-0 shadow-none" />}
        </DialogContent>
      </Dialog>
    </figure>
  );
}
