import { useEffect, useRef, useState } from 'react';

interface DrawioViewerProps {
  src: string;
  className?: string;
}

type LoadState = 'loading' | 'ready' | 'error';

export function DrawioViewer({ src, className }: DrawioViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Failed to fetch diagram: ${response.status}`);
        const xml = await response.text();

        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = '';

        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.minHeight = '600px';
        iframe.setAttribute('frameBorder', '0');

        // Use srcdoc to avoid deprecated doc.write().
        // The iframe loads a minimal HTML shell, then we inject the
        // data-mxgraph attribute and viewer script via DOM API to
        // sidestep HTML-attribute escaping issues with large XML.
        iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; overflow: hidden; }
    .mxgraph { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="diagram" class="mxgraph"></div>
</body>
</html>`;

        iframe.addEventListener('load', () => {
          if (cancelled) return;

          const doc = iframe.contentDocument;
          if (!doc) {
            setErrorMsg('Cannot access iframe document');
            setState('error');
            return;
          }

          const diagramDiv = doc.getElementById('diagram');
          if (!diagramDiv) {
            setErrorMsg('Diagram container not found');
            setState('error');
            return;
          }

          diagramDiv.setAttribute(
            'data-mxgraph',
            JSON.stringify({
              highlight: '#0000ff',
              nav: true,
              resize: true,
              toolbar: 'zoom layers lightbox',
              'auto-fit': true,
              zoom: 0.8,
              xml,
            })
          );

          const script = doc.createElement('script');
          script.src = 'https://viewer.diagrams.net/js/viewer-static.min.js';
          doc.body.appendChild(script);

          setState('ready');
        });

        containerRef.current.appendChild(iframe);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load diagram');
          setState('error');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [src]);

  if (state === 'error') {
    return (
      <div className={className}>
        <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-destructive font-medium">Error loading diagram</p>
          <p className="text-sm text-destructive/80 mt-1">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {state === 'loading' && (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading diagram...</p>
        </div>
      )}
      <div ref={containerRef} style={{ height: '100%' }} />
    </div>
  );
}
