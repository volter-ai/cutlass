import { useRef, useCallback, useState } from 'react';
import { useTimelineStore } from '../../store/timeline';
import type { TextOverlay } from '../../types';

interface Props {
  overlay: TextOverlay;
}

export function TextOverlayClip({ overlay }: Props) {
  const zoom = useTimelineStore((s) => s.zoom);
  const selectedTextOverlayId = useTimelineStore((s) => s.selectedTextOverlayId);
  const { selectTextOverlay, updateTextOverlay } = useTimelineStore();

  const clipRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, startTime: 0, duration: 0 });

  const isSelected = selectedTextOverlayId === overlay.id;
  const left = overlay.startTime * zoom;
  const width = overlay.duration * zoom;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'move' | 'trim-end') => {
      e.stopPropagation();
      selectTextOverlay(overlay.id);
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, startTime: overlay.startTime, duration: overlay.duration };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        // delta is always computed from the drag-start position (not incremental)
        const delta = (moveEvent.clientX - dragStartRef.current.x) / zoom;
        if (type === 'move') {
          updateTextOverlay(overlay.id, { startTime: Math.max(0, dragStartRef.current.startTime + delta) });
        } else {
          const newDuration = dragStartRef.current.duration + delta;
          if (newDuration > 0.5) {
            updateTextOverlay(overlay.id, { duration: newDuration });
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
    [overlay, zoom, selectTextOverlay, updateTextOverlay],
  );

  const handleDoubleClick = useCallback(() => {
    const newText = prompt('Edit text:', overlay.text);
    if (newText !== null) {
      updateTextOverlay(overlay.id, { text: newText });
    }
  }, [overlay, updateTextOverlay]);

  return (
    <div
      ref={clipRef}
      className="absolute top-0.5 bottom-0.5 flex items-center select-none group"
      style={{
        left,
        width: Math.max(width, 4),
        background: 'var(--filler-highlight)',
        opacity: isDragging ? 0.8 : 0.9,
        borderRadius: 3,
        border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isSelected ? 10 : 1,
        overflow: 'hidden',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onDoubleClick={handleDoubleClick}
    >
      {/* Text content */}
      <div className="flex-1 h-full flex items-center px-2 overflow-hidden">
        <span className="text-xs text-black truncate font-semibold">
          {overlay.text}
        </span>
      </div>

      {/* Trim handle right */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleMouseDown(e, 'trim-end');
        }}
      />
    </div>
  );
}
