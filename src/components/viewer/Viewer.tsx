import { useRef, useEffect, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import type { TimelineClip } from '../../types';

export function Viewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const playheadPosition = useTimelineStore((s) => s.playheadPosition);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const clips = useTimelineStore((s) => s.clips);
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaFiles = useTimelineStore((s) => s.mediaFiles);

  // Find the active video clip at the current playhead position
  const videoTracks = tracks.filter((t) => t.type === 'video');
  const activeClip = videoTracks.reduce<TimelineClip | null>(
    (found, track) => {
      if (found) return found;
      return (
        Object.values(clips).find(
          (c) =>
            c.trackId === track.id &&
            playheadPosition >= c.startTime &&
            playheadPosition < c.startTime + c.duration,
        ) ?? null
      );
    },
    null,
  );

  const activeMedia = activeClip ? mediaFiles[activeClip.mediaFileId] : null;

  // Sync video element with playhead
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip || !activeMedia) return;

    if (video.src !== activeMedia.url) {
      video.src = activeMedia.url;
    }

    const mediaTime = activeClip.mediaOffset + (playheadPosition - activeClip.startTime);

    if (!isPlaying) {
      video.pause();
      // Only seek if significantly different (avoid jitter)
      if (Math.abs(video.currentTime - mediaTime) > 0.05) {
        video.currentTime = mediaTime;
      }
    } else {
      if (Math.abs(video.currentTime - mediaTime) > 0.2) {
        video.currentTime = mediaTime;
      }
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  }, [playheadPosition, isPlaying, activeClip, activeMedia]);

  // Pause video when no active clip
  useEffect(() => {
    if (!activeClip && videoRef.current) {
      videoRef.current.pause();
    }
  }, [activeClip]);

  const handleFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full relative"
      style={{ background: '#000' }}
    >
      {/* Viewer Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Program
        </span>
        <button
          onClick={handleFullscreen}
          className="p-1 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Maximize2 size={12} />
        </button>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {activeMedia ? (
          <video
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            muted
            playsInline
          />
        ) : (
          <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">No clip at playhead</p>
            <p className="text-xs mt-1">Import media and add to the timeline</p>
          </div>
        )}
      </div>
    </div>
  );
}
