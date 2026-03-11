import { Key, Monitor, Type, Palette } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import type { AspectRatio, CaptionStyle, TextStyle } from '../../types';

const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New',
  'Verdana', 'Impact', 'Comic Sans MS', 'Trebuchet MS',
];

export function SettingsPanel() {
  const { settings, setAspectRatio, setDeepgramApiKey, setCaptionStyle } = useTimelineStore();
  const selectedTextOverlayId = useTimelineStore((s) => s.selectedTextOverlayId);
  const textOverlays = useTimelineStore((s) => s.textOverlays);
  const updateTextOverlay = useTimelineStore((s) => s.updateTextOverlay);

  const selectedOverlay = selectedTextOverlayId ? textOverlays[selectedTextOverlayId] : null;

  const updateStyle = (updates: Partial<TextStyle>) => {
    if (selectedTextOverlayId) {
      updateTextOverlay(selectedTextOverlayId, { style: updates });
    }
  };
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

        {/* Text Overlay Style (when selected) */}
        {selectedOverlay && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Palette size={12} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t.settings.textStyle ?? 'Text Style'}
              </span>
            </div>
            <p className="text-xs mb-2 truncate" style={{ color: 'var(--text-secondary)' }}>
              {selectedOverlay.text}
            </p>

            {/* Font Family */}
            <div className="mb-2">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t.settings.fontFamily ?? 'Font'}
              </label>
              <select
                value={selectedOverlay.style.fontFamily}
                onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                className="w-full text-xs px-2 py-1 rounded border"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="mb-2">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t.settings.fontSize}: {selectedOverlay.style.fontSize}px
              </label>
              <input
                type="range"
                min={12}
                max={120}
                value={selectedOverlay.style.fontSize}
                onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Font Weight */}
            <div className="mb-2">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t.settings.fontWeight ?? 'Weight'}
              </label>
              <div className="flex gap-1">
                {(['normal', 'bold'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => updateStyle({ fontWeight: w })}
                    className="flex-1 px-2 py-1 rounded text-xs"
                    style={{
                      background: selectedOverlay.style.fontWeight === w ? 'var(--accent)' : 'var(--bg-surface)',
                      color: selectedOverlay.style.fontWeight === w ? 'white' : 'var(--text-secondary)',
                      fontWeight: w,
                    }}
                  >
                    {w === 'normal' ? 'Normal' : 'Bold'}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div className="mb-2">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t.settings.textColor ?? 'Color'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedOverlay.style.color}
                  onChange={(e) => updateStyle({ color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selectedOverlay.style.color}
                </span>
              </div>
            </div>

            {/* Background Color */}
            <div className="mb-2">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t.settings.bgColor ?? 'Background'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedOverlay.style.backgroundColor === 'transparent' ? '#000000' : selectedOverlay.style.backgroundColor}
                  onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
                <button
                  onClick={() => updateStyle({ backgroundColor: 'transparent' })}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: selectedOverlay.style.backgroundColor === 'transparent' ? 'var(--accent)' : 'var(--bg-surface)',
                    color: selectedOverlay.style.backgroundColor === 'transparent' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {t.contextMenu.none}
                </button>
              </div>
            </div>

            {/* Text Align */}
            <div className="mb-2">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t.settings.textAlign ?? 'Align'}
              </label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => updateStyle({ textAlign: a })}
                    className="flex-1 px-2 py-1 rounded text-xs"
                    style={{
                      background: selectedOverlay.style.textAlign === a ? 'var(--accent)' : 'var(--bg-surface)',
                      color: selectedOverlay.style.textAlign === a ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Position X / Y */}
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  X: {Math.round(selectedOverlay.style.x)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selectedOverlay.style.x}
                  onChange={(e) => updateStyle({ x: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Y: {Math.round(selectedOverlay.style.y)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selectedOverlay.style.y}
                  onChange={(e) => updateStyle({ y: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Outline */}
            <div className="mb-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={selectedOverlay.style.outline}
                  onChange={(e) => updateStyle({ outline: e.target.checked })}
                />
                {t.settings.textOutline ?? 'Outline'}
              </label>
              {selectedOverlay.style.outline && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={selectedOverlay.style.outlineColor}
                    onChange={(e) => updateStyle({ outlineColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {selectedOverlay.style.outlineColor}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
