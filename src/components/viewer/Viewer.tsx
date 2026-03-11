import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import type { AnimationPreset } from '../../types';

/** Compute CSS transform + opacity for a clip animation at a given progress (0-1 through clip) */
function getAnimationStyle(
  preset: AnimationPreset | undefined,
  progress: number,
): { transform: string; opacity: number } {
  if (!preset || preset === 'none') return { transform: '', opacity: 1 };

  // Easing function (ease-in-out)
  const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  switch (preset) {
    case 'fade-in': {
      const t = Math.min(1, progress * 3); // fade in over first third
      return { transform: '', opacity: ease(t) };
    }
    case 'fade-out': {
      const t = Math.max(0, (progress - 0.67) * 3); // fade out over last third
      return { transform: '', opacity: 1 - ease(t) };
    }
    case 'fade-in-out': {
      const fadeIn = Math.min(1, progress * 4);
      const fadeOut = Math.max(0, (progress - 0.75) * 4);
      return { transform: '', opacity: ease(fadeIn) * (1 - ease(fadeOut)) };
    }
    case 'slide-left': {
      const t = Math.min(1, progress * 3);
      const x = (1 - ease(t)) * 100;
      return { transform: `translateX(${x}%)`, opacity: 1 };
    }
    case 'slide-right': {
      const t = Math.min(1, progress * 3);
      const x = (1 - ease(t)) * -100;
      return { transform: `translateX(${x}%)`, opacity: 1 };
    }
    case 'slide-up': {
      const t = Math.min(1, progress * 3);
      const y = (1 - ease(t)) * 100;
      return { transform: `translateY(${y}%)`, opacity: 1 };
    }
    case 'slide-down': {
      const t = Math.min(1, progress * 3);
      const y = (1 - ease(t)) * -100;
      return { transform: `translateY(${y}%)`, opacity: 1 };
    }
    case 'zoom-in': {
      const scale = 1 + progress * 0.3; // 1.0 → 1.3
      return { transform: `scale(${scale})`, opacity: 1 };
    }
    case 'zoom-out': {
      const scale = 1.3 - progress * 0.3; // 1.3 → 1.0
      return { transform: `scale(${scale})`, opacity: 1 };
    }
    case 'ken-burns': {
      // Slow zoom in + subtle pan
      const scale = 1 + progress * 0.2;
      const x = progress * 5;
      const y = progress * -3;
      return { transform: `scale(${scale}) translate(${x}%, ${y}%)`, opacity: 1 };
    }
    default:
      return { transform: '', opacity: 1 };
  }
}

