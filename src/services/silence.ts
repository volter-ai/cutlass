export interface SilenceRegion {
  start: number;  // seconds in source media
  end: number;
  duration: number;
}

/**
 * Detect silence regions in an audio/video file using the Web Audio API.
 * Returns regions where RMS amplitude stays below `threshold` for at least `minDuration` seconds.
 *
 * @param url        URL or blob URL of the media file
 * @param threshold  RMS amplitude threshold (0–1). Default 0.02 (–34 dBFS).
 * @param minDuration  Minimum silence gap duration in seconds. Default 0.5s.
 * @param windowSize   Analysis window in seconds. Default 0.05s (50ms).
 */
export async function detectSilence(
  url: string,
  threshold = 0.02,
  minDuration = 0.5,
  windowSize = 0.05,
): Promise<SilenceRegion[]> {
  const fetchResponse = await fetch(url);
  const arrayBuffer = await fetchResponse.arrayBuffer();

  const audioContext = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close();
  }

  const sampleRate = audioBuffer.sampleRate;
  const windowSamples = Math.floor(windowSize * sampleRate);
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  // Mix down all channels to mono
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / numChannels;
    }
  }

  // Compute RMS per analysis window and classify as silent
  const numWindows = Math.ceil(length / windowSamples);
  const isSilent = new Uint8Array(numWindows);
  for (let w = 0; w < numWindows; w++) {
    const start = w * windowSamples;
    const end = Math.min(start + windowSamples, length);
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += mono[i] * mono[i];
    }
    const rms = Math.sqrt(sum / (end - start));
    isSilent[w] = rms < threshold ? 1 : 0;
  }

  // Collect contiguous silent windows into regions that meet minDuration
  const regions: SilenceRegion[] = [];
  let silenceStart: number | null = null;

  for (let w = 0; w <= numWindows; w++) {
    const silent = w < numWindows && isSilent[w] === 1;
    if (silent && silenceStart === null) {
      silenceStart = w * windowSize;
    } else if (!silent && silenceStart !== null) {
      const end = Math.min(w * windowSize, audioBuffer.duration);
      const duration = end - silenceStart;
      if (duration >= minDuration) {
        regions.push({ start: silenceStart, end, duration });
      }
      silenceStart = null;
    }
  }

  return regions;
}
