import { useEffect, useCallback, useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.5;

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
  const { t } = useTranslation();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const [prevIndex, setPrevIndex] = useState(currentIndex);

  // Reset zoom when changing images — "adjust state during render" pattern
  // (https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  if (prevIndex !== currentIndex) {
    setPrevIndex(currentIndex);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  // Keep positionRef in sync with position state for pointer event handlers
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const isZoomed = scale > 1;

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + ZOOM_STEP, MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(s - ZOOM_STEP, MIN_SCALE);
      if (next === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && !isZoomed) onNext();
      if (e.key === 'ArrowLeft' && !isZoomed) onPrev();
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
      if (e.key === '-') { e.preventDefault(); zoomOut(); }
      if (e.key === '0') { e.preventDefault(); resetZoom(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, isZoomed, zoomIn, zoomOut, resetZoom]);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    },
    [zoomIn, zoomOut]
  );

  // Pan handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isZoomed) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isZoomed]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const newPos = {
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      };
      setPosition(newPos);
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (isZoomed) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  }, [isZoomed, resetZoom]);

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
      {/* Top bar with close + zoom controls */}
      <div className="absolute top-4 left-0 right-0 z-10 flex items-center justify-between px-4">
        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 backdrop-blur-sm">
          <button
            className="text-white/70 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            disabled={scale <= MIN_SCALE}
            aria-label={t('cases.zoomOut')}
            title={t('cases.zoomOut')}
          >
            <ZoomOut className="h-5 w-5" />
          </button>

          <button
            className="text-white/70 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors text-sm font-mono min-w-[3.5rem] text-center"
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            title={t('cases.resetZoom')}
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            className="text-white/70 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            disabled={scale >= MAX_SCALE}
            aria-label={t('cases.zoomIn')}
            title={t('cases.zoomIn')}
          >
            <ZoomIn className="h-5 w-5" />
          </button>

          {isZoomed && (
            <button
              className="text-white/70 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors ml-1 border-l border-white/10"
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              aria-label={t('cases.resetZoom')}
              title={t('cases.resetZoom')}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          className="text-white/70 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
          onClick={onClose}
          aria-label="Close lightbox"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Carousel */}
      <div
        role="presentation"
        className="w-full max-w-5xl px-12"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        <Carousel
          opts={{
            startIndex: currentIndex,
            loop: false,
            watchDrag: !isZoomed,
          }}
          setApi={handleCarouselChange}
          className="w-full"
        >
          <CarouselContent>
            {images.map((image, idx) => (
              <CarouselItem key={image.id}>
                <div className="flex flex-col items-center justify-center h-[85vh]">
                  {imageUrls[image.id] ? (
                    <div
                      className="overflow-hidden flex items-center justify-center w-full h-[75vh]"
                      style={{ cursor: isZoomed ? 'grab' : 'zoom-in' }}
                    >
                      <img
                        src={imageUrls[image.id]}
                        alt={image.filename}
                        className="max-w-full max-h-[75vh] object-contain rounded-lg select-none"
                        draggable={false}
                        onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(); }}
                        onPointerDown={idx === currentIndex ? handlePointerDown : undefined}
                        onPointerMove={idx === currentIndex ? handlePointerMove : undefined}
                        onPointerUp={idx === currentIndex ? handlePointerUp : undefined}
                        style={{
                          transform: idx === currentIndex
                            ? `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`
                            : undefined,
                          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                      <Spinner size="lg" className="text-white/60" />
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {!isZoomed && (
            <>
              <CarouselPrevious className="left-0 bg-white/10 hover:bg-white/20 border-white/20 text-white" />
              <CarouselNext className="right-0 bg-white/10 hover:bg-white/20 border-white/20 text-white" />
            </>
          )}
        </Carousel>

        {/* Counter + hint */}
        <div className="mt-4 text-center">
          <p className="text-white/60 text-sm">
            {currentIndex + 1} / {images.length}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {t('cases.zoomHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
