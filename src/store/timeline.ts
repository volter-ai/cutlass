import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuid } from 'uuid';
import type {
  MediaFile,
  TimelineClip,
  Track,
  Transcript,
  Scene,
  Tool,
  FillerRemovalMode,
} from '../types';

interface TimelineState {
  // Media
  mediaFiles: Record<string, MediaFile>;

  // Timeline
  tracks: Track[];
  clips: Record<string, TimelineClip>;
  playheadPosition: number;
  isPlaying: boolean;
  duration: number;
  zoom: number; // pixels per second

  // Selection
  selectedClipIds: string[];
  activeTool: Tool;

  // Transcript
  transcripts: Record<string, Transcript>;
  activeTranscriptMediaId: string | null;

  // UI
  leftPanelTab: 'media' | 'transcript';

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
  trimClipStart: (clipId: string, newStartTime: number) => void;
  trimClipEnd: (clipId: string, newEndTime: number) => void;
  splitClipAtPlayhead: (clipId: string) => void;
  rippleDelete: (clipId: string) => void;

  // Actions - Tracks
  addTrack: (type: 'video' | 'audio') => string;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;

  // Actions - Playback
  setPlayheadPosition: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;

  // Actions - Selection
  selectClip: (clipId: string, multi?: boolean) => void;
  clearSelection: () => void;
  setActiveTool: (tool: Tool) => void;

  // Actions - Transcript
  setTranscript: (mediaFileId: string, transcript: Transcript) => void;
  setActiveTranscriptMediaId: (id: string | null) => void;
  removeFillerWords: (mediaFileId: string, mode: FillerRemovalMode) => void;
  detectScenes: (mediaFileId: string) => void;

  // Actions - UI
  setLeftPanelTab: (tab: 'media' | 'transcript') => void;

  // Computed
  getClipsForTrack: (trackId: string) => TimelineClip[];
  getClipAtPlayhead: (trackId: string) => TimelineClip | undefined;
  recalculateDuration: () => void;
}

const DEFAULT_TRACKS: Track[] = [
  { id: 'v2', type: 'video', name: 'V2', muted: false, locked: false, height: 60 },
  { id: 'v1', type: 'video', name: 'V1', muted: false, locked: false, height: 60 },
  { id: 'a1', type: 'audio', name: 'A1', muted: false, locked: false, height: 50 },
  { id: 'a2', type: 'audio', name: 'A2', muted: false, locked: false, height: 50 },
];

