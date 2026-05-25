import express from 'express';
import session from 'express-session';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { sessionSecret } from './db/index.js';
import { BetterSqliteSessionStore } from './db/sessionStore.js';
import { authRouter } from './routes/auth.js';
import { settingsRouter } from './routes/settings.js';
import { uploadRouter } from './routes/upload.js';
import { defaultPhotosRouter } from './routes/defaultPhotos.js';
import { komootRouter } from './routes/komoot.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: config.sessionCookieName,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new BetterSqliteSessionStore(),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // kein HTTPS vorausgesetzt; läuft hinter Reverse Proxy
      maxAge: config.sessionMaxAgeMs,
    },
  }),
);

// API-Routes
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/default-photos', defaultPhotosRouter);
app.use('/api/komoot', komootRouter);

// Statisch: Uploads + Default-Photos
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));
if (fs.existsSync(config.defaultPhotosDir)) {
  app.use('/default-photos', express.static(config.defaultPhotosDir, { maxAge: '7d' }));
}

// Frontend statisch ausliefern (in Produktion)
if (config.isProd && fs.existsSync(config.frontendDist)) {
  app.use(express.static(config.frontendDist, { index: false, maxAge: '7d' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      next();
      return;
    }
    res.sendFile(path.join(config.frontendDist, 'index.html'));
  });
}

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '0.1.0' });
});

// Generic error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Interner Serverfehler';
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  res.status(500).json({ error: message });
});

app.listen(config.port, config.host, () => {
  // eslint-disable-next-line no-console
  console.log(`Activity Share läuft auf http://${config.host}:${config.port} (prod=${config.isProd})`);
});
