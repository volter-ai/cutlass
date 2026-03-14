import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { useLanguage } from '../../context/LanguageProvider';
import { DrawingCanvas } from './DrawingCanvas';
import { DrawingStrokeRenderer } from './DrawingStrokeRenderer';
import type { AnimationPreset } from '../../types';

/** Compute fade volume multiplier (0–1) for a clip at the given playhead position */
function computeVideoFadeMultiplier(clip: { startTime: number; duration: number; fadeIn: number; fadeOut: number }, playheadPosition: number): number {
  const elapsed = playheadPosition - clip.startTime;
  const remaining = clip.startTime + clip.duration - playheadPosition;
  let multiplier = 1.0;
  if (clip.fadeIn > 0 && elapsed < clip.fadeIn) {
    multiplier = Math.max(0, elapsed / clip.fadeIn);
  }
  if (clip.fadeOut > 0 && remaining < clip.fadeOut) {
    multiplier = Math.min(multiplier, Math.max(0, remaining / clip.fadeOut));
  }
  return multiplier;
}

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
  const videoAreaRef = useRef<HTMLDivElement>(null);

  const playheadPosition = useTimelineStore((s) => s.playheadPosition);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const clips = useTimelineStore((s) => s.clips);
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaFiles = useTimelineStore((s) => s.mediaFiles);
  const textOverlays = useTimelineStore((s) => s.textOverlays);
  const drawingOverlays = useTimelineStore((s) => s.drawingOverlays);
  const activeTool = useTimelineStore((s) => s.activeTool);
  const selectedDrawingOverlayId = useTimelineStore((s) => s.selectedDrawingOverlayId);
  const { addDrawingOverlay, addTrack, selectDrawingOverlay } = useTimelineStore();
  const resolution = useTimelineStore((s) => s.settings.resolution);
  const backgroundColor = useTimelineStore((s) => s.settings.backgroundColor ?? '#000000');
  const { t } = useLanguage();

  // Track the video area container size to compute exact pixel display dimensions
  const [videoAreaSize, setVideoAreaSize] = useState({ width: 640, height: 360 });
  useEffect(() => {
    const el = videoAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setVideoAreaSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute the largest box that fits resolution aspect ratio within the video area
  const ar = resolution.width / resolution.height;
  const displayWidth = Math.min(videoAreaSize.width, videoAreaSize.height * ar);
  const displayHeight = displayWidth / ar;

  // Find the active video clip at the current playhead position (video type only).
  // When clips on multiple video tracks overlap, pick the one from the highest-index
  // track — that is the top rendered layer, consistent with the export sort order.
  const activeClip = useMemo(() => {
    const videoTrackIds = new Set(
      tracks.filter((t) => t.type === 'video').map((t) => t.id),
    );
    const candidates = Object.values(clips).filter(
      (c) =>
        c.type === 'video' &&
        videoTrackIds.has(c.trackId) &&
        playheadPosition >= c.startTime &&
        playheadPosition < c.startTime + c.duration,
    );
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    // Return the clip whose track has the highest index (rendered last = on top in export)
    return candidates.reduce((best, clip) => {
      const clipIdx = tracks.findIndex((t) => t.id === clip.trackId);
      const bestIdx = tracks.findIndex((t) => t.id === best.trackId);
      return clipIdx > bestIdx ? clip : best;
    });
  }, [tracks, clips, playheadPosition]);

  // Image clips active at the current playhead (rendered as overlays on top of video)
  const activeImageClips = useMemo(() => {
    return Object.values(clips).filter(
      (c) =>
        c.type === 'image' &&
        playheadPosition >= c.startTime &&
        playheadPosition < c.startTime + c.duration,
    );
  }, [clips, playheadPosition]);

  const activeMedia = activeClip ? mediaFiles[activeClip.mediaFileId] : null;

  // Compute animation progress and style
  const animStyle = useMemo(() => {
    if (!activeClip) return { transform: '', opacity: 1 };
    const progress = (playheadPosition - activeClip.startTime) / activeClip.duration;
    return getAnimationStyle(activeClip.animation?.preset, Math.max(0, Math.min(1, progress)));
  }, [activeClip, playheadPosition]);

  // Compute fade envelope opacity (fadeIn / fadeOut)
  const fadeOpacity = useMemo(() => {
    if (!activeClip) return 1;
    return computeVideoFadeMultiplier(activeClip, playheadPosition);
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

  // Drawing overlays active at current playhead
  const activeDrawingOverlays = useMemo(() => {
    return Object.values(drawingOverlays).filter(
      (o) => playheadPosition >= o.startTime && playheadPosition < o.startTime + o.duration,
    );
  }, [drawingOverlays, playheadPosition]);

  const fontScale = displayWidth / resolution.width;

  /** Compute write-on reveal fraction (0–1) for a single stroke at the given elapsed overlay time.
   *  Each stroke has an explicit startOffset (seconds from overlay start).
   *  Default sequential: stroke N starts at N * 0.5s; 0.5s draw duration at 1× speed. */
  function computeStrokeRevealFraction(stroke: { startOffset: number }, writeOnSpeed: number, elapsed: number): number {
    if (elapsed <= 0) return 0;
    const strokeDuration = 0.5 / writeOnSpeed;
    const strokeElapsed = elapsed - stroke.startOffset;
    if (strokeElapsed <= 0) return 0;
    return Math.min(1, strokeElapsed / strokeDuration);
  }

  /** Compute fade opacity for drawing/text overlays */
  function computeOverlayOpacity(overlay: { startTime: number; duration: number; fadeIn?: number; fadeOut?: number }): number {
    const elapsed = playheadPosition - overlay.startTime;
    const remaining = overlay.startTime + overlay.duration - playheadPosition;
    let opacity = 1;
    if (overlay.fadeIn && overlay.fadeIn > 0 && elapsed < overlay.fadeIn) {
      opacity = Math.max(0, elapsed / overlay.fadeIn);
    }
    if (overlay.fadeOut && overlay.fadeOut > 0 && remaining < overlay.fadeOut) {
      opacity = Math.min(opacity, Math.max(0, remaining / overlay.fadeOut));
    }
    return opacity;
  }

  /** Called by DrawingCanvas when no overlay is active — creates one automatically */
  const handleNeedOverlay = useCallback((): string => {
    // Find or create a drawing track
    let drawingTrackId = tracks.find((t) => t.type === 'drawing')?.id;
    if (!drawingTrackId) {
      drawingTrackId = addTrack('drawing');
    }
    const newId = addDrawingOverlay(drawingTrackId, playheadPosition);
    selectDrawingOverlay(newId);
    return newId;
  }, [tracks, addTrack, addDrawingOverlay, selectDrawingOverlay, playheadPosition]);

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
    videoAreaRef.current?.requestFullscreen?.();
  }, []);

  // Build combined transform: base (scale/position) + animation
  const baseTransform = activeClip
    ? `scale(${activeClip.scale ?? 1}) translate(${activeClip.positionX ?? 0}%, ${activeClip.positionY ?? 0}%)`
    : '';
  const combinedTransform = [baseTransform, animStyle.transform].filter(Boolean).join(' ');

  return (
    <div
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
      <div ref={videoAreaRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div
          className="relative overflow-hidden"
          style={{
            width: displayWidth,
            height: displayHeight,
            background: backgroundColor,
            flexShrink: 0,
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
                opacity: animStyle.opacity * transitionOpacity * fadeOpacity,
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

          {/* Image overlays */}
          {activeImageClips.map((clip) => {
            const imgMedia = mediaFiles[clip.mediaFileId];
            if (!imgMedia) return null;
            const imgProgress = (playheadPosition - clip.startTime) / clip.duration;
            const imgAnim = getAnimationStyle(clip.animation?.preset, Math.max(0, Math.min(1, imgProgress)));
            const imgFade = computeVideoFadeMultiplier(clip, playheadPosition);
            const imgBaseTransform = `scale(${clip.scale ?? 1}) translate(${clip.positionX ?? 0}%, ${clip.positionY ?? 0}%)`;
            const imgTransform = [imgBaseTransform, imgAnim.transform].filter(Boolean).join(' ');
            return (
              <img
                key={clip.id}
                src={imgMedia.url}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: clip.fitMode === 'fill' ? 'cover' : clip.fitMode === 'stretch' ? 'fill' : 'contain',
                  transform: imgTransform || undefined,
                  opacity: imgAnim.opacity * imgFade,
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            );
          })}

          {/* Text overlays */}
          {activeTextOverlays.map((overlay) => {
            const textOpacity = computeOverlayOpacity(overlay);
            return (
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
                  opacity: textOpacity,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                {overlay.text}
              </div>
            );
          })}

          {/* Drawing overlays SVG layer — shown when not in draw mode, OR when playing.
               During playback, this takes over from DrawingCanvas so write-on animates. */}
          {activeDrawingOverlays.length > 0 && (activeTool !== 'draw' || isPlaying) && (
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 15,
              }}
            >
              <defs>
                <filter id="cutlass-chalk-filter" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
              {activeDrawingOverlays.map((overlay) => {
                const elapsed = playheadPosition - overlay.startTime;
                const drawOpacity = computeOverlayOpacity(overlay);
                const speed = overlay.writeOnSpeed ?? 1;
                return (
                  <g key={overlay.id} opacity={drawOpacity}>
                    {overlay.strokes.map((stroke) => (
                      <DrawingStrokeRenderer
                        key={stroke.id}
                        stroke={stroke}
                        canvasWidth={displayWidth}
                        canvasHeight={displayHeight}
                        revealFraction={computeStrokeRevealFraction(stroke, speed, elapsed)}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>
          )}

          {/* Interactive drawing canvas — draw mode only, hidden during playback
               so the animated SVG overlay shows write-on instead */}
          {activeTool === 'draw' && !isPlaying && (
            <DrawingCanvas
              width={displayWidth}
              height={displayHeight}
              activeOverlayId={selectedDrawingOverlayId}
              onNeedOverlay={handleNeedOverlay}
            />
          )}
        </div>
      </div>
    </div>
  );
}
