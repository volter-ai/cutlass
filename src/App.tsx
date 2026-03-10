import { Toolbar } from './components/toolbar/Toolbar';
import { MediaBin } from './components/media-bin/MediaBin';
import { TranscriptPanel } from './components/transcript/TranscriptPanel';
import { Viewer } from './components/viewer/Viewer';
import { Timeline } from './components/timeline/Timeline';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlayback } from './hooks/usePlayback';
import { useTimelineStore } from './store/timeline';

export default function App() {
  useKeyboardShortcuts();
  usePlayback();

  const leftPanelTab = useTimelineStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useTimelineStore((s) => s.setLeftPanelTab);

  return (
    <div className="flex flex-col h-screen w-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel: Media Bin / Transcript */}
        <div
          className="flex flex-col border-r"
          style={{ width: 280, borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
        >
          {/* Tab switcher */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setLeftPanelTab('media')}
              className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: leftPanelTab === 'media' ? 'var(--bg-surface)' : 'transparent',
                color: leftPanelTab === 'media' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: leftPanelTab === 'media' ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              Media
            </button>
            <button
              onClick={() => setLeftPanelTab('transcript')}
              className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: leftPanelTab === 'transcript' ? 'var(--bg-surface)' : 'transparent',
                color: leftPanelTab === 'transcript' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: leftPanelTab === 'transcript' ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              Transcript
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0">
            {leftPanelTab === 'media' ? <MediaBin /> : <TranscriptPanel />}
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
    </div>
  );
}
