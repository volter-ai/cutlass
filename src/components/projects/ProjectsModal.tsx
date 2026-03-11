import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Edit3, FolderOpen } from 'lucide-react';
import { useTimelineStore, useTimelineStoreApi } from '../../store/timeline';
import { useAuth } from '../../context/AuthProvider';
import { isSupabaseConfigured } from '../../services/supabase';
import {
  listProjects,
  createProject,
  deleteProject,
  renameProject,
  loadProject,
  saveProject,
  deserializeProject,
} from '../../services/projects';
import { getMediaFile } from '../../services/mediaStorage';
import { createMediaFile } from '../../utils/media';
import { useLanguage } from '../../context/LanguageProvider';
import type { Project } from '../../types';

export function ProjectsModal() {
  const show = useTimelineStore((s) => s.showProjectsModal);
  const setShow = useTimelineStore((s) => s.setShowProjectsModal);
  const setCurrentProject = useTimelineStore((s) => s.setCurrentProject);
  const store = useTimelineStore();
  const { user } = useAuth();
  const storeApi = useTimelineStoreApi();
  const panelRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Can create/list projects either with Supabase+auth OR with localStorage
  const canManageProjects = (isSupabaseConfigured() && !!user) || !isSupabaseConfigured();

  const fetchProjects = useCallback(async () => {
    if (!canManageProjects) return;
    setLoading(true);
    try {
      const list = await listProjects();
      setProjects(list);
    } catch {
      // Silently fail
    }
    setLoading(false);
  }, [canManageProjects]);

  useEffect(() => {
    if (show) fetchProjects();
  }, [show, fetchProjects]);

  useEffect(() => {
    if (!show) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShow(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShow(false);
    }
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [show, setShow]);

  if (!show) return null;

  const handleNew = async () => {
    if (store.currentProjectId) {
      try {
        await saveProject(store.currentProjectId, store.currentProjectName, store);
      } catch {
        // ignore save error on new
      }
    }
    try {
      const project = await createProject('Untitled Project');
      setCurrentProject(project.id, project.name);
      setShow(false);
    } catch {
      // Error creating project
    }
  };

  const handleOpen = async (project: Project) => {
    try {
      const { timelineData } = await loadProject(project.id);
      const deserialized = deserializeProject(timelineData, store.mediaFiles);
      const currentState = storeApi.getState();

      storeApi.setState({
        tracks: deserialized.tracks.length > 0 ? deserialized.tracks : currentState.tracks,
        clips: deserialized.clips,
        textOverlays: deserialized.textOverlays,
        transcripts: deserialized.transcripts,
        settings: { ...currentState.settings, ...deserialized.settings },
        currentProjectId: project.id,
        currentProjectName: project.name,
        projectSaved: true,
        playheadPosition: 0,
        isPlaying: false,
      });

      // Try to recover media from IndexedDB
      const mediaNameMap = deserialized.mediaNameMap;
      for (const [mediaId] of Object.entries(mediaNameMap)) {
        if (storeApi.getState().mediaFiles[mediaId]) continue;
        getMediaFile(mediaId).then(async (file) => {
          if (!file) return;
          const mf = await createMediaFile(file);
          mf.id = mediaId;
          storeApi.getState().addMediaFile(mf);
        }).catch(() => {});
      }

      setShow(false);
    } catch {
      // Error loading project
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (store.currentProjectId === id) {
        setCurrentProject(null, 'Untitled Project');
      }
    } catch {
      // Error deleting
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await renameProject(id, renameValue.trim());
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, name: renameValue.trim() } : p));
      if (store.currentProjectId === id) {
        setCurrentProject(id, renameValue.trim());
      }
      setRenamingId(null);
    } catch {
      // Error renaming
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        ref={panelRef}
        className="rounded-lg shadow-2xl overflow-hidden max-h-[70vh] flex flex-col"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', width: 480 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-sm font-bold">{t.projects.title}</h2>
            {!isSupabaseConfigured() && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t.projects.savedLocally}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canManageProjects && (
              <button
                onClick={handleNew}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Plus size={12} />
                {t.projects.new}
              </button>
            )}
            <button onClick={() => setShow(false)} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!canManageProjects ? (
            <div className="p-8 text-center">
              <FolderOpen size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t.projects.signInToSave}
              </p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.projects.loadingProjects}</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center">
              <FolderOpen size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t.projects.noProjects}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                {t.projects.autoSaveHint}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:opacity-90 cursor-pointer transition-colors"
                  style={{
                    background: store.currentProjectId === project.id ? 'var(--bg-primary)' : 'transparent',
                  }}
                  onClick={() => handleOpen(project)}
                >
                  <div className="flex-1 min-w-0">
                    {renamingId === project.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(project.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-1 py-0.5 rounded text-xs outline-none"
                        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
                      />
                    ) : (
                      <p className="text-xs font-semibold truncate">{project.name}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenamingId(project.id); setRenameValue(project.name); }}
                      className="p-1 rounded hover:opacity-80"
                      style={{ color: 'var(--text-secondary)' }}
                      title={t.projects.rename}
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                      className="p-1 rounded hover:opacity-80"
                      style={{ color: 'var(--playhead)' }}
                      title={t.projects.delete}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
