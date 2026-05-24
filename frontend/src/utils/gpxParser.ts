// GPX-Parser für Activity Share.
// Basierend auf der Logik aus reference/src/js/lib/GPX.js, neu in TypeScript geschrieben
// und um zusätzliche Stats (moving duration, max speed, pace, bounds) erweitert.

import type { GpxStats, GpxTrackpoint } from '@/types';

const EARTH_RADIUS_KM = 6371.009;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);

  const s =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return EARTH_RADIUS_KM * c;
}

function getText(el: Element, tag: string): string | null {
  const node = el.getElementsByTagName(tag)[0];
  return node?.textContent ?? null;
}

class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GpxParseError';
  }
}

export function parseGpx(xml: string): GpxStats {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = doc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new GpxParseError('GPX-Datei ist kein gültiges XML.');
  }

  const trkptNodes = Array.from(doc.getElementsByTagName('trkpt'));
  if (trkptNodes.length < 2) {
    throw new GpxParseError('GPX-Datei enthält zu wenig Trackpunkte.');
  }

  // Name aus <trk><name>… oder <metadata><name>
  const trkName =
    getText(doc.documentElement, 'name') ??
    doc.getElementsByTagName('trk')[0]?.getElementsByTagName('name')[0]?.textContent ??
    '';

  // 1. Rohpunkte einlesen
  type Raw = { lat: number; lon: number; ele: number; time: number };
  const raw: Raw[] = [];
  for (const node of trkptNodes) {
    const lat = parseFloat(node.getAttribute('lat') ?? '');
    const lon = parseFloat(node.getAttribute('lon') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const eleText = getText(node, 'ele');
    const ele = eleText ? parseFloat(eleText) : 0;

    const timeText = getText(node, 'time');
    const time = timeText ? Date.parse(timeText) : 0;

    raw.push({ lat, lon, ele: Number.isFinite(ele) ? ele : 0, time });
  }

  if (raw.length < 2) {
    throw new GpxParseError('GPX-Datei enthält zu wenig gültige Trackpunkte.');
  }

  // 2. Cumulative distance + bounds + elevation
  let totalDistKm = 0;
  let minLat = raw[0].lat;
  let maxLat = raw[0].lat;
  let minLon = raw[0].lon;
  let maxLon = raw[0].lon;
  let minEle = raw[0].ele;
  let maxEle = raw[0].ele;
  let gain = 0;
  let loss = 0;
  let maxSpeedKmh = 0;

  // Heuristik moving duration: Segmente mit Bewegung > 0.5 m/s zählen
  // (entspricht ~1.8 km/h) — Pausen werden ausgeschlossen.
  const MOVING_MIN_MPS = 0.5;
  let movingMs = 0;

  const trackpoints: GpxTrackpoint[] = [];
  trackpoints.push({
    lat: raw[0].lat,
    lon: raw[0].lon,
    elevation: raw[0].ele,
    time: raw[0].time,
    dist: 0,
  });

  // Elevation-Glättung über Fenster, um GPS-Rauschen bei gain/loss zu reduzieren.
  // Wir berechnen gain/loss erst nach einer einfachen exponential-moving-average-Filterung.
  const smoothedEle: number[] = new Array(raw.length);
  const alpha = 0.25;
  smoothedEle[0] = raw[0].ele;
  for (let i = 1; i < raw.length; i++) {
    smoothedEle[i] = alpha * raw[i].ele + (1 - alpha) * smoothedEle[i - 1];
  }

  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1];
    const cur = raw[i];
    const segKm = haversineKm(prev, cur);
    totalDistKm += segKm;

    if (cur.lat < minLat) minLat = cur.lat;
    if (cur.lat > maxLat) maxLat = cur.lat;
    if (cur.lon < minLon) minLon = cur.lon;
    if (cur.lon > maxLon) maxLon = cur.lon;
    if (cur.ele < minEle) minEle = cur.ele;
    if (cur.ele > maxEle) maxEle = cur.ele;

    const dEle = smoothedEle[i] - smoothedEle[i - 1];
    if (dEle > 0) gain += dEle;
    else loss += dEle;

    // Speed pro Segment (km/h) — nur wenn beide Punkte einen Zeitstempel haben.
    if (prev.time > 0 && cur.time > 0 && cur.time > prev.time) {
      const dtMs = cur.time - prev.time;
      const dtH = dtMs / 1000 / 3600;
      const speedKmh = segKm / dtH;
      if (Number.isFinite(speedKmh) && speedKmh < 200) {
        if (speedKmh > maxSpeedKmh) maxSpeedKmh = speedKmh;
        // moving duration: nur Segmente mit ausreichender Geschwindigkeit zählen
        const mps = (segKm * 1000) / (dtMs / 1000);
        if (mps >= MOVING_MIN_MPS) movingMs += dtMs;
      }
    }

    trackpoints.push({
      lat: cur.lat,
      lon: cur.lon,
      elevation: cur.ele,
      time: cur.time,
      dist: totalDistKm,
    });
  }

  const startTime = raw[0].time;
  const endTime = raw[raw.length - 1].time;
  const totalMs = startTime > 0 && endTime > 0 ? Math.max(0, endTime - startTime) : 0;
  const movingMsFinal = movingMs > 0 ? movingMs : totalMs;

  const durationH = totalMs / 1000 / 3600;
  const avgSpeed = durationH > 0 ? totalDistKm / durationH : 0;
  const avgPaceSecPerKm = totalDistKm > 0 ? totalMs / 1000 / totalDistKm : 0;

  return {
    name: trkName?.trim() ?? '',
    trackpoints,
    distance: totalDistKm,
    duration: totalMs,
    movingDuration: movingMsFinal,
    elevationGain: gain,
    elevationLoss: Math.abs(loss),
    elevationMin: minEle,
    elevationMax: maxEle,
    avgSpeed,
    maxSpeed: maxSpeedKmh,
    avgPaceSecPerKm,
    startTime,
    endTime,
    bounds: { minLat, minLon, maxLat, maxLon },
  };
}

export function formatDistance(km: number): string {
  return `${km.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatMeters(m: number): string {
  return `${Math.round(m).toLocaleString('de-DE')} m`;
}

export function formatSpeed(kmh: number): string {
  return `${kmh.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/h`;
}

export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '–';
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

export function formatDate(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
