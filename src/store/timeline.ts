import { createContext, useContext } from 'react';
import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuid } from 'uuid';
import { ASPECT_RATIO_DIMENSIONS } from '../types';
import type {
  MediaFile,
  TimelineClip,
  Track,
  Transcript,
  TextOverlay,
  TextStyle,
  Scene,
  Tool,
  FillerRemovalMode,
  Transition,
  ClipAnimation,
  AspectRatio,
  ProjectSettings,
  CaptionStyle,
} from '../types';

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  preset: 'default',
  fontFamily: 'Arial',
  fontSize: 24,
  color: '#ffffff',
  backgroundColor: 'rgba(0,0,0,0.7)',
  position: 'bottom',
  maxWords: 8,
};

const DEFAULT_SETTINGS: ProjectSettings = {
  aspectRatio: '16:9',
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
  captionStyle: DEFAULT_CAPTION_STYLE,
  deepgramApiKey: typeof localStorage !== 'undefined'
    ? localStorage.getItem('cutlass-deepgram-key') ?? ''
    : '',
};

export interface TimelineState {
  // Media
  mediaFiles: Record<string, MediaFile>;

  // Timeline
  tracks: Track[];
  clips: Record<string, TimelineClip>;
  textOverlays: Record<string, TextOverlay>;
  playheadPosition: number;
  isPlaying: boolean;
  duration: number;
  zoom: number;
  snapEnabled: boolean;

  // Selection
  selectedClipIds: string[];
  selectedTextOverlayId: string | null;
  activeTool: Tool;

  // Transcript
  transcripts: Record<string, Transcript>;
  activeTranscriptMediaId: string | null;

  // Project
  settings: ProjectSettings;

  // Export
  isExporting: boolean;
  exportProgress: number;

  // UI
  leftPanelTab: 'media' | 'transcript' | 'settings';
  showExportDialog: boolean;
  showHelpOverlay: boolean;
  showProjectsModal: boolean;

  // Project persistence
  currentProjectId: string | null;
  currentProjectName: string;
  projectSaved: boolean;

  // Actions - Media
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;

  // Actions - Timeline
  addClipToTrack: (
    mediaFileId: string,
    trackId: string,
    startTime: number,
    mediaOffset?: number,
    duration?: number,
  ) => string;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void;
  moveClipsBatch: (positions: Record<string, number>) => void;
  trimClipStart: (clipId: string, newStartTime: number) => void;
  trimClipEnd: (clipId: string, newEndTime: number) => void;
  splitClipAtPlayhead: (clipId: string) => void;
  rippleDelete: (clipId: string) => void;
  setClipVolume: (clipId: string, volume: number) => void;
  setClipSpeed: (clipId: string, speed: number) => void;
  setClipFitMode: (clipId: string, fitMode: 'fit' | 'fill' | 'stretch') => void;
  setClipTransform: (clipId: string, transform: { scale?: number; positionX?: number; positionY?: number }) => void;
  setClipAnimation: (clipId: string, animation: ClipAnimation | undefined) => void;
  setClipFade: (clipId: string, edge: 'in' | 'out', duration: number) => void;
  setClipTransition: (clipId: string, edge: 'in' | 'out', transition: Transition | undefined) => void;
  extractAudioFromClip: (clipId: string) => string | null;
  unlinkClips: (clipId: string) => void;

  // Actions - Text Overlays
  addTextOverlay: (trackId: string, startTime: number, text: string) => string;
  updateTextOverlay: (id: string, updates: Partial<Pick<TextOverlay, 'text' | 'startTime' | 'duration'>> & { style?: Partial<TextOverlay['style']> }) => void;
  removeTextOverlay: (id: string) => void;
  selectTextOverlay: (id: string | null) => void;

  // Actions - Tracks
  addTrack: (type: 'video' | 'audio' | 'text') => string;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;

  // Actions - Playback
  setPlayheadPosition: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  toggleSnap: () => void;

  // Actions - Selection
  selectClip: (clipId: string, multi?: boolean) => void;
  selectClips: (clipIds: string[]) => void;
  clearSelection: () => void;
  setActiveTool: (tool: Tool) => void;

