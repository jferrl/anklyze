import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, getAuthHeaders } from '../services/core/apiClient';
import { PanelRightOpen, PanelRightClose, X } from 'lucide-react';
import { Button } from './ui/button';
import { SvgDiagramViewer } from './SvgDiagramViewer';

export function FlowDiagramSidebar() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const lang = i18n.language === 'en' ? 'en' : 'es';
  // Admin-only endpoint, so the decision tree never ships in the public bundle; fetched on first open.
  const { data: diagramSrc, isError } = useQuery({
    queryKey: ['flow-diagram', lang],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/flow-diagram`, {
        headers: { ...(await getAuthHeaders()), 'Accept-Language': lang },
      });
      if (!res.ok) throw new Error(`flow diagram: ${res.status}`);
      return URL.createObjectURL(await res.blob());
    },
    enabled: isOpen,
    // The object URL is never revoked, so keep it for the session: at most one per language.
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <>
      {/* Below lg an edge tab would cover the form, so the toggle sits in the empty right of the app header. */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-1.5 right-4 z-50 size-9 p-0 lg:top-1/2 lg:right-(--flow-right) lg:size-auto lg:-translate-y-1/2 lg:py-4 lg:px-2 lg:rounded-r-none lg:border-r-0"
        aria-label={isOpen ? t('classify.flowDiagram.hide') : t('classify.flowDiagram.show')}
        style={{ '--flow-right': isOpen ? 'min(90vw, 1200px)' : '0px' } as CSSProperties}
      >
        <span className="flex flex-col items-center gap-3">
          {isOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
          <span className="hidden text-sm font-medium writing-mode-vertical lg:inline">
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
          {isOpen && (diagramSrc ? (
            <SvgDiagramViewer
              key={diagramSrc}
              src={diagramSrc}
              className="flex-1 flex flex-col overflow-hidden"
            />
          ) : (
            <p className="p-8 text-center text-muted-foreground">
              {isError ? t('classify.flowDiagram.loadFailed') : t('classify.flowDiagram.loading')}
            </p>
          ))}
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
