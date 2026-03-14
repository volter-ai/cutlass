import { useRef, useCallback } from 'react';
import { Pen, ArrowUpRight, Circle, Square } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import type { DrawingStroke, DrawingTexture, DrawingToolType } from '../../types';

const TOOLS: { type: DrawingToolType; icon: typeof Pen; label: string }[] = [
  { type: 'pen', icon: Pen, label: 'Pen' },
  { type: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'rectangle', icon: Square, label: 'Rect' },
];

const TEXTURES: { type: DrawingTexture; label: string }[] = [
  { type: 'solid', label: 'Solid' },
  { type: 'marker', label: 'Marker' },
  { type: 'chalk', label: 'Chalk' },
];

const TOOL_ICONS: Record<DrawingToolType, typeof Pen> = {
  pen: Pen,
  arrow: ArrowUpRight,
  circle: Circle,
  rectangle: Square,
};

interface StrokeTimingRowProps {
  stroke: DrawingStroke;
  overlayId: string;
  overlayDuration: number;
  index: number;
}

function StrokeTimingRow({ stroke, overlayId, overlayDuration, index }: StrokeTimingRowProps) {
  const updateStrokeInDrawingOverlay = useTimelineStore((s) => s.updateStrokeInDrawingOverlay);
  const stripRef = useRef<HTMLDivElement>(null);
  const Icon = TOOL_ICONS[stroke.tool];
  const duration = Math.max(overlayDuration, 0.1);
  const startFraction = Math.max(0, Math.min(1, stroke.startOffset / duration));

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);

    const onMove = (moveE: PointerEvent) => {
      const strip = stripRef.current;
      if (!strip) return;
      const rect = strip.getBoundingClientRect();
      const newFraction = Math.max(0, Math.min(0.99, (moveE.clientX - rect.left) / rect.width));
      const newOffset = newFraction * duration;
      updateStrokeInDrawingOverlay(overlayId, stroke.id, { startOffset: newOffset });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [overlayId, stroke.id, duration, updateStrokeInDrawingOverlay]);

  return (
    <div
      className="flex items-center gap-2 py-1"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Stroke index + icon */}
      <div className="flex items-center gap-1 shrink-0 w-16">
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)', minWidth: '1.25rem' }}>
          {index + 1}
        </span>
        <Icon size={11} style={{ color: 'var(--bg-clip-drawing)', flexShrink: 0 }} />
        <span className="text-xs capitalize truncate" style={{ color: 'var(--text-primary)' }}>
          {stroke.tool}
        </span>
      </div>

      {/* Timing strip */}
      <div
        ref={stripRef}
        className="relative flex-1 rounded"
        style={{ height: 14, background: 'var(--bg-surface)' }}
      >
        {/* Filled region: from startOffset to end */}
        <div
          className="absolute top-0 bottom-0 rounded"
          style={{
            left: `${startFraction * 100}%`,
            right: 0,
            background: stroke.color,
            opacity: 0.35,
          }}
        />
        {/* Draggable left handle */}
        <div
          onPointerDown={handlePointerDown}
          className="absolute top-0 bottom-0 rounded cursor-ew-resize"
          style={{
            left: `calc(${startFraction * 100}% - 3px)`,
            width: 6,
            background: stroke.color,
            opacity: 0.9,
            borderRadius: 3,
            zIndex: 1,
          }}
          title={`Start: ${stroke.startOffset.toFixed(2)}s — drag to adjust`}
        />
        {/* Time label */}
        <span
          className="absolute text-xs select-none pointer-events-none"
          style={{
            left: `calc(${startFraction * 100}% + 8px)`,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.6rem',
            whiteSpace: 'nowrap',
          }}
        >
          {stroke.startOffset.toFixed(1)}s
        </span>
      </div>
    </div>
  );
}

export function DrawingEffectsPanel() {
  const activeDrawingTool = useTimelineStore((s) => s.activeDrawingTool);
  const activeDrawingColor = useTimelineStore((s) => s.activeDrawingColor);
  const activeDrawingStrokeWidth = useTimelineStore((s) => s.activeDrawingStrokeWidth);
  const activeDrawingTexture = useTimelineStore((s) => s.activeDrawingTexture);
  const activeDrawingWriteOnSpeed = useTimelineStore((s) => s.activeDrawingWriteOnSpeed);
  const selectedDrawingOverlayId = useTimelineStore((s) => s.selectedDrawingOverlayId);
  const drawingOverlays = useTimelineStore((s) => s.drawingOverlays);
  const {
    setActiveDrawingTool,
    setActiveDrawingColor,
    setActiveDrawingStrokeWidth,
    setActiveDrawingTexture,
    setActiveDrawingWriteOnSpeed,
  } = useTimelineStore();

  const selectedOverlay = selectedDrawingOverlayId ? drawingOverlays[selectedDrawingOverlayId] : null;

  const speedLabel = activeDrawingWriteOnSpeed <= 0.5 ? '0.5× slow'
    : activeDrawingWriteOnSpeed >= 2 ? '2× fast'
    : `${activeDrawingWriteOnSpeed}×`;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-1.5">
          <Pen size={12} style={{ color: 'var(--bg-clip-drawing)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Drawing
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Zone 1: Tool controls ── */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          {/* Tool selector */}
          <div className="mb-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Tool</label>
            <div className="grid grid-cols-2 gap-1">
              {TOOLS.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setActiveDrawingTool(type)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors"
                  style={{
                    background: activeDrawingTool === type ? 'var(--bg-clip-drawing)' : 'var(--bg-surface)',
                    color: activeDrawingTool === type ? 'white' : 'var(--text-secondary)',
                  }}
                  title={label}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Texture selector */}
          <div className="mb-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Texture</label>
            <div className="flex gap-1">
              {TEXTURES.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setActiveDrawingTexture(type)}
                  className="flex-1 px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    background: activeDrawingTexture === type ? 'var(--bg-clip-drawing)' : 'var(--bg-surface)',
                    color: activeDrawingTexture === type ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="mb-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={activeDrawingColor}
                onChange={(e) => setActiveDrawingColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {activeDrawingColor}
              </span>
            </div>
          </div>

          {/* Stroke width */}
          <div className="mb-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Size: {activeDrawingStrokeWidth}px
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={activeDrawingStrokeWidth}
              onChange={(e) => setActiveDrawingStrokeWidth(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--bg-clip-drawing)' }}
            />
          </div>

          {/* Write-on speed */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Speed: {speedLabel}
            </label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.25}
              value={activeDrawingWriteOnSpeed}
              onChange={(e) => setActiveDrawingWriteOnSpeed(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--bg-clip-drawing)' }}
            />
            <div className="flex justify-between mt-0.5" style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>
        </div>

        {/* ── Zone 2: Stroke timing ── */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Strokes
            </span>
            {selectedOverlay && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                drag handle to offset
              </span>
            )}
          </div>

          {!selectedOverlay ? (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Select a drawing clip to adjust timing.
            </p>
          ) : selectedOverlay.strokes.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Draw something to see stroke timing.
            </p>
          ) : (
            <div>
              {selectedOverlay.strokes.map((stroke, i) => (
                <StrokeTimingRow
                  key={stroke.id}
                  stroke={stroke}
                  overlayId={selectedOverlay.id}
                  overlayDuration={selectedOverlay.duration}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
