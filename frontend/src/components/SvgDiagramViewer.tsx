import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from './ui/button';

interface SvgDiagramViewerProps {
  src: string;
  className?: string;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;

export function SvgDiagramViewer({ src, className }: SvgDiagramViewerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  useEffect(() => {
    scaleRef.current = scale;
    translateRef.current = translate;
  }, [scale, translate]);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom (trackpad) or Ctrl+scroll (mouse) → zoom toward cursor
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // Cursor position relative to container
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const prevScale = scaleRef.current;
      const prevTranslate = translateRef.current;
      const zoomFactor = 1 - e.deltaY * 0.005;
      const newScale = clampScale(prevScale * zoomFactor);
      const ratio = newScale / prevScale;

      // Adjust translate so the point under cursor stays fixed
      const newTranslate = {
        x: cx - ratio * (cx - prevTranslate.x),
        y: cy - ratio * (cy - prevTranslate.y),
      };

      setScale(newScale);
      setTranslate(newTranslate);
    } else {
      // Regular scroll/swipe → pan
      setTranslate((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - panStart.current.x),
      y: translateStart.current.y + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/20">
        <Button variant="ghost" size="icon" onClick={() => setScale((s) => clampScale(s + ZOOM_STEP))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setScale((s) => clampScale(s - ZOOM_STEP))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={resetView} title={t('classify.flowDiagram.resetZoom')}>
          <Maximize className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground ml-2">{Math.round(scale * 100)}%</span>
      </div>

      {/* Pan/Zoom area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ height: 'calc(100% - 41px)' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!loaded && (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('classify.flowDiagram.loading')}</p>
          </div>
        )}
        <img
          src={src}
          alt={t('classify.flowDiagram.title')}
          draggable={false}
          onLoad={() => setLoaded(true)}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            maxWidth: 'none',
            display: loaded ? 'block' : 'none',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  );
}
