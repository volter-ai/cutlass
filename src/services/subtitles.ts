import type { Transcript } from '../types';

function padTime(n: number, width: number) {
  return String(Math.floor(n)).padStart(width, '0');
}

/** Format seconds → HH:MM:SS,mmm (SRT) */
function toSrtTime(secs: number): string {
  const ms = Math.round((secs % 1) * 1000);
  const s = Math.floor(secs) % 60;
  const m = Math.floor(secs / 60) % 60;
  const h = Math.floor(secs / 3600);
  return `${padTime(h, 2)}:${padTime(m, 2)}:${padTime(s, 2)},${padTime(ms, 3)}`;
}

/** Format seconds → HH:MM:SS.mmm (VTT) */
function toVttTime(secs: number): string {
  return toSrtTime(secs).replace(',', '.');
}

interface CaptionEntry {
  start: number;
  end: number;
  text: string;
}

/**
 * Build caption entries from transcripts, chunking words by maxWords
 * and skipping removed words. Merges all transcripts sorted by start time.
 */
function buildEntries(transcripts: Transcript[], maxWords: number): CaptionEntry[] {
  const entries: CaptionEntry[] = [];

  for (const transcript of transcripts) {
    for (const segment of transcript.segments) {
      const visible = segment.words.filter((w) => !w.isRemoved);
      if (visible.length === 0) continue;

      for (let i = 0; i < visible.length; i += maxWords) {
        const chunk = visible.slice(i, i + maxWords);
        entries.push({
          start: chunk[0].start,
          end: chunk[chunk.length - 1].end,
          text: chunk.map((w) => w.word).join(' '),
        });
      }
    }
  }

  return entries.sort((a, b) => a.start - b.start);
}

export function transcriptsToSrt(transcripts: Transcript[], maxWords = 8): string {
  const entries = buildEntries(transcripts, maxWords);
  return entries
    .map((e, i) => `${i + 1}\n${toSrtTime(e.start)} --> ${toSrtTime(e.end)}\n${e.text}`)
    .join('\n\n');
}

export function transcriptsToVtt(transcripts: Transcript[], maxWords = 8): string {
  const entries = buildEntries(transcripts, maxWords);
  const body = entries
    .map((e) => `${toVttTime(e.start)} --> ${toVttTime(e.end)}\n${e.text}`)
    .join('\n\n');
  return `WEBVTT\n\n${body}`;
}
