import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelRightOpen, PanelRightClose, X, ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';
import { Button } from './ui/button';
import { MermaidDiagram } from './MermaidDiagram';
import { flowchartEN } from '../data/flowcharts/en';
import { flowchartES } from '../data/flowcharts/es';

export function FlowDiagramSidebar() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentChart = i18n.language === 'es' ? flowchartES : flowchartEN;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);
  const handleFitToScreen = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      setZoom(0.5);
    }
  };

  return (
    <>
      {/* Toggle Button - Always visible on right edge */}
      <Button
        variant="default"
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-1/2 -translate-y-1/2 z-50 h-auto py-6 px-3 rounded-l-xl rounded-r-none border-r-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:px-4"
        aria-label={isOpen ? t('classify.flowDiagram.hide') : t('classify.flowDiagram.show')}
        style={{ right: isOpen ? 'min(90vw, 1200px)' : '0' }}
      >
        <span className="flex flex-col items-center gap-3">
          {isOpen ? (
            <PanelRightClose className="h-6 w-6" />
          ) : (
            <PanelRightOpen className="h-6 w-6" />
          )}
          <span className="text-sm font-semibold writing-mode-vertical">
            {t('classify.flowDiagram.title')}
          </span>
        </span>
      </Button>

      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-16 bottom-0 z-40 bg-background border-l shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 'min(90vw, 1200px)' }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-muted/30 flex items-center justify-between gap-4 shrink-0">
            <div>
              <h2 className="font-semibold text-lg">{t('classify.flowDiagram.title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t('classify.flowDiagram.description')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label={t('classify.flowDiagram.hide')}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-2 border-b bg-muted/10 flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
                disabled={zoom <= 0.25}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-14 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleResetZoom}
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleFitToScreen}
              title="Fit to Screen"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          {/* Diagram Content - Scrollable in both directions */}
          <div ref={containerRef} className="flex-1 overflow-auto p-4">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                transition: 'transform 0.2s ease-out',
              }}
            >
              <MermaidDiagram
                chart={currentChart}
                className="min-w-max"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
