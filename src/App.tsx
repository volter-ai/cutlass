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
import { useTimelineStore } from './store/timeline';

const TABS = ['media', 'transcript', 'settings'] as const;

export default function App() {
  useKeyboardShortcuts();
  usePlayback();
  useAudioPlayback();

  const leftPanelTab = useTimelineStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useTimelineStore((s) => s.setLeftPanelTab);

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
