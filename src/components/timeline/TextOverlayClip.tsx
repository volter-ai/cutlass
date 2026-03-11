import { useRef, useCallback, useState, useEffect } from 'react';
import { useTimelineStore, useTimelineStoreApi } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import type { TextOverlay } from '../../types';

interface Props {
  overlay: TextOverlay;
}

export function TextOverlayClip({ overlay }: Props) {
  const zoom = useTimelineStore((s) => s.zoom);
  const selectedTextOverlayId = useTimelineStore((s) => s.selectedTextOverlayId);
  const { selectTextOverlay, updateTextOverlay, removeTextOverlay } = useTimelineStore();
  const storeApi = useTimelineStoreApi();
  const { t } = useLanguage();

  const clipRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
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
          updateTextOverlay(overlay.id, { startTime: newTime });
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
    setEditText(overlay.text);
    setIsEditing(true);
  }, [overlay.text]);

  const commitEdit = useCallback(() => {
    if (editText.trim()) {
      updateTextOverlay(overlay.id, { text: editText.trim() });
    }
    setIsEditing(false);
  }, [editText, overlay.id, updateTextOverlay]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) editInputRef.current.focus();
  }, [isEditing]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectTextOverlay(overlay.id);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, [overlay.id, selectTextOverlay]);

  // Close context menu on outside click
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
      onContextMenu={handleContextMenu}
    >
      {/* Text content or inline edit */}
      <div className="flex-1 h-full flex items-center px-2 overflow-hidden">
        {isEditing ? (
          <input
            ref={editInputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') setIsEditing(false);
              e.stopPropagation();
            }}
            onBlur={commitEdit}
            className="text-xs font-semibold w-full bg-transparent outline-none"
            style={{ color: 'black' }}
          />
        ) : (
          <span className="text-xs text-black truncate font-semibold">
            {overlay.text}
          </span>
        )}
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
            {t.contextMenu.editText ?? 'Edit Text'}
          </button>
          <button
            className="w-full text-left px-3 py-1 text-xs hover:opacity-80"
            style={{ color: '#ef4444' }}
            onClick={() => { setContextMenuPos(null); removeTextOverlay(overlay.id); }}
          >
            {t.contextMenu.deleteClip}
          </button>
        </div>
      )}
    </div>
  );
}
