import { useRef, useCallback, useState, useMemo } from 'react';
import { Link, AlertTriangle } from 'lucide-react';
import { useTimelineStore, useTimelineStoreApi } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import { ClipContextMenu } from './ClipContextMenu';
import { createMediaFile } from '../../utils/media';
import type { TimelineClip as TClip } from '../../types';

/** Stable waveform bars — heights are generated once per clip ID */
function WaveformBars({ clipId }: { clipId: string }) {
  const bars = useMemo(
    () => Array.from({ length: 50 }, (_, i) => ({ i, h: Math.random() * 16 + 2 })),
    [clipId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
      <svg viewBox="0 0 100 20" className="w-full h-3/4" preserveAspectRatio="none">
        {bars.map(({ i, h }) => (
          <rect key={i} x={i * 2} y={10 - h / 2} width={1.5} height={h} fill="white" />
        ))}
      </svg>
    </div>
  );
}

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
    moveClipsBatch,
    trimClipStart,
    trimClipEnd,
    splitClipAtPlayhead,
    setPlayheadPosition,
    setClipFade,
    addMediaFile,
  } = useTimelineStore();

  const storeApi = useTimelineStoreApi();
  const { t } = useLanguage();
  const isMissing = !mediaFiles[clip.mediaFileId];

  const clipRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef({ x: 0, startTime: 0, duration: 0, mediaOffset: 0 });

  const isSelected = selectedClipIds.includes(clip.id);
  const left = clip.startTime * zoom;
  const width = clip.duration * zoom;

  const isVideo = clip.type === 'video';
  const clipColor = isVideo ? 'var(--bg-clip-video)' : 'var(--bg-clip-audio)';

  const fadeInWidth = clip.fadeIn * zoom;
  const fadeOutWidth = clip.fadeOut * zoom;
  const volumeY = (1 - clip.volume / 2) * 100; // percentage from top

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'move' | 'trim-start' | 'trim-end') => {
      if (activeTool === 'razor') {
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

      const wasAlreadySelected = selectedClipIds.includes(clip.id);
      let shouldDeferDeselect = false;

      if (e.shiftKey) {
        selectClip(clip.id, true);
      } else if (wasAlreadySelected && selectedClipIds.length > 1) {
        // Already part of multi-selection: defer deselect until mouseup (allows multi-drag)
        shouldDeferDeselect = true;
      } else if (!wasAlreadySelected) {
        selectClip(clip.id, false);
      }

      setIsDragging(true);
      let hasMoved = false;

      // Get the effective selection for this drag
      const effectiveSelection = storeApi.getState().selectedClipIds;
      const isMultiDrag = type === 'move' && effectiveSelection.length > 1;

      // Capture initial positions for multi-drag
      const initialPositions: Record<string, number> = {};
      if (isMultiDrag) {
        const currentClips = storeApi.getState().clips;
        for (const id of effectiveSelection) {
          if (currentClips[id]) initialPositions[id] = currentClips[id].startTime;
        }
      }

      dragStartRef.current = {
        x: e.clientX,
        startTime: clip.startTime,
        duration: clip.duration,
        mediaOffset: clip.mediaOffset,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        hasMoved = true;
        const delta = (moveEvent.clientX - dragStartRef.current.x) / zoom;

        switch (type) {
          case 'move': {
            let newTime = Math.max(0, dragStartRef.current.startTime + delta);
            const snapState = storeApi.getState();
            if (snapState.snapEnabled) {
              const points = snapState.getSnapPoints();
              const threshold = 10 / zoom;
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
            if (isMultiDrag) {
              const positions: Record<string, number> = {};
              for (const [id, initial] of Object.entries(initialPositions)) {
                positions[id] = Math.max(0, initial + (newTime - dragStartRef.current.startTime));
              }
              moveClipsBatch(positions);
            } else {
              moveClip(clip.id, newTime);
            }
            break;
          }
          case 'trim-start': {
            let newStart = Math.max(0, dragStartRef.current.startTime + delta);
            const maxStart = dragStartRef.current.startTime + dragStartRef.current.duration - 0.1;
            const snapState = storeApi.getState();
            if (snapState.snapEnabled) {
              const points = snapState.getSnapPoints();
              const threshold = 10 / zoom;
              let bestDist = threshold;
              for (const sp of points) {
                if (Math.abs(newStart - sp) < bestDist) { newStart = sp; bestDist = Math.abs(newStart - sp); }
              }
              newStart = Math.max(0, newStart);
            }
            if (newStart < maxStart) {
              trimClipStart(clip.id, newStart);
            }
            break;
          }
          case 'trim-end': {
            let newEnd =
              dragStartRef.current.startTime + dragStartRef.current.duration + delta;
            const minEnd = clip.startTime + 0.1;
            const snapState = storeApi.getState();
            if (snapState.snapEnabled) {
              const points = snapState.getSnapPoints();
              const threshold = 10 / zoom;
              let bestDist = threshold;
              for (const sp of points) {
                if (Math.abs(newEnd - sp) < bestDist) { newEnd = sp; bestDist = Math.abs(newEnd - sp); }
              }
            }
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

        // If we deferred deselection and didn't drag, select just this clip
        if (shouldDeferDeselect && !hasMoved) {
          selectClip(clip.id, false);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [activeTool, clip, zoom, selectedClipIds, selectClip, moveClip, moveClipsBatch, trimClipStart, trimClipEnd, splitClipAtPlayhead, setPlayheadPosition, storeApi],
  );

  const handleFadeDrag = useCallback(
    (e: React.MouseEvent, edge: 'in' | 'out') => {
      e.stopPropagation();
      const startX = e.clientX;
      const startFade = edge === 'in' ? clip.fadeIn : clip.fadeOut;

      const handleMove = (moveEvent: MouseEvent) => {
        const delta = (moveEvent.clientX - startX) / zoom;
        const newFade = edge === 'in'
          ? Math.max(0, startFade + delta)
          : Math.max(0, startFade - delta);
        setClipFade(clip.id, edge, newFade);
      };

      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [clip.id, clip.fadeIn, clip.fadeOut, zoom, setClipFade],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectClip(clip.id);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    },
    [clip.id, selectClip],
  );

  const handleRelink = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,audio/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const mf = await createMediaFile(file);
      // Override the ID to match the clip's expected mediaFileId
      mf.id = clip.mediaFileId;
      addMediaFile(mf);
    };
    input.click();
  }, [clip.mediaFileId, addMediaFile]);

  return (
    <>
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
        onContextMenu={handleContextMenu}
      >
        {/* Fade in indicator */}
        {fadeInWidth > 2 && (
          <div
            className="absolute top-0 left-0 bottom-0 pointer-events-none"
            style={{ width: fadeInWidth }}
          >
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <polygon points="0,0 100,0 0,100" fill="rgba(0,0,0,0.4)" />
              <line x1="0" y1="100" x2="100" y2="0" stroke="white" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>
        )}

        {/* Fade out indicator */}
        {fadeOutWidth > 2 && (
          <div
            className="absolute top-0 right-0 bottom-0 pointer-events-none"
            style={{ width: fadeOutWidth }}
          >
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <polygon points="0,0 100,0 100,100" fill="rgba(0,0,0,0.4)" />
              <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>
        )}

        {/* Fade in drag handle */}
        <div
          className="absolute top-0 left-0 w-3 h-3 cursor-ew-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '0 0 4px 0' }}
          onMouseDown={(e) => handleFadeDrag(e, 'in')}
          title={t.clip.dragFadeIn}
        />

        {/* Fade out drag handle */}
        <div
          className="absolute top-0 right-0 w-3 h-3 cursor-ew-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '0 0 0 4px' }}
          onMouseDown={(e) => handleFadeDrag(e, 'out')}
          title={t.clip.dragFadeOut}
        />

        {/* Volume rubber band line */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: `${volumeY}%` }}
        >
          <div
            className="w-full opacity-0 group-hover:opacity-60 transition-opacity"
            style={{ height: 1, background: '#fbbf24' }}
          />
        </div>

        {/* Speed badge */}
        {(clip.speed ?? 1) !== 1 && (
          <div
            className="absolute bottom-0.5 left-1 z-10 pointer-events-none px-0.5 rounded"
            style={{ background: 'rgba(0,0,0,0.6)', fontSize: 8, color: '#fbbf24', lineHeight: '12px' }}
          >
            {clip.speed}x
          </div>
        )}

        {/* Animation badge */}
        {clip.animation && clip.animation.preset !== 'none' && (
          <div
            className="absolute bottom-0.5 z-10 pointer-events-none px-0.5 rounded"
            style={{
              left: (clip.speed ?? 1) !== 1 ? 30 : 4,
              background: 'rgba(0,0,0,0.6)',
              fontSize: 8,
              color: '#a78bfa',
              lineHeight: '12px',
            }}
          >
            {clip.animation.preset}
          </div>
        )}

        {/* Linked indicator */}
        {clip.linkedGroupId && (
          <div className="absolute top-0.5 right-1 z-10 pointer-events-none">
            <Link size={8} color="white" opacity={0.7} />
          </div>
        )}

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

        {/* Missing media overlay */}
        {isMissing && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-30 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => { e.stopPropagation(); handleRelink(); }}
            title={t.clip.relinkTitle}
          >
            <AlertTriangle size={12} color="#ef4444" />
            <span className="text-xs mt-0.5" style={{ color: '#ef4444', fontSize: 9 }}>{t.clip.relink}</span>
          </div>
        )}

        {/* Audio waveform placeholder */}
        {!isVideo && width > 30 && (
          <WaveformBars clipId={clip.id} />
        )}
      </div>

      {/* Context menu */}
      {contextMenuPos && (
        <ClipContextMenu
          clipId={clip.id}
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </>
  );
}
