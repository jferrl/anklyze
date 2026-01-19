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

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderCount = useRef(0);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(null);
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
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (containerRef.current && renderCount.current === currentRender) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setIsLoading(false);
        }
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className={className}>
        <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-destructive font-medium">Error rendering diagram</p>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading diagram...</p>
        </div>
      )}
      <div
        ref={containerRef}
        data-slot="mermaid-diagram"
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
}
