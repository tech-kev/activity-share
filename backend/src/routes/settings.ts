import { Router } from 'express';
import { settingsRepo } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get('/', (_req, res) => {
  res.json(settingsRepo.all());
});

settingsRouter.put('/', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Ungültiger Payload' });
    return;
  }
  for (const [key, value] of Object.entries(body)) {
    settingsRepo.set(key, value);
  }
  res.json({ ok: true });
});

settingsRouter.delete('/:key', (req, res) => {
  settingsRepo.delete(req.params.key);
  res.json({ ok: true });
});
