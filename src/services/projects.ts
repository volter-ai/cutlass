import { supabase, isSupabaseConfigured } from './supabase';
import type { TimelineState } from '../store/timeline';
import type { Project } from '../types';

const LOCAL_AUTOSAVE_KEY = 'cutlass-autosave';
const LOCAL_USER_EMAIL_KEY = 'cutlass-user-email';

/** Persist the current user's email so local projects survive page refresh. */
export function persistUserEmail(email: string): void {
  try { localStorage.setItem(LOCAL_USER_EMAIL_KEY, email); } catch { /* ignore */ }
}

/** Clear persisted email on sign-out. */
export function clearPersistedEmail(): void {
  try { localStorage.removeItem(LOCAL_USER_EMAIL_KEY); } catch { /* ignore */ }
}

/** Return the localStorage key for projects — namespaced by email if available. */
function localProjectsKey(): string {
  try {
    const email = localStorage.getItem(LOCAL_USER_EMAIL_KEY);
    if (email) return `cutlass-projects-${email}`;
  } catch { /* ignore */ }
  return 'cutlass-projects';
}

// ─── Serialization ───────────────────────────────────────────────────

/**
 * Extracts serializable timeline state for persistence.
 * Excludes: mediaFiles (blob URLs + File objects), playback state, UI state, export state.
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
    },
    mediaNameMap,
  };
}

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

// ─── Local Storage Backend ───────────────────────────────────────────

interface LocalProject {
  id: string;
  name: string;
  timeline_state: Record<string, unknown>;
  updated_at: string;
  created_at: string;
}

function getLocalProjects(): LocalProject[] {
  try {
    const raw = localStorage.getItem(localProjectsKey());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setLocalProjects(projects: LocalProject[]) {
  localStorage.setItem(localProjectsKey(), JSON.stringify(projects));
}

function localToProject(lp: LocalProject): Project {
  return { id: lp.id, name: lp.name, updatedAt: lp.updated_at, createdAt: lp.created_at };
}

// ─── Auto-save (always works, no auth needed) ────────────────────────

export function autoSaveLocal(state: TimelineState): void {
  try {
    const data = serializeProject(state);
    localStorage.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify({
      projectName: state.currentProjectName,
      projectId: state.currentProjectId,
      timestamp: new Date().toISOString(),
      data,
    }));
  } catch { /* quota exceeded — ignore */ }
}

export function loadAutoSave(): { projectName: string; projectId: string | null; data: Record<string, unknown> } | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearAutoSave(): void {
  localStorage.removeItem(LOCAL_AUTOSAVE_KEY);
}

// ─── Supabase helpers ────────────────────────────────────────────────

function mapRow(row: { id: string; name: string; updated_at: string; created_at: string; thumbnail?: string }): Project {
  return { id: row.id, name: row.name, updatedAt: row.updated_at, createdAt: row.created_at, thumbnail: row.thumbnail };
}

// ─── Unified CRUD (Supabase when available, localStorage fallback) ──

export async function listProjects(): Promise<Project[]> {
  if (isSupabaseConfigured()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, updated_at, created_at, thumbnail')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  }
  // Local fallback
  return getLocalProjects()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(localToProject);
}

export async function createProject(name: string): Promise<Project> {
  if (isSupabaseConfigured()) {
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
  // Local fallback
  const now = new Date().toISOString();
  const lp: LocalProject = {
    id: crypto.randomUUID(),
    name,
    timeline_state: {},
    updated_at: now,
    created_at: now,
  };
  const projects = getLocalProjects();
  projects.push(lp);
  setLocalProjects(projects);
  return localToProject(lp);
}

export async function saveProject(projectId: string, name: string, state: TimelineState): Promise<void> {
  const timeline_state = serializeProject(state);

  // Always auto-save locally too
  autoSaveLocal(state);

  if (isSupabaseConfigured()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('projects')
      .update({ name, timeline_state, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return;
  }
  // Local fallback
  const projects = getLocalProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx >= 0) {
    projects[idx] = { ...projects[idx], name, timeline_state, updated_at: new Date().toISOString() };
    setLocalProjects(projects);
  }
}

export async function loadProject(projectId: string): Promise<{ project: Project; timelineData: Record<string, unknown> }> {
  if (isSupabaseConfigured()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();
    if (error) throw new Error(error.message);
    return { project: mapRow(data), timelineData: (data.timeline_state ?? {}) as Record<string, unknown> };
  }
  // Local fallback
  const projects = getLocalProjects();
  const lp = projects.find((p) => p.id === projectId);
  if (!lp) throw new Error('Project not found');
  return { project: localToProject(lp), timelineData: lp.timeline_state };
}

export async function deleteProject(projectId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return;
  }
  // Local fallback
  const projects = getLocalProjects().filter((p) => p.id !== projectId);
  setLocalProjects(projects);
}

export async function renameProject(projectId: string, name: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('projects')
      .update({ name })
      .eq('id', projectId)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return;
  }
  // Local fallback
  const projects = getLocalProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx >= 0) {
    projects[idx].name = name;
    setLocalProjects(projects);
  }
}
