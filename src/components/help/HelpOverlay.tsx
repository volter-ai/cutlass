import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';

const SHORTCUT_SECTIONS = [
  {
    title: 'Playback',
    shortcuts: [
      { keys: 'Space', desc: 'Play / Pause' },
      { keys: '←  →', desc: 'Step 1 frame' },
      { keys: '⇧ ←  ⇧ →', desc: 'Step 5 frames' },
    ],
  },
  {
    title: 'Tools',
    shortcuts: [
      { keys: 'V', desc: 'Select tool' },
      { keys: 'C', desc: 'Razor tool' },
      { keys: 'T', desc: 'Text tool' },
      { keys: 'S', desc: 'Toggle snap' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: '⌘ K', desc: 'Split at playhead' },
      { keys: 'Delete', desc: 'Remove selected' },
      { keys: '⇧ Delete', desc: 'Ripple delete' },
      { keys: 'U', desc: 'Extract / unlink audio' },
      { keys: 'Right-click', desc: 'Clip context menu' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '⌘ Z', desc: 'Undo' },
      { keys: '⌘ ⇧ Z', desc: 'Redo' },
      { keys: '⌘ +', desc: 'Zoom in' },
      { keys: '⌘ −', desc: 'Zoom out' },
    ],
  },
  {
    title: 'Project',
    shortcuts: [
      { keys: '⌘ S', desc: 'Save project' },
      { keys: '⌘ O', desc: 'Open projects' },
      { keys: '?', desc: 'Toggle this help' },
    ],
  },
];

const QUICK_START_STEPS = [
  { step: '1', title: 'Import media', desc: 'Drag video or audio files into the Media panel, or click Import.' },
  { step: '2', title: 'Build your timeline', desc: 'Drag clips from the Media panel onto timeline tracks.' },
  { step: '3', title: 'Cut and arrange', desc: 'Use the Razor tool (C) to cut clips. Select tool (V) to move them.' },
  { step: '4', title: 'Fine-tune audio & video', desc: 'Right-click clips for volume, fades, transitions, and extract audio.' },
  { step: '5', title: 'Transcribe & caption', desc: 'Open the Transcript tab to auto-transcribe and generate captions.' },
  { step: '6', title: 'Export', desc: 'Click Export to render your video as MP4 or WebM.' },
];

export function HelpOverlay() {
  const show = useTimelineStore((s) => s.showHelpOverlay);
  const setShow = useTimelineStore((s) => s.setShowHelpOverlay);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShow(false);
    }
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [show, setShow]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        ref={panelRef}
        className="rounded-lg shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', width: 640 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--accent)' }}>
            CUTLASS — Help
          </h2>
          <button onClick={() => setShow(false)} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Quick Start */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Quick Start
          </h3>
          <div className="grid gap-2">
            {QUICK_START_STEPS.map((s) => (
              <div key={s.step} className="flex gap-3 items-start">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {s.step}
                </span>
                <div>
                  <span className="text-xs font-semibold">{s.title}</span>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="px-5 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {SHORTCUT_SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--accent)' }}>
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.shortcuts.map((sc) => (
                    <div key={sc.keys} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>{sc.desc}</span>
                      <kbd
                        className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      >
                        {sc.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2 text-center border-t" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Press <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-primary)' }}>?</kbd> or <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-primary)' }}>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
