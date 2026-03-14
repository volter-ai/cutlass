import type { DrawingStroke } from '../../types';

interface Props {
  stroke: DrawingStroke;
  canvasWidth: number;
  canvasHeight: number;
  /** Fraction 0–1 of the stroke to reveal (write-on animation). 1 = fully visible. */
  revealFraction?: number;
}

/** Convert normalized 0-1 point to pixel SVG coordinate string */
function px(points: { x: number; y: number }[], w: number, h: number): string {
  if (points.length === 0) return '';
  const first = `M ${points[0].x * w} ${points[0].y * h}`;
  const rest = points.slice(1).map((p) => `L ${p.x * w} ${p.y * h}`).join(' ');
  return rest ? `${first} ${rest}` : first;
}

/** Euclidean path length in pixels (sum of segment lengths) */
function pathLength(points: { x: number; y: number }[], w: number, h: number): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = (points[i].x - points[i - 1].x) * w;
    const dy = (points[i].y - points[i - 1].y) * h;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/** Compute arrowhead polygon points for arrow strokes */
function arrowheadPoints(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  w: number,
  h: number,
  size: number,
): string {
  const ax = p0.x * w, ay = p0.y * h;
  const bx = p1.x * w, by = p1.y * h;
  const angle = Math.atan2(by - ay, bx - ax);
  const left = { x: bx - size * Math.cos(angle - Math.PI / 6), y: by - size * Math.sin(angle - Math.PI / 6) };
  const right = { x: bx - size * Math.cos(angle + Math.PI / 6), y: by - size * Math.sin(angle + Math.PI / 6) };
  return `${bx},${by} ${left.x},${left.y} ${right.x},${right.y}`;
}

export function DrawingStrokeRenderer({ stroke, canvasWidth: w, canvasHeight: h, revealFraction = 1 }: Props) {
  const rf = Math.max(0, Math.min(1, revealFraction));

  const commonProps = {
    stroke: stroke.color,
    strokeWidth: stroke.strokeWidth * (w / 1920),
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: stroke.opacity,
    filter: stroke.texture === 'chalk' ? 'url(#cutlass-chalk-filter)' : undefined,
  };

  if (stroke.tool === 'pen') {
    if (stroke.points.length < 2) return null;
    const d = px(stroke.points, w, h);
    const totalLen = pathLength(stroke.points, w, h);
    return (
      <path
        d={d}
        {...commonProps}
        strokeDasharray={totalLen}
        strokeDashoffset={totalLen * (1 - rf)}
      />
    );
  }

  if (stroke.tool === 'arrow') {
    if (stroke.points.length < 2) return null;
    const [p0, p1] = stroke.points;
    const lineLen = Math.sqrt(
      ((p1.x - p0.x) * w) ** 2 + ((p1.y - p0.y) * h) ** 2,
    );
    const arrowSize = Math.max(10, stroke.strokeWidth * (w / 1920) * 4);
    const headPoints = arrowheadPoints(p0, p1, w, h, arrowSize);
    const dashTotal = lineLen + arrowSize * 2;
    return (
      <g opacity={stroke.opacity} filter={stroke.texture === 'chalk' ? 'url(#cutlass-chalk-filter)' : undefined}>
        <line
          x1={p0.x * w} y1={p0.y * h}
          x2={p1.x * w} y2={p1.y * h}
          stroke={stroke.color}
          strokeWidth={stroke.strokeWidth * (w / 1920)}
          strokeLinecap="round"
          strokeDasharray={dashTotal}
          strokeDashoffset={dashTotal * (1 - rf)}
        />
        {rf > 0.9 && (
          <polygon
            points={headPoints}
            fill={stroke.color}
            opacity={Math.max(0, (rf - 0.9) * 10)}
          />
        )}
      </g>
    );
  }

  if (stroke.tool === 'circle') {
    if (stroke.points.length < 2) return null;
    const [center, edge] = stroke.points;
    const rx = Math.abs((edge.x - center.x) * w);
    const ry = Math.abs((edge.y - center.y) * h);
    const circumference = 2 * Math.PI * Math.max(rx, ry);
    return (
      <ellipse
        cx={center.x * w} cy={center.y * h}
        rx={rx} ry={ry}
        {...commonProps}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - rf)}
      />
    );
  }

  if (stroke.tool === 'rectangle') {
    if (stroke.points.length < 2) return null;
    const [tl, br] = stroke.points;
    const rx = tl.x * w, ry = tl.y * h;
    const rw = (br.x - tl.x) * w, rh = (br.y - tl.y) * h;
    const perimeter = 2 * (Math.abs(rw) + Math.abs(rh));
    return (
      <rect
        x={Math.min(rx, rx + rw)} y={Math.min(ry, ry + rh)}
        width={Math.abs(rw)} height={Math.abs(rh)}
        {...commonProps}
        strokeDasharray={perimeter}
        strokeDashoffset={perimeter * (1 - rf)}
      />
    );
  }

  return null;
}
