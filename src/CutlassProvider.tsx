import { useMemo, type ReactNode } from 'react';
import {
  TimelineStoreContext,
  createTimelineStore,
  type TimelineStore,
  type TimelineStoreOptions,
} from './store/timeline';

interface CutlassProviderProps {
  children: ReactNode;
  /** Provide an existing store instance (e.g. from a parent app) */
  store?: TimelineStore;
  /** Or provide options to create a new store */
  storeOptions?: TimelineStoreOptions;
}

/**
 * Wraps Cutlass components with a store context.
 *
 * Usage in a parent app (e.g. minimal-claude or chat):
 *
 *   // Option A: let Cutlass create its own store
 *   <CutlassProvider>
 *     <CutlassEditor />
 *   </CutlassProvider>
 *
 *   // Option B: inject an externally-created store
 *   const store = createTimelineStore({ initialTracks: myTracks });
 *   <CutlassProvider store={store}>
 *     <CutlassEditor />
 *   </CutlassProvider>
 */
export function CutlassProvider({ children, store, storeOptions }: CutlassProviderProps) {
  const resolvedStore = useMemo(
    () => store ?? createTimelineStore(storeOptions),
    [store, storeOptions],
  );

  return (
    <TimelineStoreContext.Provider value={resolvedStore}>
      {children}
    </TimelineStoreContext.Provider>
  );
}
