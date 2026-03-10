import { useState, useCallback } from 'react';
import {
  FileText,
  Loader2,
  Sparkles,
  Wand2,
  Layers,
} from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { transcribeMedia } from '../../services/transcription';
import type { FillerRemovalMode } from '../../types';

export function TranscriptPanel() {
  const {
    mediaFiles,
    transcripts,
    activeTranscriptMediaId,
    setActiveTranscriptMediaId,
    setTranscript,
    removeFillerWords,
    detectScenes,
    setPlayheadPosition,
  } = useTimelineStore();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [fillerMode, setFillerMode] = useState<FillerRemovalMode>('delete');

  const mediaList = Object.values(mediaFiles).filter((m) => m.type === 'video' || m.type === 'audio');
  const activeTranscript = activeTranscriptMediaId
    ? transcripts[activeTranscriptMediaId]
    : null;

  const handleTranscribe = useCallback(
    async (mediaFileId: string) => {
      setIsTranscribing(true);
      try {
        const media = mediaFiles[mediaFileId];
        if (!media) return;
        const transcript = await transcribeMedia(media);
        setTranscript(mediaFileId, transcript);
        setActiveTranscriptMediaId(mediaFileId);
      } catch (err) {
        console.error('Transcription failed:', err);
      } finally {
        setIsTranscribing(false);
      }
    },
    [mediaFiles, setTranscript, setActiveTranscriptMediaId],
  );

  const handleWordClick = useCallback(
    (time: number) => {
      setPlayheadPosition(time);
    },
    [setPlayheadPosition],
  );

  const handleRemoveFillers = useCallback(() => {
    if (!activeTranscriptMediaId) return;
    removeFillerWords(activeTranscriptMediaId, fillerMode);
  }, [activeTranscriptMediaId, fillerMode, removeFillerWords]);

  const handleDetectScenes = useCallback(() => {
    if (!activeTranscriptMediaId) return;
    detectScenes(activeTranscriptMediaId);
  }, [activeTranscriptMediaId, detectScenes]);

  const fillerCount = activeTranscript
    ? activeTranscript.segments.reduce(
        (count, seg) =>
          count + seg.words.filter((w) => w.isFiller && !w.isRemoved).length,
        0,
      )
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Transcript
        </span>
      </div>

      {/* Media selector for transcription */}
      {mediaList.length > 0 && (
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <select
            className="w-full text-xs px-2 py-1.5 rounded border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            value={activeTranscriptMediaId ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              setActiveTranscriptMediaId(id || null);
            }}
          >
            <option value="">Select media to transcribe...</option>
            {mediaList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {transcripts[m.id] ? '(transcribed)' : ''}
              </option>
            ))}
          </select>

          {activeTranscriptMediaId && !transcripts[activeTranscriptMediaId] && (
            <button
              onClick={() => handleTranscribe(activeTranscriptMediaId)}
              disabled={isTranscribing}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'white',
                opacity: isTranscribing ? 0.6 : 1,
              }}
            >
              {isTranscribing ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <FileText size={12} />
                  Transcribe
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* AI Actions */}
      {activeTranscript && (
        <div className="px-3 py-2 border-b flex gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
          {/* Filler removal */}
          <div className="flex items-center gap-1">
            <select
              className="text-xs px-1.5 py-1 rounded border"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              value={fillerMode}
              onChange={(e) => setFillerMode(e.target.value as FillerRemovalMode)}
            >
              <option value="delete">Delete</option>
              <option value="gap">Replace with gap</option>
              <option value="ignore">Ignore</option>
              <option value="transcript-only">Transcript only</option>
            </select>
            <button
              onClick={handleRemoveFillers}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
              style={{
                background: fillerCount > 0 ? 'var(--filler-highlight)' : 'var(--bg-surface)',
                color: fillerCount > 0 ? '#000' : 'var(--text-secondary)',
              }}
              title="Remove filler words (um, uh, etc.)"
            >
              <Wand2 size={11} />
              Fillers ({fillerCount})
            </button>
          </div>

          {/* Scene detection */}
          <button
            onClick={handleDetectScenes}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
            style={{ background: 'var(--scene-border)', color: 'white' }}
            title="Detect scenes from transcript"
          >
            <Layers size={11} />
            Detect Scenes
          </button>
        </div>
      )}

      {/* Transcript Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!activeTranscript ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
            <Sparkles size={32} className="mb-2 opacity-50" />
            <p className="text-sm text-center">
              {mediaList.length === 0
                ? 'Import media to get started'
                : 'Select media and transcribe'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Scene markers */}
            {activeTranscript.scenes.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--scene-border)' }}>
                  Scenes ({activeTranscript.scenes.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {activeTranscript.scenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => handleWordClick(scene.start)}
                      className="px-2 py-0.5 rounded text-xs border transition-colors hover:opacity-80"
                      style={{ borderColor: 'var(--scene-border)', color: 'var(--scene-border)' }}
                    >
                      {scene.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript segments */}
            {activeTranscript.segments.map((segment) => (
              <div key={segment.id} className="group">
                {/* Speaker label */}
                {segment.speaker !== undefined && (
                  <span className="text-xs font-semibold mr-1" style={{ color: 'var(--accent)' }}>
                    Speaker {segment.speaker + 1}:
                  </span>
                )}

                {/* Words */}
                <span className="text-sm leading-relaxed">
                  {segment.words.map((word, wi) => (
                    <span
                      key={wi}
                      onClick={() => handleWordClick(word.start)}
                      className="cursor-pointer rounded-sm px-px transition-colors"
                      style={{
                        color: word.isRemoved
                          ? 'var(--text-secondary)'
                          : word.isFiller
                            ? 'var(--filler-highlight)'
                            : 'var(--text-primary)',
                        textDecoration: word.isRemoved ? 'line-through' : 'none',
                        opacity: word.isRemoved ? 0.4 : 1,
                        background:
                          word.isFiller && !word.isRemoved
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'transparent',
                      }}
                      title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s${word.isFiller ? ' (filler)' : ''}`}
                    >
                      {word.word}{' '}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
