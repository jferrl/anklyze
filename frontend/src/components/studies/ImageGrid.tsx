import { useTranslation } from 'react-i18next';
import { ImageIcon, Loader2 } from 'lucide-react';
import type { StudyImageInfo } from '../../types/study';

interface ImageGridProps {
  images: StudyImageInfo[];
  imageUrls: Record<string, string>;
  loading: boolean;
  onImageClick: (index: number) => void;
}

export function ImageGrid({ images, imageUrls, loading, onImageClick }: ImageGridProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        <div
          key={image.id}
          className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => onImageClick(index)}
        >
          {imageUrls[image.id] ? (
            <img
              src={imageUrls[image.id]}
              alt={image.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
