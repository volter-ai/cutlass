import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';

type Tab = 'basics' | 'advanced' | 'updates';

export function HelpOverlay() {
  const show = useTimelineStore((s) => s.showHelpOverlay);
  const setShow = useTimelineStore((s) => s.setShowHelpOverlay);
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('basics');
  const { t } = useLanguage();

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
            {t.help.title}
          </h2>
          <button onClick={() => setShow(false)} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          <button style={tabStyle('basics')} onClick={() => setActiveTab('basics')}>
            {t.help.basics}
          </button>
          <button style={tabStyle('advanced')} onClick={() => setActiveTab('advanced')}>
            {t.help.advanced}
          </button>
          <button style={tabStyle('updates')} onClick={() => setActiveTab('updates')}>
            {t.help.updates}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'basics' && (
            <>
              {/* Quick Start */}
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {t.help.quickStart}
                </h3>
                <div className="grid gap-2">
                  {t.help.steps.map((s, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--accent)', color: 'white' }}
                      >
                        {i + 1}
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
                  {t.help.keyboardShortcuts}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {t.help.shortcutSections.map((section) => (
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
              {t.help.advancedSections.map((section) => (
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

          {activeTab === 'updates' && (
            <div className="px-5 py-4 space-y-4">
              {t.help.updateEntries.map((entry, i) => (
                <div key={i} className="border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-xs font-bold mb-1.5" style={{ color: 'var(--accent)' }}>
                    {entry.date}
                  </div>
                  <ul className="space-y-1">
                    {entry.items.map((item, j) => (
                      <li key={j} className="text-xs flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 text-center border-t" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t.help.closeHint}
          </span>
        </div>
      </div>
    </div>
  );
}
