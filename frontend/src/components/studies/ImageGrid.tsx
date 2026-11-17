import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import type { CaseImageInfo } from '@/types';

interface ImageGridProps {
  images: CaseImageInfo[];
  imageUrls: Record<string, string>;
  isLoadingUrls: boolean;
  onImageClick: (index: number) => void;
}

// Thumbnails sit on the black image well in both themes, so they use fixed neutrals, not theme tokens.
const THUMB = 'aspect-square overflow-hidden rounded-md border border-neutral-800 bg-neutral-900';

function GridImage({
  image,
  url,
  isLoadingUrls,
  index,
  onImageClick,
}: {
  image: CaseImageInfo;
  url: string | undefined;
  isLoadingUrls: boolean;
  index: number;
  onImageClick: (index: number) => void;
}) {
  const { t } = useTranslation();
  const handleClick = () => onImageClick(index);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') onImageClick(index);
  };

  // Still loading batch URLs
  if (isLoadingUrls) {
    return <Skeleton className="aspect-square rounded-md bg-neutral-900" />;
  }

  // Batch loaded but this image has no URL (generation failed server-side)
  if (!url) {
    return (
      <div className={`${THUMB} flex flex-col items-center justify-center gap-2`}>
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-xs text-neutral-400">{t('cases.imageLoadFailed')}</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${THUMB} cursor-zoom-in transition-colors duration-150 hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <img
        src={url}
        alt={image.filename}
        loading="lazy"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

export function ImageGrid({ images, imageUrls, isLoadingUrls, onImageClick }: ImageGridProps) {
  const { t } = useTranslation();

  if (!isLoadingUrls && images.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-neutral-400">
        {t('studies.noImagesInCategory')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {images.map((image, index) => (
        <GridImage
          key={image.id}
          image={image}
          url={imageUrls[image.id]}
          isLoadingUrls={isLoadingUrls}
          index={index}
          onImageClick={onImageClick}
        />
      ))}
    </div>
  );
}
