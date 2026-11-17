import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import type { CaseImageInfo } from '@/types';

interface ImageGridProps {
  images: CaseImageInfo[];
  imageUrls: Record<string, string>;
  isLoadingUrls: boolean;
  /** Index of the image shown large. */
  index: number;
  onIndexChange: (index: number) => void;
  /** Opens the lightbox at the given index. */
  onImageClick: (index: number) => void;
}

// Everything here sits on the black image well in both themes, so it uses fixed neutrals, not theme tokens.
const OVERLAY_BUTTON =
  'absolute rounded-md bg-black/60 p-2 text-white/80 backdrop-blur-sm transition-colors duration-150 hover:bg-black/80 hover:text-white disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

/** ImageGrid shows one radiograph large with a thumbnail strip to switch between the category's images. */
export function ImageGrid({ images, imageUrls, isLoadingUrls, index, onIndexChange, onImageClick }: ImageGridProps) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  if (images.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">{t('studies.noImagesInCategory')}</p>;
  }

  const current = Math.min(index, images.length - 1);
  const image = images[current];
  const url = imageUrls[image.id];
  const multiple = images.length > 1;
  const markFailed = (id: string) => setFailed((prev) => ({ ...prev, [id]: true }));
  const go = (next: number) => {
    if (next >= 0 && next < images.length) onIndexChange(next);
  };

  // Arrows only while focus is inside the gallery; the classification form owns the other keys.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
  };

  let large;
  if (isLoadingUrls) {
    large = <Skeleton className="aspect-[4/3] w-full rounded-none bg-neutral-900" />;
  } else if (!url || failed[image.id]) {
    large = (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm text-neutral-400">{t('cases.imageLoadFailed')}</span>
      </div>
    );
  } else {
    large = (
      <>
        <button
          type="button"
          tabIndex={-1}
          className="flex w-full cursor-zoom-in justify-center"
          onClick={() => onImageClick(current)}
        >
          <img
            key={image.id}
            src={url}
            alt={image.filename}
            onError={() => markFailed(image.id)}
            className="max-w-full object-contain lg:max-h-[calc(100vh-22rem)]"
          />
        </button>
        <button
          type="button"
          className={cn(OVERLAY_BUTTON, 'right-3 top-3')}
          onClick={() => onImageClick(current)}
          aria-label={t('cases.clickToEnlarge')}
          title={t('cases.clickToEnlarge')}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </>
    );
  }

  return (
    <div className="bg-neutral-950" onKeyDown={handleKeyDown}>
      <div className="relative flex min-h-48 items-center justify-center">
        {large}
        {multiple && (
          <>
            <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-neutral-400 tabular-nums">
              {current + 1} / {images.length}
            </span>
            <button
              type="button"
              className={cn(OVERLAY_BUTTON, 'left-3 top-1/2 -translate-y-1/2')}
              onClick={() => go(current - 1)}
              disabled={current === 0}
              aria-label={t('cases.gallery.previousImage')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={cn(OVERLAY_BUTTON, 'right-3 top-1/2 -translate-y-1/2')}
              onClick={() => go(current + 1)}
              disabled={current === images.length - 1}
              aria-label={t('cases.gallery.nextImage')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {multiple && (
        <div className="flex gap-2 overflow-x-auto border-t border-neutral-800 p-3">
          {images.map((img, i) => {
            const thumbUrl = imageUrls[img.id];
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={img.filename}
                aria-current={i === current}
                className={cn(
                  'h-16 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 transition-colors duration-150 hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                  i === current && 'ring-2 ring-neutral-100'
                )}
              >
                {isLoadingUrls ? (
                  <Skeleton className="h-full w-full rounded-none bg-neutral-900" />
                ) : thumbUrl && !failed[img.id] ? (
                  <img
                    src={thumbUrl}
                    alt=""
                    loading="lazy"
                    onError={() => markFailed(img.id)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AlertCircle className="mx-auto h-4 w-4 text-destructive" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
