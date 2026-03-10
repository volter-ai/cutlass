import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MousePointer2,
  Scissors,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { formatTimecode } from '../../utils/time';
import type { Tool } from '../../types';

export function Toolbar() {
  const {
    isPlaying,
    setIsPlaying,
    playheadPosition,
    setPlayheadPosition,
    duration,
    activeTool,
    setActiveTool,
    zoom,
    setZoom,
  } = useTimelineStore();

  const temporal = useTimelineStore.temporal.getState();

  const tools: { tool: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
    { tool: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { tool: 'razor', icon: Scissors, label: 'Razor', shortcut: 'C' },
  ];

  return (
    <div className="flex items-center h-10 px-3 gap-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      {/* App Title */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-sm font-bold tracking-wider" style={{ color: 'var(--accent)' }}>
          CUTLASS
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

      {/* Tools */}
      <div className="flex items-center gap-1">
        {tools.map(({ tool, icon: Icon, label, shortcut }) => (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
            style={{
              background: activeTool === tool ? 'var(--accent)' : 'transparent',
              color: activeTool === tool ? 'white' : 'var(--text-secondary)',
            }}
            title={`${label} (${shortcut})`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

      {/* Transport Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPlayheadPosition(0)}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title="Go to start"
        >
          <SkipBack size={14} />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded transition-colors"
          style={{
            background: isPlaying ? 'var(--playhead)' : 'var(--accent)',
            color: 'white',
          }}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={() => setPlayheadPosition(duration)}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title="Go to end"
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Timecode */}
      <div
        className="font-mono text-xs px-3 py-1 rounded"
        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        {formatTimecode(playheadPosition)}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => temporal.undo()}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title="Undo (Cmd+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => temporal.redo()}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom(zoom / 1.2)}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-xs w-10 text-center" style={{ color: 'var(--text-secondary)' }}>
          {Math.round(zoom)}%
        </span>
        <button
          onClick={() => setZoom(zoom * 1.2)}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
      </div>
    </div>
  );
}
