import { useEffect } from 'react';
import { useTimelineStoreApi } from '../store/timeline';
import { saveProject, autoSaveLocal } from '../services/projects';

/** Split all clips at the current playhead position */
function splitAllAtPlayhead(store: ReturnType<ReturnType<typeof useTimelineStoreApi>['getState']>) {
  const playhead = store.playheadPosition;
  Object.values(store.clips).forEach((clip) => {
    if (playhead > clip.startTime && playhead < clip.startTime + clip.duration) {
      store.splitClipAtPlayhead(clip.id);
    }
  });
}

export function useKeyboardShortcuts() {
  const storeApi = useTimelineStoreApi();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Read fresh state on each keypress — avoids stale closures and
      // prevents the effect from re-running (and re-registering the listener)
      // on every store state change.
      const store = storeApi.getState();
      const isMeta = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          store.setIsPlaying(!store.isPlaying);
          break;

        case 'k':
          if (isMeta) {
            e.preventDefault();
            splitAllAtPlayhead(store);
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (store.selectedClipIds.length > 0) {
            e.preventDefault();
            if (e.shiftKey) {
              // Sort by startTime descending so ripple shifts don't corrupt later positions
              [...store.selectedClipIds]
                .sort((a, b) => (store.clips[b]?.startTime ?? 0) - (store.clips[a]?.startTime ?? 0))
                .forEach((id) => store.rippleDelete(id));
            } else {
              store.selectedClipIds.forEach((id) => store.removeClip(id));
            }
            store.recalculateDuration();
          } else if (store.selectedTextOverlayId) {
            e.preventDefault();
            store.removeTextOverlay(store.selectedTextOverlayId);
          }
          break;

        case 'z':
          if (isMeta) {
            e.preventDefault();
            const temporal = storeApi.temporal.getState();
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
          if (!isMeta) {
            e.preventDefault();
            splitAllAtPlayhead(store);
          }
          break;

        case 'd':
          if (isMeta && store.selectedClipIds.length > 0) {
            e.preventDefault();
            // Duplicate selected clips — preserves all clip properties (speed, volume, animation, fades)
            for (const id of [...store.selectedClipIds]) {
              store.duplicateClip(id);
            }
          }
          break;

        case 't':
          if (!isMeta) store.setActiveTool('text');
          break;

        case 's':
          if (isMeta) {
            e.preventDefault();
            // Cmd+S: save project
            if (store.currentProjectId) {
              saveProject(store.currentProjectId, store.currentProjectName, store)
                .then(() => store.markProjectSaved())
                .catch(() => {});
            } else {
              // No project yet — just auto-save locally
              autoSaveLocal(store);
              store.markProjectSaved();
            }
          } else {
            store.toggleSnap();
          }
          break;

        case 'u':
          if (!isMeta && store.selectedClipIds.length === 1) {
            const clipId = store.selectedClipIds[0];
            const clip = store.clips[clipId];
            if (clip) {
              if (clip.linkedGroupId) {
                store.unlinkClips(clipId);
              } else if (clip.type === 'video') {
                store.extractAudioFromClip(clipId);
              }
            }
          }
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

        case '?':
          store.setShowHelpOverlay(!store.showHelpOverlay);
          break;

        case 'o':
          if (isMeta) {
            e.preventDefault();
            store.setShowProjectsModal(!store.showProjectsModal);
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [storeApi]); // storeApi is stable — listener registers exactly once
}
