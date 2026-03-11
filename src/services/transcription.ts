import { v4 as uuid } from 'uuid';
import type { MediaFile, Transcript, TranscriptSegment, TranscriptWord } from '../types';

const FILLER_WORDS = new Set([
  'um', 'uh', 'umm', 'uhh', 'hmm', 'hm', 'mm', 'mmm',
  'er', 'ah', 'eh', 'like', 'you know', 'so', 'actually',
  'basically', 'literally', 'right', 'okay so',
]);

/**
 * Transcribe media using:
 * 1. Deepgram (if deepgramApiKey set) — best quality, speaker diarization
 * 2. OpenAI Whisper (if openaiApiKey set) — good quality, word timestamps
 * 3. Demo mode (fallback)
 */
export async function transcribeMedia(
  media: MediaFile,
  deepgramApiKey?: string,
  openaiApiKey?: string,
): Promise<Transcript> {
  const dgKey = deepgramApiKey
    || import.meta.env.VITE_DEEPGRAM_API_KEY
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('cutlass-deepgram-key') : null);

  if (dgKey) {
    return transcribeWithDeepgram(media, dgKey);
  }

  const oaiKey = openaiApiKey
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('cutlass-openai-key') : null);

  if (oaiKey) {
    return transcribeWithOpenAI(media, oaiKey);
  }

  // Demo mode: generate a mock transcript
  return generateDemoTranscript(media);
}

async function transcribeWithDeepgram(media: MediaFile, apiKey: string): Promise<Transcript> {
  const response = await fetch(
    'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&utterances=true&diarize=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      body: media.file,
    },
  );

  if (!response.ok) {
    throw new Error(`Deepgram API error: ${response.status}`);
  }

  const data = await response.json();
  return parseDeepgramResponse(media.id, data);
}

function parseDeepgramResponse(mediaFileId: string, data: DeepgramResponse): Transcript {
  const segments: TranscriptSegment[] = [];

  if (data.results?.utterances) {
    for (const utterance of data.results.utterances) {
      const words: TranscriptWord[] = utterance.words.map((w) => ({
        word: w.punctuated_word || w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        isFiller: isFillerWord(w.word),
        isRemoved: false,
        speaker: w.speaker,
      }));

      segments.push({
        id: uuid(),
        words,
        speaker: utterance.speaker,
        start: utterance.start,
        end: utterance.end,
      });
    }
  } else if (data.results?.channels?.[0]?.alternatives?.[0]?.words) {
    // Fallback: no utterances, use raw words
    const allWords = data.results.channels[0].alternatives[0].words;
    let currentSegment: TranscriptWord[] = [];
    let segStart = 0;

    for (let i = 0; i < allWords.length; i++) {
      const w = allWords[i];
      if (currentSegment.length === 0) {
        segStart = w.start;
      }

      currentSegment.push({
        word: w.punctuated_word || w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        isFiller: isFillerWord(w.word),
        isRemoved: false,
        speaker: w.speaker,
      });

      // Break segment on sentence-ending punctuation or long pause
      const nextWord = allWords[i + 1];
      const isPunctEnd = /[.!?]$/.test(w.punctuated_word || w.word);
      const hasGap = nextWord && nextWord.start - w.end > 0.5;

      if (isPunctEnd || hasGap || i === allWords.length - 1) {
        segments.push({
          id: uuid(),
          words: currentSegment,
          speaker: currentSegment[0].speaker,
          start: segStart,
          end: w.end,
        });
        currentSegment = [];
      }
    }
  }

  return { mediaFileId, segments, scenes: [] };
}