export function Viewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const playheadPosition = useTimelineStore((s) => s.playheadPosition);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const clips = useTimelineStore((s) => s.clips);
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaFiles = useTimelineStore((s) => s.mediaFiles);
  const textOverlays = useTimelineStore((s) => s.textOverlays);
  const resolution = useTimelineStore((s) => s.settings.resolution);
  const { t } = useLanguage();

  // Track container width for scaling text overlays
  const [containerWidth, setContainerWidth] = useState(640);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Find the active video clip at the current playhead position
  const activeClip = useMemo(() => {
    const videoTrackIds = new Set(
      tracks.filter((t) => t.type === 'video').map((t) => t.id),
    );
    return (
      Object.values(clips).find(
        (c) =>
          videoTrackIds.has(c.trackId) &&
          playheadPosition >= c.startTime &&
          playheadPosition < c.startTime + c.duration,
      ) ?? null
    );
  }, [tracks, clips, playheadPosition]);

  const activeMedia = activeClip ? mediaFiles[activeClip.mediaFileId] : null;

  // Compute animation progress and style
  const animStyle = useMemo(() => {
    if (!activeClip) return { transform: '', opacity: 1 };
    const progress = (playheadPosition - activeClip.startTime) / activeClip.duration;
    return getAnimationStyle(activeClip.animation?.preset, Math.max(0, Math.min(1, progress)));
  }, [activeClip, playheadPosition]);

  // Compute transition opacity (transitionIn / transitionOut)
  const transitionOpacity = useMemo(() => {
    if (!activeClip) return 1;
    const elapsed = playheadPosition - activeClip.startTime;
    let opacity = 1;
    if (activeClip.transitionIn) {
      const d = activeClip.transitionIn.duration;
      if (elapsed < d) opacity *= elapsed / d;
    }
    if (activeClip.transitionOut) {
      const d = activeClip.transitionOut.duration;
      const remaining = activeClip.duration - elapsed;
      if (remaining < d) opacity *= remaining / d;
    }
    return Math.max(0, opacity);
  }, [activeClip, playheadPosition]);

  // Text overlays active at current playhead
  const activeTextOverlays = useMemo(() => {
    return Object.values(textOverlays).filter(
      (o) => playheadPosition >= o.startTime && playheadPosition < o.startTime + o.duration,
    );
  }, [textOverlays, playheadPosition]);

  const fontScale = containerWidth / resolution.width;

  // Sync video element with playhead
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip || !activeMedia) return;

    if (video.src !== activeMedia.url) {
      video.src = activeMedia.url;
    }

    const speed = activeClip.speed ?? 1;
    const mediaTime = activeClip.mediaOffset + (playheadPosition - activeClip.startTime) * speed;

    // Set playback rate to match clip speed
    if (video.playbackRate !== speed) {
      video.playbackRate = speed;
    }

    if (!isPlaying) {
      video.pause();
      // Only seek if significantly different (avoid jitter)
      if (Math.abs(video.currentTime - mediaTime) > 0.05) {
        video.currentTime = mediaTime;
      }
    } else {
      if (Math.abs(video.currentTime - mediaTime) > 0.2) {
        video.currentTime = mediaTime;
      }
      if (video.paused) {
        video.play().catch((err) => console.warn('Video play failed:', err));
      }
    }
  }, [playheadPosition, isPlaying, activeClip, activeMedia]);

  // Pause video when no active clip
  useEffect(() => {
    if (!activeClip && videoRef.current) {
      videoRef.current.pause();
    }
  }, [activeClip]);

  const handleFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.();
  }, []);

  // Build combined transform: base (scale/position) + animation
  const baseTransform = activeClip
    ? `scale(${activeClip.scale ?? 1}) translate(${activeClip.positionX ?? 0}%, ${activeClip.positionY ?? 0}%)`
    : '';
  const combinedTransform = [baseTransform, animStyle.transform].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full relative"
      style={{ background: '#000' }}
    >
      {/* Viewer Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t.viewer.title}
        </span>
        <button
          onClick={handleFullscreen}
          className="p-1 rounded transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Maximize2 size={12} />
        </button>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div
          className="relative max-w-full max-h-full overflow-hidden"
          style={{
            aspectRatio: `${resolution.width}/${resolution.height}`,
            background: '#000',
          }}
        >
          {activeMedia ? (
            <video
              ref={videoRef}
              className="w-full h-full"
              style={{
                objectFit: activeClip?.fitMode === 'fill' ? 'cover'
                  : activeClip?.fitMode === 'stretch' ? 'fill'
                  : 'contain',
                transform: combinedTransform || undefined,
                opacity: animStyle.opacity * transitionOpacity,
              }}
              muted
              playsInline
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-center" style={{ color: 'var(--text-secondary)' }}>
              <div>
                <p className="text-sm">{t.viewer.noClip}</p>
                <p className="text-xs mt-1">{t.viewer.importMedia}</p>
              </div>
            </div>
          )}

          {/* Text overlays */}
          {activeTextOverlays.map((overlay) => (
            <div
              key={overlay.id}
              style={{
                position: 'absolute',
                left: `${overlay.style.x}%`,
                top: `${overlay.style.y}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: overlay.style.fontFamily,
                fontSize: Math.round(overlay.style.fontSize * fontScale),
                fontWeight: overlay.style.fontWeight,
                color: overlay.style.color,
                textAlign: overlay.style.textAlign,
                backgroundColor: overlay.style.backgroundColor !== 'transparent' ? overlay.style.backgroundColor : undefined,
                padding: overlay.style.backgroundColor !== 'transparent' ? '4px 8px' : undefined,
                textShadow: overlay.style.outline
                  ? `-1px -1px 0 ${overlay.style.outlineColor}, 1px -1px 0 ${overlay.style.outlineColor}, -1px 1px 0 ${overlay.style.outlineColor}, 1px 1px 0 ${overlay.style.outlineColor}`
                  : undefined,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
            >
              {overlay.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
