import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MousePointer2,
  Scissors,
  Type,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Magnet,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { useTimelineStore, useTimelineStoreApi } from '../../store/timeline';
import { formatTimecode } from '../../utils/time';
import { UserMenu } from '../auth/UserMenu';
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
    snapEnabled,
    toggleSnap,
    setShowExportDialog,
    setShowHelpOverlay,
    setShowProjectsModal,
    settings,
    currentProjectName,
    projectSaved,
  } = useTimelineStore();

  const storeApi = useTimelineStoreApi();
  const temporal = storeApi.temporal.getState();

  const tools: { tool: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
    { tool: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { tool: 'razor', icon: Scissors, label: 'Razor', shortcut: 'C' },
    { tool: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  ];

  return (
    <div className="flex items-center h-10 px-3 gap-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      {/* App Title + Project Name */}
      <div className="flex items-center gap-2 mr-2">
        <span className="text-sm font-bold tracking-wider" style={{ color: 'var(--accent)' }}>
          CUTLASS
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          /
        </span>
        <span className="text-xs truncate max-w-32" style={{ color: 'var(--text-primary)' }}>
          {currentProjectName}
          {!projectSaved && <span style={{ color: 'var(--playhead)' }}> *</span>}
        </span>
      </div>

      {/* Projects */}
      <button
        onClick={() => setShowProjectsModal(true)}
        className="p-1.5 rounded transition-colors hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
        title="Projects (Cmd+O)"
      >
        <FolderOpen size={14} />
      </button>

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

        {/* Snap toggle */}
        <button
          onClick={toggleSnap}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
          style={{
            background: snapEnabled ? 'var(--scene-border)' : 'transparent',
            color: snapEnabled ? 'white' : 'var(--text-secondary)',
          }}
          title={`Snap ${snapEnabled ? 'On' : 'Off'} (S)`}
        >
          <Magnet size={14} />
          Snap
        </button>
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

      {/* Timecode + Aspect Ratio badge */}
      <div className="flex items-center gap-2">
        <div
          className="font-mono text-xs px-3 py-1 rounded"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {formatTimecode(playheadPosition)}
        </div>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
        >
          {settings.aspectRatio}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export */}
      <button
        onClick={() => setShowExportDialog(true)}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors hover:opacity-90"
        style={{ background: 'var(--accent)', color: 'white' }}
      >
        <Download size={12} />
        Export
      </button>

      {/* Divider */}
      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

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

      {/* Divider */}
      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

      {/* Help */}
      <button
        onClick={() => setShowHelpOverlay(true)}
        className="p-1.5 rounded transition-colors hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
        title="Help (?)"
      >
        <HelpCircle size={14} />
      </button>

      {/* User Menu */}
      <UserMenu />
    </div>
  );
}
