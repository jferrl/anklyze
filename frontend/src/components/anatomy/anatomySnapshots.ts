import { useSyncExternalStore } from 'react';

/** Snapshots are the last AP and Lateral views the figure drew, as image URLs. */
export interface Snapshots {
  ap?: string;
  lateral?: string;
}

// Module state: the result screen shows what the figure last drew, without loading three.js.
let snapshots: Snapshots = {};
const listeners = new Set<() => void>();

/** setSnapshot records one view's latest drawing. */
export function setSnapshot(view: keyof Snapshots, url: string) {
  snapshots = { ...snapshots, [view]: url };
  listeners.forEach((notify) => notify());
}

/** useSnapshots is the latest AP and Lateral drawings, updated as the figure redraws them. */
export function useSnapshots(): Snapshots {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => snapshots,
  );
}
