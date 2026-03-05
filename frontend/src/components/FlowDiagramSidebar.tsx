import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelRightOpen, PanelRightClose, X } from 'lucide-react';
import { Button } from './ui/button';
import { DrawioViewer } from './DrawioViewer';

const DIAGRAM_SRC = '/classification-flow.drawio';

export function FlowDiagramSidebar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

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

          {/* Diagram Content — draw.io viewer handles zoom/pan/toolbar */}
          <div className="flex-1 overflow-auto">
            {isOpen && (
              <DrawioViewer
                src={DIAGRAM_SRC}
                className="h-full"
              />
            )}
          </div>
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
