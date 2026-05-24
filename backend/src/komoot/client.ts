// Komoot Web-API Client.
//
// Achtung: inoffiziell — Komoot bietet keine öffentliche REST-API für
// individuelle Entwickler. Die verwendeten Endpunkte sind die der Komoot-
// Web-App (api.komoot.de v007) und können sich jederzeit ändern oder
// schließen. Auth ist HTTP-Basic mit E-Mail + Passwort; aus der Antwort
// extrahieren wir userId + Session-Token, mit dem alle weiteren Requests
// signiert werden (statt das Passwort jedes Mal mitzuschicken).

const BASE_URL = 'https://api.komoot.de';
const DEFAULT_USER_AGENT = 'ActivityShare/0.1 (https://github.com/tech-kev/activity-share)';

export interface KomootSession {
  email: string;
  /** Numerische Komoot-User-ID (Komoot nennt das im JSON `username`). */
  userId: string;
  /** Session-Token (Komoot nennt das im JSON `password`). Wird in HTTP-Basic verwendet. */
  token: string;
  /** Anzeige-Name für die UI. */
  displayName?: string;
}

export interface KomootTour {
  id: string;
  name: string;
  sport: string;
  /** Meter */
  distance: number;
  /** Sekunden */
  duration: number;
  elevationUp?: number;
  elevationDown?: number;
  date?: string;
  mapImage?: string;
  type: string; // tour_recorded | tour_planned
}

export interface ToursPage {
  tours: KomootTour[];
  totalElements: number;
  totalPages: number;
  page: number;
}

function basicAuth(user: string, pass: string): string {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

function commonHeaders(authValue: string): Record<string, string> {
  return {
    Authorization: authValue,
    'User-Agent': DEFAULT_USER_AGENT,
    Accept: 'application/hal+json,application/json;q=0.9,*/*;q=0.8',
  };
}

/**
 * Templated URL aus Komoot-Bildern auflösen — Komoot liefert RFC-6570-Templates
 * wie `https://photos.komoot.de/vectormap/...{width}{height}{crop}`.
 */
function resolveImageUrl(src: string | undefined, templated: boolean): string | undefined {
  if (!src) return undefined;
  if (!templated) return src;
  return src
    .replace(/\{width\}/g, '480')
    .replace(/\{height\}/g, '320')
    .replace(/\{crop\}/g, '');
}

export async function komootLogin(email: string, password: string): Promise<KomootSession> {
  const url = `${BASE_URL}/v007/account/email/${encodeURIComponent(email)}/`;
  const res = await fetch(url, { headers: commonHeaders(basicAuth(email, password)) });
  if (res.status === 401) throw new Error('E-Mail oder Passwort falsch');
  if (!res.ok) throw new Error(`Komoot-Login fehlgeschlagen (HTTP ${res.status})`);
  const data = (await res.json()) as {
    email?: string;
    username?: string;
    password?: string;
    user?: { displayname?: string };
  };
  if (!data.username || !data.password) {
    throw new Error('Unerwartete Login-Antwort von Komoot');
  }
  return {
    email: data.email ?? email,
    userId: String(data.username),
    token: data.password,
    displayName: data.user?.displayname,
  };
}

interface ApiTour {
  id: string | number;
  name: string;
  sport: string;
  distance: number;
  duration: number;
  elevation_up?: number;
  elevation_down?: number;
  date?: string;
  type?: string;
  vector_map_image?: { src?: string; templated?: boolean };
  map_image_preview?: { src?: string; templated?: boolean };
  map_image?: { src?: string; templated?: boolean };
}

function mapTour(t: ApiTour): KomootTour {
  const vector = t.vector_map_image;
  const preview = t.map_image_preview ?? t.map_image;
  return {
    id: String(t.id),
    name: t.name,
    sport: t.sport,
    distance: t.distance,
    duration: t.duration,
    elevationUp: t.elevation_up,
    elevationDown: t.elevation_down,
    date: t.date,
    mapImage:
      resolveImageUrl(vector?.src, !!vector?.templated) ??
      resolveImageUrl(preview?.src, !!preview?.templated),
    type: t.type ?? 'tour_recorded',
  };
}

export async function komootTours(
  session: KomootSession,
  opts: { type: 'tour_recorded' | 'tour_planned'; page: number; limit: number },
): Promise<ToursPage> {
  const params = new URLSearchParams({
    type: opts.type,
    limit: String(opts.limit),
    page: String(opts.page),
    sort_field: 'date',
    sort_direction: 'desc',
  });
  const url = `${BASE_URL}/v007/users/${session.userId}/tours/?${params.toString()}`;
  const res = await fetch(url, {
    headers: commonHeaders(basicAuth(session.userId, session.token)),
  });
  if (res.status === 401) throw new Error('Komoot-Session abgelaufen — bitte neu verbinden');
  if (!res.ok) throw new Error(`Tour-Liste fehlgeschlagen (HTTP ${res.status})`);
  const data = (await res.json()) as {
    _embedded?: { tours?: ApiTour[] };
    page?: { totalElements?: number; totalPages?: number; number?: number };
  };
  const rawTours = data._embedded?.tours ?? [];
  return {
    tours: rawTours.map(mapTour),
    totalElements: data.page?.totalElements ?? rawTours.length,
    totalPages: data.page?.totalPages ?? 1,
    page: data.page?.number ?? opts.page,
  };
}

export async function komootTourGpx(session: KomootSession, tourId: string): Promise<string> {
  const url = `${BASE_URL}/v007/tours/${tourId}.gpx`;
  const res = await fetch(url, {
    headers: commonHeaders(basicAuth(session.userId, session.token)),
  });
  if (res.status === 401) throw new Error('Komoot-Session abgelaufen — bitte neu verbinden');
  if (res.status === 404) throw new Error('Tour nicht gefunden');
  if (!res.ok) throw new Error(`GPX-Download fehlgeschlagen (HTTP ${res.status})`);
  return res.text();
}

export async function komootTourImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': DEFAULT_USER_AGENT } });
  if (!res.ok) throw new Error(`Bild-Download fehlgeschlagen (HTTP ${res.status})`);
  const ab = await res.arrayBuffer();
  return {
    buffer: Buffer.from(ab),
    contentType: res.headers.get('content-type') ?? 'image/jpeg',
  };
}
