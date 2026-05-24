import { Router } from 'express';
import { settingsRepo } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import {
  komootLogin,
  komootTourGpx,
  komootTourImageBuffer,
  komootTours,
  type KomootSession,
} from '../komoot/client.js';

export const komootRouter = Router();
komootRouter.use(requireAuth);

const KEY = 'komootAuth';

function getSession(): KomootSession | null {
  return settingsRepo.get<KomootSession | null>(KEY, null);
}

/**
 * Public-facing Session-Info ohne Token (nicht ans Frontend leaken).
 */
function publicSession(session: KomootSession | null): { authenticated: boolean; email?: string; displayName?: string } {
  if (!session) return { authenticated: false };
  return { authenticated: true, email: session.email, displayName: session.displayName };
}

komootRouter.get('/status', (_req, res) => {
  res.json(publicSession(getSession()));
});

komootRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    return;
  }
  try {
    const session = await komootLogin(email, password);
    settingsRepo.set(KEY, session);
    res.json(publicSession(session));
  } catch (e) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Login fehlgeschlagen' });
  }
});

komootRouter.post('/logout', (_req, res) => {
  settingsRepo.delete(KEY);
  res.json({ ok: true });
});

komootRouter.get('/tours', async (req, res) => {
  const session = getSession();
  if (!session) {
    res.status(401).json({ error: 'Nicht mit Komoot verbunden' });
    return;
  }
  const type = req.query.type === 'tour_planned' ? 'tour_planned' : 'tour_recorded';
  const page = Math.max(0, Number(req.query.page) || 0);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));
  try {
    const data = await komootTours(session, { type, page, limit });
    res.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Fehler beim Laden';
    // Bei abgelaufener Session: gespeicherten Token verwerfen.
    if (/Session abgelaufen/i.test(msg)) {
      settingsRepo.delete(KEY);
      res.status(401).json({ error: msg });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

komootRouter.get('/tours/:id/gpx', async (req, res) => {
  const session = getSession();
  if (!session) {
    res.status(401).json({ error: 'Nicht mit Komoot verbunden' });
    return;
  }
  try {
    const gpx = await komootTourGpx(session, req.params.id);
    res.setHeader('Content-Type', 'application/gpx+xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="komoot-${req.params.id}.gpx"`);
    res.send(gpx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Fehler beim GPX-Download';
    if (/Session abgelaufen/i.test(msg)) {
      settingsRepo.delete(KEY);
      res.status(401).json({ error: msg });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

/**
 * Image-Proxy: lädt das Komoot-Tour-Map-Image über unser Backend, damit
 * der Browser keine direkten Cross-Origin-Calls macht und damit das Bild
 * für den Auto-Crop in die Photo-Pipeline gegeben werden kann.
 *
 * Akzeptiert die URL als Query-Param `url`; wir filtern auf Komoot-Hosts.
 */
komootRouter.get('/image', async (req, res) => {
  const session = getSession();
  if (!session) {
    res.status(401).json({ error: 'Nicht mit Komoot verbunden' });
    return;
  }
  const url = typeof req.query.url === 'string' ? req.query.url : '';
  if (!/^https:\/\/[a-z0-9.-]*komoot\.(de|com)\//i.test(url)) {
    res.status(400).json({ error: 'Ungültige Bild-URL' });
    return;
  }
  try {
    const { buffer, contentType } = await komootTourImageBuffer(url);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Bild-Download fehlgeschlagen' });
  }
});
