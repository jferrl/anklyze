import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import type { StudyImageInfo } from '../../types/study';

interface ImageLightboxProps {
  images: StudyImageInfo[];
  imageUrls: Record<string, string>;
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function ImageLightbox({
  images,
  imageUrls,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}: ImageLightboxProps) {
  const currentImage = images[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          className="absolute left-4 text-white/70 hover:text-white p-2"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {currentIndex < images.length - 1 && (
        <button
          className="absolute right-4 text-white/70 hover:text-white p-2"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {imageUrls[currentImage.id] ? (
          <img
            src={imageUrls[currentImage.id]}
            alt={currentImage.caption || currentImage.filename}
            className="max-w-full max-h-[85vh] object-contain"
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Caption */}
        {currentImage.caption && (
          <p className="text-white/80 mt-4 text-center">{currentImage.caption}</p>
        )}

        {/* Counter */}
        <p className="text-white/60 mt-2 text-sm">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