  // Actions - Transcript
  setTranscript: (mediaFileId: string, transcript: Transcript) => void;
  setActiveTranscriptMediaId: (id: string | null) => void;
  removeFillerWords: (mediaFileId: string, mode: FillerRemovalMode) => void;
  detectScenes: (mediaFileId: string) => void;

  // Actions - Settings
  setAspectRatio: (ratio: AspectRatio) => void;
  setDeepgramApiKey: (key: string) => void;
  setCaptionStyle: (style: Partial<CaptionStyle>) => void;
  setSettings: (settings: Partial<ProjectSettings>) => void;

  // Actions - Export
  setIsExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setShowExportDialog: (show: boolean) => void;

  // Actions - UI
  setLeftPanelTab: (tab: 'media' | 'transcript' | 'settings') => void;
  setShowHelpOverlay: (show: boolean) => void;
  setShowProjectsModal: (show: boolean) => void;

  // Actions - Project
  setCurrentProject: (id: string | null, name: string) => void;
  markProjectSaved: () => void;
  markProjectDirty: () => void;

  // Computed
  getClipsForTrack: (trackId: string) => TimelineClip[];
  getClipAtPlayhead: (trackId: string) => TimelineClip | undefined;
  getSnapPoints: () => number[];
  recalculateDuration: () => void;
}

export type TimelineStore = ReturnType<typeof createTimelineStore>;

const DEFAULT_TRACKS: Track[] = [
  { id: 'v2', type: 'video', name: 'V2', muted: false, locked: false, height: 60, volume: 1 },
  { id: 'v1', type: 'video', name: 'V1', muted: false, locked: false, height: 60, volume: 1 },
  { id: 'a1', type: 'audio', name: 'A1', muted: false, locked: false, height: 50, volume: 1 },
  { id: 'a2', type: 'audio', name: 'A2', muted: false, locked: false, height: 50, volume: 1 },
  { id: 't1', type: 'text', name: 'T1', muted: false, locked: false, height: 40, volume: 1 },
];

export interface TimelineStoreOptions {
  initialTracks?: Track[];
  initialMediaFiles?: Record<string, MediaFile>;
  initialSettings?: Partial<ProjectSettings>;
}

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Arial',
  fontSize: 48,
  fontWeight: 'bold',
  color: '#ffffff',
  backgroundColor: 'transparent',
  x: 50,
  y: 50,
  textAlign: 'center',
  outline: true,
  outlineColor: '#000000',
};

