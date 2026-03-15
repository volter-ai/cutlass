import { useEffect, useRef } from 'react';
import { useTimelineStore, useTimelineStoreApi } from '../store/timeline';
import type { TimelineState } from '../store/timeline';

/** Compute the actual content end (no padding) from clips and overlays. */
function getContentEnd(state: TimelineState): number {
  let end = 0;
  for (const c of Object.values(state.clips)) end = Math.max(end, c.startTime + c.duration);
  for (const o of Object.values(state.textOverlays)) end = Math.max(end, o.startTime + o.duration);
  for (const o of Object.values(state.drawingOverlays)) end = Math.max(end, o.startTime + o.duration);
  return end;
}

export function usePlayback() {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const setPlayheadPosition = useTimelineStore((s) => s.setPlayheadPosition);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const storeApi = useTimelineStoreApi();
  const lastFrameRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameRef.current = performance.now();

    function tick(now: number) {
      // Clamp delta to prevent huge playhead jumps after tab switch
      const delta = Math.min((now - lastFrameRef.current) / 1000, 0.1);
      lastFrameRef.current = now;

      const state = storeApi.getState();
      const newPosition = state.playheadPosition + delta;
      const contentEnd = getContentEnd(state);

      if (contentEnd === 0 || newPosition >= contentEnd) {
        setPlayheadPosition(0);
        setIsPlaying(false);
        return;
      }

      setPlayheadPosition(newPosition);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, setPlayheadPosition, setIsPlaying, storeApi]);
}
