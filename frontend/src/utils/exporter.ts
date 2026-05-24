import { useEditorStore } from '@/stores/editor';
import { useGpxStore } from '@/stores/gpx';
import { useSettingsStore } from '@/stores/settings';
import { renderToCanvas } from './renderer';
import { FORMAT_SIZES } from '@/types';

/**
 * Lädt ein Bild aus einer URL als HTMLImageElement (mit decode für sauberen Render).
 */
function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    img.src = url;
  });
}

async function renderFullResolution(): Promise<HTMLCanvasElement> {
  const editor = useEditorStore();
  const gpx = useGpxStore();
  const settings = useSettingsStore();

  const photoUrl = editor.photo.croppedUrl ?? editor.photo.originalUrl;
  const photoImg = await loadImage(photoUrl);
  const logoImg = await loadImage(settings.values.logoPath);

  const canvas = document.createElement('canvas');
  const size = FORMAT_SIZES[editor.format];
  renderToCanvas(
    canvas,
    {
      format: editor.format,
      title: editor.title,
      activity: editor.activity,
      stats: editor.stats,
      gpx: gpx.stats,
      overrides: gpx.overrides,
      photo: photoImg,
      logo: logoImg,
      elements: editor.elements,
      settings: settings.values,
      imageFilter: editor.imageFilter,
    },
    size,
  );
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas konnte nicht in Bild konvertiert werden'));
    }, type);
  });
}

function buildFileName(): string {
  const editor = useEditorStore();
  const date = new Date().toISOString().slice(0, 10);
  const slug = (editor.title || editor.activity || 'activity-share')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `activity-share-${slug || 'export'}-${date}.png`;
}

export async function exportImage(): Promise<void> {
  const canvas = await renderFullResolution();
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildFileName();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareImage(): Promise<void> {
  const canvas = await renderFullResolution();
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], buildFileName(), { type: 'image/png' });

  // Web Share API mit Files (falls verfügbar)
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({
      files: [file],
      title: 'Activity Share',
      text: 'Meine Aktivität als Activity Share',
    });
    return;
  }

  // Clipboard-Fallback (PNG): ClipboardItem
  const w = window as Window & {
    ClipboardItem?: typeof ClipboardItem;
  };
  if (w.ClipboardItem && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return;
    } catch {
      // Fall through to download
    }
  }

  // Letzter Fallback: einfacher Download
  await exportImage();
}
