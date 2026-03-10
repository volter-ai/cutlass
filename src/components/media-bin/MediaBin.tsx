import { useCallback } from 'react';
import { Film, Music, Image, Upload, Trash2 } from 'lucide-react';
import { useTimelineStore } from '../../store/timeline';
import { createMediaFile } from '../../utils/media';
import { formatDuration } from '../../utils/time';

export function MediaBin() {
  const { mediaFiles, addMediaFile, removeMediaFile } = useTimelineStore();

  const handleFileImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'video/*,audio/*,image/*';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      for (const file of Array.from(files)) {
        const media = await createMediaFile(file);
        addMediaFile(media);
      }
    };
    input.click();
  }, [addMediaFile]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (
          file.type.startsWith('video/') ||
          file.type.startsWith('audio/') ||
          file.type.startsWith('image/')
        ) {
          const media = await createMediaFile(file);
          addMediaFile(media);
        }
      }
    },
    [addMediaFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, mediaFileId: string) => {
    e.dataTransfer.setData('application/x-cutlass-media', mediaFileId);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const mediaList = Object.values(mediaFiles);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Film size={14} />;
      case 'audio': return <Music size={14} />;
      default: return <Image size={14} />;
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Media
        </span>
        <button
          onClick={handleFileImport}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Upload size={12} />
          Import
        </button>
      </div>

      {/* Media List */}
      <div className="flex-1 overflow-y-auto p-2">
        {mediaList.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <Upload size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Drop media files here</p>
            <p className="text-xs mt-1">or click Import</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {mediaList.map((media) => (
              <div
                key={media.id}
                draggable
                onDragStart={(e) => handleDragStart(e, media.id)}
                className="flex items-center gap-2 p-2 rounded cursor-grab active:cursor-grabbing transition-colors group"
                style={{ background: 'var(--bg-surface)' }}
              >
                {/* Thumbnail */}
                {media.thumbnail ? (
                  <img
                    src={media.thumbnail}
                    alt={media.name}
                    className="w-16 h-9 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 h-9 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    {typeIcon(media.type)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                    {media.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatDuration(media.duration)}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeMediaFile(media.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity hover:opacity-80"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
