import { useRef, useCallback, useMemo } from 'react';
import { useTimelineStore } from '../../store/timeline';
import { formatTimecode } from '../../utils/time';

export function TimelineRuler() {
  const rulerRef = useRef<HTMLDivElement>(null);
  const zoom = useTimelineStore((s) => s.zoom);
  const duration = useTimelineStore((s) => s.duration);
  const playheadPosition = useTimelineStore((s) => s.playheadPosition);
  const setPlayheadPosition = useTimelineStore((s) => s.setPlayheadPosition);

  const totalWidth = duration * zoom;

  const ticks = useMemo(() => {
    let interval = 1; // seconds
    if (zoom < 30) interval = 10;
    else if (zoom < 60) interval = 5;
    else if (zoom < 150) interval = 1;
    else interval = 0.5;

    const t: { time: number; major: boolean }[] = [];
    for (let s = 0; s <= duration; s += interval / 5) {
      t.push({
        time: s,
        major: Math.abs(s % interval) < 0.001 || Math.abs(s % interval - interval) < 0.001,
      });
    }
    return t;
  }, [zoom, duration]);

  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left + (rulerRef.current?.parentElement?.scrollLeft ?? 0);
      const time = x / zoom;
      setPlayheadPosition(Math.max(0, time));
    },
    [zoom, setPlayheadPosition],
  );

  return (
    <div
      ref={rulerRef}
      className="relative h-6 cursor-pointer select-none"
      style={{
        width: totalWidth,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
      onClick={handleRulerClick}
    >
      {ticks.map(({ time, major }, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: time * zoom,
            height: major ? '100%' : '40%',
            width: 1,
            background: major ? 'var(--text-secondary)' : 'var(--border)',
            bottom: 0,
            top: 'auto',
          }}
        >
          {major && (
            <span
              className="absolute text-xs select-none"
              style={{
                top: 1,
                left: 4,
                color: 'var(--text-secondary)',
                fontSize: '9px',
                whiteSpace: 'nowrap',
              }}
            >
              {formatTimecode(time)}
            </span>
          )}
        </div>
      ))}

      {/* Playhead marker on ruler */}
      <div
        className="absolute top-0 h-full"
        style={{
          left: playheadPosition * zoom - 5,
          width: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          className="mx-auto"
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '6px solid var(--playhead)',
          }}
        />
      </div>
    </div>
  );
}
