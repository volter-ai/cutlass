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
  /** Whether the video file contains an audio track (always true for audio files, undefined = unknown/assume true) */
  hasAudio?: boolean;
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
  type: 'video' | 'audio' | 'image';
  /** Volume level 0-2 */
  volume: number;
  /** Audio fade in duration (seconds) */
  fadeIn: number;
  /** Audio fade out duration (seconds) */
  fadeOut: number;
  /** Links extracted audio clip to its source video clip */
  linkedGroupId?: string;
  /** Playback speed multiplier (0.25-4, default 1) */
  speed: number;
  /** How the clip fits the canvas: fit (letterbox), fill (crop), stretch */
  fitMode?: 'fit' | 'fill' | 'stretch';
  /** Scale multiplier for the clip (default 1) */
  scale?: number;
  /** Horizontal position offset as percentage (-100 to 100, default 0) */
  positionX?: number;
  /** Vertical position offset as percentage (-100 to 100, default 0) */
  positionY?: number;
  /** Animation preset applied to this clip */
  animation?: ClipAnimation;
  /** Transition applied to the start of this clip */
  transitionIn?: Transition;
  /** Transition applied to the end of this clip */
  transitionOut?: Transition;
}

export type AnimationPreset =
  | 'none'
  | 'fade-in'
  | 'fade-out'
  | 'fade-in-out'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'ken-burns';

export interface ClipAnimation {
  preset: AnimationPreset;
  /** Duration of the animation effect in seconds (default: full clip) */
  duration?: number;
}

export interface Transition {
  type: 'cross-dissolve' | 'fade-to-black' | 'fade-from-black';
  duration: number; // seconds
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'text' | 'drawing';
  name: string;
  muted: boolean;
  locked: boolean;
  height: number;
  /** Master volume for this track (0-2, default 1) */
  volume: number;
}

export interface TextOverlay {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  text: string;
  style: TextStyle;
  /** Fade-in duration in seconds */
  fadeIn?: number;
  /** Fade-out duration in seconds */
  fadeOut?: number;
  /** How this overlay was created — 'caption' overlays are managed by addTranscriptCaptionsToTimeline */
  source?: 'manual' | 'caption';
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

export type DrawingToolType = 'pen' | 'arrow' | 'circle' | 'rectangle';

export type DrawingTexture = 'solid' | 'marker' | 'chalk';

export interface DrawingPoint {
  x: number; // normalized 0–1 (relative to canvas width)
  y: number; // normalized 0–1 (relative to canvas height)
}

/** A single drawn stroke or shape.
 *  points interpretation by tool:
 *   pen:       polyline — all captured pointer positions
 *   arrow:     exactly 2 points [start, end]
 *   circle:    exactly 2 points [center, edge] — radius = distance
 *   rectangle: exactly 2 points [topLeft, bottomRight]
 */
export interface DrawingStroke {
  id: string;
  tool: DrawingToolType;
  texture: DrawingTexture;
  color: string;         // CSS hex e.g. '#ff0000'
  strokeWidth: number;   // pixels at 1920px canvas width; scale proportionally
  opacity: number;       // baked in at creation: solid=1, marker=0.5, chalk=0.7
  points: DrawingPoint[];
  /** Seconds from overlay start when this stroke begins its write-on animation */
  startOffset: number;
}

/** A timed drawing layer — mirrors TextOverlay structurally */
export interface DrawingOverlay {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  strokes: DrawingStroke[];
  /** Write-on animation speed multiplier: 0.5=slow, 1=normal, 2=fast (preview-only in v1) */
  writeOnSpeed: number;
  fadeIn?: number;
  fadeOut?: number;
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
  openaiApiKey: string;
  backgroundColor: string;
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

export type Tool = 'select' | 'razor' | 'trim' | 'text' | 'draw';

export type FillerRemovalMode = 'delete' | 'gap' | 'ignore' | 'transcript-only';

export interface ExportSettings {
  format: 'mp4' | 'webm';
  quality: '720p' | '1080p' | '4k';
  includeAudio: boolean;
  burnCaptions: boolean;
  exportSubtitles: boolean;
  subtitleFormat: 'srt' | 'vtt';
}

export interface Project {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  thumbnail?: string;
}
