import { useState, useEffect, useRef, useCallback } from 'react';
import { Unlink, AudioLines, Scissors, ChevronDown, ChevronUp } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import type { AnimationPreset } from '../../types';

interface Props {
  clipId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const FADE_OPTIONS = [0, 0.25, 0.5, 1, 2];
const SPEED_OPTIONS = [
  { label: '0.25×', value: 0.25 },
  { label: '0.5×', value: 0.5 },
  { label: '0.75×', value: 0.75 },
  { label: '1×', value: 1 },
  { label: '1.5×', value: 1.5 },
  { label: '2×', value: 2 },
  { label: '4×', value: 4 },
];
const ANIMATION_PRESETS: { key: string; value: AnimationPreset }[] = [
  { key: 'animNone', value: 'none' },
  { key: 'animFadeIn', value: 'fade-in' },
  { key: 'animFadeOut', value: 'fade-out' },
  { key: 'animFadeInOut', value: 'fade-in-out' },
  { key: 'animSlideLeft', value: 'slide-left' },
  { key: 'animSlideRight', value: 'slide-right' },
  { key: 'animSlideUp', value: 'slide-up' },
  { key: 'animSlideDown', value: 'slide-down' },
  { key: 'animZoomIn', value: 'zoom-in' },
  { key: 'animZoomOut', value: 'zoom-out' },
  { key: 'animKenBurns', value: 'ken-burns' },
];
const TRANSITION_TYPES = [
  { key: 'crossDissolve', value: 'cross-dissolve' as const },
  { key: 'fadeToBlack', value: 'fade-to-black' as const },
  { key: 'fadeFromBlack', value: 'fade-from-black' as const },
];

const MENU_WIDTH = 240;

export function ClipContextMenu({ clipId, position, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const clip = useTimelineStore((s) => s.clips[clipId]);
  const {
    extractAudioFromClip, unlinkClips,
    setClipFade, setClipSpeed, setClipFitMode,
    setClipTransform, setClipAnimation, setClipTransition,
    setClipVolume, removeClip,
  } = useTimelineStore();
  const { t } = useLanguage();

  // Which accordion section is open (click-to-toggle)
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleAction = useCallback((action: () => void) => { action(); onClose(); }, [onClose]);
  const toggle = useCallback((key: string) => setOpenSection((s) => s === key ? null : key), []);

  if (!clip) return null;

  const isVideo = clip.type === 'video';
  const isImage = clip.type === 'image';
  const isLinked = !!clip.linkedGroupId;
  const clipSpeed = clip.speed ?? 1;
  const clipAnimationPreset = clip.animation?.preset ?? 'none';
  const clipFitMode = clip.fitMode ?? 'fit';
  const clipScale = clip.scale ?? 1;
  const cm = t.contextMenu;

  // Smart positioning: keep within viewport
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = position.x + MENU_WIDTH > vw ? Math.max(0, vw - MENU_WIDTH - 8) : position.x;
  // Top is adjusted dynamically after render, but cap at a safe value
  const top = Math.min(position.y, vh - 80);

  // Styles
  const item: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', fontSize: 12,
    color: 'var(--text-primary)', cursor: 'pointer',
    width: '100%', border: 'none', background: 'none', textAlign: 'left',
  };
  const sep: React.CSSProperties = { height: 1, background: 'var(--border)', margin: '3px 0' };
  const sectionHeader: React.CSSProperties = {
    ...item, justifyContent: 'space-between', userSelect: 'none',
  };
  const chipRow: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', gap: 4,
    padding: '4px 12px 8px',
  };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: 'none',
    background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-primary)',
  });
  const gridWrap: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 4, padding: '4px 12px 8px',
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed', left, top, zIndex: 9999,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 6, padding: '4px 0',
        width: MENU_WIDTH,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        maxHeight: vh - top - 8,
        overflowY: 'auto',
      }}
    >
      {/* Extract Audio */}
      {isVideo && !isLinked && (
        <button style={item} onClick={() => handleAction(() => extractAudioFromClip(clipId))}>
          <AudioLines size={12} />{cm.extractAudio}
        </button>
      )}
      {isLinked && (
        <button style={item} onClick={() => handleAction(() => unlinkClips(clipId))}>
          <Unlink size={12} />{cm.unlink}
        </button>
      )}
      {(isVideo || isLinked) && <div style={sep} />}

      {/* Speed */}
      <button style={sectionHeader} onClick={() => toggle('speed')}>
        <span>{cm.speed}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
          {clipSpeed}×{openSection === 'speed' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </span>
      </button>
      {openSection === 'speed' && (
        <div style={chipRow}>
          {SPEED_OPTIONS.map((opt) => (
            <button key={opt.value} style={chip(clipSpeed === opt.value)}
              onClick={() => handleAction(() => setClipSpeed(clipId, opt.value))}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Fit Mode (video + image) */}
      {(isVideo || isImage) && (
        <>
          <button style={sectionHeader} onClick={() => toggle('fitMode')}>
            <span>{cm.fitMode}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
              {clipFitMode}{openSection === 'fitMode' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </span>
          </button>
          {openSection === 'fitMode' && (
            <div style={chipRow}>
              {(['fit', 'fill', 'stretch'] as const).map((mode) => (
                <button key={mode} style={chip(clipFitMode === mode)}
                  onClick={() => handleAction(() => setClipFitMode(clipId, mode))}>
                  {mode === 'fit' ? cm.fitLetterbox : mode === 'fill' ? cm.fillCrop : cm.stretch}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Scale (video + image) */}
      {(isVideo || isImage) && (
        <div style={{ ...item, cursor: 'default', gap: 8 }}>
          <span style={{ minWidth: 38, fontSize: 12 }}>{cm.scale}</span>
          <input type="range" min={10} max={400} value={Math.round(clipScale * 100)}
            onChange={(e) => setClipTransform(clipId, { scale: Number(e.target.value) / 100 })}
            style={{ flex: 1, height: 4, accentColor: 'var(--accent)' }}
            onClick={(e) => e.stopPropagation()} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 32, textAlign: 'right' }}>
            {Math.round(clipScale * 100)}%
          </span>
        </div>
      )}

      {/* Animation (video + image) */}
      {(isVideo || isImage) && (
        <>
          <button style={sectionHeader} onClick={() => toggle('animation')}>
            <span>{cm.animation}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
              {clipAnimationPreset === 'none' ? cm.animNone : clipAnimationPreset}
              {openSection === 'animation' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </span>
          </button>
          {openSection === 'animation' && (
            <div style={gridWrap}>
              {ANIMATION_PRESETS.map((opt) => (
                <button key={opt.value} style={chip(clipAnimationPreset === opt.value)}
                  onClick={() => handleAction(() =>
                    setClipAnimation(clipId, opt.value === 'none' ? undefined : { preset: opt.value }))}>
                  {cm[opt.key as keyof typeof cm]}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div style={sep} />

      {/* Fade In */}
      <button style={sectionHeader} onClick={() => toggle('fadeIn')}>
        <span>{cm.fadeIn}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
          {clip.fadeIn > 0 ? `${clip.fadeIn}s` : cm.none}
          {openSection === 'fadeIn' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </span>
      </button>
      {openSection === 'fadeIn' && (
        <div style={chipRow}>
          {FADE_OPTIONS.map((v) => (
            <button key={v} style={chip(clip.fadeIn === v)}
              onClick={() => handleAction(() => setClipFade(clipId, 'in', v))}>
              {v === 0 ? cm.none : `${v}s`}
            </button>
          ))}
        </div>
      )}

      {/* Fade Out */}
      <button style={sectionHeader} onClick={() => toggle('fadeOut')}>
        <span>{cm.fadeOut}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
          {clip.fadeOut > 0 ? `${clip.fadeOut}s` : cm.none}
          {openSection === 'fadeOut' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </span>
      </button>
      {openSection === 'fadeOut' && (
        <div style={chipRow}>
          {FADE_OPTIONS.map((v) => (
            <button key={v} style={chip(clip.fadeOut === v)}
              onClick={() => handleAction(() => setClipFade(clipId, 'out', v))}>
              {v === 0 ? cm.none : `${v}s`}
            </button>
          ))}
        </div>
      )}

      {/* Transitions (video only) */}
      {isVideo && (
        <>
          <div style={sep} />

          <button style={sectionHeader} onClick={() => toggle('transIn')}>
            <span>{cm.transitionIn}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
              {clip.transitionIn ? clip.transitionIn.type : cm.none}
              {openSection === 'transIn' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </span>
          </button>
          {openSection === 'transIn' && (
            <div style={chipRow}>
              <button style={chip(!clip.transitionIn)}
                onClick={() => handleAction(() => setClipTransition(clipId, 'in', undefined))}>
                {cm.none}
              </button>
              {TRANSITION_TYPES.map((tt) => (
                <button key={tt.value} style={chip(clip.transitionIn?.type === tt.value)}
                  onClick={() => handleAction(() => setClipTransition(clipId, 'in', { type: tt.value, duration: 0.5 }))}>
                  {cm[tt.key as keyof typeof cm]}
                </button>
              ))}
            </div>
          )}

          <button style={sectionHeader} onClick={() => toggle('transOut')}>
            <span>{cm.transitionOut}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
              {clip.transitionOut ? clip.transitionOut.type : cm.none}
              {openSection === 'transOut' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </span>
          </button>
          {openSection === 'transOut' && (
            <div style={chipRow}>
              <button style={chip(!clip.transitionOut)}
                onClick={() => handleAction(() => setClipTransition(clipId, 'out', undefined))}>
                {cm.none}
              </button>
              {TRANSITION_TYPES.map((tt) => (
                <button key={tt.value} style={chip(clip.transitionOut?.type === tt.value)}
                  onClick={() => handleAction(() => setClipTransition(clipId, 'out', { type: tt.value, duration: 0.5 }))}>
                  {cm[tt.key as keyof typeof cm]}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div style={sep} />

      {/* Volume */}
      <div style={{ ...item, cursor: 'default', gap: 8 }}>
        <span style={{ minWidth: 42, fontSize: 12 }}>{cm.volume}</span>
        <input type="range" min={0} max={200} value={Math.round(clip.volume * 100)}
          onChange={(e) => setClipVolume(clipId, Number(e.target.value) / 100)}
          style={{ flex: 1, height: 4, accentColor: 'var(--accent)' }}
          onClick={(e) => e.stopPropagation()} />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 32, textAlign: 'right' }}>
          {Math.round(clip.volume * 100)}%
        </span>
      </div>

      <div style={sep} />

      {/* Delete */}
      <button style={{ ...item, color: 'var(--playhead)' }}
        onClick={() => handleAction(() => removeClip(clipId))}>
        <Scissors size={12} />{cm.deleteClip}
      </button>
    </div>
  );
}
