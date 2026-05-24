import { defineStore } from 'pinia';
import {
  DEFAULT_ACTIVITY,
  isStatElement,
  type CanvasElement,
  type ElementId,
  type ImageFormat,
  type StatKey,
} from '@/types';

export interface PhotoState {
  /** Object-URL des aktuell geladenen Originalfotos (vor Crop). */
  originalUrl: string | null;
  /** Datei-Name des Originalfotos. */
  fileName: string | null;
  /** Object-URL des zugeschnittenen Fotos (so wird im Canvas gerendert). */
  croppedUrl: string | null;
  /** Natürliche Maße des Original-Fotos. */
  natural: { width: number; height: number } | null;
}

interface EditorState {
  format: ImageFormat;
  title: string;
  /** Aktuell ausgewählter Aktivitäts-Label (freier String aus settings.activities). */
  activity: string;
  /** Reihenfolge der aktiven Stats (für deterministische Sortierung in Listen). */
  stats: StatKey[];
  photo: PhotoState;
  elements: Record<string, CanvasElement>;
  selectedElement: ElementId | null;
  gridEnabled: boolean;
  imageFilter: { brightness: number; contrast: number; saturation: number };
  manualTitleEdited: boolean;
}

const DEFAULT_ELEMENTS: Record<string, CanvasElement> = {
  photo: { id: 'photo', x: 0, y: 0, w: 1, h: 1, visible: true, locked: true, zIndex: 0 },
  gradient: { id: 'gradient', x: 0, y: 0.55, w: 1, h: 0.45, visible: true, locked: true, zIndex: 1 },
  activity: { id: 'activity', x: 0.05, y: 0.74, w: 0.6, h: 0.08, visible: true, locked: false, zIndex: 2 },
  title: { id: 'title', x: 0.05, y: 0.83, w: 0.6, h: 0.04, visible: true, locked: false, zIndex: 3 },
  route: { id: 'route', x: 0.7, y: 0.62, w: 0.25, h: 0.18, visible: true, locked: false, zIndex: 4 },
  elevation: { id: 'elevation', x: 0.05, y: 0.62, w: 0.6, h: 0.12, visible: false, locked: false, zIndex: 5 },
  logo: { id: 'logo', x: 0.78, y: 0.04, w: 0.18, h: 0.08, visible: false, locked: false, zIndex: 6 },
  // Stats sind individuelle Elemente, dreispalten-Layout am unteren Rand:
  'stat:distance': { id: 'stat:distance', x: 0.05, y: 0.88, w: 0.28, h: 0.08, visible: true, locked: false, zIndex: 10 },
  'stat:duration': { id: 'stat:duration', x: 0.36, y: 0.88, w: 0.28, h: 0.08, visible: true, locked: false, zIndex: 11 },
  'stat:elevationGain': { id: 'stat:elevationGain', x: 0.67, y: 0.88, w: 0.28, h: 0.08, visible: true, locked: false, zIndex: 12 },
  // Übrige Stats: standardmäßig ausgeblendet, vordefinierte Default-Plätze:
  'stat:movingDuration': { id: 'stat:movingDuration', x: 0.05, y: 0.62, w: 0.28, h: 0.06, visible: false, locked: false, zIndex: 13 },
  'stat:elevationLoss': { id: 'stat:elevationLoss', x: 0.36, y: 0.62, w: 0.28, h: 0.06, visible: false, locked: false, zIndex: 14 },
  'stat:elevationMax': { id: 'stat:elevationMax', x: 0.67, y: 0.62, w: 0.28, h: 0.06, visible: false, locked: false, zIndex: 15 },
  'stat:avgSpeed': { id: 'stat:avgSpeed', x: 0.05, y: 0.54, w: 0.28, h: 0.06, visible: false, locked: false, zIndex: 16 },
  'stat:maxSpeed': { id: 'stat:maxSpeed', x: 0.36, y: 0.54, w: 0.28, h: 0.06, visible: false, locked: false, zIndex: 17 },
  'stat:avgPace': { id: 'stat:avgPace', x: 0.67, y: 0.54, w: 0.28, h: 0.06, visible: false, locked: false, zIndex: 18 },
  'stat:startDate': { id: 'stat:startDate', x: 0.05, y: 0.04, w: 0.30, h: 0.04, visible: false, locked: false, zIndex: 19 },
};

function cloneElements(src: Record<string, CanvasElement>): Record<string, CanvasElement> {
  const out: Record<string, CanvasElement> = {};
  for (const k of Object.keys(src)) out[k] = { ...src[k] };
  return out;
}

/**
 * Mischt ein evtl. älteres gespeichertes Layout mit den aktuellen Default-Elementen
 * — neue ElementIds (z.B. einzelne Stats nachträglich eingeführt) erscheinen mit Defaults.
 * Alte Layouts mit dem entfernten `stats`-Sammel-Element werden ignoriert.
 */
