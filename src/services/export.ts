import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { TimelineState } from '../store/timeline';
import type { ExportSettings, TimelineClip } from '../types';
import { track } from './analytics';

/** Escape a string for use inside FFmpeg drawtext's text='...' option.
 *  Order matters: backslash must be escaped first. */
function escapeDrawtext(s: string): string {
  return s
    .replace(/\\/g, '\\\\')   // backslash first
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\r?\n/g, '\\n'); // actual newlines → FFmpeg \n escape
}

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(onProgress: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.min(progress * 100, 99));
  });

  ffmpeg.on('log', ({ type, message }) => {
    if (type === 'stderr') console.error('[FFmpeg]', message);
  });

  // Prefer locally-served files (no CDN latency, no blob-URL Worker issues).
  // Falls back to unpkg CDN if /ffmpeg-core/ isn't present (e.g. production without the files).
  const localBase = `${window.location.origin}/ffmpeg-core`;
  const cdnBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  let coreURL: string;
  let wasmURL: string;
  try {
    const probe = await fetch(`${localBase}/ffmpeg-core.js`, { method: 'HEAD' });
    if (probe.ok) {
      coreURL = `${localBase}/ffmpeg-core.js`;
      wasmURL = `${localBase}/ffmpeg-core.wasm`;
    } else {
      throw new Error('local not found');
    }
  } catch {
    coreURL = await toBlobURL(`${cdnBase}/ffmpeg-core.js`, 'text/javascript');
    wasmURL = await toBlobURL(`${cdnBase}/ffmpeg-core.wasm`, 'application/wasm');
  }
  await ffmpeg.load({ coreURL, wasmURL });

  return ffmpeg;
}

