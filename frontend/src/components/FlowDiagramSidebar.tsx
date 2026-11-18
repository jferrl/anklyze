import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelRightOpen, PanelRightClose, X } from 'lucide-react';
import { Button } from './ui/button';
import { SvgDiagramViewer } from './SvgDiagramViewer';

export function FlowDiagramSidebar() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // Built per language by scripts/build_flow_diagram.py; Spanish is the source.
  const diagramSrc = `/classification-flow.${i18n.language === 'en' ? 'en' : 'es'}.svg`;

  return (
    <>
      {/* Toggle Button - Always visible on right edge */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-1/2 -translate-y-1/2 z-50 h-auto py-4 px-2 rounded-r-none border-r-0"
        aria-label={isOpen ? t('classify.flowDiagram.hide') : t('classify.flowDiagram.show')}
        style={{ right: isOpen ? 'min(90vw, 1200px)' : '0' }}
      >
        <span className="flex flex-col items-center gap-3">
          {isOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
          <span className="text-sm font-medium writing-mode-vertical">
            {t('classify.flowDiagram.title')}
          </span>
        </span>
      </Button>

      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-12 bottom-0 z-40 bg-background border-l transform transition-transform duration-150 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 'min(90vw, 1200px)' }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between gap-4 shrink-0">
            <div>
              <h2 className="text-base font-semibold">{t('classify.flowDiagram.title')}</h2>
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
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Diagram Content — SVG viewer with pan/zoom */}
          {isOpen && (
            <SvgDiagramViewer
              src={diagramSrc}
              className="flex-1 flex flex-col overflow-hidden"
            />
          )}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        />
      )}
    </>
  );
}