function mergeWithDefaults(
  layout: Partial<Record<string, CanvasElement>>,
): Record<string, CanvasElement> {
  const out: Record<string, CanvasElement> = {};
  for (const k of Object.keys(DEFAULT_ELEMENTS)) {
    const incoming = layout?.[k];
    out[k] = incoming
      ? { ...DEFAULT_ELEMENTS[k], ...incoming, id: k as ElementId }
      : { ...DEFAULT_ELEMENTS[k] };
  }
  return out;
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export const useEditorStore = defineStore('editor', {
  state: (): EditorState => ({
    format: '1:1',
    title: '',
    activity: DEFAULT_ACTIVITY,
    stats: ['distance', 'duration', 'elevationGain'],
    photo: { originalUrl: null, fileName: null, croppedUrl: null, natural: null },
    elements: cloneElements(DEFAULT_ELEMENTS),
    selectedElement: null,
    gridEnabled: false,
    imageFilter: { brightness: 1, contrast: 1, saturation: 1 },
    manualTitleEdited: false,
  }),
  getters: {
    sortedElements(state): CanvasElement[] {
      return Object.values(state.elements).sort((a, b) => a.zIndex - b.zIndex);
    },
    /** Aktive Stat-Elemente in user-definierter Reihenfolge (für die Liste). */
    activeStatElements(state): CanvasElement[] {
      return state.stats
        .map((key) => state.elements[`stat:${key}`])
        .filter((el): el is CanvasElement => !!el);
    },
  },
  actions: {
    setFormat(format: ImageFormat) {
      this.format = format;
    },
    setTitle(title: string) {
      this.title = title;
      this.manualTitleEdited = true;
    },
    setTitleFromGpx(name: string | undefined) {
      if (this.manualTitleEdited) return;
      this.title = name?.trim() ?? '';
    },
    setActivity(activity: string) {
      this.activity = activity;
    },
    setStats(stats: StatKey[]) {
      // Reihenfolge merken; Sichtbarkeit der zugehörigen Elemente entsprechend setzen.
      const set = new Set(stats);
      this.stats = stats.slice();
      for (const key of Object.keys(this.elements)) {
        if (isStatElement(key)) {
          const statKey = key.slice(5) as StatKey;
          this.elements[key].visible = set.has(statKey);
        }
      }
    },
    addStat(key: StatKey) {
      if (this.stats.includes(key)) return;
      this.stats.push(key);
      const id = `stat:${key}` satisfies `stat:${StatKey}`;
      if (this.elements[id]) this.elements[id].visible = true;
    },
    removeStat(key: StatKey) {
      this.stats = this.stats.filter((k) => k !== key);
      const id = `stat:${key}` satisfies `stat:${StatKey}`;
      if (this.elements[id]) this.elements[id].visible = false;
    },
    setPhotoOriginal(url: string, fileName: string, natural: { width: number; height: number }) {
      if (this.photo.originalUrl) URL.revokeObjectURL(this.photo.originalUrl);
      if (this.photo.croppedUrl) URL.revokeObjectURL(this.photo.croppedUrl);
      this.photo = { originalUrl: url, fileName, croppedUrl: null, natural };
    },
    setPhotoCropped(url: string) {
      if (this.photo.croppedUrl) URL.revokeObjectURL(this.photo.croppedUrl);
      this.photo.croppedUrl = url;
    },
    clearPhoto() {
      if (this.photo.originalUrl) URL.revokeObjectURL(this.photo.originalUrl);
      if (this.photo.croppedUrl) URL.revokeObjectURL(this.photo.croppedUrl);
      this.photo = { originalUrl: null, fileName: null, croppedUrl: null, natural: null };
    },
    selectElement(id: ElementId | null) {
      this.selectedElement = id;
    },
    moveElement(id: ElementId, dx: number, dy: number) {
      const el = this.elements[id];
      if (!el || el.locked) return;
      el.x = clamp01(el.x + dx);
      el.y = clamp01(el.y + dy);
    },
    setElementPosition(id: ElementId, x: number, y: number) {
      const el = this.elements[id];
      if (!el || el.locked) return;
      el.x = clamp01(x);
      el.y = clamp01(y);
    },
    setElementBox(id: ElementId, box: { x: number; y: number; w: number; h: number }) {
      const el = this.elements[id];
      if (!el || el.locked) return;
      const MIN = 0.02;
      let { x, y, w, h } = box;
      w = Math.max(MIN, w);
      h = Math.max(MIN, h);
      x = clamp01(x);
      y = clamp01(y);
      if (x + w > 1) w = 1 - x;
      if (y + h > 1) h = 1 - y;
      el.x = x;
      el.y = y;
      el.w = w;
      el.h = h;
    },
    toggleVisibility(id: ElementId) {
      const el = this.elements[id];
      if (!el) return;
      el.visible = !el.visible;
      // Stats-Liste synchron halten
      if (isStatElement(id)) {
        const key = id.slice(5) as StatKey;
        if (el.visible) {
          if (!this.stats.includes(key)) this.stats.push(key);
        } else {
          this.stats = this.stats.filter((k) => k !== key);
        }
      }
    },
    toggleLock(id: ElementId) {
      const el = this.elements[id];
      if (!el) return;
      el.locked = !el.locked;
    },
    setGridEnabled(value: boolean) {
      this.gridEnabled = value;
    },
    setImageFilter(patch: Partial<EditorState['imageFilter']>) {
      this.imageFilter = { ...this.imageFilter, ...patch };
    },
    resetLayout(layout: Partial<Record<string, CanvasElement>> | null) {
      this.elements = layout ? mergeWithDefaults(layout) : cloneElements(DEFAULT_ELEMENTS);
      // stats-Array aus den Visibilities ableiten
      this.syncStatsFromElements();
    },
    setLayout(elements: Partial<Record<string, CanvasElement>>) {
      this.elements = mergeWithDefaults(elements);
      this.syncStatsFromElements();
    },
    syncStatsFromElements() {
      const found: StatKey[] = [];
      for (const key of Object.keys(this.elements)) {
        if (isStatElement(key) && this.elements[key].visible) {
          found.push(key.slice(5) as StatKey);
        }
      }
      // bewahre bestehende Reihenfolge, soweit möglich
      const ordered = this.stats.filter((k) => found.includes(k));
      for (const k of found) if (!ordered.includes(k)) ordered.push(k);
      this.stats = ordered;
    },
  },
});

export const EDITOR_DEFAULT_LAYOUT = DEFAULT_ELEMENTS;
