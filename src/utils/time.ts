export function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30); // 30fps frame count

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}:${pad(f)}`;
  }
  return `${pad(m)}:${pad(s)}:${pad(f)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${pad(s)}`;
}

export function snapToGrid(time: number, gridSize: number): number {
  return Math.round(time / gridSize) * gridSize;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
