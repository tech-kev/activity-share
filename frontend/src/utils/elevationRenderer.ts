import type { GpxStats } from '@/types';

interface ElevationRenderOptions {
  bounds: { x: number; y: number; w: number; h: number };
  color: string;
  fillAlpha?: number;
  /** Mit semi-transparentem Hintergrund-Panel ausfüllen */
  showBackground?: boolean;
}

export function drawElevation(
  ctx: CanvasRenderingContext2D,
  stats: GpxStats,
  opts: ElevationRenderOptions,
): void {
  const { bounds, color, showBackground = true } = opts;
  if (stats.trackpoints.length < 2 || stats.distance <= 0) return;

  ctx.save();

  if (showBackground) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 8);
    ctx.fill();
  }

  // Clip auf die bounds, damit nichts überläuft
  roundRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 8);
  ctx.clip();

  const padX = 6;
  const padY = 6;
  const innerX = bounds.x + padX;
  const innerY = bounds.y + padY;
  const innerW = bounds.w - padX * 2;
  const innerH = bounds.h - padY * 2;

  const eMin = stats.elevationMin;
  const eMax = stats.elevationMax;
  const eRange = Math.max(eMax - eMin, 1);
  const dRange = stats.distance;

  ctx.beginPath();
  ctx.moveTo(innerX, innerY + innerH);
  for (const p of stats.trackpoints) {
    const tx = (p.dist / dRange) * innerW;
    const ty = innerH - ((p.elevation - eMin) / eRange) * innerH;
    ctx.lineTo(innerX + tx, innerY + ty);
  }
  ctx.lineTo(innerX + innerW, innerY + innerH);
  ctx.closePath();
  ctx.fillStyle = withAlpha(color, opts.fillAlpha ?? 0.25);
  ctx.fill();

  ctx.beginPath();
  let first = true;
  for (const p of stats.trackpoints) {
    const tx = (p.dist / dRange) * innerW;
    const ty = innerH - ((p.elevation - eMin) / eRange) * innerH;
    if (first) {
      ctx.moveTo(innerX + tx, innerY + ty);
      first = false;
    } else ctx.lineTo(innerX + tx, innerY + ty);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
