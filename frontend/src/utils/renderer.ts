// Haupt-Renderer: zeichnet die komplette Komposition auf ein Canvas.
// Reine Funktion (state in → pixels out), genutzt sowohl für Live-Preview als auch Export.

import {
  FORMAT_SIZES,
  isStatElement,
  STAT_LABELS,
  type AppSettings,
  type CanvasElement,
  type GpxStats,
  type ImageFormat,
  type StatKey,
  type StatOverrides,
} from '@/types';
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatMeters,
  formatPace,
  formatSpeed,
} from './gpxParser';
import { drawRoute } from './routeRenderer';
import { drawElevation } from './elevationRenderer';

export interface RenderInput {
  format: ImageFormat;
  title: string;
  activity: string;
  stats: StatKey[];
  gpx: GpxStats | null;
  overrides: StatOverrides;
  photo: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  elements: Record<string, CanvasElement>;
  settings: AppSettings;
  imageFilter: { brightness: number; contrast: number; saturation: number };
}

export interface StatItem {
  label: string;
  value: string;
}

export function buildStatItems(input: RenderInput): StatItem[] {
  const items: StatItem[] = [];
  if (!input.gpx) return items;
  for (const key of input.stats) {
    items.push(formatStat(key, input.gpx, input.overrides));
  }
  return items;
}

export function formatStat(key: StatKey, gpx: GpxStats, overrides: StatOverrides): StatItem {
  const override = overrides[key];
  const label = STAT_LABELS[key] ?? key;
  switch (key) {
    case 'distance':
      return { label, value: override ?? formatDistance(gpx.distance) };
    case 'duration':
      return { label, value: override ?? formatDuration(gpx.duration) };
    case 'movingDuration':
      return { label, value: override ?? formatDuration(gpx.movingDuration) };
    case 'elevationGain':
      return { label, value: override ?? formatMeters(gpx.elevationGain) };
    case 'elevationLoss':
      return { label, value: override ?? formatMeters(gpx.elevationLoss) };
    case 'elevationMax':
      return { label, value: override ?? formatMeters(gpx.elevationMax) };
    case 'avgSpeed':
      return { label, value: override ?? formatSpeed(gpx.avgSpeed) };
    case 'maxSpeed':
      return { label, value: override ?? formatSpeed(gpx.maxSpeed) };
    case 'avgPace':
      return { label, value: override ?? formatPace(gpx.avgPaceSecPerKm) };
    case 'startDate':
      return { label, value: override ?? formatDate(gpx.startTime) };
    default:
      return { label, value: override ?? '' };
  }
}

export function activityDisplay(input: RenderInput): string {
  return (input.activity || '').toUpperCase();
}

/**
 * Misst die mittlere Helligkeit (0..1) der Pixel in einem Rechteck des Canvas.
 * Wird für Auto-Kontrast verwendet, **nach** dem Foto+Gradient-Draw.
 */
function averageLuminance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): number {
  const sw = Math.max(1, Math.floor(w));
  const sh = Math.max(1, Math.floor(h));
  if (sw <= 0 || sh <= 0) return 0;
  try {
    const data = ctx.getImageData(Math.max(0, Math.floor(x)), Math.max(0, Math.floor(y)), sw, sh).data;
    let sum = 0;
    let n = 0;
    // Stride von 4 Pixeln in beide Richtungen, max 1024 Samples (perf)
    const stride = Math.max(1, Math.floor(Math.sqrt((sw * sh) / 1024)));
    for (let py = 0; py < sh; py += stride) {
      for (let px = 0; px < sw; px += stride) {
        const i = (py * sw + px) * 4;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        // Rec. 709 Luminanz
        sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        n++;
      }
    }
    return n > 0 ? sum / n : 0;
  } catch {
    return 0;
  }
}

