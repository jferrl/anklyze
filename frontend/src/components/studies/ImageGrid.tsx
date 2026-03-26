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
  const handleClick = () => onImageClick(index);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') onImageClick(index);
  };

  // Still loading batch URLs
  if (isLoadingUrls) {
    return <Skeleton className="aspect-square rounded-lg" />;
  }

  // Batch loaded but this image has no URL (generation failed server-side)
  if (!url) {
    return (
      <div className="aspect-square rounded-lg overflow-hidden bg-muted flex flex-col items-center justify-center gap-2">
        <AlertCircle className="h-6 w-6 text-destructive/60" />
        <span className="text-xs text-muted-foreground">Failed to load</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-shadow"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <img
        src={url}
        alt={image.filename}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function ImageGrid({ images, imageUrls, isLoadingUrls, onImageClick }: ImageGridProps) {
  const { t } = useTranslation();

  if (!isLoadingUrls && images.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('studies.noImagesInCategory')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
