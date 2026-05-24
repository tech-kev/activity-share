// Rendert die Strecke aus GPX-Punkten als Outline / Heatmap auf einem Canvas-Context
// (oder berechnet SVG-Pfade — wir nutzen Canvas für 1:1-Konsistenz mit dem Export).

import type { GpxStats, GpxTrackpoint, HeatmapMode } from '@/types';

interface RouteRenderOptions {
  bounds: { x: number; y: number; w: number; h: number };
  color: string;
  width: number;
  heatmap: HeatmapMode;
  /** Padding innerhalb der bounds (in px). */
  inset?: number;
}

/**
 * Projiziert die Punkte einer Tour in das gegebene Rechteck, mit korrekter
 * Aspect-Ratio (cos(lat)-Korrektur). Gibt ein Array von [x, y]-Tupeln zurück.
 */
function projectPoints(
  trackpoints: GpxTrackpoint[],
  stats: GpxStats,
  box: { x: number; y: number; w: number; h: number },
  inset: number,
): Array<[number, number]> {
  const innerW = box.w - inset * 2;
  const innerH = box.h - inset * 2;

  const meanLat = (stats.bounds.minLat + stats.bounds.maxLat) / 2;
  const lonScale = Math.cos((meanLat * Math.PI) / 180);

  const lonSpan = (stats.bounds.maxLon - stats.bounds.minLon) * lonScale;
  const latSpan = stats.bounds.maxLat - stats.bounds.minLat;
  const dataAspect = lonSpan / Math.max(latSpan, 1e-9);
  const boxAspect = innerW / innerH;

  let drawW = innerW;
  let drawH = innerH;
  if (dataAspect > boxAspect) {
    drawH = innerW / dataAspect;
  } else {
    drawW = innerH * dataAspect;
  }
  const offsetX = (innerW - drawW) / 2 + inset;
  const offsetY = (innerH - drawH) / 2 + inset;

  return trackpoints.map((p) => {
    const nx = ((p.lon - stats.bounds.minLon) * lonScale) / Math.max(lonSpan, 1e-9);
    // y invertieren (lat größer = oben)
    const ny = 1 - (p.lat - stats.bounds.minLat) / Math.max(latSpan, 1e-9);
    return [box.x + offsetX + nx * drawW, box.y + offsetY + ny * drawH];
  });
}

/** Misst Geschwindigkeit (km/h) zwischen zwei Punkten. */
function segmentSpeedKmh(a: GpxTrackpoint, b: GpxTrackpoint): number | null {
  if (!a.time || !b.time || b.time <= a.time) return null;
  const dKm = b.dist - a.dist;
  const dH = (b.time - a.time) / 1000 / 3600;
  if (dH <= 0) return null;
  return dKm / dH;
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// Gradient für Heatmap: dunkles Blau → Türkis → Gelb → Rot
function heatColor(t: number): string {
  // 3 Stops: blue → yellow → red
  if (t < 0.5) {
    return lerpColor([34, 94, 168], [253, 219, 84], t * 2);
  }
  return lerpColor([253, 219, 84], [220, 38, 38], (t - 0.5) * 2);
}

export function drawRoute(
  ctx: CanvasRenderingContext2D,
  stats: GpxStats,
  opts: RouteRenderOptions,
): void {
  const inset = opts.inset ?? Math.max(opts.width / 2, 4);
  const projected = projectPoints(stats.trackpoints, stats, opts.bounds, inset);
  if (projected.length < 2) return;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (opts.heatmap === 'off') {
    // Einfacher weißer (oder farbiger) Outline-Stroke mit dezenter Schattierung
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.max(2, opts.width * 0.8);

    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.width;
    ctx.beginPath();
    ctx.moveTo(projected[0][0], projected[0][1]);
    for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
    ctx.stroke();
  } else if (opts.heatmap === 'speed') {
    const speeds: Array<number | null> = [null];
    for (let i = 1; i < stats.trackpoints.length; i++) {
      speeds.push(segmentSpeedKmh(stats.trackpoints[i - 1], stats.trackpoints[i]));
    }
    const valid = speeds.filter((s): s is number => s !== null);
    if (valid.length === 0) {
      // fallback: nur Outline
      drawRoute(ctx, stats, { ...opts, heatmap: 'off' });
      ctx.restore();
      return;
    }
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    drawHeatSegments(ctx, projected, speeds, min, max, opts.width);
  } else if (opts.heatmap === 'elevation') {
    const elevations = stats.trackpoints.map((p) => p.elevation);
    const min = stats.elevationMin;
    const max = stats.elevationMax;
    const speeds: Array<number | null> = elevations.map((v) => v);
    drawHeatSegments(ctx, projected, speeds, min, max, opts.width);
  }
  ctx.restore();
}

function drawHeatSegments(
  ctx: CanvasRenderingContext2D,
  projected: Array<[number, number]>,
  values: Array<number | null>,
  min: number,
  max: number,
  width: number,
): void {
  const range = Math.max(max - min, 1e-9);
  ctx.lineWidth = width;
  for (let i = 1; i < projected.length; i++) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    const t = Math.max(0, Math.min(1, (v - min) / range));
    ctx.strokeStyle = heatColor(t);
    ctx.beginPath();
    ctx.moveTo(projected[i - 1][0], projected[i - 1][1]);
    ctx.lineTo(projected[i][0], projected[i][1]);
    ctx.stroke();
  }
}
