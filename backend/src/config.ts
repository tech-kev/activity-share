import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dev (tsx): __dirname = backend/src; Prod (node): __dirname = backend/dist.
// In beiden Fällen ist eine Ebene hoch = backend/.
const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');
const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  isProd,
  dataDir: process.env.DATA_DIR ?? path.join(backendRoot, 'data'),
  uploadsDir: process.env.UPLOADS_DIR ?? path.join(backendRoot, 'uploads'),
  /** Verzeichnis mit Default-Hintergrundbildern (vom User mit Dateien gefüllt). */
  defaultPhotosDir: process.env.DEFAULT_PHOTOS_DIR ?? path.join(repoRoot, 'default-photos'),
  frontendDist: process.env.FRONTEND_DIST ?? path.join(repoRoot, 'frontend', 'dist'),
  sessionCookieName: 'activity-share.sid',
  sessionMaxAgeMs: 1000 * 60 * 60 * 24 * 30, // 30 Tage
};
