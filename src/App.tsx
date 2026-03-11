import { useEffect, useRef } from 'react';
import { Toolbar } from './components/toolbar/Toolbar';
import { MediaBin } from './components/media-bin/MediaBin';
import { TranscriptPanel } from './components/transcript/TranscriptPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
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

const TABS = ['media', 'transcript', 'settings'] as const;

export default function App() {
  useKeyboardShortcuts();
  usePlayback();
  useAudioPlayback();

  const leftPanelTab = useTimelineStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useTimelineStore((s) => s.setLeftPanelTab);
  const storeApi = useTimelineStoreApi();
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);

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
      transcripts: deserialized.transcripts,
      settings: { ...currentState.settings, ...deserialized.settings },
      currentProjectId: saved.projectId,
      currentProjectName: saved.projectName || 'Untitled Project',
      projectSaved: true,
    });

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
      // Only auto-save when meaningful data changes
      if (
        state.clips === prevState.clips &&
        state.tracks === prevState.tracks &&
        state.textOverlays === prevState.textOverlays &&
        state.settings === prevState.settings
      ) return;

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        const current = storeApi.getState();
        autoSaveLocal(current);
        current.markProjectDirty();
      }, 3000);
    });
    return unsub;
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
                {tab}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0">
            {leftPanelTab === 'media' && <MediaBin />}
            {leftPanelTab === 'transcript' && <TranscriptPanel />}
            {leftPanelTab === 'settings' && <SettingsPanel />}
          </div>
        </div>

        {/* Right: Viewer + Timeline */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Viewer */}
          <div className="border-b" style={{ height: '45%', borderColor: 'var(--border)' }}>
            <Viewer />
          </div>

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
