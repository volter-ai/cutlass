import { supabase, isSupabaseConfigured } from './supabase';
import type { TimelineState } from '../store/timeline';
import type { Project } from '../types';

/**
 * Extracts serializable timeline state for persistence.
 * Excludes: mediaFiles (blob URLs + File objects), playback state, UI state, export state.
 * For each clip, we store the media file name so the user can re-link on load.
 */
export function serializeProject(state: TimelineState): Record<string, unknown> {
  const mediaNameMap: Record<string, string> = {};
  for (const [id, mf] of Object.entries(state.mediaFiles)) {
    mediaNameMap[id] = mf.name;
  }

  return {
    tracks: state.tracks,
    clips: state.clips,
    textOverlays: state.textOverlays,
    transcripts: state.transcripts,
    settings: {
      aspectRatio: state.settings.aspectRatio,
      resolution: state.settings.resolution,
      frameRate: state.settings.frameRate,
      captionStyle: state.settings.captionStyle,
      // Exclude deepgramApiKey — it stays in localStorage
    },
    mediaNameMap,
  };
}

/**
 * Reconstructs timeline state from stored JSON.
 * Returns partial state that can be used to hydrate the store.
 */
export function deserializeProject(
  data: Record<string, unknown>,
  existingMediaFiles: Record<string, { id: string; name: string }>,
): {
  tracks: TimelineState['tracks'];
  clips: TimelineState['clips'];
  textOverlays: TimelineState['textOverlays'];
  transcripts: TimelineState['transcripts'];
  settings: Partial<TimelineState['settings']>;
  mediaNameMap: Record<string, string>;
  missingMediaIds: string[];
} {
  const mediaNameMap = (data.mediaNameMap ?? {}) as Record<string, string>;

  // Figure out which media IDs are present vs missing
  const existingIds = new Set(Object.keys(existingMediaFiles));
  const missingMediaIds = Object.keys(mediaNameMap).filter((id) => !existingIds.has(id));

  return {
    tracks: (data.tracks ?? []) as TimelineState['tracks'],
    clips: (data.clips ?? {}) as TimelineState['clips'],
    textOverlays: (data.textOverlays ?? {}) as TimelineState['textOverlays'],
    transcripts: (data.transcripts ?? {}) as TimelineState['transcripts'],
    settings: (data.settings ?? {}) as Partial<TimelineState['settings']>,
    mediaNameMap,
    missingMediaIds,
  };
}

function mapRow(row: { id: string; name: string; updated_at: string; created_at: string; thumbnail?: string }): Project {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    thumbnail: row.thumbnail,
  };
}

export async function listProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, updated_at, created_at, thumbnail')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function createProject(name: string): Promise<Project> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, user_id: user.id, timeline_state: {} })
    .select('id, name, updated_at, created_at, thumbnail')
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function saveProject(
  projectId: string,
  name: string,
  state: TimelineState,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const timeline_state = serializeProject(state);
  const { error } = await supabase
    .from('projects')
    .update({ name, timeline_state, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function loadProject(
  projectId: string,
): Promise<{ project: Project; timelineData: Record<string, unknown> }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (error) throw new Error(error.message);
  return {
    project: mapRow(data),
    timelineData: (data.timeline_state ?? {}) as Record<string, unknown>,
  };
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function renameProject(projectId: string, name: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', projectId);
  if (error) throw new Error(error.message);
}