export function createTimelineStore(options?: TimelineStoreOptions) {
  return create<TimelineState>()(
    temporal(
      immer((set, get) => ({
        mediaFiles: options?.initialMediaFiles ?? {},
        tracks: options?.initialTracks ?? DEFAULT_TRACKS,
        clips: {},
        textOverlays: {},
        playheadPosition: 0,
        isPlaying: false,
        duration: 0,
        zoom: 100,
        snapEnabled: true,
        selectedClipIds: [],
        selectedTextOverlayId: null,
        activeTool: 'select' as Tool,
        transcripts: {},
        activeTranscriptMediaId: null,
        settings: { ...DEFAULT_SETTINGS, ...options?.initialSettings },
        isExporting: false,
        exportProgress: 0,
        leftPanelTab: 'media' as const,
        showExportDialog: false,
        showHelpOverlay: false,
        showProjectsModal: false,
        currentProjectId: null,
        currentProjectName: 'Untitled Project',
        projectSaved: true,

        addMediaFile: (file) => {
          set((state) => {
            state.mediaFiles[file.id] = file;
          });
          // Persist to IndexedDB (fire-and-forget)
          import('../services/mediaStorage').then((ms) =>
            ms.storeMediaFile(file.id, file.file).catch(() => {}),
          );
        },

        removeMediaFile: (id) => {
          set((state) => {
            delete state.mediaFiles[id];
            // Remove all timeline clips that reference this media file
            for (const clipId of Object.keys(state.clips)) {
              if (state.clips[clipId].mediaFileId === id) {
                delete state.clips[clipId];
              }
            }
            state.selectedClipIds = state.selectedClipIds.filter((clipId) => !!state.clips[clipId]);
          });
          get().recalculateDuration();
          // Remove from IndexedDB (fire-and-forget)
          import('../services/mediaStorage').then((ms) =>
            ms.removeMediaFile(id).catch(() => {}),
          );
        },

        addClipToTrack: (mediaFileId, trackId, startTime, mediaOffset = 0, duration?) => {
          const clipId = uuid();
          const mediaFile = get().mediaFiles[mediaFileId];
          if (!mediaFile) return clipId;

          const clipDuration = duration ?? mediaFile.duration - mediaOffset;
          set((state) => {
            state.clips[clipId] = {
              id: clipId,
              mediaFileId,
              trackId,
              startTime,
              duration: clipDuration,
              mediaOffset,
              name: mediaFile.name,
              type: mediaFile.type === 'audio' ? 'audio' : 'video',
              volume: 1,
              speed: 1,
              fadeIn: 0,
              fadeOut: 0,
            };
          });
          get().recalculateDuration();
          return clipId;
        },

        removeClip: (clipId) => {
          set((state) => {
            delete state.clips[clipId];
            state.selectedClipIds = state.selectedClipIds.filter((id) => id !== clipId);
          });
          get().recalculateDuration();
        },

        moveClip: (clipId, newStartTime, newTrackId) => {
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            const delta = Math.max(0, newStartTime) - clip.startTime;
            clip.startTime = Math.max(0, newStartTime);
            if (newTrackId) clip.trackId = newTrackId;

            // Move linked clip by the same delta
            if (clip.linkedGroupId) {
              const linked = Object.values(state.clips).find(
                (c) => c.id !== clipId && c.linkedGroupId === clip.linkedGroupId,
              );
              if (linked) {
                linked.startTime = Math.max(0, linked.startTime + delta);
              }
            }
          });
          get().recalculateDuration();
        },

        moveClipsBatch: (positions) => {
          set((state) => {
            const processed = new Set<string>();
            for (const [clipId, newStartTime] of Object.entries(positions)) {
              if (processed.has(clipId)) continue;
              const clip = state.clips[clipId];
              if (!clip) continue;
              const delta = Math.max(0, newStartTime) - clip.startTime;
              clip.startTime = Math.max(0, newStartTime);
              processed.add(clipId);
              if (clip.linkedGroupId) {
                const linked = Object.values(state.clips).find(
                  (c) => c.id !== clipId && c.linkedGroupId === clip.linkedGroupId,
                );
                if (linked && !processed.has(linked.id) && !(linked.id in positions)) {
                  linked.startTime = Math.max(0, linked.startTime + delta);
                  processed.add(linked.id);
                }
              }
            }
          });
          get().recalculateDuration();
        },

        trimClipStart: (clipId, newStartTime) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            const delta = newStartTime - clip.startTime;
            clip.mediaOffset += delta;
            clip.duration -= delta;
            clip.startTime = newStartTime;
            // Clamp fade-in so it never exceeds half the new duration
            clip.fadeIn = Math.min(clip.fadeIn, clip.duration / 2);
          }),

        trimClipEnd: (clipId, newEndTime) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            clip.duration = newEndTime - clip.startTime;
            // Clamp fade-out so it never exceeds half the new duration
            clip.fadeOut = Math.min(clip.fadeOut, clip.duration / 2);
          }),

        splitClipAtPlayhead: (clipId) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            const playhead = state.playheadPosition;
            if (playhead <= clip.startTime || playhead >= clip.startTime + clip.duration) return;

            const splitPoint = playhead - clip.startTime;
            const newClipId = uuid();

            state.clips[newClipId] = {
              id: newClipId,
              mediaFileId: clip.mediaFileId,
              trackId: clip.trackId,
              startTime: playhead,
              duration: clip.duration - splitPoint,
              mediaOffset: clip.mediaOffset + splitPoint * clip.speed,
              name: clip.name,
              type: clip.type,
              volume: clip.volume,
              speed: clip.speed,
              fadeIn: 0,
              fadeOut: clip.fadeOut,
            };

            clip.duration = splitPoint;
            clip.fadeOut = 0;
          }),

        rippleDelete: (clipId) => {
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            const trackId = clip.trackId;
            const clipEnd = clip.startTime + clip.duration;
            const gap = clip.duration;

            delete state.clips[clipId];
            state.selectedClipIds = state.selectedClipIds.filter((id) => id !== clipId);

            Object.values(state.clips).forEach((c) => {
              if (c.trackId === trackId && c.startTime >= clipEnd) {
                c.startTime -= gap;
              }
            });
          });
          get().recalculateDuration();
        },

        setClipVolume: (clipId, volume) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            clip.volume = Math.max(0, Math.min(2, volume));
            // Sync linked clip volume (e.g. extracted audio), consistent with setClipSpeed
            if (clip.linkedGroupId) {
              const linked = Object.values(state.clips).find(
                (c) => c.id !== clipId && c.linkedGroupId === clip.linkedGroupId,
              );
              if (linked) {
                linked.volume = clip.volume;
              }
            }
          }),

        setClipSpeed: (clipId, speed) => {
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            const clampedSpeed = Math.max(0.25, Math.min(4, speed));
            // Adjust duration to keep the same source media range
            clip.duration = clip.duration * (clip.speed / clampedSpeed);
            clip.speed = clampedSpeed;

            // Sync linked clip (e.g. extracted audio)
            if (clip.linkedGroupId) {
              const linked = Object.values(state.clips).find(
                (c) => c.id !== clipId && c.linkedGroupId === clip.linkedGroupId,
              );
              if (linked) {
                linked.duration = linked.duration * (linked.speed / clampedSpeed);
                linked.speed = clampedSpeed;
              }
            }
          });
          get().recalculateDuration();
        },

        setClipFitMode: (clipId, fitMode) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (clip) clip.fitMode = fitMode;
          }),

        setClipTransform: (clipId, transform) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            if (transform.scale !== undefined) clip.scale = Math.max(0.1, Math.min(4, transform.scale));
            if (transform.positionX !== undefined) clip.positionX = Math.max(-100, Math.min(100, transform.positionX));
            if (transform.positionY !== undefined) clip.positionY = Math.max(-100, Math.min(100, transform.positionY));
          }),

        setClipAnimation: (clipId, animation) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (clip) clip.animation = animation;
          }),

        setClipFade: (clipId, edge, duration) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            const fadeDuration = Math.max(0, Math.min(duration, clip.duration / 2));
            if (edge === 'in') {
              clip.fadeIn = fadeDuration;
            } else {
              clip.fadeOut = fadeDuration;
            }
          }),

        setClipTransition: (clipId, edge, transition) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip) return;
            if (edge === 'in') {
              clip.transitionIn = transition;
            } else {
              clip.transitionOut = transition;
            }
            // If video clip has linked audio, apply matching audio fade
            if (clip.linkedGroupId && clip.type === 'video' && transition) {
              const linked = Object.values(state.clips).find(
                (c) => c.id !== clipId && c.linkedGroupId === clip.linkedGroupId,
              );
              if (linked) {
                if (edge === 'in') {
                  linked.fadeIn = transition.duration;
                } else {
                  linked.fadeOut = transition.duration;
                }
              }
            }
          }),

        extractAudioFromClip: (clipId) => {
          const state = get();
          const clip = state.clips[clipId];
          if (!clip || clip.type !== 'video') return null;

          // Find or create an audio track
          let audioTrack = state.tracks.find((t) => t.type === 'audio');
          let audioTrackId = audioTrack?.id;
          if (!audioTrackId) {
            audioTrackId = get().addTrack('audio');
          }

          const groupId = clip.linkedGroupId || uuid();
          const audioClipId = uuid();

          set((s) => {
            // Set linked group on source video clip
            s.clips[clipId].linkedGroupId = groupId;
            // Create audio clip
            s.clips[audioClipId] = {
              id: audioClipId,
              mediaFileId: clip.mediaFileId,
              trackId: audioTrackId!,
              startTime: clip.startTime,
              duration: clip.duration,
              mediaOffset: clip.mediaOffset,
              name: `${clip.name} (audio)`,
              type: 'audio',
              volume: clip.volume,
              speed: clip.speed,
              fadeIn: clip.fadeIn,
              fadeOut: clip.fadeOut,
              linkedGroupId: groupId,
            };
          });

          get().recalculateDuration();
          return audioClipId;
        },

        unlinkClips: (clipId) =>
          set((state) => {
            const clip = state.clips[clipId];
            if (!clip?.linkedGroupId) return;
            const groupId = clip.linkedGroupId;
            // Remove linked group from all clips in the group
            Object.values(state.clips).forEach((c) => {
              if (c.linkedGroupId === groupId) {
                c.linkedGroupId = undefined;
              }
            });
          }),

        // Text Overlays
        addTextOverlay: (trackId, startTime, text) => {
          const id = uuid();
          set((state) => {
            state.textOverlays[id] = {
              id,
              trackId,
              startTime,
              duration: 3,
              text,
              style: { ...DEFAULT_TEXT_STYLE },
            };
          });
          get().recalculateDuration();
          return id;
        },

        updateTextOverlay: (id, updates) =>
          set((state) => {
            const overlay = state.textOverlays[id];
            if (!overlay) return;
            if (updates.text !== undefined) overlay.text = updates.text;
            if (updates.startTime !== undefined) overlay.startTime = updates.startTime;
            if (updates.duration !== undefined) overlay.duration = updates.duration;
            if (updates.style) Object.assign(overlay.style, updates.style);
          }),

        removeTextOverlay: (id) =>
          set((state) => {
            delete state.textOverlays[id];
            if (state.selectedTextOverlayId === id) state.selectedTextOverlayId = null;
          }),

        selectTextOverlay: (id) =>
          set((state) => {
            state.selectedTextOverlayId = id;
            if (id) state.selectedClipIds = [];
          }),

        addTrack: (type) => {
          const trackId = uuid();
          set((state) => {
            const trackNum = state.tracks.filter((t) => t.type === type).length + 1;
            const prefix = type === 'video' ? 'V' : type === 'audio' ? 'A' : 'T';
            const track: Track = {
              id: trackId,
              type,
              name: `${prefix}${trackNum}`,
              muted: false,
              locked: false,
              height: type === 'video' ? 60 : type === 'audio' ? 50 : 40,
              volume: 1,
            };
            if (type === 'video') {
              state.tracks.unshift(track);
            } else {
              state.tracks.push(track);
            }
          });
          return trackId;
        },

        removeTrack: (trackId) => {
          set((state) => {
            state.tracks = state.tracks.filter((t) => t.id !== trackId);
            Object.keys(state.clips).forEach((clipId) => {
              if (state.clips[clipId].trackId === trackId) {
                delete state.clips[clipId];
              }
            });
            Object.keys(state.textOverlays).forEach((id) => {
              if (state.textOverlays[id].trackId === trackId) {
                delete state.textOverlays[id];
              }
            });
          });
          get().recalculateDuration();
        },

        toggleTrackMute: (trackId) =>
          set((state) => {
            const track = state.tracks.find((t) => t.id === trackId);
            if (track) track.muted = !track.muted;
          }),

        toggleTrackLock: (trackId) =>
          set((state) => {
            const track = state.tracks.find((t) => t.id === trackId);
            if (track) track.locked = !track.locked;
          }),

        setTrackVolume: (trackId, volume) =>
          set((state) => {
            const track = state.tracks.find((t) => t.id === trackId);
            if (track) track.volume = Math.max(0, Math.min(2, volume));
          }),

        setPlayheadPosition: (time) =>
          set((state) => {
            state.playheadPosition = Math.max(0, time);
          }),

        setIsPlaying: (playing) =>
          set((state) => {
            state.isPlaying = playing;
          }),

        setZoom: (zoom) =>
          set((state) => {
            state.zoom = Math.max(10, Math.min(500, zoom));
          }),

        toggleSnap: () =>
          set((state) => {
            state.snapEnabled = !state.snapEnabled;
          }),

        selectClip: (clipId, multi = false) =>
          set((state) => {
            state.selectedTextOverlayId = null;
            if (multi) {
              if (state.selectedClipIds.includes(clipId)) {
                state.selectedClipIds = state.selectedClipIds.filter((id) => id !== clipId);
              } else {
                state.selectedClipIds.push(clipId);
              }
            } else {
              state.selectedClipIds = [clipId];
            }
          }),

        clearSelection: () =>
          set((state) => {
            state.selectedClipIds = [];
            state.selectedTextOverlayId = null;
          }),

        selectClips: (clipIds) =>
          set((state) => {
            state.selectedTextOverlayId = null;
            state.selectedClipIds = clipIds;
          }),

        setActiveTool: (tool) =>
          set((state) => {
            state.activeTool = tool;
          }),

        setTranscript: (mediaFileId, transcript) =>
          set((state) => {
            state.transcripts[mediaFileId] = transcript;
          }),

        setActiveTranscriptMediaId: (id) =>
          set((state) => {
            state.activeTranscriptMediaId = id;
          }),

        removeFillerWords: (mediaFileId, mode) => {
          set((state) => {
            const transcript = state.transcripts[mediaFileId];
            if (!transcript) return;

            transcript.segments.forEach((segment) => {
              segment.words.forEach((word) => {
                if (!word.isFiller) return;
                switch (mode) {
                  case 'delete':
                  case 'gap':
                  case 'transcript-only':
                    word.isRemoved = true;
                    break;
                  case 'ignore':
                    word.isRemoved = false;
                    break;
                }
              });
            });

            if (mode === 'delete') {
              const fillerRegions: { start: number; end: number }[] = [];
              transcript.segments.forEach((segment) => {
                segment.words.forEach((word) => {
                  if (word.isFiller && word.isRemoved) {
                    fillerRegions.push({ start: word.start, end: word.end });
                  }
                });
              });

              const clipsForMedia = Object.values(state.clips).filter(
                (c) => c.mediaFileId === mediaFileId,
              );

              fillerRegions.reverse().forEach((region) => {
                clipsForMedia.forEach((clip) => {
                  const clipEnd = clip.startTime + clip.duration;
                  const regionStartInClip = region.start - clip.mediaOffset + clip.startTime;
                  const regionEndInClip = region.end - clip.mediaOffset + clip.startTime;
                  const fillerDuration = region.end - region.start;

                  if (regionStartInClip > clip.startTime && regionEndInClip < clipEnd) {
                    // Interior: filler falls entirely within the clip — split and close gap
                    const newClipId = uuid();
                    state.clips[newClipId] = {
                      id: newClipId,
                      mediaFileId: clip.mediaFileId,
                      trackId: clip.trackId,
                      startTime: regionStartInClip - fillerDuration,
                      duration: clipEnd - regionEndInClip,
                      mediaOffset: clip.mediaOffset + (regionEndInClip - clip.startTime),
                      name: clip.name,
                      type: clip.type,
                      volume: clip.volume,
                      speed: clip.speed,
                      fadeIn: 0,
                      fadeOut: clip.fadeOut,
                    };
                    clip.duration = regionStartInClip - clip.startTime;
                  } else if (
                    regionStartInClip <= clip.startTime &&
                    regionEndInClip > clip.startTime &&
                    regionEndInClip < clipEnd
                  ) {
                    // Leading edge: filler overlaps the clip's start — trim start and close gap
                    const trimAmount = regionEndInClip - clip.startTime;
                    clip.mediaOffset += trimAmount;
                    clip.duration -= trimAmount;
                    clip.startTime -= trimAmount;
                  } else if (
                    regionStartInClip > clip.startTime &&
                    regionStartInClip < clipEnd &&
                    regionEndInClip >= clipEnd
                  ) {
                    // Trailing edge: filler overlaps the clip's end — trim end
                    clip.duration = regionStartInClip - clip.startTime;
                  }
                });
              });
            }
          });
          get().recalculateDuration();
        },

        detectScenes: (mediaFileId) =>
          set((state) => {
            const transcript = state.transcripts[mediaFileId];
            if (!transcript) return;

            const scenes: Scene[] = [];
            let currentScene: Scene | null = null;

            transcript.segments.forEach((segment, i) => {
              const prevSegment = i > 0 ? transcript.segments[i - 1] : null;
              const gapFromPrev = prevSegment ? segment.start - prevSegment.end : 0;
              const speakerChanged = prevSegment && prevSegment.speaker !== segment.speaker;

              if (!currentScene || gapFromPrev > 2 || speakerChanged) {
                if (currentScene) scenes.push(currentScene);
                currentScene = {
                  id: uuid(),
                  name: `Scene ${scenes.length + 1}`,
                  start: segment.start,
                  end: segment.end,
                  clipIds: [],
                };
              }
              if (currentScene) currentScene.end = segment.end;
            });

            if (currentScene) scenes.push(currentScene);
            transcript.scenes = scenes;
          }),

        // Settings
        setAspectRatio: (ratio) =>
          set((state) => {
            state.settings.aspectRatio = ratio;
            state.settings.resolution = ASPECT_RATIO_DIMENSIONS[ratio];
          }),

        setDeepgramApiKey: (key) =>
          set((state) => {
            state.settings.deepgramApiKey = key;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('cutlass-deepgram-key', key);
            }
          }),

        setCaptionStyle: (style) =>
          set((state) => {
            Object.assign(state.settings.captionStyle, style);
          }),

        setSettings: (settings) =>
          set((state) => {
            Object.assign(state.settings, settings);
          }),

        // Export
        setIsExporting: (exporting) =>
          set((state) => {
            state.isExporting = exporting;
          }),

        setExportProgress: (progress) =>
          set((state) => {
            state.exportProgress = progress;
          }),

        setShowExportDialog: (show) =>
          set((state) => {
            state.showExportDialog = show;
          }),

        setLeftPanelTab: (tab) =>
          set((state) => {
            state.leftPanelTab = tab;
          }),

        setShowHelpOverlay: (show) =>
          set((state) => {
            state.showHelpOverlay = show;
          }),

        setShowProjectsModal: (show) =>
          set((state) => {
            state.showProjectsModal = show;
          }),

        setCurrentProject: (id, name) =>
          set((state) => {
            state.currentProjectId = id;
            state.currentProjectName = name;
            state.projectSaved = true;
          }),

        markProjectSaved: () =>
          set((state) => {
            state.projectSaved = true;
          }),

        markProjectDirty: () =>
          set((state) => {
            state.projectSaved = false;
          }),

        getClipsForTrack: (trackId) =>
          Object.values(get().clips)
            .filter((c) => c.trackId === trackId)
            .sort((a, b) => a.startTime - b.startTime),

        getClipAtPlayhead: (trackId) => {
          const playhead = get().playheadPosition;
          return Object.values(get().clips).find(
            (c) =>
              c.trackId === trackId &&
              playhead >= c.startTime &&
              playhead < c.startTime + c.duration,
          );
        },

        getSnapPoints: () => {
          const state = get();
          const points: number[] = [0];
          Object.values(state.clips).forEach((clip) => {
            points.push(clip.startTime);
            points.push(clip.startTime + clip.duration);
          });
          Object.values(state.textOverlays).forEach((overlay) => {
            points.push(overlay.startTime);
            points.push(overlay.startTime + overlay.duration);
          });
          // Scene boundaries
          Object.values(state.transcripts).forEach((t) => {
            t.scenes.forEach((s) => {
              points.push(s.start);
              points.push(s.end);
            });
          });
          return [...new Set(points)].sort((a, b) => a - b);
        },

        recalculateDuration: () =>
          set((state) => {
            let maxEnd = 0;
            Object.values(state.clips).forEach((clip) => {
              maxEnd = Math.max(maxEnd, clip.startTime + clip.duration);
            });
            Object.values(state.textOverlays).forEach((overlay) => {
              maxEnd = Math.max(maxEnd, overlay.startTime + overlay.duration);
            });
            state.duration = maxEnd + 5;
          }),
      })),
      {
        partialize: (state) => ({
          tracks: state.tracks,
          clips: state.clips,
          textOverlays: state.textOverlays,
          transcripts: state.transcripts,
          mediaFiles: state.mediaFiles,
          settings: state.settings,
        }),
      },
    ),
  );
}

// Context for dependency injection
export const TimelineStoreContext = createContext<TimelineStore | null>(null);

let defaultStore: TimelineStore | null = null;

function getDefaultStore(): TimelineStore {
  if (!defaultStore) {
    defaultStore = createTimelineStore();
  }
  return defaultStore;
}

export function useTimelineStore(): TimelineState;
export function useTimelineStore<T>(selector: (state: TimelineState) => T): T;
export function useTimelineStore<T>(selector?: (state: TimelineState) => T) {
  const contextStore = useContext(TimelineStoreContext);
  const store = contextStore ?? getDefaultStore();
  if (selector) {
    return store(selector);
  }
  return store();
}

export function useTimelineStoreApi() {
  const contextStore = useContext(TimelineStoreContext);
  return contextStore ?? getDefaultStore();
}
