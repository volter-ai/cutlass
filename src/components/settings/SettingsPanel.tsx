import { Key, Monitor, Type } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import type { AspectRatio, CaptionStyle } from '../../types';

export function SettingsPanel() {
  const { settings, setAspectRatio, setDeepgramApiKey, setCaptionStyle } = useTimelineStore();
  const { t } = useLanguage();

  const ASPECT_OPTIONS: { ratio: AspectRatio; label: string; desc: string }[] = [
    { ratio: '16:9', label: '16:9', desc: t.settings.landscape },
    { ratio: '9:16', label: '9:16', desc: t.settings.reels },
    { ratio: '1:1', label: '1:1', desc: t.settings.instagram },
    { ratio: '4:5', label: '4:5', desc: t.settings.instagramFb },
  ];

  const CAPTION_PRESETS: { id: CaptionStyle['preset']; label: string; style: Partial<CaptionStyle> }[] = [
    {
      id: 'default',
      label: t.settings.default,
      style: { fontSize: 24, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.7)', position: 'bottom' },
    },
    {
      id: 'tiktok',
      label: t.settings.tiktok,
      style: { fontSize: 32, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0)', position: 'center' },
    },
    {
      id: 'youtube',
      label: t.settings.youtube,
      style: { fontSize: 20, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.8)', position: 'bottom' },
    },
    {
      id: 'minimal',
      label: t.settings.minimal,
      style: { fontSize: 18, color: '#e2e8f0', backgroundColor: 'transparent', position: 'bottom' },
    },
  ];

  const positionLabels: Record<string, string> = {
    top: t.settings.top,
    center: t.settings.center,
    bottom: t.settings.bottom,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t.settings.title}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Aspect Ratio */}
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <Monitor size={12} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t.settings.aspectRatio}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {ASPECT_OPTIONS.map(({ ratio, label, desc }) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className="px-2.5 py-2 rounded text-left transition-colors"
                style={{
                  background: settings.aspectRatio === ratio ? 'var(--accent)' : 'var(--bg-surface)',
                  color: settings.aspectRatio === ratio ? 'white' : 'var(--text-primary)',
                }}
              >
                <div className="text-xs font-bold">{label}</div>
                <div className="text-xs opacity-70">{desc}</div>
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {settings.resolution.width} x {settings.resolution.height}
          </div>
        </section>

        {/* Deepgram API Key */}
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <Key size={12} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t.settings.deepgramKey}</span>
          </div>
          <input
            type="password"
            value={settings.deepgramApiKey}
            onChange={(e) => setDeepgramApiKey(e.target.value)}
            placeholder={t.settings.keyPlaceholder}
            className="w-full text-xs px-2.5 py-1.5 rounded border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {settings.deepgramApiKey ? t.settings.keySet : t.settings.noKey}
          </p>
        </section>

        {/* Caption Style */}
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <Type size={12} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t.settings.captionStyle}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CAPTION_PRESETS.map(({ id, label, style }) => (
              <button
                key={id}
                onClick={() => setCaptionStyle({ ...style, preset: id })}
                className="px-2.5 py-2 rounded text-xs font-semibold transition-colors"
                style={{
                  background: settings.captionStyle.preset === id ? 'var(--accent)' : 'var(--bg-surface)',
                  color: settings.captionStyle.preset === id ? 'white' : 'var(--text-primary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Caption position */}
          <div className="mt-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>{t.settings.position}</label>
            <div className="flex gap-1">
              {(['top', 'center', 'bottom'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setCaptionStyle({ position: pos })}
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{
                    background: settings.captionStyle.position === pos ? 'var(--accent)' : 'var(--bg-surface)',
                    color: settings.captionStyle.position === pos ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {positionLabels[pos]}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div className="mt-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              {t.settings.fontSize}: {settings.captionStyle.fontSize}px
            </label>
            <input
              type="range"
              min={14}
              max={48}
              value={settings.captionStyle.fontSize}
              onChange={(e) => setCaptionStyle({ fontSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
