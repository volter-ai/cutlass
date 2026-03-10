export interface MediaFile {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  duration: number; // seconds
  file: File;
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface TimelineClip {
  id: string;
  mediaFileId: string;
  trackId: string;
  /** Start position on the timeline (seconds) */
  startTime: number;
  /** Duration of this clip on the timeline (seconds) */
  duration: number;
  /** Offset into the source media (seconds) */
  mediaOffset: number;
  name: string;
  type: 'video' | 'audio';
}

export interface Track {
  id: string;
  type: 'video' | 'audio';
  name: string;
  muted: boolean;
  locked: boolean;
  height: number;
}

export interface TranscriptWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
  confidence: number;
  isFiller: boolean;
  isRemoved: boolean;
  speaker?: number;
}

export interface TranscriptSegment {
  id: string;
  words: TranscriptWord[];
  speaker?: number;
  start: number;
  end: number;
}

export interface Scene {
  id: string;
  name: string;
  start: number; // seconds
  end: number; // seconds
  clipIds: string[];
  description?: string;
}

export interface Transcript {
  mediaFileId: string;
  segments: TranscriptSegment[];
  scenes: Scene[];
}

export type Tool = 'select' | 'razor' | 'trim';

export type FillerRemovalMode = 'delete' | 'gap' | 'ignore' | 'transcript-only';
