import { useRef, useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { useTimelineStore } from '../../store/timeline';
import { DrawingStrokeRenderer } from './DrawingStrokeRenderer';
import type { DrawingPoint, DrawingStroke } from '../../types';

interface Props {
  width: number;
  height: number;
  activeOverlayId: string | null;
  /** Called when the user starts drawing and no overlay is selected */
  onNeedOverlay: () => string;
}

export function DrawingCanvas({ width, height, activeOverlayId, onNeedOverlay }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const activeDrawingTool = useTimelineStore((s) => s.activeDrawingTool);
  const activeDrawingColor = useTimelineStore((s) => s.activeDrawingColor);
  const activeDrawingStrokeWidth = useTimelineStore((s) => s.activeDrawingStrokeWidth);
  const activeDrawingTexture = useTimelineStore((s) => s.activeDrawingTexture);
  const { addStrokeToDrawingOverlay } = useTimelineStore();

  // In-progress stroke points (not yet committed to store)
  const [inProgressPoints, setInProgressPoints] = useState<DrawingPoint[]>([]);
  const activeOverlayIdRef = useRef(activeOverlayId);
  activeOverlayIdRef.current = activeOverlayId;

  const getOpacityForTexture = useCallback(() => {
    if (activeDrawingTexture === 'marker') return 0.5;
    if (activeDrawingTexture === 'chalk') return 0.7;
    return 1;
  }, [activeDrawingTexture]);

  const toNormalized = useCallback((clientX: number, clientY: number): DrawingPoint => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);

      const pt = toNormalized(e.clientX, e.clientY);
      setInProgressPoints([pt]);
    },
    [toNormalized],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.buttons === 0) return; // no button held
      const pt = toNormalized(e.clientX, e.clientY);
      setInProgressPoints((prev) => {
        if (prev.length === 0) return prev;
        // For shapes (arrow/circle/rectangle), only keep first + current
        if (activeDrawingTool !== 'pen') {
          return [prev[0], pt];
        }
        return [...prev, pt];
      });
    },
    [toNormalized, activeDrawingTool],
  );

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent<SVGSVGElement>) => {
      if (inProgressPoints.length < 1) return;

      // Ensure we have an overlay to attach to
      let overlayId = activeOverlayIdRef.current;
      if (!overlayId) {
        overlayId = onNeedOverlay();
      }

      const needsMinPoints = activeDrawingTool !== 'pen';
      const points = inProgressPoints;
      const hasEnoughPoints = needsMinPoints ? points.length >= 2 : points.length >= 2;

      if (hasEnoughPoints && overlayId) {
        const stroke: DrawingStroke = {
          id: uuid(),
          tool: activeDrawingTool,
          texture: activeDrawingTexture,
          color: activeDrawingColor,
          strokeWidth: activeDrawingStrokeWidth,
          opacity: getOpacityForTexture(),
          points,
          startOffset: 0, // store overwrites with sequential default
        };
        addStrokeToDrawingOverlay(overlayId, stroke);
      }

      setInProgressPoints([]);
    },
    [
      inProgressPoints,
      activeDrawingTool,
      activeDrawingTexture,
      activeDrawingColor,
      activeDrawingStrokeWidth,
      getOpacityForTexture,
      addStrokeToDrawingOverlay,
      onNeedOverlay,
    ],
  );

  // Build in-progress stroke for preview
  const inProgressStroke: DrawingStroke | null =
    inProgressPoints.length >= 1
      ? {
          id: 'in-progress',
          tool: activeDrawingTool,
          texture: activeDrawingTexture,
          color: activeDrawingColor,
          strokeWidth: activeDrawingStrokeWidth,
          opacity: getOpacityForTexture(),
          points: inProgressPoints,
          startOffset: 0,
        }
      : null;

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 20,
        cursor: activeDrawingTool === 'pen' ? 'crosshair'
          : activeDrawingTool === 'arrow' ? 'crosshair'
          : 'crosshair',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <defs>
        <filter id="cutlass-chalk-filter" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* In-progress stroke preview — committed strokes are rendered by the SVG overlay in Viewer.tsx */}
      {inProgressStroke && (
        <DrawingStrokeRenderer
          stroke={inProgressStroke}
          canvasWidth={width}
          canvasHeight={height}
          revealFraction={1}
        />
      )}
    </svg>
  );
}
