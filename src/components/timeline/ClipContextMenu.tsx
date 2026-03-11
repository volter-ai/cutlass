import { useState, useEffect, useRef, useCallback } from 'react';
import { Unlink, AudioLines, Scissors, ChevronRight } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import type { AnimationPreset } from '../../types';

interface Props {
  clipId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const FADE_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '0.25s', value: 0.25 },
  { label: '0.5s', value: 0.5 },
  { label: '1s', value: 1 },
  { label: '2s', value: 2 },
];

const SPEED_OPTIONS = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x (Normal)', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
];

const ANIMATION_PRESETS: { label: string; value: AnimationPreset }[] = [
  { label: 'None', value: 'none' },
  { label: 'Fade In', value: 'fade-in' },
  { label: 'Fade Out', value: 'fade-out' },
  { label: 'Fade In/Out', value: 'fade-in-out' },
  { label: 'Slide Left', value: 'slide-left' },
  { label: 'Slide Right', value: 'slide-right' },
  { label: 'Slide Up', value: 'slide-up' },
  { label: 'Slide Down', value: 'slide-down' },
  { label: 'Zoom In', value: 'zoom-in' },
  { label: 'Zoom Out', value: 'zoom-out' },
  { label: 'Ken Burns', value: 'ken-burns' },
];

const TRANSITION_TYPES = [
  { label: 'Cross Dissolve', value: 'cross-dissolve' as const },
  { label: 'Fade to Black', value: 'fade-to-black' as const },
  { label: 'Fade from Black', value: 'fade-from-black' as const },
];

