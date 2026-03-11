import type { TimelineState } from '../store/timeline';

// --- Operation Types ---

export type AIEditOperation =
  | { type: 'remove-clip'; clipId: string; reason: string }
  | { type: 'ripple-delete'; clipId: string; reason: string }
  | { type: 'split-at-time'; time: number; reason: string }
  | { type: 'trim-clip-start'; clipId: string; newStartTime: number; reason: string }
  | { type: 'trim-clip-end'; clipId: string; newEndTime: number; reason: string }
  | { type: 'move-clip'; clipId: string; newStartTime: number; reason: string }
  | { type: 'set-speed'; clipId: string; speed: number; reason: string }
  | { type: 'set-volume'; clipId: string; volume: number; reason: string }
  | { type: 'add-text-overlay'; trackId: string; startTime: number; duration: number; text: string; reason: string }
  | { type: 'remove-text-overlay'; overlayId: string; reason: string }
  | { type: 'add-transition'; clipId: string; edge: 'in' | 'out'; transitionType: 'cross-dissolve' | 'fade-to-black' | 'fade-from-black'; duration: number; reason: string }
  | { type: 'set-animation'; clipId: string; preset: string; reason: string }
  | { type: 'message'; text: string };

export interface AIEditResponse {
  operations: AIEditOperation[];
  summary: string;
}

// --- Human-readable descriptions ---

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function describeOperation(op: AIEditOperation, state: TimelineState): string {
  switch (op.type) {
    case 'remove-clip': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Remove "${name}" — ${op.reason}`;
    }
    case 'ripple-delete': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Ripple delete "${name}" (close gap) — ${op.reason}`;
    }
    case 'split-at-time':
      return `Split clips at ${formatTime(op.time)} — ${op.reason}`;
    case 'trim-clip-start': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Trim start of "${name}" to ${formatTime(op.newStartTime)} — ${op.reason}`;
    }
    case 'trim-clip-end': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Trim end of "${name}" to ${formatTime(op.newEndTime)} — ${op.reason}`;
    }
    case 'move-clip': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Move "${name}" to ${formatTime(op.newStartTime)} — ${op.reason}`;
    }
    case 'set-speed': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Set "${name}" speed to ${op.speed}x — ${op.reason}`;
    }
    case 'set-volume': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Set "${name}" volume to ${Math.round(op.volume * 100)}% — ${op.reason}`;
    }
    case 'add-text-overlay':
      return `Add text "${op.text}" at ${formatTime(op.startTime)} (${op.duration}s) — ${op.reason}`;
    case 'remove-text-overlay':
      return `Remove text overlay — ${op.reason}`;
    case 'add-transition': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Add ${op.transitionType} (${op.edge}) to "${name}" — ${op.reason}`;
    }
    case 'set-animation': {
      const clip = state.clips[op.clipId];
      const name = clip?.name ?? op.clipId;
      return `Set animation "${op.preset}" on "${name}" — ${op.reason}`;
    }
    case 'message':
      return op.text;
  }
}

// --- Executor ---

export function executeOperations(
  storeApi: { getState: () => TimelineState; temporal: { getState: () => { pause: () => void; resume: () => void } } },
  operations: AIEditOperation[],
): { applied: number; errors: string[] } {
  const errors: string[] = [];
  let applied = 0;

  // Pause undo tracking so all ops are a single undo step
  storeApi.temporal.getState().pause();

  try {
    for (const op of operations) {
      const store = storeApi.getState();
      try {
        switch (op.type) {
          case 'remove-clip':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.removeClip(op.clipId);
            break;

          case 'ripple-delete':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.rippleDelete(op.clipId);
            break;

          case 'split-at-time': {
            store.setPlayheadPosition(op.time);
            const clips = Object.values(store.clips);
            for (const clip of clips) {
              if (op.time > clip.startTime && op.time < clip.startTime + clip.duration) {
                store.splitClipAtPlayhead(clip.id);
              }
            }
            break;
          }

          case 'trim-clip-start':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.trimClipStart(op.clipId, op.newStartTime);
            break;

          case 'trim-clip-end':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.trimClipEnd(op.clipId, op.newEndTime);
            break;

          case 'move-clip':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.moveClip(op.clipId, op.newStartTime);
            break;

          case 'set-speed':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.setClipSpeed(op.clipId, op.speed);
            break;

          case 'set-volume':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.setClipVolume(op.clipId, op.volume);
            break;

          case 'add-text-overlay': {
            const textTrack = store.tracks.find((t) => t.type === 'text');
            const trackId = textTrack?.id ?? op.trackId;
            if (!trackId) { errors.push('No text track available'); continue; }
            const overlayId = store.addTextOverlay(trackId, op.startTime, op.text);
            store.updateTextOverlay(overlayId, { duration: op.duration });
            break;
          }

          case 'remove-text-overlay':
            store.removeTextOverlay(op.overlayId);
            break;

          case 'add-transition':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.setClipTransition(op.clipId, op.edge, {
              type: op.transitionType,
              duration: op.duration,
            });
            break;

          case 'set-animation':
            if (!store.clips[op.clipId]) { errors.push(`Clip ${op.clipId} not found`); continue; }
            store.setClipAnimation(op.clipId, {
              preset: op.preset as import('../types').AnimationPreset,
            });
            break;

          case 'message':
            // No-op — display only
            continue;
        }
        applied++;
      } catch (err) {
        errors.push(`${op.type}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    storeApi.getState().recalculateDuration();
  } finally {
    storeApi.temporal.getState().resume();
  }

  return { applied, errors };
}
