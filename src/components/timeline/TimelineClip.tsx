import { useRef, useCallback, useState } from 'react';
import { useTimelineStore } from '../../store/timeline';
import type { TimelineClip as TClip } from '../../types';

interface Props {
  clip: TClip;
}

export function TimelineClipComponent({ clip }: Props) {
  const zoom = useTimelineStore((s) => s.zoom);
  const selectedClipIds = useTimelineStore((s) => s.selectedClipIds);
  const activeTool = useTimelineStore((s) => s.activeTool);
  const mediaFiles = useTimelineStore((s) => s.mediaFiles);
  const {
    selectClip,
    moveClip,
    trimClipStart,
    trimClipEnd,
    splitClipAtPlayhead,
    setPlayheadPosition,
  } = useTimelineStore();

  const clipRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, startTime: 0, duration: 0, mediaOffset: 0 });

  const isSelected = selectedClipIds.includes(clip.id);
  void mediaFiles; // used for future thumbnail rendering
  const left = clip.startTime * zoom;
  const width = clip.duration * zoom;

  const isVideo = clip.type === 'video';
  const clipColor = isVideo ? 'var(--bg-clip-video)' : 'var(--bg-clip-audio)';

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'move' | 'trim-start' | 'trim-end') => {
      if (activeTool === 'razor') {
        // Razor tool: split at click position
        const rect = clipRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const timeInClip = x / zoom;
        const splitTime = clip.startTime + timeInClip;
        setPlayheadPosition(splitTime);
        splitClipAtPlayhead(clip.id);
        return;
      }

      e.stopPropagation();
      selectClip(clip.id, e.shiftKey);
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        startTime: clip.startTime,
        duration: clip.duration,
        mediaOffset: clip.mediaOffset,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = (moveEvent.clientX - dragStartRef.current.x) / zoom;

        switch (type) {
          case 'move':
            moveClip(clip.id, Math.max(0, dragStartRef.current.startTime + delta));
            break;
          case 'trim-start': {
            const newStart = Math.max(0, dragStartRef.current.startTime + delta);
            const maxStart = dragStartRef.current.startTime + dragStartRef.current.duration - 0.1;
            if (newStart < maxStart) {
              trimClipStart(clip.id, newStart);
            }
            break;
          }
          case 'trim-end': {
            const newEnd =
              dragStartRef.current.startTime + dragStartRef.current.duration + delta;
            const minEnd = clip.startTime + 0.1;
            if (newEnd > minEnd) {
              trimClipEnd(clip.id, newEnd);
            }
            break;
          }
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [activeTool, clip, zoom, selectClip, moveClip, trimClipStart, trimClipEnd, splitClipAtPlayhead, setPlayheadPosition],
  );

  return (
    <div
      ref={clipRef}
      className="absolute top-0.5 bottom-0.5 flex items-center select-none group"
      style={{
        left,
        width: Math.max(width, 4),
        background: clipColor,
        opacity: isDragging ? 0.8 : 0.9,
        borderRadius: 3,
        border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
        cursor: activeTool === 'razor' ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
        zIndex: isSelected ? 10 : 1,
        overflow: 'hidden',
      }}
    >
      {/* Trim handle left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.5)' }}
        onMouseDown={(e) => handleMouseDown(e, 'trim-start')}
      />

      {/* Clip body */}
      <div
        className="flex-1 h-full flex items-center px-2 overflow-hidden"
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        <span className="text-xs text-white truncate font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          {clip.name}
        </span>
      </div>

      {/* Trim handle right */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.5)' }}
        onMouseDown={(e) => handleMouseDown(e, 'trim-end')}
      />

      {/* Audio waveform placeholder */}
      {!isVideo && width > 30 && (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <svg viewBox="0 0 100 20" className="w-full h-3/4" preserveAspectRatio="none">
            {Array.from({ length: 50 }).map((_, i) => {
              const h = Math.random() * 16 + 2;
              return (
                <rect
                  key={i}
                  x={i * 2}
                  y={10 - h / 2}
                  width={1.5}
                  height={h}
                  fill="white"
                />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
