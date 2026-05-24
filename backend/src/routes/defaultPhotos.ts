import { Router } from 'express';
import fs from 'node:fs';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

export const defaultPhotosRouter = Router();
defaultPhotosRouter.use(requireAuth);

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

defaultPhotosRouter.get('/', (_req, res) => {
  try {
    if (!fs.existsSync(config.defaultPhotosDir)) {
      res.json({ photos: [] });
      return;
    }
    const files = fs
      .readdirSync(config.defaultPhotosDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && IMAGE_EXT.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, 'de'));
    res.json({
      photos: files.map((name) => ({
        name,
        url: `/default-photos/${encodeURIComponent(name)}`,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Lesefehler' });
  }
});
