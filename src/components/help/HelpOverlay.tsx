import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';

type Tab = 'basics' | 'advanced';

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
  { step: '4', title: 'Fine-tune audio & video', desc: 'Right-click clips for volume, fades, speed, effects, and more.' },
  { step: '5', title: 'Transcribe & caption', desc: 'Open the Transcript tab to auto-transcribe and generate captions.' },
  { step: '6', title: 'Export', desc: 'Click Export to render your video as MP4 or WebM at 720p, 1080p, or 4K.' },
];

const ADVANCED_SECTIONS = [
  {
    title: 'Multi-Select & Group Editing',
    items: [
      { label: 'Marquee select', desc: 'Click and drag on empty timeline space to draw a selection box around multiple clips.' },
      { label: 'Shift-click', desc: 'Hold Shift and click clips to add/remove them from the selection one by one.' },
      { label: 'Move together', desc: 'When multiple clips are selected, drag any one of them to move the entire group.' },
    ],
  },
  {
    title: 'Clip Speed Control',
    items: [
      { label: 'Change speed', desc: 'Right-click a clip > Speed. Choose from 0.25x (slow motion) to 4x (fast forward).' },
      { label: 'Duration adjusts', desc: 'The clip\'s timeline duration changes automatically to match the speed (2x = half the length).' },
      { label: 'Badge', desc: 'Clips with non-1x speed show a yellow speed badge (e.g. "2x") in the bottom-left corner.' },
    ],
  },
  {
    title: 'Crop, Resize & Fit Mode',
    items: [
      { label: 'Fit Mode', desc: 'Right-click a clip > Fit Mode. Choose Fit (letterbox), Fill (crop to fill), or Stretch.' },
      { label: 'Scale', desc: 'Right-click a clip > adjust the Scale slider (10%–400%) to zoom in or out.' },
      { label: 'Aspect ratios', desc: 'Go to Settings tab to switch between 16:9, 9:16 (vertical), 1:1, or 4:5 canvas presets.' },
    ],
  },
  {
    title: 'Animations & Effects',
    items: [
      { label: 'Apply animation', desc: 'Right-click a video clip > Animation. Choose from 11 presets.' },
      { label: 'Fade presets', desc: 'Fade In, Fade Out, Fade In/Out — smooth opacity transitions.' },
      { label: 'Motion presets', desc: 'Slide Left/Right/Up/Down — clip slides into frame from the chosen direction.' },
      { label: 'Zoom presets', desc: 'Zoom In, Zoom Out — gradual scale change. Ken Burns — slow zoom with pan.' },
      { label: 'Preview', desc: 'Animations play in real-time in the Viewer as you scrub or play the timeline.' },
    ],
  },
  {
    title: 'Transitions',
    items: [
      { label: 'Apply', desc: 'Right-click a video clip > Transition In / Transition Out.' },
      { label: 'Types', desc: 'Cross Dissolve, Fade to Black, Fade from Black — each with a 0.5s default duration.' },
      { label: 'Linked audio', desc: 'Video transitions automatically apply matching audio fades to linked audio clips.' },
    ],
  },
  {
    title: 'Audio & Volume',
    items: [
      { label: 'Clip volume', desc: 'Right-click a clip to adjust volume (0–200%). A yellow line on the clip shows the level.' },
      { label: 'Track volume', desc: 'Click the percentage label on any track header to show a volume slider.' },
      { label: 'Fades', desc: 'Right-click > Fade In / Fade Out, or drag the small white handles at clip corners.' },
      { label: 'Extract audio', desc: 'Right-click a video clip > Extract Audio to create a linked audio clip on a separate track.' },
      { label: 'Unlink', desc: 'Right-click a linked clip > Unlink to separate audio from its source video.' },
    ],
  },
  {
    title: 'Text & Captions',
    items: [
      { label: 'Add text', desc: 'Double-click on a Text track, or switch to the Text tool (T) and click a text track.' },
      { label: 'Auto-captions', desc: 'In Transcript tab, click Transcribe, then use "Generate Captions" for auto-placed subtitles.' },
      { label: 'Caption styles', desc: 'Settings > Caption Style: choose Default, TikTok, YouTube, or Minimal presets.' },
      { label: 'Burn captions', desc: 'Enable "Burn Captions" in the Export dialog to embed subtitles directly in the video.' },
    ],
  },
  {
    title: 'Projects & Auto-Save',
    items: [
      { label: 'Auto-save', desc: 'Your timeline auto-saves to the browser every 3 seconds. Refreshing restores your work.' },
      { label: 'Named projects', desc: 'Press ⌘O or click the folder icon to manage multiple projects, each saved locally.' },
      { label: 'Re-link media', desc: 'If clips show a red "Re-link" badge after restoring, click it to re-import the original file.' },
    ],
  },
  {
    title: 'Export Settings',
    items: [
      { label: 'Format', desc: 'Choose MP4 (H.264, widely compatible) or WebM (VP9, smaller files).' },
      { label: 'Quality', desc: '720p for quick drafts, 1080p for standard HD, 4K for maximum quality.' },
      { label: 'Audio', desc: 'Toggle "Include Audio" to export with or without the audio mix.' },
      { label: 'Speed & effects', desc: 'Clip speed, fade animations, and transitions are baked into the exported file.' },
    ],
  },
];

export function HelpOverlay() {
  const show = useTimelineStore((s) => s.showHelpOverlay);
  const setShow = useTimelineStore((s) => s.setShowHelpOverlay);
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('basics');

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

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: activeTab === tab ? 700 : 500,
    color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: activeTab === tab ? 'var(--accent)' : 'transparent',
    cursor: 'pointer',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        ref={panelRef}
        className="rounded-lg shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', width: 660, maxHeight: '85vh' }}
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

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          <button style={tabStyle('basics')} onClick={() => setActiveTab('basics')}>
            Basics
          </button>
          <button style={tabStyle('advanced')} onClick={() => setActiveTab('advanced')}>
            Advanced
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'basics' && (
            <>
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
            </>
          )}

          {activeTab === 'advanced' && (
            <div className="px-5 py-4 space-y-5">
              {ADVANCED_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
                    {section.title}
                  </h4>
                  <div className="space-y-1.5">
                    {section.items.map((item) => (
                      <div key={item.label} className="flex gap-2 text-xs">
                        <span className="font-semibold flex-shrink-0" style={{ minWidth: 100 }}>
                          {item.label}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {item.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
