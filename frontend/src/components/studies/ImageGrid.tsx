import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getImageSignedURL } from '@/services';
import type { CaseImageInfo } from '@/types';

interface ImageGridProps {
  images: CaseImageInfo[];
  caseId: string;
  onImageClick: (index: number) => void;
  onUrlResolved?: (imageId: string, url: string) => void;
}

function LazyImage({
  image,
  caseId,
  index,
  onImageClick,
  onUrlResolved,
}: {
  image: CaseImageInfo;
  caseId: string;
  index: number;
  onImageClick: (index: number) => void;
  onUrlResolved?: (imageId: string, url: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getImageSignedURL(caseId, image.id)
      .then((res) => {
        if (!cancelled) {
          setUrl(res.url);
          onUrlResolved?.(image.id, res.url);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [caseId, image.id, onUrlResolved]);

  const handleClick = () => onImageClick(index);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') onImageClick(index);
  };

  // Error state — show immediately, no retry (per user decision)
  if (error) {
    return (
      <div
        className="aspect-square rounded-lg overflow-hidden bg-muted flex flex-col items-center justify-center gap-2"
      >
        <AlertCircle className="h-6 w-6 text-destructive/60" />
        <span className="text-xs text-muted-foreground">Failed to load</span>
      </div>
    );
  }

  // Loading state — Skeleton shimmer
  if (!url) {
    return (
      <Skeleton className="aspect-square rounded-lg" />
    );
  }

  // Loaded state — render image with native lazy loading
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

export function ImageGrid({ images, caseId, onImageClick, onUrlResolved }: ImageGridProps) {
  const { t } = useTranslation();

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('studies.noImagesInCategory')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((image, index) => (
        <LazyImage
          key={image.id}
          image={image}
          caseId={caseId}
          index={index}
          onImageClick={onImageClick}
          onUrlResolved={onUrlResolved}
        />
      ))}
    </div>
  );
}
