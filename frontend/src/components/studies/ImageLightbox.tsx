import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import type { CaseImageInfo } from '@/types';
import { Spinner } from '../ui/spinner';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '../ui/carousel';

interface ImageLightboxProps {
  images: CaseImageInfo[];
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

  const handleCarouselChange = useCallback(
    (api: CarouselApi) => {
      if (!api) return;

      api.on('select', () => {
        const newIndex = api.selectedScrollSnap();
        if (newIndex > currentIndex) {
          onNext();
        } else if (newIndex < currentIndex) {
          onPrev();
        }
      });
    },
    [currentIndex, onNext, onPrev]
  );

  // Preload neighboring images for instant carousel swiping
  useEffect(() => {
    const neighbors = [currentIndex - 1, currentIndex + 1];
    for (const idx of neighbors) {
      if (idx >= 0 && idx < images.length) {
        const url = imageUrls[images[idx].id];
        if (url) {
          const img = new Image();
          img.src = url;
        }
      }
    }
  }, [currentIndex, images, imageUrls]);

  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Carousel */}
      <div
        role="presentation"
        className="w-full max-w-5xl px-12"
        onClick={(e) => e.stopPropagation()}
      >
        <Carousel
          opts={{
            startIndex: currentIndex,
            loop: false,
          }}
          setApi={handleCarouselChange}
          className="w-full"
        >
          <CarouselContent>
            {images.map((image) => (
              <CarouselItem key={image.id}>
                <div className="flex flex-col items-center justify-center h-[85vh]">
                  {imageUrls[image.id] ? (
                    <img
                      src={imageUrls[image.id]}
                      alt={image.filename}
                      className="max-w-full max-h-[75vh] object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                      <Spinner size="lg" className="text-white/60" />
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="left-0 bg-white/10 hover:bg-white/20 border-white/20 text-white" />
          <CarouselNext className="right-0 bg-white/10 hover:bg-white/20 border-white/20 text-white" />
        </Carousel>

        {/* Counter */}
        <p className="text-white/60 mt-4 text-sm text-center">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