export async function exportTimeline(
  state: TimelineState,
  settings: ExportSettings,
  onProgress: (progress: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg(onProgress);
  onProgress(5);

  const { clips, mediaFiles, tracks, textOverlays, transcripts } = state;
  const { resolution, frameRate, backgroundColor } = state.settings;

  // Collect all media files used by clips
  const usedMediaIds = new Set<string>();
  Object.values(clips).forEach((clip) => usedMediaIds.add(clip.mediaFileId));

  // Write font file into ffmpeg virtual filesystem (required for drawtext filter)
  const fontPath = '/font.ttf';
  try {
    const fontData = await fetchFile(`${window.location.origin}/DejaVuSans-Bold.ttf`);
    await ff.writeFile(fontPath, fontData);
  } catch {
    // Font unavailable — drawtext will fail gracefully; export continues without text overlays
  }

  // Write source media files into ffmpeg virtual filesystem
  let fileIndex = 0;
  const mediaFileMap = new Map<string, string>();
  for (const mediaId of usedMediaIds) {
    const media = mediaFiles[mediaId];
    if (!media) continue;
    const ext = media.name.split('.').pop() || 'mp4';
    const filename = `input_${fileIndex}.${ext}`;
    mediaFileMap.set(mediaId, filename);
    await ff.writeFile(filename, await fetchFile(media.url));
    fileIndex++;
  }

  onProgress(15);

  // Sort clips by track priority (higher video tracks overlay lower)
  const videoClips: (TimelineClip & { inputIdx: number })[] = [];
  const audioClips: (TimelineClip & { inputIdx: number })[] = [];

  // Map input files to ffmpeg input indices
  const inputFiles: string[] = [];
  const inputIdxMap = new Map<string, number>();

  for (const [mediaId, filename] of mediaFileMap) {
    inputIdxMap.set(mediaId, inputFiles.length);
    inputFiles.push(filename);
  }

  // Build set of linkedGroupIds that have a dedicated audio clip on an audio track,
  // so the paired video clip doesn't produce double audio (mirrors useAudioPlayback logic).
  const linkedGroupsWithAudio = new Set<string>();
  for (const clip of Object.values(clips)) {
    const track = tracks.find((t) => t.id === clip.trackId);
    if (track?.type === 'audio' && clip.linkedGroupId) {
      linkedGroupsWithAudio.add(clip.linkedGroupId);
    }
  }

  // Categorize clips
  for (const clip of Object.values(clips)) {
    const track = tracks.find((t) => t.id === clip.trackId);
    if (!track || track.muted) continue;
    const inputIdx = inputIdxMap.get(clip.mediaFileId);
    if (inputIdx === undefined) continue;

    if (track.type === 'video') {
      if (clip.type !== 'audio') {
        // Only video/image clips go into the visual filter chain.
        // An audio-only file (WAV/MP3) placed on a video track has no [v] stream
        // and would cause FFmpeg to fail with exit code 1.
        videoClips.push({ ...clip, inputIdx });
        // Video/image clips also contribute audio unless: extracted to a linked clip,
        // they are images, or the source file has no audio stream (hasAudio === false).
        const sourceMedia = mediaFiles[clip.mediaFileId];
        if (settings.includeAudio && clip.type !== 'image' && sourceMedia?.hasAudio !== false && !(clip.linkedGroupId && linkedGroupsWithAudio.has(clip.linkedGroupId))) {
          audioClips.push({ ...clip, inputIdx });
        }
      } else if (settings.includeAudio) {
        // Audio-only clip placed on a video track: treat it as audio-only.
        audioClips.push({ ...clip, inputIdx });
      }
    } else if (track.type === 'audio' && settings.includeAudio) {
      audioClips.push({ ...clip, inputIdx });
    }
  }

  // Calculate actual timeline duration (without padding)
  let timelineDuration = 0;
  Object.values(clips).forEach((c) => {
    timelineDuration = Math.max(timelineDuration, c.startTime + c.duration);
  });
  Object.values(textOverlays).forEach((o) => {
    timelineDuration = Math.max(timelineDuration, o.startTime + o.duration);
  });
  if (timelineDuration === 0) {
    throw new Error('Nothing to export - timeline is empty');
  }

  track('export.started', {
    format: settings.format,
    quality: settings.quality,
    includeAudio: settings.includeAudio,
    burnCaptions: settings.burnCaptions,
    clipCount: Object.keys(clips).length,
    textOverlayCount: Object.keys(textOverlays).length,
    durationSeconds: timelineDuration,
  });
  const exportStartMs = Date.now();

  // Build ffmpeg command
  const args: string[] = [];

  // Input files
  for (const filename of inputFiles) {
    args.push('-i', filename);
  }

  // Create background canvas with user-selected color
  const bgColor = (backgroundColor ?? '#000000').replace('#', '0x');
  args.push(
    '-f', 'lavfi',
    '-i', `color=c=${bgColor}:s=${resolution.width}x${resolution.height}:r=${frameRate}:d=${timelineDuration}`,
  );
  const canvasIdx = inputFiles.length;

  // Build filter complex
  const filterParts: string[] = [];
  let overlayLabel = `[${canvasIdx}:v]`;

  // Sort video clips by start time, then layer
  videoClips.sort((a, b) => {
    const aTrackIdx = tracks.findIndex((t) => t.id === a.trackId);
    const bTrackIdx = tracks.findIndex((t) => t.id === b.trackId);
    return aTrackIdx - bTrackIdx || a.startTime - b.startTime;
  });

  // Trim and position each video clip
  videoClips.forEach((clip, i) => {
    const trimLabel = `v${i}`;
    const scaledLabel = `vs${i}`;
    const speed = clip.speed ?? 1;
    const sourceDuration = clip.duration * speed;

    // Trim the input and apply speed
    if (clip.type === 'image') {
      // Single-frame image: loop indefinitely and trim to the required clip duration
      filterParts.push(
        `[${clip.inputIdx}:v]loop=-1:size=1,fps=${frameRate},trim=duration=${clip.duration},setpts=PTS-STARTPTS[${trimLabel}]`,
      );
    } else if (speed !== 1) {
      filterParts.push(
        `[${clip.inputIdx}:v]trim=start=${clip.mediaOffset}:duration=${sourceDuration},setpts=(PTS-STARTPTS)/${speed}[${trimLabel}]`,
      );
    } else {
      filterParts.push(
        `[${clip.inputIdx}:v]trim=start=${clip.mediaOffset}:duration=${sourceDuration},setpts=PTS-STARTPTS[${trimLabel}]`,
      );
    }

    // Scale to fit canvas based on fitMode
    const fitMode = clip.fitMode ?? 'fit';
    const clipScale = clip.scale ?? 1;
    const sw = Math.round(resolution.width * clipScale);
    const sh = Math.round(resolution.height * clipScale);
    const posX = clip.positionX ?? 0;
    const posY = clip.positionY ?? 0;

    if (fitMode === 'fill') {
      // Scale to cover, then crop to canvas size
      filterParts.push(
        `[${trimLabel}]scale=${sw}:${sh}:force_original_aspect_ratio=increase,crop=${resolution.width}:${resolution.height}:${Math.round(posX * resolution.width / 200 + (sw - resolution.width) / 2)}:${Math.round(posY * resolution.height / 200 + (sh - resolution.height) / 2)}[${scaledLabel}]`,
      );
    } else if (fitMode === 'stretch') {
      filterParts.push(
        `[${trimLabel}]scale=${sw}:${sh},pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2[${scaledLabel}]`,
      );
    } else {
      // fit (letterbox) - default
      // Always scale+pad to exact canvas first, then apply clipScale as a post-zoom.
      // clipScale > 1: scale-up past canvas then crop back (pad can't shrink frames).
      // clipScale < 1: scale-down then pad back to canvas.
      const W = resolution.width;
      const H = resolution.height;
      let fitChain = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`;
      if (clipScale > 1) {
        const cropX = Math.max(0, Math.round(posX * W / 200 + (sw - W) / 2));
        const cropY = Math.max(0, Math.round(posY * H / 200 + (sh - H) / 2));
        fitChain += `,scale=${sw}:${sh},crop=${W}:${H}:${cropX}:${cropY}`;
      } else if (clipScale < 1) {
        fitChain += `,scale=${sw}:${sh},pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`;
      }
      filterParts.push(`[${trimLabel}]${fitChain}[${scaledLabel}]`);
    }

    // Apply clip animation effects
    let animLabel = scaledLabel;
    const anim = clip.animation?.preset;
    if (anim && anim !== 'none') {
      const animOut = `${scaledLabel}an`;
      const dur = clip.duration;
      const fadeInDur = Math.min(dur / 3, 1);
      const fadeOutDur = Math.min(dur / 3, 1);
      const totalFrames = Math.max(1, Math.round(dur * frameRate));
      const W = resolution.width;
      const H = resolution.height;

      if (anim === 'fade-in') {
        filterParts.push(`[${animLabel}]fade=t=in:st=0:d=${fadeInDur}[${animOut}]`);
        animLabel = animOut;
      } else if (anim === 'fade-out') {
        filterParts.push(`[${animLabel}]fade=t=out:st=${dur - fadeOutDur}:d=${fadeOutDur}[${animOut}]`);
        animLabel = animOut;
      } else if (anim === 'fade-in-out') {
        filterParts.push(`[${animLabel}]fade=t=in:st=0:d=${fadeInDur},fade=t=out:st=${dur - fadeOutDur}:d=${fadeOutDur}[${animOut}]`);
        animLabel = animOut;
      } else if (anim === 'zoom-in') {
        // 1.0x → 1.3x zoom, keeping center (matches Viewer CSS scale 1.0→1.3)
        filterParts.push(
          `[${animLabel}]zoompan=z='min(1+0.3*on/${totalFrames},1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${W}x${H}:fps=${frameRate}[${animOut}]`,
        );
        animLabel = animOut;
      } else if (anim === 'zoom-out') {
        // 1.3x → 1.0x zoom, keeping center (matches Viewer CSS scale 1.3→1.0)
        filterParts.push(
          `[${animLabel}]zoompan=z='max(1.3-0.3*on/${totalFrames},1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${W}x${H}:fps=${frameRate}[${animOut}]`,
        );
        animLabel = animOut;
      } else if (anim === 'ken-burns') {
        // 1.0x → 1.2x zoom with 5% rightward and 3% upward pan (matches Viewer CSS)
        filterParts.push(
          `[${animLabel}]zoompan=z='min(1+0.2*on/${totalFrames},1.2)':x='iw/2+on/${totalFrames}*0.05*iw-(iw/zoom/2)':y='ih/2-on/${totalFrames}*0.03*ih-(ih/zoom/2)':d=${totalFrames}:s=${W}x${H}:fps=${frameRate}[${animOut}]`,
        );
        animLabel = animOut;
      }
      // slide-* animations remain preview-only
    }

    // Apply transitionIn / transitionOut fade filters before overlaying
    let clipLabel = animLabel;

    if (clip.transitionIn) {
      const tr = clip.transitionIn;
      if (tr.type === 'cross-dissolve' || tr.type === 'fade-from-black') {
        const tiLabel = `${animLabel}ti`;
        filterParts.push(`[${clipLabel}]fade=t=in:st=0:d=${tr.duration}[${tiLabel}]`);
        clipLabel = tiLabel;
      }
    }

    if (clip.transitionOut) {
      const tr = clip.transitionOut;
      if (tr.type === 'cross-dissolve' || tr.type === 'fade-to-black') {
        const toLabel = `${animLabel}to`;
        const fadeStart = Math.max(0, clip.duration - tr.duration);
        filterParts.push(`[${clipLabel}]fade=t=out:st=${fadeStart}:d=${tr.duration}[${toLabel}]`);
        clipLabel = toLabel;
      }
    }

    // Apply clip-level fadeIn / fadeOut (separate from animation presets and transitions)
    if (clip.fadeIn > 0) {
      const fiLabel = `${trimLabel}fi`;
      filterParts.push(`[${clipLabel}]fade=t=in:st=0:d=${clip.fadeIn}[${fiLabel}]`);
      clipLabel = fiLabel;
    }
    if (clip.fadeOut > 0) {
      const foLabel = `${trimLabel}fo`;
      const fadeStart = Math.max(0, clip.duration - clip.fadeOut);
      filterParts.push(`[${clipLabel}]fade=t=out:st=${fadeStart}:d=${clip.fadeOut}[${foLabel}]`);
      clipLabel = foLabel;
    }

    // Overlay with enable timing
    const outLabel = `ov${i}`;
    const enableExpr = `between(t,${clip.startTime},${clip.startTime + clip.duration})`;
    const overlayFilter = `overlay=0:0:enable='${enableExpr}'`;

    filterParts.push(`${overlayLabel}[${clipLabel}]${overlayFilter}[${outLabel}]`);
    overlayLabel = `[${outLabel}]`;
  });

  // Text overlays and captions
  const allTextOverlays = [...Object.values(textOverlays)];

  // Auto-captions from transcript
  if (settings.burnCaptions) {
    const captionStyle = state.settings.captionStyle;
    let captionIdx = 0; // global counter — guarantees unique FFmpeg filter labels
    Object.values(transcripts).forEach((transcript) => {
      transcript.segments.forEach((segment) => {
        const visibleWords = segment.words.filter((w) => !w.isRemoved);
        if (visibleWords.length === 0) return;

        // Group words into lines
        for (let i = 0; i < visibleWords.length; i += captionStyle.maxWords) {
          const chunk = visibleWords.slice(i, i + captionStyle.maxWords);
          const text = chunk.map((w) => w.word).join(' ');
          const start = chunk[0].start;
          const end = chunk[chunk.length - 1].end;

          // Add drawtext filter
          const yPos = captionStyle.position === 'bottom' ? 'h-th-40'
            : captionStyle.position === 'top' ? '40'
            : '(h-th)/2';

          const escapedText = escapeDrawtext(text);
          const capLabel = `cap${captionIdx}`;
          filterParts.push(
            `${overlayLabel}drawtext=fontfile=${fontPath}:text='${escapedText}':fontsize=${captionStyle.fontSize}:fontcolor=${captionStyle.color}:x=(w-tw)/2:y=${yPos}:enable='between(t,${start},${end})':box=1:boxcolor=${captionStyle.backgroundColor.replace(/,/g, '\\,')}:boxborderw=8[${capLabel}]`,
          );
          overlayLabel = `[${capLabel}]`;
          captionIdx++;
        }
      });
    });
  }

  // Custom text overlays via drawtext
  allTextOverlays.forEach((overlay, i) => {
    const escapedText = escapeDrawtext(overlay.text);
    const x = overlay.style.textAlign === 'center' ? '(w-tw)/2'
      : overlay.style.textAlign === 'right' ? 'w-tw-20'
      : '20';
    const y = `h*${overlay.style.y / 100}`;

    let drawtext = `drawtext=fontfile=${fontPath}:text='${escapedText}':fontsize=${overlay.style.fontSize}:fontcolor=${overlay.style.color}:x=${x}:y=${y}:enable='between(t,${overlay.startTime},${overlay.startTime + overlay.duration})'`;

    if (overlay.style.outline) {
      drawtext += `:borderw=2:bordercolor=${overlay.style.outlineColor}`;
    }
    if (overlay.style.backgroundColor !== 'transparent') {
      drawtext += `:box=1:boxcolor=${overlay.style.backgroundColor.replace(/,/g, '\\,')}:boxborderw=6`;
    }

    const outLabel = `txt${i}`;
    filterParts.push(`${overlayLabel}${drawtext}[${outLabel}]`);
    overlayLabel = `[${outLabel}]`;
  });

  // Audio mixing with fades and track volume
  let audioFilterLabel = '';
  if (settings.includeAudio && audioClips.length > 0) {
    const audioParts: string[] = [];
    audioClips.forEach((clip, i) => {
      const label = `a${i}`;
      const track = tracks.find((t) => t.id === clip.trackId);
      const trackVolume = track?.volume ?? 1;
      const combinedVolume = clip.volume * trackVolume;
      const speed = clip.speed ?? 1;
      const sourceDuration = clip.duration * speed;

      // Build audio filter chain: trim → reset pts → speed → delay → volume → fades
      let chain = `[${clip.inputIdx}:a]atrim=start=${clip.mediaOffset}:duration=${sourceDuration},asetpts=PTS-STARTPTS`;

      // Apply speed via atempo (supports 0.5-100, chain for values < 0.5)
      if (speed !== 1) {
        if (speed >= 0.5) {
          chain += `,atempo=${speed}`;
        } else {
          // Chain two atempo filters for speeds below 0.5
          chain += `,atempo=${Math.sqrt(speed)},atempo=${Math.sqrt(speed)}`;
        }
      }

      chain += `,adelay=${Math.round(clip.startTime * 1000)}|${Math.round(clip.startTime * 1000)},volume=${combinedVolume}`;

      // Audio fade in
      if (clip.fadeIn > 0) {
        chain += `,afade=t=in:d=${clip.fadeIn}`;
      }

      // Audio fade out
      if (clip.fadeOut > 0) {
        const fadeOutStart = clip.duration - clip.fadeOut;
        chain += `,afade=t=out:st=${Math.max(0, fadeOutStart)}:d=${clip.fadeOut}`;
      }

      audioParts.push(`${chain}[${label}]`);
    });
    filterParts.push(...audioParts);
    const mixInputs = audioClips.map((_, i) => `[a${i}]`).join('');
    filterParts.push(`${mixInputs}amix=inputs=${audioClips.length}:duration=longest:normalize=0[aout]`);
    audioFilterLabel = '[aout]';
  }

  // Finalize filter complex
  if (filterParts.length > 0) {
    args.push('-filter_complex', filterParts.join(';'));
    args.push('-map', overlayLabel);
    if (audioFilterLabel) {
      args.push('-map', audioFilterLabel);
    }
  }

  // Output settings — quality maps: 4k=18, 1080p=20, 720p=26 (CRF)
  const quality = settings.quality === '4k' ? '18' : settings.quality === '1080p' ? '20' : '26';
  const outputFile = settings.format === 'mp4' ? 'output.mp4' : 'output.webm';

  if (settings.format === 'mp4') {
    args.push('-c:v', 'libx264', '-crf', quality, '-preset', 'fast', '-pix_fmt', 'yuv420p');
    if (audioFilterLabel) args.push('-c:a', 'aac', '-b:a', '192k');
  } else {
    args.push('-c:v', 'libvpx-vp9', '-crf', quality, '-b:v', '0');
    if (audioFilterLabel) args.push('-c:a', 'libopus', '-b:a', '128k');
  }

  args.push('-t', String(timelineDuration), '-y', outputFile);

  onProgress(20);

  // Log the filter_complex before running so failures are diagnosable remotely.
  const fcIdx = args.indexOf('-filter_complex');
  if (fcIdx >= 0) console.log('[Export] filter_complex:', args[fcIdx + 1]);

  const exitCode = await ff.exec(args);
  if (exitCode !== 0) {
    console.error('[Export] FFmpeg failed (code', exitCode, '). Full args:', args);
    track('export.failed', {
      format: settings.format,
      quality: settings.quality,
      exitCode,
      filterComplex: fcIdx >= 0 ? args[fcIdx + 1] : undefined,
    });
    throw new Error(`FFmpeg exited with code ${exitCode}. Check browser console for details.`);
  }

  onProgress(95);

  const data = await ff.readFile(outputFile);
  const mimeType = settings.format === 'mp4' ? 'video/mp4' : 'video/webm';
  const blob = new Blob([data as BlobPart], { type: mimeType });
  track('export.completed', {
    format: settings.format,
    quality: settings.quality,
    elapsedMs: Date.now() - exportStartMs,
    blobSizeBytes: blob.size,
  });

  // Cleanup
  for (const filename of inputFiles) {
    await ff.deleteFile(filename);
  }
  await ff.deleteFile(outputFile);

  onProgress(100);
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
