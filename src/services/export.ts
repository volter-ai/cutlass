import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { TimelineState } from '../store/timeline';
import type { ExportSettings, TimelineClip } from '../types';

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(onProgress: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.min(progress * 100, 99));
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

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
  const { resolution, frameRate } = state.settings;

  // Collect all media files used by clips
  const usedMediaIds = new Set<string>();
  Object.values(clips).forEach((clip) => usedMediaIds.add(clip.mediaFileId));

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
      videoClips.push({ ...clip, inputIdx });
      // Video clips contribute audio unless their audio has been extracted to a linked clip
      if (settings.includeAudio && !(clip.linkedGroupId && linkedGroupsWithAudio.has(clip.linkedGroupId))) {
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

  // Build ffmpeg command
  const args: string[] = [];

  // Input files
  for (const filename of inputFiles) {
    args.push('-i', filename);
  }

  // Create a black background canvas
  args.push(
    '-f', 'lavfi',
    '-i', `color=c=black:s=${resolution.width}x${resolution.height}:r=${frameRate}:d=${timelineDuration}`,
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
    if (speed !== 1) {
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
      filterParts.push(
        `[${trimLabel}]scale=${sw}:${sh}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2[${scaledLabel}]`,
      );
    }

    // Apply clip animation effects (fade-based)
    let animLabel = scaledLabel;
    const anim = clip.animation?.preset;
    if (anim && anim !== 'none') {
      const animOut = `${scaledLabel}an`;
      const dur = clip.duration;
      const fadeInDur = Math.min(dur / 3, 1);
      const fadeOutDur = Math.min(dur / 3, 1);

      if (anim === 'fade-in') {
        filterParts.push(`[${animLabel}]fade=t=in:st=0:d=${fadeInDur}[${animOut}]`);
        animLabel = animOut;
      } else if (anim === 'fade-out') {
        filterParts.push(`[${animLabel}]fade=t=out:st=${dur - fadeOutDur}:d=${fadeOutDur}[${animOut}]`);
        animLabel = animOut;
      } else if (anim === 'fade-in-out') {
        filterParts.push(`[${animLabel}]fade=t=in:st=0:d=${fadeInDur},fade=t=out:st=${dur - fadeOutDur}:d=${fadeOutDur}[${animOut}]`);
        animLabel = animOut;
      }
      // zoom-in, zoom-out, ken-burns use CSS transforms in the Viewer preview;
      // exporting them would require zoompan filters which are complex to implement
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

          const escapedText = text.replace(/'/g, "\\'").replace(/:/g, '\\:');
          const capLabel = `cap${captionIdx}`;
          filterParts.push(
            `${overlayLabel}drawtext=text='${escapedText}':fontsize=${captionStyle.fontSize}:fontcolor=${captionStyle.color}:x=(w-tw)/2:y=${yPos}:enable='between(t,${start},${end})':box=1:boxcolor=${captionStyle.backgroundColor.replace(/,/g, '\\,')}:boxborderw=8[${capLabel}]`,
          );
          overlayLabel = `[${capLabel}]`;
          captionIdx++;
        }
      });
    });
  }

  // Custom text overlays via drawtext
  allTextOverlays.forEach((overlay, i) => {
    const escapedText = overlay.text.replace(/'/g, "\\'").replace(/:/g, '\\:');
    const x = overlay.style.textAlign === 'center' ? '(w-tw)/2'
      : overlay.style.textAlign === 'right' ? 'w-tw-20'
      : '20';
    const y = `h*${overlay.style.y / 100}`;

    let drawtext = `drawtext=text='${escapedText}':fontsize=${overlay.style.fontSize}:fontcolor=${overlay.style.color}:x=${x}:y=${y}:enable='between(t,${overlay.startTime},${overlay.startTime + overlay.duration})'`;

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

  const exitCode = await ff.exec(args);
  if (exitCode !== 0) {
    throw new Error(`FFmpeg exited with code ${exitCode}. Check browser console for details.`);
  }

  onProgress(95);

  const data = await ff.readFile(outputFile);
  const mimeType = settings.format === 'mp4' ? 'video/mp4' : 'video/webm';
  const blob = new Blob([data as BlobPart], { type: mimeType });

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