/** Liefert für eine Hintergrund-Luminanz die passende Textfarbe (mit Schatten). */
function pickTextColor(bgLum: number): { fg: string; shadow: string } {
  // Schwellwert mittig — Bildverlauf liefert ohnehin meist <0.5 im Bottom-Bereich
  if (bgLum > 0.6) {
    return { fg: '#0a0a0b', shadow: 'rgba(255,255,255,0.55)' };
  }
  return { fg: '#ffffff', shadow: 'rgba(0,0,0,0.55)' };
}

/**
 * Rendert die Komposition in ein vorhandenes Canvas-Element.
 * `targetSize` ist die tatsächliche Pixel-Größe, in die gerendert wird.
 * Die normalisierten Element-Positionen (0..1) werden dabei in absolute
 * Koordinaten umgerechnet.
 */
export function renderToCanvas(
  canvas: HTMLCanvasElement,
  input: RenderInput,
  targetSize?: { width: number; height: number },
): void {
  const formatSize = FORMAT_SIZES[input.format];
  const size = targetSize ?? formatSize;
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Hintergrund: dunkles Grau, falls kein Foto
  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, size.width, size.height);

  // Elemente in Z-Reihenfolge rendern
  const ordered = Object.values(input.elements).sort((a, b) => a.zIndex - b.zIndex);
  for (const el of ordered) {
    if (!el.visible) continue;
    const bx = el.x * size.width;
    const by = el.y * size.height;
    const bw = el.w * size.width;
    const bh = el.h * size.height;

    if (isStatElement(el.id)) {
      if (!input.gpx) continue;
      const key = el.id.slice(5) as StatKey;
      const lum = input.settings.autoContrast ? averageLuminance(ctx, bx, by, bw, bh) : 0;
      const colors = input.settings.autoContrast ? pickTextColor(lum) : null;
      drawSingleStat(ctx, input, key, bx, by, bw, bh, colors);
      continue;
    }

    switch (el.id) {
      case 'photo':
        drawPhoto(ctx, input.photo, size, input.imageFilter);
        break;
      case 'gradient':
        drawGradient(ctx, size, input.settings.gradientStrength);
        break;
      case 'activity': {
        const lum = input.settings.autoContrast
          ? averageLuminance(ctx, bx, by, bw, bh)
          : 0;
        const colors = input.settings.autoContrast ? pickTextColor(lum) : null;
        drawActivity(ctx, input, bx, by, bw, bh, colors);
        break;
      }
      case 'title': {
        const lum = input.settings.autoContrast
          ? averageLuminance(ctx, bx, by, bw, bh)
          : 0;
        const colors = input.settings.autoContrast ? pickTextColor(lum) : null;
        drawTitle(ctx, input, bx, by, bw, bh, colors);
        break;
      }
      case 'route':
        if (input.gpx) {
          drawRoute(ctx, input.gpx, {
            bounds: { x: bx, y: by, w: bw, h: bh },
            color: input.settings.outlineColor,
            width: input.settings.outlineWidth,
            heatmap: input.settings.heatmapMode,
          });
        }
        break;
      case 'elevation':
        if (input.gpx) {
          drawElevation(ctx, input.gpx, {
            bounds: { x: bx, y: by, w: bw, h: bh },
            color: input.settings.outlineColor,
          });
        }
        break;
      case 'logo':
        if (input.logo) drawLogo(ctx, input.logo, bx, by, bw, bh);
        break;
    }
  }
}

