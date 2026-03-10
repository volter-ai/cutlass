import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack } from './TimelineTrack';

export function Timeline() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tracks = useTimelineStore((s) => s.tracks);
  const zoom = useTimelineStore((s) => s.zoom);
  const duration = useTimelineStore((s) => s.duration);
  const playheadPosition = useTimelineStore((s) => s.playheadPosition);
  const addTrack = useTimelineStore((s) => s.addTrack);

  const videoTracks = tracks.filter((t) => t.type === 'video');
  const audioTracks = tracks.filter((t) => t.type === 'audio');
  const textTracks = tracks.filter((t) => t.type === 'text');
  const totalWidth = duration * zoom;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Timeline Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Timeline
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => addTrack('video')}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--bg-clip-video)', border: '1px solid var(--bg-clip-video)' }}
          >
            <Plus size={10} /> Video
          </button>
          <button
            onClick={() => addTrack('audio')}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--bg-clip-audio)', border: '1px solid var(--bg-clip-audio)' }}
          >
            <Plus size={10} /> Audio
          </button>
          <button
            onClick={() => addTrack('text')}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--filler-highlight)', border: '1px solid var(--filler-highlight)' }}
          >
            <Plus size={10} /> Text
          </button>
        </div>
      </div>

      {/* Scrollable timeline area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
        <div style={{ minWidth: totalWidth + 100 }}>
          {/* Ruler */}
          <div className="sticky top-0 z-20" style={{ marginLeft: 100 }}>
            <TimelineRuler />
          </div>

          {/* Video tracks */}
          {videoTracks.map((track) => (
            <TimelineTrack key={track.id} track={track} />
          ))}

          {/* V/A divider */}
          <div className="flex" style={{ height: 2, background: 'var(--border)' }}>
            <div style={{ width: 100 }} />
            <div className="flex-1" />
          </div>

          {/* Audio tracks */}
          {audioTracks.map((track) => (
            <TimelineTrack key={track.id} track={track} />
          ))}

          {/* A/T divider */}
          {textTracks.length > 0 && (
            <div className="flex" style={{ height: 2, background: 'var(--border)' }}>
              <div style={{ width: 100 }} />
              <div className="flex-1" />
            </div>
          )}

          {/* Text tracks */}
          {textTracks.map((track) => (
            <TimelineTrack key={track.id} track={track} />
          ))}

          {/* Playhead line */}
          <div
            className="absolute top-0 bottom-0 z-50 pointer-events-none"
            style={{
              left: 100 + playheadPosition * zoom,
              width: 1,
              background: 'var(--playhead)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
