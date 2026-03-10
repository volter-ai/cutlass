import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../store/timeline';

interface AudioSource {
  element: HTMLAudioElement;
  clipId: string;
  mediaFileId: string;
}

/**
 * Manages multi-track audio playback using HTML audio elements.
 * Each audio clip on the timeline gets its own audio element,
 * synced to the playhead position.
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

    // Find all audio-contributing clips (audio tracks + video tracks with audio)
    const audioClips = Object.values(clips).filter((clip) => {
      const track = tracks.find((t) => t.id === clip.trackId);
      if (!track || track.muted) return false;
      return track.type === 'audio' || track.type === 'video';
    });

    // Create/update audio elements for active clips
    const activeClipIds = new Set<string>();

    for (const clip of audioClips) {
      const media = mediaFiles[clip.mediaFileId];
      if (!media) continue;

      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;
      const isActive = playheadPosition >= clipStart && playheadPosition < clipEnd;

      if (!isActive) {
        // Pause inactive clips
        const source = sources.get(clip.id);
        if (source) {
          source.element.pause();
        }
        continue;
      }

      activeClipIds.add(clip.id);

      let source = sources.get(clip.id);
      if (!source || source.mediaFileId !== clip.mediaFileId) {
        // Create new audio element
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
      audioElement.volume = clip.volume;

      const mediaTime = clip.mediaOffset + (playheadPosition - clipStart);

      if (isPlaying) {
        // Sync position if drifted
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
