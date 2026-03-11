import { useRef, useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack } from './TimelineTrack';

const RULER_HEIGHT = 25; // h-6 (24px) + 1px border
const TRACK_HEADER_WIDTH = 100;

interface MarqueeRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function Timeline() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tracks = useTimelineStore((s) => s.tracks);
  const clips = useTimelineStore((s) => s.clips);
  const zoom = useTimelineStore((s) => s.zoom);
  const duration = useTimelineStore((s) => s.duration);
  const playheadPosition = useTimelineStore((s) => s.playheadPosition);
  const activeTool = useTimelineStore((s) => s.activeTool);
  const addTrack = useTimelineStore((s) => s.addTrack);
  const selectClips = useTimelineStore((s) => s.selectClips);
  const clearSelection = useTimelineStore((s) => s.clearSelection);
  const { t } = useLanguage();

  const videoTracks = tracks.filter((t) => t.type === 'video');
  const audioTracks = tracks.filter((t) => t.type === 'audio');
  const textTracks = tracks.filter((t) => t.type === 'text');
  const totalWidth = duration * zoom;

  // Marquee selection state
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeRef = useRef<MarqueeRect | null>(null);

  // Compute track Y positions for marquee intersection.
  // Depends on `tracks` (stable reference from the store) rather than the
  // filtered arrays above, which are new references every render and would
  // defeat the memo.
  const trackPositions = useMemo(() => {
    const positions: Record<string, { top: number; height: number }> = {};
    let y = RULER_HEIGHT;

    videoTracks.forEach((track) => {
      positions[track.id] = { top: y, height: track.height };
      y += track.height;
    });
    y += 2; // V/A divider

    audioTracks.forEach((track) => {
      positions[track.id] = { top: y, height: track.height };
      y += track.height;
    });

    if (textTracks.length > 0) y += 2; // A/T divider

    textTracks.forEach((track) => {
      positions[track.id] = { top: y, height: track.height };
      y += track.height;
    });

    return positions;
  }, [tracks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get clips within marquee bounds
  const getClipsInMarquee = useCallback(
    (marq: MarqueeRect) => {
      const left = Math.min(marq.startX, marq.endX);
      const right = Math.max(marq.startX, marq.endX);
      const top = Math.min(marq.startY, marq.endY);
      const bottom = Math.max(marq.startY, marq.endY);

      const matchingIds: string[] = [];
      Object.values(clips).forEach((clip) => {
        const trackPos = trackPositions[clip.trackId];
        if (!trackPos) return;

        const clipLeft = TRACK_HEADER_WIDTH + clip.startTime * zoom;
        const clipRight = clipLeft + clip.duration * zoom;
        const clipTop = trackPos.top;
        const clipBottom = clipTop + trackPos.height;

        if (clipRight > left && clipLeft < right && clipBottom > top && clipTop < bottom) {
          matchingIds.push(clip.id);
        }
      });

      return matchingIds;
    },
    [clips, trackPositions, zoom],
  );

  const handleMarqueeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== 'select') return;

      const container = scrollContainerRef.current;
      if (!container) return;

      // Compute position in scroll content coordinates
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;

      // Ignore clicks on ruler or track headers
      if (y < RULER_HEIGHT || x < TRACK_HEADER_WIDTH) return;

      const marq: MarqueeRect = { startX: x, startY: y, endX: x, endY: y };
      marqueeRef.current = marq;
      setMarquee(marq);

      const handleMove = (moveEvent: MouseEvent) => {
        const mx = moveEvent.clientX - rect.left + container.scrollLeft;
        const my = moveEvent.clientY - rect.top + container.scrollTop;
        const updated = { ...marqueeRef.current!, endX: mx, endY: my };
        marqueeRef.current = updated;
        setMarquee(updated);

        // Update selection in real-time
        const clipIds = getClipsInMarquee(updated);
        selectClips(clipIds);
      };

      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);

        const finalMarquee = marqueeRef.current;
        marqueeRef.current = null;
        setMarquee(null);

        if (finalMarquee) {
          const dx = Math.abs(finalMarquee.endX - finalMarquee.startX);
          const dy = Math.abs(finalMarquee.endY - finalMarquee.startY);

          if (dx > 5 || dy > 5) {
            // Was a real drag — prevent the subsequent click from clearing selection
            container.addEventListener(
              'click',
              (clickE) => {
                clickE.stopPropagation();
                clickE.preventDefault();
              },
              { capture: true, once: true },
            );
          } else {
            // Was just a click on empty space — clear selection
            clearSelection();
          }
        }
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [activeTool, getClipsInMarquee, selectClips, clearSelection],
  );

  // Compute marquee display rect
  const marqueeStyle = useMemo(() => {
    if (!marquee) return null;
    const left = Math.min(marquee.startX, marquee.endX);
    const top = Math.min(marquee.startY, marquee.endY);
    const width = Math.abs(marquee.endX - marquee.startX);
    const height = Math.abs(marquee.endY - marquee.startY);
    return { left, top, width, height };
  }, [marquee]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Timeline Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t.timeline.title}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => addTrack('video')}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--bg-clip-video)', border: '1px solid var(--bg-clip-video)' }}
          >
            <Plus size={10} /> {t.timeline.video}
          </button>
          <button
            onClick={() => addTrack('audio')}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--bg-clip-audio)', border: '1px solid var(--bg-clip-audio)' }}
          >
            <Plus size={10} /> {t.timeline.audio}
          </button>
          <button
            onClick={() => addTrack('text')}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--filler-highlight)', border: '1px solid var(--filler-highlight)' }}
          >
            <Plus size={10} /> {t.timeline.text}
          </button>
        </div>
      </div>

      {/* Scrollable timeline area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
        onMouseDown={handleMarqueeMouseDown}
      >
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

          {/* Marquee selection box */}
          {marqueeStyle && (
            <div
              className="absolute pointer-events-none z-40"
              style={{
                left: marqueeStyle.left,
                top: marqueeStyle.top,
                width: marqueeStyle.width,
                height: marqueeStyle.height,
                border: '1px solid var(--accent)',
                background: 'rgba(99, 102, 241, 0.15)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
