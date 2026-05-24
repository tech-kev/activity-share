import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { settingsRepo } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = /^\.(png|jpe?g|svg|webp)$/.test(ext) ? ext : '.bin';
    const name = `${crypto.randomBytes(12).toString('hex')}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max für Logo
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien erlaubt (PNG, JPG, SVG, WebP).'));
    }
  },
});

uploadRouter.post('/logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Keine Datei hochgeladen' });
    return;
  }
  const publicPath = `/uploads/${req.file.filename}`;
  settingsRepo.set('logoPath', publicPath);
  res.json({ ok: true, path: publicPath });
});

uploadRouter.delete('/logo', (_req, res) => {
  settingsRepo.delete('logoPath');
  res.json({ ok: true });
});
