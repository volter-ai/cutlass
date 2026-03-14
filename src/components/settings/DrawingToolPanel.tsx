import { Pen, ArrowUpRight, Circle, Square } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import type { DrawingTexture, DrawingToolType } from '../../types';

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

export function DrawingToolPanel() {
  const activeDrawingTool = useTimelineStore((s) => s.activeDrawingTool);
  const activeDrawingColor = useTimelineStore((s) => s.activeDrawingColor);
  const activeDrawingStrokeWidth = useTimelineStore((s) => s.activeDrawingStrokeWidth);
  const activeDrawingTexture = useTimelineStore((s) => s.activeDrawingTexture);
  const activeDrawingWriteOnSpeed = useTimelineStore((s) => s.activeDrawingWriteOnSpeed);
  const {
    setActiveDrawingTool,
    setActiveDrawingColor,
    setActiveDrawingStrokeWidth,
    setActiveDrawingTexture,
    setActiveDrawingWriteOnSpeed,
  } = useTimelineStore();

  const speedLabel = activeDrawingWriteOnSpeed <= 0.5 ? '0.5× slow'
    : activeDrawingWriteOnSpeed >= 2 ? '2× fast'
    : `${activeDrawingWriteOnSpeed}×`;

  return (
    <section>
      <div className="flex items-center gap-1.5 mb-2">
        <Pen size={12} style={{ color: 'var(--bg-clip-drawing)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Drawing
        </span>
      </div>

      {/* Tool selector */}
      <div className="mb-2">
        <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Tool</label>
        <div className="flex gap-1">
          {TOOLS.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setActiveDrawingTool(type)}
              className="flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded text-xs transition-colors"
              style={{
                background: activeDrawingTool === type ? 'var(--bg-clip-drawing)' : 'var(--bg-surface)',
                color: activeDrawingTool === type ? 'white' : 'var(--text-secondary)',
              }}
              title={label}
            >
              <Icon size={12} />
              <span style={{ fontSize: '0.6rem' }}>{label}</span>
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
      <div className="mb-2">
        <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
          Write-on speed: {speedLabel}
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
        <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>
          <span>Slow</span>
          <span>Fast</span>
        </div>
      </div>
    </section>
  );
}