export const useTimelineStore = create<TimelineState>()(
  temporal(
    immer((set, get) => ({
      mediaFiles: {},
      tracks: DEFAULT_TRACKS,
      clips: {},
      playheadPosition: 0,
      isPlaying: false,
      duration: 0,
      zoom: 100,
      selectedClipIds: [],
      activeTool: 'select' as Tool,
      transcripts: {},
      activeTranscriptMediaId: null,
      leftPanelTab: 'media' as const,

      addMediaFile: (file) =>
        set((state) => {
          state.mediaFiles[file.id] = file;
        }),

      removeMediaFile: (id) =>
        set((state) => {
          delete state.mediaFiles[id];
        }),

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
          };
        });
        get().recalculateDuration();
        return clipId;
      },

      removeClip: (clipId) =>
        set((state) => {
          delete state.clips[clipId];
          state.selectedClipIds = state.selectedClipIds.filter((id) => id !== clipId);
        }),

      moveClip: (clipId, newStartTime, newTrackId) =>
        set((state) => {
          const clip = state.clips[clipId];
          if (!clip) return;
          clip.startTime = Math.max(0, newStartTime);
          if (newTrackId) clip.trackId = newTrackId;
        }),

      trimClipStart: (clipId, newStartTime) =>
        set((state) => {
          const clip = state.clips[clipId];
          if (!clip) return;
          const delta = newStartTime - clip.startTime;
          clip.mediaOffset += delta;
          clip.duration -= delta;
          clip.startTime = newStartTime;
        }),

      trimClipEnd: (clipId, newEndTime) =>
        set((state) => {
          const clip = state.clips[clipId];
          if (!clip) return;
          clip.duration = newEndTime - clip.startTime;
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
            mediaOffset: clip.mediaOffset + splitPoint,
            name: clip.name,
            type: clip.type,
          };

          clip.duration = splitPoint;
        }),

      rippleDelete: (clipId) =>
        set((state) => {
          const clip = state.clips[clipId];
          if (!clip) return;
          const trackId = clip.trackId;
          const clipEnd = clip.startTime + clip.duration;
          const gap = clip.duration;

          delete state.clips[clipId];
          state.selectedClipIds = state.selectedClipIds.filter((id) => id !== clipId);

          // Shift subsequent clips on the same track
          Object.values(state.clips).forEach((c) => {
            if (c.trackId === trackId && c.startTime >= clipEnd) {
              c.startTime -= gap;
            }
          });
        }),

      addTrack: (type) => {
        const trackId = uuid();
        set((state) => {
          const trackNum =
            state.tracks.filter((t) => t.type === type).length + 1;
          const track: Track = {
            id: trackId,
            type,
            name: `${type === 'video' ? 'V' : 'A'}${trackNum}`,
            muted: false,
            locked: false,
            height: type === 'video' ? 60 : 50,
          };
          if (type === 'video') {
            state.tracks.unshift(track);
          } else {
            state.tracks.push(track);
          }
        });
        return trackId;
      },

      removeTrack: (trackId) =>
        set((state) => {
          state.tracks = state.tracks.filter((t) => t.id !== trackId);
          Object.keys(state.clips).forEach((clipId) => {
            if (state.clips[clipId].trackId === trackId) {
              delete state.clips[clipId];
            }
          });
        }),

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

      selectClip: (clipId, multi = false) =>
        set((state) => {
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

      removeFillerWords: (mediaFileId, mode) =>
        set((state) => {
          const transcript = state.transcripts[mediaFileId];
          if (!transcript) return;

          transcript.segments.forEach((segment) => {
            segment.words.forEach((word) => {
              if (!word.isFiller) return;

              switch (mode) {
                case 'delete':
                  word.isRemoved = true;
                  break;
                case 'gap':
                  // Mark as removed but keep timing (creates silence)
                  word.isRemoved = true;
                  break;
                case 'ignore':
                  // Keep in audio but mark visually
                  word.isRemoved = false;
                  break;
                case 'transcript-only':
                  // Remove from transcript display only
                  word.isRemoved = true;
                  break;
              }
            });
          });

          // For 'delete' mode, create edit points on the timeline
          if (mode === 'delete') {
            const fillerRegions: { start: number; end: number }[] = [];
            transcript.segments.forEach((segment) => {
              segment.words.forEach((word) => {
                if (word.isFiller && word.isRemoved) {
                  fillerRegions.push({ start: word.start, end: word.end });
                }
              });
            });

            // Find clips that use this media file and split around fillers
            const clipsForMedia = Object.values(state.clips).filter(
              (c) => c.mediaFileId === mediaFileId,
            );

            fillerRegions.reverse().forEach((region) => {
              clipsForMedia.forEach((clip) => {
                const clipEnd = clip.startTime + clip.duration;
                const regionStartInClip = region.start - clip.mediaOffset + clip.startTime;
                const regionEndInClip = region.end - clip.mediaOffset + clip.startTime;

                if (regionStartInClip > clip.startTime && regionEndInClip < clipEnd) {
                  // Split and remove the filler region
                  const newClipId = uuid();
                  const fillerDuration = region.end - region.start;

                  state.clips[newClipId] = {
                    id: newClipId,
                    mediaFileId: clip.mediaFileId,
                    trackId: clip.trackId,
                    startTime: regionStartInClip,
                    duration: clipEnd - regionEndInClip,
                    mediaOffset: clip.mediaOffset + (regionEndInClip - clip.startTime),
                    name: clip.name,
                    type: clip.type,
                  };

                  clip.duration = regionStartInClip - clip.startTime;

                  // Shift the new clip to close the gap
                  state.clips[newClipId].startTime -= fillerDuration;
                }
              });
            });
          }
        }),

      detectScenes: (mediaFileId) =>
        set((state) => {
          const transcript = state.transcripts[mediaFileId];
          if (!transcript) return;

          // Detect scenes based on long pauses between segments and speaker changes
          const scenes: Scene[] = [];
          let currentScene: Scene | null = null;

          transcript.segments.forEach((segment, i) => {
            const prevSegment = i > 0 ? transcript.segments[i - 1] : null;
            const gapFromPrev = prevSegment ? segment.start - prevSegment.end : 0;
            const speakerChanged = prevSegment && prevSegment.speaker !== segment.speaker;

            // Start new scene on: first segment, long pause (>2s), or speaker change
            if (!currentScene || gapFromPrev > 2 || speakerChanged) {
              if (currentScene) {
                scenes.push(currentScene);
              }
              currentScene = {
                id: uuid(),
                name: `Scene ${scenes.length + 1}`,
                start: segment.start,
                end: segment.end,
                clipIds: [],
              };
            }

            if (currentScene) {
              currentScene.end = segment.end;
            }
          });

          if (currentScene) {
            scenes.push(currentScene);
          }

          transcript.scenes = scenes;
        }),

      setLeftPanelTab: (tab) =>
        set((state) => {
          state.leftPanelTab = tab;
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

      recalculateDuration: () =>
        set((state) => {
          const maxEnd = Object.values(state.clips).reduce(
            (max, clip) => Math.max(max, clip.startTime + clip.duration),
            0,
          );
          state.duration = maxEnd + 5; // 5s padding
        }),
    })),
    {
      partialize: (state) => ({
        tracks: state.tracks,
        clips: state.clips,
        transcripts: state.transcripts,
        mediaFiles: state.mediaFiles,
      }),
    },
  ),
);
