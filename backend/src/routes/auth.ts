import { Router } from 'express';
import bcrypt from 'bcrypt';
import { userRepo } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

authRouter.get('/status', (req, res) => {
  res.json({
    setupComplete: userRepo.exists(),
    authenticated: Boolean(req.session.userId),
  });
});

authRouter.post('/setup', async (req, res) => {
  if (userRepo.exists()) {
    res.status(409).json({ error: 'Setup wurde bereits abgeschlossen' });
    return;
  }
  const { password } = req.body ?? {};
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben` });
    return;
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = userRepo.create(hash);
  req.session.userId = id;
  res.json({ ok: true });
});

authRouter.post('/login', async (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== 'string') {
    res.status(400).json({ error: 'Passwort fehlt' });
    return;
  }
  const user = userRepo.getFirst();
  if (!user) {
    res.status(400).json({ error: 'Es existiert noch kein Account. Bitte Setup durchführen.' });
    return;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: 'Falsches Passwort' });
    return;
  }
  req.session.userId = user.id;
  res.json({ ok: true });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

authRouter.post('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
    return;
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben` });
    return;
  }
  const user = userRepo.getFirst();
  if (!user || !req.session.userId || user.id !== req.session.userId) {
    res.status(401).json({ error: 'Nicht angemeldet' });
    return;
  }
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    return;
  }
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  userRepo.updatePassword(user.id, hash);
  res.json({ ok: true });
});
