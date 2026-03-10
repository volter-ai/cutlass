// Cutlass - AI-Assisted Video Editor
// Library entry point for embedding in parent applications

// Provider (wraps panels with store context)
export { CutlassProvider } from './CutlassProvider';
export { AuthProvider, useAuth } from './context/AuthProvider';

// Individual panels (can be mounted into dockview or any layout system)
export { Toolbar } from './components/toolbar/Toolbar';
export { MediaBin } from './components/media-bin/MediaBin';
export { TranscriptPanel } from './components/transcript/TranscriptPanel';
export { Viewer } from './components/viewer/Viewer';
export { Timeline } from './components/timeline/Timeline';
export { ExportDialog } from './components/export/ExportDialog';
export { SettingsPanel } from './components/settings/SettingsPanel';
export { ClipContextMenu } from './components/timeline/ClipContextMenu';
export { HelpOverlay } from './components/help/HelpOverlay';
export { ProjectsModal } from './components/projects/ProjectsModal';
export { AuthModal } from './components/auth/AuthModal';
export { UserMenu } from './components/auth/UserMenu';

// Hooks (for custom integrations)
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export { usePlayback } from './hooks/usePlayback';
export { useAudioPlayback } from './hooks/useAudioPlayback';

// Store (for external state management)
export {
  createTimelineStore,
  useTimelineStore,
  useTimelineStoreApi,
  TimelineStoreContext,
} from './store/timeline';
export type {
  TimelineState,
  TimelineStore,
  TimelineStoreOptions,
} from './store/timeline';

// Services
export { transcribeMedia } from './services/transcription';
export { exportTimeline, downloadBlob } from './services/export';
export { supabase, isSupabaseConfigured } from './services/supabase';
export {
  listProjects,
  createProject,
  saveProject,
  loadProject,
  deleteProject,
  renameProject,
  serializeProject,
  deserializeProject,
} from './services/projects';
export {
  storeMediaFile,
  getMediaFile,
  removeMediaFile as removeStoredMedia,
  listStoredMediaIds,
} from './services/mediaStorage';

// Types
export type {
  MediaFile,
  TimelineClip,
  Track,
  TranscriptWord,
  TranscriptSegment,
  Scene,
  Transcript,
  Tool,
  FillerRemovalMode,
  Transition,
  TextOverlay,
  TextStyle,
  CaptionStyle,
  AspectRatio,
  ProjectSettings,
  ExportSettings,
  Project,
} from './types';
export { ASPECT_RATIO_DIMENSIONS } from './types';

// Utils
export { createMediaFile } from './utils/media';
export { formatTimecode, formatDuration, clamp } from './utils/time';

// Full editor (convenience export)
export { default as CutlassEditor } from './App';
