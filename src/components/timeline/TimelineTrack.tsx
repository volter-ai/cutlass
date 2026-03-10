import { useCallback } from 'react';
import { Volume2, VolumeX, Lock, Unlock, Eye, EyeOff, Type } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { TimelineClipComponent } from './TimelineClip';
import { TextOverlayClip } from './TextOverlayClip';
import type { Track } from '../../types';

interface Props {
  track: Track;
}

export function TimelineTrack({ track }: Props) {
  const clips = useTimelineStore((s) => s.clips);
  const textOverlays = useTimelineStore((s) => s.textOverlays);
  const zoom = useTimelineStore((s) => s.zoom);
  const duration = useTimelineStore((s) => s.duration);
  const activeTool = useTimelineStore((s) => s.activeTool);
  const { toggleTrackMute, toggleTrackLock, addClipToTrack, addTextOverlay, clearSelection } =
    useTimelineStore();

  const trackClips = Object.values(clips)
    .filter((c) => c.trackId === track.id)
    .sort((a, b) => a.startTime - b.startTime);

  const trackTextOverlays = Object.values(textOverlays)
    .filter((o) => o.trackId === track.id)
    .sort((a, b) => a.startTime - b.startTime);

  const totalWidth = duration * zoom;
  const isVideo = track.type === 'video';
  const isText = track.type === 'text';

  const trackColor = isVideo
    ? 'var(--bg-clip-video)'
    : isText
      ? 'var(--filler-highlight)'
      : 'var(--bg-clip-audio)';

  const bgTint = isVideo
    ? 'rgba(59, 130, 246, 0.05)'
    : isText
      ? 'rgba(245, 158, 11, 0.05)'
      : 'rgba(34, 197, 94, 0.05)';

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (isText) return; // Text tracks don't accept media drops
      const mediaFileId = e.dataTransfer.getData('application/x-cutlass-media');
      if (!mediaFileId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (e.currentTarget.scrollLeft ?? 0);
      const startTime = Math.max(0, x / zoom);
      addClipToTrack(mediaFileId, track.id, startTime);
    },
    [zoom, track.id, addClipToTrack, isText],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget) return;

      if (isText && (activeTool === 'text' || e.detail === 2)) {
        // Double-click or text tool: add text overlay
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const startTime = Math.max(0, x / zoom);
        const text = prompt('Enter text:');
        if (text) {
          addTextOverlay(track.id, startTime, text);
        }
        return;
      }

      clearSelection();
    },
    [clearSelection, isText, activeTool, zoom, track.id, addTextOverlay],
  );

  const MuteIcon = isVideo
    ? (track.muted ? EyeOff : Eye)
    : isText
      ? (track.muted ? EyeOff : Type)
      : (track.muted ? VolumeX : Volume2);

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
        <span className="text-xs font-semibold w-6" style={{ color: trackColor }}>
          {track.name}
        </span>

        <button
          onClick={() => toggleTrackMute(track.id)}
          className="p-0.5 rounded transition-colors hover:opacity-80"
          style={{ color: track.muted ? 'var(--playhead)' : 'var(--text-secondary)' }}
          title={track.muted ? 'Unmute' : 'Mute'}
        >
          <MuteIcon size={11} />
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
          background: bgTint,
          minWidth: totalWidth,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleTrackClick}
      >
        {/* Media clips */}
        {trackClips.map((clip) => (
          <TimelineClipComponent key={clip.id} clip={clip} />
        ))}

        {/* Text overlays */}
        {trackTextOverlays.map((overlay) => (
          <TextOverlayClip key={overlay.id} overlay={overlay} />
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