export function ClipContextMenu({ clipId, position, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const clip = useTimelineStore((s) => s.clips[clipId]);
  const {
    extractAudioFromClip,
    unlinkClips,
    setClipFade,
    setClipSpeed,
    setClipFitMode,
    setClipTransform,
    setClipAnimation,
    setClipTransition,
    setClipVolume,
    removeClip,
  } = useTimelineStore();

  const [openSub, setOpenSub] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleAction = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose],
  );

  if (!clip) return null;

  const isVideo = clip.type === 'video';
  const isLinked = !!clip.linkedGroupId;
  const clipSpeed = clip.speed ?? 1;
  const clipAnimationPreset = clip.animation?.preset ?? 'none';
  const clipFitMode = clip.fitMode ?? 'fit';
  const clipScale = clip.scale ?? 1;

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 9999,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 0',
    minWidth: 200,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    fontSize: 12,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    width: '100%',
    border: 'none',
    background: 'none',
    textAlign: 'left',
  };

  const separatorStyle: React.CSSProperties = {
    height: 1,
    background: 'var(--border)',
    margin: '4px 0',
  };

  const subMenuStyle: React.CSSProperties = {
    position: 'absolute',
    left: '100%',
    top: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 0',
    minWidth: 140,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  };

  return (
    <div ref={menuRef} style={menuStyle}>
      {/* Extract Audio */}
      {isVideo && !isLinked && (
        <button
          style={itemStyle}
          onClick={() => handleAction(() => extractAudioFromClip(clipId))}
          onMouseEnter={() => setOpenSub(null)}
        >
          <AudioLines size={12} />
          Extract Audio
        </button>
      )}

      {/* Unlink */}
      {isLinked && (
        <button
          style={itemStyle}
          onClick={() => handleAction(() => unlinkClips(clipId))}
          onMouseEnter={() => setOpenSub(null)}
        >
          <Unlink size={12} />
          Unlink
        </button>
      )}

      {(isVideo || isLinked) && <div style={separatorStyle} />}

      {/* Speed */}
      <div
        className="relative"
        onMouseEnter={() => setOpenSub('speed')}
      >
        <div style={itemStyle}>
          <span style={{ flex: 1 }}>Speed</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {clipSpeed}x
          </span>
          <ChevronRight size={10} />
        </div>
        {openSub === 'speed' && (
          <div style={subMenuStyle}>
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...itemStyle,
                  fontWeight: clipSpeed === opt.value ? 'bold' : 'normal',
                  color: clipSpeed === opt.value ? 'var(--accent)' : 'var(--text-primary)',
                }}
                onClick={() => handleAction(() => setClipSpeed(clipId, opt.value))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fit Mode (video only) */}
      {isVideo && (
        <div
          className="relative"
          onMouseEnter={() => setOpenSub('fitMode')}
        >
          <div style={itemStyle}>
            <span style={{ flex: 1 }}>Fit Mode</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              {clipFitMode.charAt(0).toUpperCase() + clipFitMode.slice(1)}
            </span>
            <ChevronRight size={10} />
          </div>
          {openSub === 'fitMode' && (
            <div style={subMenuStyle}>
              {(['fit', 'fill', 'stretch'] as const).map((mode) => (
                <button
                  key={mode}
                  style={{
                    ...itemStyle,
                    fontWeight: clipFitMode === mode ? 'bold' : 'normal',
                    color: clipFitMode === mode ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                  onClick={() => handleAction(() => setClipFitMode(clipId, mode))}
                >
                  {mode === 'fit' ? 'Fit (Letterbox)' : mode === 'fill' ? 'Fill (Crop)' : 'Stretch'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scale slider (video only) */}
      {isVideo && (
        <div style={{ ...itemStyle, cursor: 'default' }} onMouseEnter={() => setOpenSub(null)}>
          <span style={{ fontSize: 12 }}>Scale</span>
          <input
            type="range"
            min={10}
            max={400}
            value={Math.round(clipScale * 100)}
            onChange={(e) => setClipTransform(clipId, { scale: Number(e.target.value) / 100 })}
            style={{ flex: 1, height: 4, accentColor: 'var(--accent)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 32, textAlign: 'right' }}>
            {Math.round(clipScale * 100)}%
          </span>
        </div>
      )}

      {/* Animation (video only) */}
      {isVideo && (
        <div
          className="relative"
          onMouseEnter={() => setOpenSub('animation')}
        >
          <div style={itemStyle}>
            <span style={{ flex: 1 }}>Animation</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              {ANIMATION_PRESETS.find((p) => p.value === clipAnimationPreset)?.label ?? 'None'}
            </span>
            <ChevronRight size={10} />
          </div>
          {openSub === 'animation' && (
            <div style={{ ...subMenuStyle, maxHeight: 260, overflowY: 'auto' }}>
              {ANIMATION_PRESETS.map((opt) => (
                <button
                  key={opt.value}
                  style={{
                    ...itemStyle,
                    fontWeight: clipAnimationPreset === opt.value ? 'bold' : 'normal',
                    color: clipAnimationPreset === opt.value ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                  onClick={() =>
                    handleAction(() =>
                      setClipAnimation(
                        clipId,
                        opt.value === 'none' ? undefined : { preset: opt.value },
                      ),
                    )
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fade In */}
      <div
        className="relative"
        onMouseEnter={() => setOpenSub('fadeIn')}
      >
        <div style={itemStyle}>
          <span style={{ flex: 1 }}>Fade In</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {clip.fadeIn > 0 ? `${clip.fadeIn}s` : 'None'}
          </span>
          <ChevronRight size={10} />
        </div>
        {openSub === 'fadeIn' && (
          <div style={subMenuStyle}>
            {FADE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...itemStyle,
                  fontWeight: clip.fadeIn === opt.value ? 'bold' : 'normal',
                  color: clip.fadeIn === opt.value ? 'var(--accent)' : 'var(--text-primary)',
                }}
                onClick={() => handleAction(() => setClipFade(clipId, 'in', opt.value))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fade Out */}
      <div
        className="relative"
        onMouseEnter={() => setOpenSub('fadeOut')}
      >
        <div style={itemStyle}>
          <span style={{ flex: 1 }}>Fade Out</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {clip.fadeOut > 0 ? `${clip.fadeOut}s` : 'None'}
          </span>
          <ChevronRight size={10} />
        </div>
        {openSub === 'fadeOut' && (
          <div style={subMenuStyle}>
            {FADE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...itemStyle,
                  fontWeight: clip.fadeOut === opt.value ? 'bold' : 'normal',
                  color: clip.fadeOut === opt.value ? 'var(--accent)' : 'var(--text-primary)',
                }}
                onClick={() => handleAction(() => setClipFade(clipId, 'out', opt.value))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={separatorStyle} />

      {/* Transition In (video only) */}
      {isVideo && (
        <div
          className="relative"
          onMouseEnter={() => setOpenSub('transIn')}
        >
          <div style={itemStyle}>
            <span style={{ flex: 1 }}>Transition In</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              {clip.transitionIn?.type ?? 'None'}
            </span>
            <ChevronRight size={10} />
          </div>
          {openSub === 'transIn' && (
            <div style={subMenuStyle}>
              <button
                style={{
                  ...itemStyle,
                  fontWeight: !clip.transitionIn ? 'bold' : 'normal',
                  color: !clip.transitionIn ? 'var(--accent)' : 'var(--text-primary)',
                }}
                onClick={() => handleAction(() => setClipTransition(clipId, 'in', undefined))}
              >
                None
              </button>
              {TRANSITION_TYPES.map((t) => (
                <button
                  key={t.value}
                  style={{
                    ...itemStyle,
                    fontWeight: clip.transitionIn?.type === t.value ? 'bold' : 'normal',
                    color: clip.transitionIn?.type === t.value ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                  onClick={() =>
                    handleAction(() => setClipTransition(clipId, 'in', { type: t.value, duration: 0.5 }))
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transition Out (video only) */}
      {isVideo && (
        <div
          className="relative"
          onMouseEnter={() => setOpenSub('transOut')}
        >
          <div style={itemStyle}>
            <span style={{ flex: 1 }}>Transition Out</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              {clip.transitionOut?.type ?? 'None'}
            </span>
            <ChevronRight size={10} />
          </div>
          {openSub === 'transOut' && (
            <div style={subMenuStyle}>
              <button
                style={{
                  ...itemStyle,
                  fontWeight: !clip.transitionOut ? 'bold' : 'normal',
                  color: !clip.transitionOut ? 'var(--accent)' : 'var(--text-primary)',
                }}
                onClick={() => handleAction(() => setClipTransition(clipId, 'out', undefined))}
              >
                None
              </button>
              {TRANSITION_TYPES.map((t) => (
                <button
                  key={t.value}
                  style={{
                    ...itemStyle,
                    fontWeight: clip.transitionOut?.type === t.value ? 'bold' : 'normal',
                    color: clip.transitionOut?.type === t.value ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                  onClick={() =>
                    handleAction(() => setClipTransition(clipId, 'out', { type: t.value, duration: 0.5 }))
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={separatorStyle} />

      {/* Volume slider */}
      <div style={{ ...itemStyle, cursor: 'default' }} onMouseEnter={() => setOpenSub(null)}>
        <span style={{ fontSize: 12 }}>Volume</span>
        <input
          type="range"
          min={0}
          max={200}
          value={Math.round(clip.volume * 100)}
          onChange={(e) => setClipVolume(clipId, Number(e.target.value) / 100)}
          style={{ flex: 1, height: 4, accentColor: 'var(--accent)' }}
          onClick={(e) => e.stopPropagation()}
        />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 32, textAlign: 'right' }}>
          {Math.round(clip.volume * 100)}%
        </span>
      </div>

      <div style={separatorStyle} />

      {/* Delete */}
      <button
        style={{ ...itemStyle, color: 'var(--playhead)' }}
        onClick={() => handleAction(() => removeClip(clipId))}
        onMouseEnter={() => setOpenSub(null)}
      >
        <Scissors size={12} />
        Delete Clip
      </button>
    </div>
  );
}