function drawSingleStat(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  key: StatKey,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: { fg: string; shadow: string } | null,
) {
  if (!input.gpx) return;
  const stat = formatStat(key, input.gpx, input.overrides);
  if (!stat.value) return;
  const fg = colors?.fg ?? '#ffffff';
  const shadow = colors?.shadow ?? 'rgba(0,0,0,0.55)';

  const fontFamily = quoteFont(input.settings.fontFamily);
  // Wert nimmt ~60 % der Höhe, Label ~25 %, Rest Abstand.
  const valueSize = Math.max(8, Math.round(h * 0.6));
  const labelSize = Math.max(6, Math.round(h * 0.22));

  ctx.save();
  ctx.shadowColor = shadow;
  ctx.shadowBlur = 6;
  ctx.textBaseline = 'alphabetic';

  // Value (oben)
  ctx.fillStyle = fg;
  ctx.font = `700 ${valueSize}px ${fontFamily}, system-ui, sans-serif`;
  ctx.fillText(stat.value, x, y + valueSize, w);

  // Label (unten, semi-transparent)
  ctx.globalAlpha = 0.7;
  ctx.font = `600 ${labelSize}px ${fontFamily}, system-ui, sans-serif`;
  ctx.fillText(stat.label.toUpperCase(), x, y + valueSize + labelSize + 4, w);
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement | null,
  size: { width: number; height: number },
  filter: { brightness: number; contrast: number; saturation: number },
) {
  if (!photo) {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, size.width, size.height);
    return;
  }
  ctx.save();
  ctx.filter = `brightness(${filter.brightness}) contrast(${filter.contrast}) saturate(${filter.saturation})`;
  const targetAspect = size.width / size.height;
  const photoAspect = photo.naturalWidth / photo.naturalHeight;
  let sx = 0;
  let sy = 0;
  let sw = photo.naturalWidth;
  let sh = photo.naturalHeight;
  if (photoAspect > targetAspect) {
    sw = photo.naturalHeight * targetAspect;
    sx = (photo.naturalWidth - sw) / 2;
  } else {
    sh = photo.naturalWidth / targetAspect;
    sy = (photo.naturalHeight - sh) / 2;
  }
  ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, size.width, size.height);
  ctx.restore();
}

function drawGradient(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  strength: number,
) {
  const grdH = size.height * 0.55;
  const grd = ctx.createLinearGradient(0, size.height - grdH, 0, size.height);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, `rgba(0,0,0,${Math.max(0, Math.min(1, strength * 0.9))})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, size.height - grdH, size.width, grdH);
}

function drawActivity(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: { fg: string; shadow: string } | null,
) {
  const label = activityDisplay(input);
  if (!label) return;
  const fg = colors?.fg ?? '#ffffff';
  const shadow = colors?.shadow ?? 'rgba(0,0,0,0.55)';

  ctx.save();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = shadow;
  ctx.shadowBlur = 8;

  const fontFamily = quoteFont(input.settings.fontFamily);
  // Schrift füllt die Bbox vertikal aus; Breite wird per maxWidth automatisch
  // skaliert.
  const fontSize = Math.round(h * 0.92);
  ctx.font = `900 ${fontSize}px ${fontFamily}, Impact, Arial Black, sans-serif`;
  ctx.fillText(label, x, y + fontSize, w);
  ctx.restore();
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: { fg: string; shadow: string } | null,
) {
  const title = input.title.trim().toUpperCase();
  if (!title) return;
  const fg = colors?.fg ?? '#ffffff';
  const shadow = colors?.shadow ?? 'rgba(0,0,0,0.55)';

  ctx.save();
  ctx.fillStyle = fg;
  ctx.globalAlpha = 0.9;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = shadow;
  ctx.shadowBlur = 6;

  const fontFamily = quoteFont(input.settings.fontFamily);
  const fontSize = Math.round(h * 0.92);
  ctx.font = `600 ${fontSize}px ${fontFamily}, system-ui, sans-serif`;
  ctx.fillText(title, x, y + fontSize, w);
  ctx.restore();
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const aspect = logo.naturalWidth / logo.naturalHeight;
  let drawW = w;
  let drawH = h;
  if (w / h > aspect) {
    drawW = h * aspect;
  } else {
    drawH = w / aspect;
  }
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;
  ctx.drawImage(logo, dx, dy, drawW, drawH);
}

function quoteFont(name: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(name)) return name;
  return `'${name.replace(/'/g, "\\'")}'`;
}
