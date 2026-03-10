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
  /** Volume level 0-1 */
  volume: number;
  /** Transition applied to the start of this clip */
  transitionIn?: Transition;
  /** Transition applied to the end of this clip */
  transitionOut?: Transition;
}

export interface Transition {
  type: 'cross-dissolve' | 'fade-to-black' | 'fade-from-black';
  duration: number; // seconds
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'text';
  name: string;
  muted: boolean;
  locked: boolean;
  height: number;
}

export interface TextOverlay {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  text: string;
  style: TextStyle;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  backgroundColor: string;
  /** Position as percentage of canvas (0-100) */
  x: number;
  y: number;
  textAlign: 'left' | 'center' | 'right';
  outline: boolean;
  outlineColor: string;
}

export interface CaptionStyle {
  preset: 'default' | 'tiktok' | 'youtube' | 'minimal';
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: 'bottom' | 'center' | 'top';
  maxWords: number;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface ProjectSettings {
  aspectRatio: AspectRatio;
  resolution: { width: number; height: number };
  frameRate: number;
  captionStyle: CaptionStyle;
  deepgramApiKey: string;
}

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
};

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

export type Tool = 'select' | 'razor' | 'trim' | 'text';

export type FillerRemovalMode = 'delete' | 'gap' | 'ignore' | 'transcript-only';

export interface ExportSettings {
  format: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high';
  includeAudio: boolean;
  burnCaptions: boolean;
}