async function transcribeWithOpenAI(media: MediaFile, apiKey: string): Promise<Transcript> {
  const formData = new FormData();
  formData.append('file', media.file);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OpenAI Whisper API error: ${response.status}`);
  }

  const data: WhisperResponse = await response.json();
  return parseWhisperResponse(media.id, data);
}

function parseWhisperResponse(mediaFileId: string, data: WhisperResponse): Transcript {
  const segments: TranscriptSegment[] = [];
  const allWords = data.words ?? [];

  if (allWords.length === 0) {
    // No word timestamps — fall back to one segment per Whisper segment
    for (const seg of data.segments ?? []) {
      const words = seg.text.trim().split(/\s+/).filter(Boolean);
      const duration = seg.end - seg.start;
      const perWord = words.length > 0 ? duration / words.length : duration;
      const segWords: TranscriptWord[] = words.map((w, i) => ({
        word: w,
        start: seg.start + i * perWord,
        end: seg.start + (i + 1) * perWord,
        confidence: 1,
        isFiller: isFillerWord(w),
        isRemoved: false,
      }));
      if (segWords.length > 0) {
        segments.push({ id: uuid(), words: segWords, start: seg.start, end: seg.end });
      }
    }
    return { mediaFileId, segments, scenes: [] };
  }

  // Group word-level timings into segments by sentence-ending punctuation or pause
  let currentSegment: TranscriptWord[] = [];
  let segStart = 0;

  for (let i = 0; i < allWords.length; i++) {
    const w = allWords[i];
    if (currentSegment.length === 0) segStart = w.start;

    currentSegment.push({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: 1,
      isFiller: isFillerWord(w.word),
      isRemoved: false,
    });

    const nextWord = allWords[i + 1];
    const isPunctEnd = /[.!?]$/.test(w.word);
    const hasGap = nextWord && nextWord.start - w.end > 0.5;

    if (isPunctEnd || hasGap || i === allWords.length - 1) {
      segments.push({
        id: uuid(),
        words: currentSegment,
        start: segStart,
        end: w.end,
      });
      currentSegment = [];
    }
  }

  return { mediaFileId, segments, scenes: [] };
}

function isFillerWord(word: string): boolean {
  return FILLER_WORDS.has(word.toLowerCase().replace(/[.,!?]/g, ''));
}

/**
 * Demo transcript for testing without an API key.
 * Generates realistic-looking transcript with filler words.
 */
function generateDemoTranscript(media: MediaFile): Transcript {
  const segments: TranscriptSegment[] = [];
  const duration = media.duration;

  const demoText = [
    { words: "So um today I want to talk about", speaker: 0 },
    { words: "the uh new features we've been working on", speaker: 0 },
    { words: "basically we've redesigned the entire um interface", speaker: 0 },
    { words: "to make it more intuitive for our users", speaker: 0 },
    { words: "Right so the first thing you'll notice", speaker: 0 },
    { words: "is the uh new dashboard layout", speaker: 0 },
    { words: "It's actually much cleaner now", speaker: 0 },
    { words: "Um we moved the navigation to the left side", speaker: 0 },
    { words: "and uh added these new quick action buttons", speaker: 0 },
    { words: "You know what I mean like it's way more efficient", speaker: 0 },
    { words: "The second major change is the um search functionality", speaker: 0 },
    { words: "We've basically rebuilt it from scratch", speaker: 0 },
    { words: "So now it supports uh full text search", speaker: 0 },
    { words: "across all your projects and documents", speaker: 0 },
    { words: "And um one more thing I want to mention", speaker: 0 },
    { words: "is the new collaboration features", speaker: 0 },
    { words: "You can literally edit documents together in real time", speaker: 0 },
    { words: "Hmm let me show you how that works", speaker: 0 },
    { words: "So basically you just click the share button", speaker: 0 },
    { words: "and uh invite your team members", speaker: 0 },
    { words: "They'll get a notification um right away", speaker: 0 },
    { words: "and can start editing immediately", speaker: 0 },
    { words: "Okay so that's the overview", speaker: 0 },
    { words: "Um any questions about what we covered today?", speaker: 0 },
  ];

  let currentTime = 0.5;

  for (const line of demoText) {
    if (currentTime >= duration - 1) break;

    const lineWords = line.words.split(' ');
    const segmentWords: TranscriptWord[] = [];
    const segStart = currentTime;

    for (const w of lineWords) {
      const wordDuration = 0.3 + Math.random() * 0.2;
      const isFiller = isFillerWord(w);

      segmentWords.push({
        word: w,
        start: currentTime,
        end: currentTime + wordDuration,
        confidence: 0.85 + Math.random() * 0.15,
        isFiller,
        isRemoved: false,
        speaker: line.speaker,
      });

      currentTime += wordDuration + 0.05 + (isFiller ? 0.1 : 0);
    }

    // Add pause between segments
    currentTime += 0.3 + Math.random() * 0.5;

    segments.push({
      id: uuid(),
      words: segmentWords,
      speaker: line.speaker,
      start: segStart,
      end: segmentWords[segmentWords.length - 1].end,
    });
  }

  return { mediaFileId: media.id, segments, scenes: [] };
}

// Deepgram API types
interface DeepgramResponse {
  results?: {
    utterances?: Array<{
      words: DeepgramWord[];
      speaker: number;
      start: number;
      end: number;
    }>;
    channels?: Array<{
      alternatives: Array<{
        words: DeepgramWord[];
      }>;
    }>;
  };
}

interface DeepgramWord {
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

// OpenAI Whisper API types
interface WhisperResponse {
  text: string;
  words?: Array<{ word: string; start: number; end: number }>;
  segments?: Array<{ id: number; start: number; end: number; text: string }>;
}
