import { useCallback } from 'react';
import { Volume2, VolumeX, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { TimelineClipComponent } from './TimelineClip';
import type { Track } from '../../types';

interface Props {
  track: Track;
}

export function TimelineTrack({ track }: Props) {
  const clips = useTimelineStore((s) => s.clips);
  const zoom = useTimelineStore((s) => s.zoom);
  const duration = useTimelineStore((s) => s.duration);
  const { toggleTrackMute, toggleTrackLock, addClipToTrack, clearSelection } =
    useTimelineStore();

  const trackClips = Object.values(clips)
    .filter((c) => c.trackId === track.id)
    .sort((a, b) => a.startTime - b.startTime);

  const totalWidth = duration * zoom;
  const isVideo = track.type === 'video';

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const mediaFileId = e.dataTransfer.getData('application/x-cutlass-media');
      if (!mediaFileId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (e.currentTarget.scrollLeft ?? 0);
      const startTime = Math.max(0, x / zoom);
      addClipToTrack(mediaFileId, track.id, startTime);
    },
    [zoom, track.id, addClipToTrack],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  return (
    <div className="flex" style={{ height: track.height }}>
      {/* Track header */}
      <div
        className="flex items-center gap-1 px-2 flex-shrink-0 border-r border-b"
        style={{
          width: 100,
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        <span
          className="text-xs font-semibold w-6"
          style={{ color: isVideo ? 'var(--bg-clip-video)' : 'var(--bg-clip-audio)' }}
        >
          {track.name}
        </span>

        <button
          onClick={() => toggleTrackMute(track.id)}
          className="p-0.5 rounded transition-colors hover:opacity-80"
          style={{ color: track.muted ? 'var(--playhead)' : 'var(--text-secondary)' }}
          title={track.muted ? 'Unmute' : 'Mute'}
        >
          {isVideo ? (
            track.muted ? <EyeOff size={11} /> : <Eye size={11} />
          ) : (
            track.muted ? <VolumeX size={11} /> : <Volume2 size={11} />
          )}
        </button>

        <button
          onClick={() => toggleTrackLock(track.id)}
          className="p-0.5 rounded transition-colors hover:opacity-80"
          style={{ color: track.locked ? 'var(--filler-highlight)' : 'var(--text-secondary)' }}
          title={track.locked ? 'Unlock' : 'Lock'}
        >
          {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>

      {/* Track content */}
      <div
        className="relative flex-1 border-b"
        style={{
          borderColor: 'var(--border)',
          background:
            isVideo
              ? 'rgba(59, 130, 246, 0.05)'
              : 'rgba(34, 197, 94, 0.05)',
          minWidth: totalWidth,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleTrackClick}
      >
        {trackClips.map((clip) => (
          <TimelineClipComponent key={clip.id} clip={clip} />
        ))}

        {/* Track locked overlay */}
        {track.locked && (
          <div
            className="absolute inset-0 z-30 pointer-events-auto"
            style={{ background: 'rgba(0,0,0,0.15)' }}
          />
        )}
      </div>
    </div>
  );
}
