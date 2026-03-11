import { useState, useCallback } from 'react';
import { X, Download, Loader2, AlertTriangle } from 'lucide-react';
import { useTimelineStore, useTimelineStoreApi } from '../../store/timeline';
import { exportTimeline, downloadBlob } from '../../services/export';
import type { ExportSettings } from '../../types';

const QUALITY_OPTIONS: { value: ExportSettings['quality']; label: string }[] = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '4k', label: '4K' },
];

export function ExportDialog() {
  const { showExportDialog, setShowExportDialog, isExporting, exportProgress, settings } =
    useTimelineStore();
  const storeApi = useTimelineStoreApi();

  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: '1080p',
    includeAudio: true,
    burnCaptions: false,
  });
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    const state = storeApi.getState();
    state.setIsExporting(true);
    state.setExportProgress(0);
    setExportError(null);

    try {
      const blob = await exportTimeline(state, exportSettings, (progress) => {
        storeApi.getState().setExportProgress(progress);
      });

      const ext = exportSettings.format;
      downloadBlob(blob, `cutlass-export.${ext}`);
    } catch (err) {
      console.error('Export failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      setExportError(message || 'Export failed. Check the browser console for details.');
    } finally {
      storeApi.getState().setIsExporting(false);
    }
  }, [storeApi, exportSettings]);

  if (!showExportDialog) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="rounded-lg shadow-xl w-96"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Export Video</span>
          <button
            onClick={() => setShowExportDialog(false)}
            className="p-1 rounded hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Settings */}
        <div className="p-4 space-y-4">
          {/* Format */}
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Format</label>
            <div className="flex gap-2">
              {(['mp4', 'webm'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportSettings((s) => ({ ...s, format: fmt }))}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-semibold uppercase"
                  style={{
                    background: exportSettings.format === fmt ? 'var(--accent)' : 'var(--bg-surface)',
                    color: exportSettings.format === fmt ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Quality</label>
            <div className="flex gap-2">
              {QUALITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setExportSettings((s) => ({ ...s, quality: value }))}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-semibold"
                  style={{
                    background: exportSettings.quality === value ? 'var(--accent)' : 'var(--bg-surface)',
                    color: exportSettings.quality === value ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution info */}
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Resolution: {settings.resolution.width}x{settings.resolution.height} ({settings.aspectRatio})
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={exportSettings.includeAudio}
                onChange={(e) => setExportSettings((s) => ({ ...s, includeAudio: e.target.checked }))}
                className="rounded"
              />
              Include audio
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={exportSettings.burnCaptions}
                onChange={(e) => setExportSettings((s) => ({ ...s, burnCaptions: e.target.checked }))}
                className="rounded"
              />
              Burn captions into video
            </label>
          </div>

          {/* Error display */}
          {exportError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" color="#ef4444" />
              <p className="text-xs" style={{ color: '#ef4444' }}>{exportError}</p>
            </div>
          )}

          {/* Progress */}
          {isExporting && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                <span>Exporting...</span>
                <span>{Math.round(exportProgress)}%</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-surface)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${exportProgress}%`, background: 'var(--accent)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setShowExportDialog(false)}
            className="px-4 py-1.5 rounded text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold"
            style={{
              background: 'var(--accent)',
              color: 'white',
              opacity: isExporting ? 0.6 : 1,
            }}
          >
            {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
