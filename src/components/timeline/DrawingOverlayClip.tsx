import { useRef, useCallback, useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useTimelineStore, useTimelineStoreApi } from '../../store/timeline';
import type { DrawingOverlay } from '../../types';

interface Props {
  overlay: DrawingOverlay;
}

export function DrawingOverlayClip({ overlay }: Props) {
  const zoom = useTimelineStore((s) => s.zoom);
  const selectedDrawingOverlayId = useTimelineStore((s) => s.selectedDrawingOverlayId);
  const { selectDrawingOverlay, updateDrawingOverlay, removeDrawingOverlay, setActiveTool } = useTimelineStore();
  const storeApi = useTimelineStoreApi();

  const clipRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef({ x: 0, startTime: 0, duration: 0 });

  const isSelected = selectedDrawingOverlayId === overlay.id;
  const left = overlay.startTime * zoom;
  const width = overlay.duration * zoom;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'move' | 'trim-end') => {
      e.stopPropagation();
      selectDrawingOverlay(overlay.id);
      setIsDragging(true);
      storeApi.temporal.getState().pause();
      dragStartRef.current = { x: e.clientX, startTime: overlay.startTime, duration: overlay.duration };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = (moveEvent.clientX - dragStartRef.current.x) / zoom;
        const snapState = storeApi.getState();
        const doSnap = snapState.snapEnabled;
        const points = doSnap ? snapState.getSnapPoints() : [];
        const threshold = 10 / zoom;

        if (type === 'move') {
          let newTime = Math.max(0, dragStartRef.current.startTime + delta);
          if (doSnap) {
            const dur = dragStartRef.current.duration;
            let bestDist = threshold;
            let snapped = newTime;
            for (const sp of points) {
              const dStart = Math.abs(newTime - sp);
              if (dStart < bestDist) { snapped = sp; bestDist = dStart; }
              const dEnd = Math.abs(newTime + dur - sp);
              if (dEnd < bestDist) { snapped = sp - dur; bestDist = dEnd; }
            }
            newTime = Math.max(0, snapped);
          }
          // Detect cross-track drop (drawing tracks only)
          let targetTrackId: string | undefined;
          const els = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
          for (const el of els) {
            const tid = (el as HTMLElement).dataset?.trackId;
            const ttype = (el as HTMLElement).dataset?.trackType;
            if (tid && ttype === 'drawing') {
              targetTrackId = tid !== overlay.trackId ? tid : undefined;
              break;
            }
          }
          updateDrawingOverlay(overlay.id, { startTime: newTime, ...(targetTrackId ? { trackId: targetTrackId } : {}) });
        } else {
          let newDuration = dragStartRef.current.duration + delta;
          if (doSnap) {
            const endTime = dragStartRef.current.startTime + newDuration;
            let bestDist = threshold;
            let snappedEnd = endTime;
            for (const sp of points) {
              if (Math.abs(endTime - sp) < bestDist) { snappedEnd = sp; bestDist = Math.abs(endTime - sp); }
            }
            newDuration = snappedEnd - dragStartRef.current.startTime;
          }
          if (newDuration > 0.5) {
            updateDrawingOverlay(overlay.id, { duration: newDuration });
          }
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        storeApi.temporal.getState().resume();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [overlay, zoom, selectDrawingOverlay, updateDrawingOverlay, storeApi],
  );

  const handleDoubleClick = useCallback(() => {
    selectDrawingOverlay(overlay.id);
    setActiveTool('draw');
  }, [overlay.id, selectDrawingOverlay, setActiveTool]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectDrawingOverlay(overlay.id);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, [overlay.id, selectDrawingOverlay]);

  useEffect(() => {
    if (!contextMenuPos) return;
    const handle = () => setContextMenuPos(null);
    window.addEventListener('mousedown', handle);
    return () => window.removeEventListener('mousedown', handle);
  }, [contextMenuPos]);

  return (
    <div
      ref={clipRef}
      className="absolute top-0.5 bottom-0.5 flex items-center select-none group"
      style={{
        left,
        width: Math.max(width, 4),
        background: 'var(--bg-clip-drawing)',
        opacity: isDragging ? 0.8 : 0.9,
        borderRadius: 3,
        border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isSelected ? 10 : 1,
        overflow: 'hidden',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      title="Double-click to draw • Drag to move • Right-click for options"
    >
      <div className="flex-1 h-full flex items-center px-2 gap-1 overflow-hidden">
        <Pencil size={10} className="opacity-80 flex-shrink-0" style={{ color: 'white' }} />
        <span className="text-xs truncate font-semibold" style={{ color: 'white', fontSize: '0.65rem' }}>
          {overlay.strokes.length} stroke{overlay.strokes.length !== 1 ? 's' : ''}
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

      {/* Context menu */}
      {contextMenuPos && (
        <div
          className="fixed z-50 rounded shadow-lg py-1"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            minWidth: 120,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1 text-xs hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => { setContextMenuPos(null); handleDoubleClick(); }}
          >
            Draw on layer
          </button>
          <button
            className="w-full text-left px-3 py-1 text-xs hover:opacity-80"
            style={{ color: '#ef4444' }}
            onClick={() => { setContextMenuPos(null); removeDrawingOverlay(overlay.id); }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
