// Globale TypeScript-Typen für Activity Share

export type ImageFormat = '1:1' | '9:16' | '4:5';

export interface FormatSize {
  width: number;
  height: number;
  label: string;
}

export const FORMAT_SIZES: Record<ImageFormat, FormatSize> = {
  '1:1': { width: 1280, height: 1280, label: 'Quadrat 1:1' },
  '9:16': { width: 1080, height: 1920, label: 'Story 9:16' },
  '4:5': { width: 1080, height: 1350, label: 'Post 4:5' },
};

/**
 * Aktivitäten sind frei editierbar (Settings) — wir speichern nur Strings.
 * Die Defaults werden beim ersten Setup übernommen, können dann aber umbenannt,
 * gelöscht oder ergänzt werden.
 */
export const DEFAULT_ACTIVITIES: string[] = [
  'Gravel',
  'Wandern',
  'Spazieren gehen',
  'Laufen',
];

export const DEFAULT_ACTIVITY = 'Wandern';

export interface GpxTrackpoint {
  lat: number;
  lon: number;
  elevation: number;
  time: number; // ms since epoch; 0 if missing
  dist: number; // cumulative distance in km from start
}

export interface GpxStats {
  name: string;
  trackpoints: GpxTrackpoint[];
  distance: number; // km
  duration: number; // ms
  movingDuration: number; // ms (ohne Pausen, heuristisch)
  elevationGain: number; // m
  elevationLoss: number; // m
  elevationMin: number; // m
  elevationMax: number; // m
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h
  avgPaceSecPerKm: number; // s/km
  startTime: number;
  endTime: number;
  bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number };
}

export type StatKey =
  | 'distance'
  | 'duration'
  | 'movingDuration'
  | 'elevationGain'
  | 'elevationLoss'
  | 'elevationMax'
  | 'avgSpeed'
  | 'maxSpeed'
  | 'avgPace'
  | 'startDate';

export const STAT_LABELS: Record<StatKey, string> = {
  distance: 'Distanz',
  duration: 'Dauer',
  movingDuration: 'Bewegung',
  elevationGain: 'HM aufwärts',
  elevationLoss: 'HM abwärts',
  elevationMax: 'Max. Höhe',
  avgSpeed: 'Ø Tempo',
  maxSpeed: 'Max. Tempo',
  avgPace: 'Ø Pace',
  startDate: 'Datum',
};

export type BuiltinElementId =
  | 'photo'
  | 'gradient'
  | 'activity'
  | 'title'
  | 'route'
  | 'elevation'
  | 'logo';

export type StatElementId = `stat:${StatKey}`;

export type ElementId = BuiltinElementId | StatElementId;

export function isStatElement(id: string): id is StatElementId {
  return id.startsWith('stat:');
}

export function statKeyOf(id: StatElementId): StatKey {
  return id.slice(5) as StatKey;
}

export interface CanvasElement {
  id: ElementId;
  x: number; // 0..1 relative to canvas
  y: number;
  w: number;
  h: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface StatOverrides {
  distance?: string;
  duration?: string;
  elevationGain?: string;
  [k: string]: string | undefined;
}

export type HeatmapMode = 'off' | 'speed' | 'elevation';

export interface AppSettings {
  /** Liste aller verfügbaren Aktivitäts-Labels (frei editierbar). */
  activities: string[];
  /** Label der Default-Aktivität (muss in `activities` enthalten sein). */
  defaultActivity: string;
  defaultStats: StatKey[];
  defaultFormat: ImageFormat;
  outlineColor: string;
  outlineWidth: number;
  heatmapMode: HeatmapMode;
  fontFamily: string;
  gradientStrength: number; // 0..1
  logoPath: string | null;
  defaultLayout: Partial<Record<ElementId, CanvasElement>> | null;
  autoContrast: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  activities: [...DEFAULT_ACTIVITIES],
  defaultActivity: DEFAULT_ACTIVITY,
  defaultStats: ['distance', 'duration', 'elevationGain'],
  defaultFormat: '1:1',
  outlineColor: '#ffffff',
  outlineWidth: 4,
  heatmapMode: 'off',
  fontFamily: 'Inter',
  gradientStrength: 0.5,
  logoPath: null,
  defaultLayout: null,
  autoContrast: true,
};
