import { useEffect } from 'react';
import { useTimelineStore } from '../store/timeline';

export function useKeyboardShortcuts() {
  const store = useTimelineStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          store.setIsPlaying(!store.isPlaying);
          break;

        case 'k':
          if (isMeta) {
            e.preventDefault();
            // Split all clips at playhead
            const playhead = store.playheadPosition;
            Object.values(store.clips).forEach((clip) => {
              if (
                playhead > clip.startTime &&
                playhead < clip.startTime + clip.duration
              ) {
                store.splitClipAtPlayhead(clip.id);
              }
            });
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (store.selectedClipIds.length > 0) {
            e.preventDefault();
            if (e.shiftKey) {
              store.selectedClipIds.forEach((id) => store.rippleDelete(id));
            } else {
              store.selectedClipIds.forEach((id) => store.removeClip(id));
            }
            store.recalculateDuration();
          }
          break;

        case 'z':
          if (isMeta) {
            e.preventDefault();
            const temporal = useTimelineStore.temporal.getState();
            if (e.shiftKey) {
              temporal.redo();
            } else {
              temporal.undo();
            }
          }
          break;

        case 'v':
          if (!isMeta) store.setActiveTool('select');
          break;

        case 'c':
          if (!isMeta) store.setActiveTool('razor');
          break;

        case 'ArrowLeft':
          e.preventDefault();
          store.setPlayheadPosition(
            store.playheadPosition - (e.shiftKey ? 5 / 30 : 1 / 30),
          );
          break;

        case 'ArrowRight':
          e.preventDefault();
          store.setPlayheadPosition(
            store.playheadPosition + (e.shiftKey ? 5 / 30 : 1 / 30),
          );
          break;

        case '=':
        case '+':
          if (isMeta) {
            e.preventDefault();
            store.setZoom(store.zoom * 1.2);
          }
          break;

        case '-':
          if (isMeta) {
            e.preventDefault();
            store.setZoom(store.zoom / 1.2);
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);
}
