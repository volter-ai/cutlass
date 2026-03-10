import { useEffect, useRef } from 'react';
import { useTimelineStore, useTimelineStoreApi } from '../store/timeline';

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
      const delta = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;

      const state = storeApi.getState();
      const newPosition = state.playheadPosition + delta;

      if (newPosition >= state.duration) {
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
