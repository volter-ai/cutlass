import { useEffect, useRef, useState, useCallback } from 'react';
import { Toolbar } from './components/toolbar/Toolbar';
import { MediaBin } from './components/media-bin/MediaBin';
import { TranscriptPanel } from './components/transcript/TranscriptPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { AIEditPanel } from './components/ai/AIEditPanel';
import { Viewer } from './components/viewer/Viewer';
import { Timeline } from './components/timeline/Timeline';
import { ExportDialog } from './components/export/ExportDialog';
import { HelpOverlay } from './components/help/HelpOverlay';
import { ProjectsModal } from './components/projects/ProjectsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlayback } from './hooks/usePlayback';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useTimelineStore, useTimelineStoreApi } from './store/timeline';
import { autoSaveLocal, loadAutoSave, deserializeProject } from './services/projects';
import { getMediaFile } from './services/mediaStorage';
import { createMediaFile } from './utils/media';
import { useLanguage } from './context/LanguageProvider';
import { exportTimeline } from './services/export';

const TABS = ['media', 'transcript', 'ai', 'settings'] as const;

export default function App() {
  useKeyboardShortcuts();
  usePlayback();
  useAudioPlayback();

  const leftPanelTab = useTimelineStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useTimelineStore((s) => s.setLeftPanelTab);
  const storeApi = useTimelineStoreApi();
  // Expose store and export function for automated testing in development
  if (import.meta.env.DEV) {
    const w = window as unknown as Record<string, unknown>;
    w.__cutlassStore = storeApi;
    w.__exportTimeline = exportTimeline;
  }
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);
  const { t } = useLanguage();

  // Resizable viewer/timeline split (percentage of right panel height for viewer)
  const [viewerPct, setViewerPct] = useState(45);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const handleDividerDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = rightPanelRef.current;
    if (!panel) return;

    const handleMove = (moveEvent: MouseEvent) => {
      const rect = panel.getBoundingClientRect();
      const pct = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      setViewerPct(Math.max(20, Math.min(80, pct)));
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, []);

  const tabLabels: Record<(typeof TABS)[number], string> = {
    media: t.tabs.media,
    transcript: t.tabs.transcript,
    ai: t.tabs.ai ?? 'AI',
    settings: t.tabs.settings,
  };

  // Auto-restore from localStorage on first mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const saved = loadAutoSave();
    if (!saved || !saved.data) return;

    const currentState = storeApi.getState();
    // Only restore if timeline is empty (no clips yet)
    if (Object.keys(currentState.clips).length > 0) return;

    const deserialized = deserializeProject(saved.data, {});

    // Restore state
    storeApi.setState({
      tracks: deserialized.tracks.length > 0 ? deserialized.tracks : currentState.tracks,
      clips: deserialized.clips,
      textOverlays: deserialized.textOverlays,
      drawingOverlays: deserialized.drawingOverlays,
      transcripts: deserialized.transcripts,
      settings: { ...currentState.settings, ...deserialized.settings },
      currentProjectId: saved.projectId,
      currentProjectName: saved.projectName || 'Untitled Project',
      projectSaved: true,
    });
    storeApi.getState().recalculateDuration();

    // Try to recover media from IndexedDB
    const mediaNameMap = deserialized.mediaNameMap;
    for (const [mediaId] of Object.entries(mediaNameMap)) {
      getMediaFile(mediaId).then(async (file) => {
        if (!file) return;
        const mf = await createMediaFile(file);
        mf.id = mediaId;
        storeApi.getState().addMediaFile(mf);
      }).catch(() => {});
    }
  }, [storeApi]);

  // Auto-save on timeline changes (debounced 3s)
  useEffect(() => {
    const unsub = storeApi.subscribe((state, prevState) => {
      // Only react when meaningful data changes
      if (
        state.clips === prevState.clips &&
        state.tracks === prevState.tracks &&
        state.textOverlays === prevState.textOverlays &&
        state.drawingOverlays === prevState.drawingOverlays &&
        state.settings === prevState.settings
      ) return;

      // Mark dirty immediately so the * indicator appears as soon as edits happen
      storeApi.getState().markProjectDirty();

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveLocal(storeApi.getState());
      }, 3000);
    });
    return () => {
      unsub();
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [storeApi]);

  return (
    <div className="flex flex-col h-screen w-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel: Media Bin / Transcript / Settings */}
        <div
          className="flex flex-col border-r"
          style={{ width: 280, borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
        >
          {/* Tab switcher */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftPanelTab(tab)}
                className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors capitalize"
                style={{
                  background: leftPanelTab === tab ? 'var(--bg-surface)' : 'transparent',
                  color: leftPanelTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: leftPanelTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0">
            {leftPanelTab === 'media' && <MediaBin />}
            {leftPanelTab === 'transcript' && <TranscriptPanel />}
            {leftPanelTab === 'ai' && <AIEditPanel />}
            {leftPanelTab === 'settings' && <SettingsPanel />}
          </div>
        </div>

        {/* Right: Viewer + Timeline */}
        <div ref={rightPanelRef} className="flex flex-col flex-1 min-w-0">
          {/* Viewer */}
          <div className="border-b" style={{ height: `${viewerPct}%`, borderColor: 'var(--border)' }}>
            <Viewer />
          </div>

          {/* Resizable divider */}
          <div
            className="flex-shrink-0 cursor-row-resize hover:bg-[var(--accent)] transition-colors"
            style={{ height: 4, background: 'var(--border)' }}
            onMouseDown={handleDividerDrag}
          />

          {/* Timeline */}
          <div className="flex-1 min-h-0">
            <Timeline />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExportDialog />
      <HelpOverlay />
      <ProjectsModal />
    </div>
  );
}
