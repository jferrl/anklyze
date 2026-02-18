import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
  },
});

type RenderState =
  | { status: 'loading'; error: null }
  | { status: 'ready'; error: null }
  | { status: 'error'; error: string };

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderState, setRenderState] = useState<RenderState>({ status: 'loading', error: null });
  const renderCount = useRef(0);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      renderCount.current += 1;
      const currentRender = renderCount.current;

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Generate unique ID for this render
        const id = `mermaid-diagram-${currentRender}-${Date.now()}`;

        const { svg } = await mermaid.render(id, chart);

        // Only update if this is still the current render
        if (containerRef.current && renderCount.current === currentRender) {
          containerRef.current.innerHTML = svg;
          setRenderState({ status: 'ready', error: null });
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (containerRef.current && renderCount.current === currentRender) {
          setRenderState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to render diagram' });
        }
      }
    };

    renderDiagram();
  }, [chart]);

  if (renderState.status === 'error') {
    return (
      <div className={className}>
        <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-destructive font-medium">Error rendering diagram</p>
          <p className="text-sm text-destructive/80 mt-1">{renderState.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {renderState.status === 'loading' && (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading diagram...</p>
        </div>
      )}
      <div
        ref={containerRef}
        data-slot="mermaid-diagram"
        style={{ display: renderState.status === 'loading' ? 'none' : 'block' }}
      />
    </div>
  );
}
