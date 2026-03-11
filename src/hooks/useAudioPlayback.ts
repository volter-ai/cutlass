import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../store/timeline';
import type { TimelineClip } from '../types';

interface AudioSource {
  element: HTMLAudioElement;
  clipId: string;
  mediaFileId: string;
}

/**
 * Compute fade volume multiplier based on playhead position within a clip.
 * Returns 0-1 representing the fade envelope at the current time.
 */
function computeFadeMultiplier(clip: TimelineClip, playheadPosition: number): number {
  const elapsed = playheadPosition - clip.startTime;
  const remaining = (clip.startTime + clip.duration) - playheadPosition;

  let multiplier = 1.0;

  // Fade in
  if (clip.fadeIn > 0 && elapsed < clip.fadeIn) {
    multiplier = Math.max(0, elapsed / clip.fadeIn);
  }

  // Fade out
  if (clip.fadeOut > 0 && remaining < clip.fadeOut) {
    multiplier = Math.min(multiplier, Math.max(0, remaining / clip.fadeOut));
  }

  return multiplier;
}

/**
 * Manages multi-track audio playback using HTML audio elements.
 * Each audio clip on the timeline gets its own audio element,
 * synced to the playhead position. Supports per-clip fades and per-track volume.
 */
export function useAudioPlayback() {
  const clips = useTimelineStore((s) => s.clips);
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaFiles = useTimelineStore((s) => s.mediaFiles);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playheadPosition = useTimelineStore((s) => s.playheadPosition);

  const audioSourcesRef = useRef<Map<string, AudioSource>>(new Map());

  // Sync audio with playhead
  useEffect(() => {
    const sources = audioSourcesRef.current;

    // Build a set of linkedGroupIds that have a dedicated audio clip,
    // so the paired video clip doesn't produce double audio.
    const linkedGroupsWithAudio = new Set<string>();
    for (const clip of Object.values(clips)) {
      const track = tracks.find((t) => t.id === clip.trackId);
      if (track?.type === 'audio' && clip.linkedGroupId) {
        linkedGroupsWithAudio.add(clip.linkedGroupId);
      }
    }

    // Find all audio-contributing clips (audio tracks + video tracks with audio).
    // Skip video clips whose audio has been extracted to a linked audio clip —
    // the audio clip on the audio track is the sole audio source for that pair.
    const audioClips = Object.values(clips).filter((clip) => {
      const track = tracks.find((t) => t.id === clip.trackId);
      if (!track || track.muted) return false;
      if (track.type === 'video' && clip.linkedGroupId && linkedGroupsWithAudio.has(clip.linkedGroupId)) {
        return false;
      }
      return track.type === 'audio' || track.type === 'video';
    });

    // Create/update audio elements for active clips
    const activeClipIds = new Set<string>();

    for (const clip of audioClips) {
      const media = mediaFiles[clip.mediaFileId];
      if (!media) continue;

      const track = tracks.find((t) => t.id === clip.trackId);
      const trackVolume = track?.volume ?? 1;

      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;
      const isActive = playheadPosition >= clipStart && playheadPosition < clipEnd;

      if (!isActive) {
        const source = sources.get(clip.id);
        if (source) {
          source.element.pause();
        }
        continue;
      }

      activeClipIds.add(clip.id);

      let source = sources.get(clip.id);
      if (!source || source.mediaFileId !== clip.mediaFileId) {
        if (source) {
          source.element.pause();
          source.element.src = '';
        }
        const element = new Audio(media.url);
        element.preload = 'auto';
        source = { element, clipId: clip.id, mediaFileId: clip.mediaFileId };
        sources.set(clip.id, source);
      }

      const audioElement = source.element;

      // Compute final volume: clip volume * fade envelope * track master
      const fadeMultiplier = computeFadeMultiplier(clip, playheadPosition);
      audioElement.volume = Math.min(1, clip.volume * fadeMultiplier * trackVolume);

      const mediaTime = clip.mediaOffset + (playheadPosition - clipStart);

      if (isPlaying) {
        if (Math.abs(audioElement.currentTime - mediaTime) > 0.15) {
          audioElement.currentTime = mediaTime;
        }
        if (audioElement.paused) {
          audioElement.play().catch(() => {});
        }
      } else {
        audioElement.pause();
        if (Math.abs(audioElement.currentTime - mediaTime) > 0.05) {
          audioElement.currentTime = mediaTime;
        }
      }
    }

    // Cleanup audio elements for removed clips
    for (const [clipId, source] of sources) {
      if (!activeClipIds.has(clipId) && !audioClips.some((c) => c.id === clipId)) {
        source.element.pause();
        source.element.src = '';
        sources.delete(clipId);
      }
    }
  }, [clips, tracks, mediaFiles, isPlaying, playheadPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const source of audioSourcesRef.current.values()) {
        source.element.pause();
        source.element.src = '';
      }
      audioSourcesRef.current.clear();
    };
  }, []);
}
