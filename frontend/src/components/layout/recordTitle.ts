import { createContext, useContext, useEffect } from 'react';

export const RecordTitleContext = createContext<(title: string | undefined) => void>(() => {});

/** useRecordTitle shows the title of the case or study a nested page is about in its breadcrumb. */
export function useRecordTitle(title: string | undefined) {
  const set = useContext(RecordTitleContext);
  useEffect(() => {
    set(title);
    return () => set(undefined);
  }, [set, title]);
}
