import { useEffect } from 'react';

/** useDocumentTitle names the browser tab after the page, most specific part first: "Study · Reliability · Anklyze". */
export function useDocumentTitle(...parts: (string | undefined)[]) {
  const title = [...parts.filter(Boolean), 'Anklyze'].join(' · ');
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
