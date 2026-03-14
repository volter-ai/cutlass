import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MousePointer2,
  Scissors,
  Type,
  Pen,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Magnet,
  HelpCircle,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { useTimelineStore, useTimelineStoreApi } from '../../store/timeline';
import { formatTimecode } from '../../utils/time';
import { UserMenu } from '../auth/UserMenu';
import { useLanguage } from '../../context/LanguageProvider';
import type { Tool } from '../../types';
import type { Locale } from '../../i18n';

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
    leftPanelTab,
    setLeftPanelTab,
  } = useTimelineStore();

  const storeApi = useTimelineStoreApi();
  const temporal = storeApi.temporal.getState();
  const { t, locale, setLocale } = useLanguage();

  const tools: { tool: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
    { tool: 'select', icon: MousePointer2, label: t.toolbar.select, shortcut: 'V' },
    { tool: 'razor', icon: Scissors, label: t.toolbar.razor, shortcut: 'C' },
    { tool: 'text', icon: Type, label: t.toolbar.text, shortcut: 'T' },
    { tool: 'draw', icon: Pen, label: 'Draw', shortcut: 'D' },
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
        title={t.toolbar.projects}
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
          title={`${snapEnabled ? t.toolbar.snapOn : t.toolbar.snapOff} (S)`}
        >
          <Magnet size={14} />
          {t.toolbar.snap}
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
          title={t.toolbar.goToStart}
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
          title={isPlaying ? t.toolbar.pause : t.toolbar.play}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={() => setPlayheadPosition(duration)}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title={t.toolbar.goToEnd}
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

      {/* AI Edit */}
      <button
        onClick={() => setLeftPanelTab(leftPanelTab === 'ai' ? 'media' : 'ai')}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors hover:opacity-90"
        style={{
          background: leftPanelTab === 'ai' ? 'var(--accent)' : 'transparent',
          color: leftPanelTab === 'ai' ? 'white' : 'var(--text-secondary)',
          border: leftPanelTab === 'ai' ? 'none' : '1px solid var(--border)',
        }}
      >
        <Sparkles size={12} />
        {t.toolbar.aiEdit ?? 'AI Edit'}
      </button>

      {/* Export */}
      <button
        onClick={() => setShowExportDialog(true)}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors hover:opacity-90"
        style={{ background: 'var(--accent)', color: 'white' }}
      >
        <Download size={12} />
        {t.toolbar.export}
      </button>

      {/* Divider */}
      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => temporal.undo()}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title={t.toolbar.undo}
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => temporal.redo()}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title={t.toolbar.redo}
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
          title={t.toolbar.zoomOut}
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => {
            if (duration > 0) {
              // Fit the full timeline within roughly 80% of the window width minus track headers
              const available = window.innerWidth * 0.6 - 100;
              setZoom(Math.max(10, available / duration));
            }
          }}
          className="text-xs px-1.5 py-0.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)', minWidth: 36, textAlign: 'center' }}
          title="Zoom to fit (show full timeline)"
        >
          {Math.round(zoom)}%
        </button>
        <button
          onClick={() => setZoom(zoom * 1.2)}
          className="p-1.5 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title={t.toolbar.zoomIn}
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ background: 'var(--border)' }} />

      {/* Language Toggle */}
      <div className="flex items-center rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {(['en', 'es'] as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className="px-1.5 py-0.5 text-xs font-semibold uppercase transition-colors"
            style={{
              background: locale === l ? 'var(--accent)' : 'transparent',
              color: locale === l ? 'white' : 'var(--text-secondary)',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Help */}
      <button
        onClick={() => setShowHelpOverlay(true)}
        className="p-1.5 rounded transition-colors hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
        title={t.toolbar.help}
      >
        <HelpCircle size={14} />
      </button>

      {/* User Menu */}
      <UserMenu />
    </div>
  );
}
