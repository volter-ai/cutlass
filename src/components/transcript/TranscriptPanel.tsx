import { useState, useCallback } from 'react';
import {
  FileText,
  Loader2,
  Sparkles,
  Wand2,
  Layers,
  MessageSquarePlus,
} from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { transcribeMedia } from '../../services/transcription';
import { useLanguage } from '../../context/LanguageProvider';
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
    addTranscriptCaptionsToTimeline,
    setPlayheadPosition,
    settings,
  } = useTimelineStore();
  const { t } = useLanguage();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [fillerMode, setFillerMode] = useState<FillerRemovalMode>('delete');

  const mediaList = Object.values(mediaFiles).filter((m) => m.type === 'video' || m.type === 'audio');
  const activeTranscript = activeTranscriptMediaId
    ? transcripts[activeTranscriptMediaId]
    : null;

  const handleTranscribe = useCallback(
    async (mediaFileId: string) => {
      setIsTranscribing(true);
      setTranscriptionError(null);
      try {
        const media = mediaFiles[mediaFileId];
        if (!media) return;
        const transcript = await transcribeMedia(
          media,
          settings.deepgramApiKey || undefined,
          settings.openaiApiKey || undefined,
        );
        setTranscript(mediaFileId, transcript);
        setActiveTranscriptMediaId(mediaFileId);
      } catch (err) {
        console.error('Transcription failed:', err);
        setTranscriptionError(err instanceof Error ? err.message : 'Transcription failed');
      } finally {
        setIsTranscribing(false);
      }
    },
    [mediaFiles, setTranscript, setActiveTranscriptMediaId, settings.deepgramApiKey],
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

  const handleAddCaptionsToTimeline = useCallback(() => {
    if (!activeTranscriptMediaId) return;
    addTranscriptCaptionsToTimeline(activeTranscriptMediaId);
  }, [activeTranscriptMediaId, addTranscriptCaptionsToTimeline]);

  const fillerCount = activeTranscript
    ? activeTranscript.segments.reduce(
        (count, seg) =>
          count + seg.words.filter((w) => w.isFiller && !w.isRemoved).length,
        0,
      )
    : 0;

  const fillerModeOptions: { value: FillerRemovalMode; label: string }[] = [
    { value: 'delete', label: t.transcript.delete },
    { value: 'gap', label: t.transcript.replaceWithGap },
    { value: 'ignore', label: t.transcript.ignore },
    { value: 'transcript-only', label: t.transcript.transcriptOnly },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t.transcript.title}
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
            <option value="">{t.transcript.selectMedia}</option>
            {mediaList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {transcripts[m.id] ? t.transcript.transcribed : ''}
              </option>
            ))}
          </select>

          {activeTranscriptMediaId && !transcripts[activeTranscriptMediaId] && (
            <>
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
                    {t.transcript.transcribing}
                  </>
                ) : (
                  <>
                    <FileText size={12} />
                    {t.transcript.transcribe}
                  </>
                )}
              </button>
              {!settings.deepgramApiKey && !settings.openaiApiKey && (
                <p className="mt-1 text-xs px-1" style={{ color: 'var(--filler-highlight)' }}>
                  No API key — will generate a demo placeholder. Add a Deepgram or OpenAI key in Settings for real transcription.
                </p>
              )}
              {!settings.deepgramApiKey && !!settings.openaiApiKey && (
                <p className="mt-1 text-xs px-1" style={{ color: 'var(--text-secondary)' }}>
                  Using OpenAI Whisper. Add a Deepgram key in Settings for speaker diarization.
                </p>
              )}
              {transcriptionError && (
                <p className="mt-1 text-xs px-1" style={{ color: '#ef4444' }}>
                  {transcriptionError}
                </p>
              )}
            </>
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
              {fillerModeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleRemoveFillers}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
              style={{
                background: fillerCount > 0 ? 'var(--filler-highlight)' : 'var(--bg-surface)',
                color: fillerCount > 0 ? '#000' : 'var(--text-secondary)',
              }}
              title={t.transcript.fillersTooltip}
            >
              <Wand2 size={11} />
              {t.transcript.fillers} ({fillerCount})
            </button>
          </div>

          {/* Scene detection */}
          <button
            onClick={handleDetectScenes}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
            style={{ background: 'var(--scene-border)', color: 'white' }}
            title={t.transcript.detectScenesTooltip}
          >
            <Layers size={11} />
            {t.transcript.detectScenes}
          </button>

          {/* Add captions to timeline */}
          <button
            onClick={handleAddCaptionsToTimeline}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
            style={{ background: 'var(--accent)', color: 'white' }}
            title="Add transcript as caption text overlays on the timeline"
          >
            <MessageSquarePlus size={11} />
            {t.transcript.addCaptionsToTimeline ?? 'Add Captions'}
          </button>
        </div>
      )}

      {/* Demo mode banner */}
      {activeTranscript && !settings.deepgramApiKey && !settings.openaiApiKey && (
        <div className="px-3 py-1.5 border-b text-xs flex items-center gap-1.5" style={{ borderColor: 'var(--border)', background: 'rgba(245,158,11,0.1)', color: 'var(--filler-highlight)' }}>
          <span className="font-bold">DEMO</span>
          <span>— placeholder text, not from your video. Add a Deepgram or OpenAI key in Settings.</span>
        </div>
      )}

      {/* Transcript Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!activeTranscript ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
            <Sparkles size={32} className="mb-2 opacity-50" />
            <p className="text-sm text-center">
              {mediaList.length === 0
                ? t.transcript.importToStart
                : t.transcript.selectAndTranscribe}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Scene markers */}
            {activeTranscript.scenes.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--scene-border)' }}>
                  {t.transcript.scenes} ({activeTranscript.scenes.length})
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
                    {t.transcript.speaker} {segment.speaker + 1}:
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
