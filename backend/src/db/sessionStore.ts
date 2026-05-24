// Minimaler Session-Store, der direkt better-sqlite3 nutzt (statt connect-sqlite3 → sqlite3,
// das wegen veralteter Transitiv-Abhängigkeiten Vulnerabilities mitschleppt).
// Implementiert das express-session Store-Interface.

import session, { type SessionData } from 'express-session';
import Database from 'better-sqlite3';
import path from 'node:path';
import { config } from '../config.js';

const dbPath = path.join(config.dataDir, 'sessions.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Migration: alte connect-sqlite3-Schemata (Spalte `expired` statt `expires`)
// werden ignoriert / verworfen, damit wir nicht in eine inkompatible Tabelle
// schreiben. Sessions sind ohnehin Wegwerf-Daten.
function ensureSchema() {
  const tableInfo = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sessions'")
    .get();
  if (tableInfo) {
    const cols = db.prepare("PRAGMA table_info('sessions')").all() as Array<{ name: string }>;
    const hasExpires = cols.some((c) => c.name === 'expires');
    const hasData = cols.some((c) => c.name === 'data');
    if (!hasExpires || !hasData) {
      db.exec('DROP TABLE sessions');
    }
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      expires INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires);
  `);
}
ensureSchema();

const stmtGet = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
const stmtSet = db.prepare(
  'INSERT INTO sessions (sid, expires, data) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data',
);
const stmtDestroy = db.prepare('DELETE FROM sessions WHERE sid = ?');
const stmtCleanup = db.prepare('DELETE FROM sessions WHERE expires < ?');
const stmtTouch = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
const stmtAll = db.prepare('SELECT sid, data FROM sessions WHERE expires > ?');
const stmtLength = db.prepare('SELECT COUNT(*) as n FROM sessions WHERE expires > ?');
const stmtClear = db.prepare('DELETE FROM sessions');

export class BetterSqliteSessionStore extends session.Store {
  constructor() {
    super();
    // Periodischer Cleanup expired Sessions (alle 15 Minuten)
    const interval = setInterval(() => {
      stmtCleanup.run(Date.now());
    }, 15 * 60 * 1000);
    if (typeof interval === 'object' && 'unref' in interval) {
      (interval as NodeJS.Timeout).unref();
    }
  }

  override get(
    sid: string,
    cb: (err: unknown, session?: SessionData | null) => void,
  ): void {
    try {
      const row = stmtGet.get(sid) as { data: string; expires: number } | undefined;
      if (!row) return cb(null, null);
      if (row.expires < Date.now()) {
        stmtDestroy.run(sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.data) as SessionData);
    } catch (e) {
      cb(e);
    }
  }

  override set(sid: string, sess: SessionData, cb?: (err?: unknown) => void): void {
    try {
      const maxAge = sess.cookie?.maxAge ?? config.sessionMaxAgeMs;
      const expires = sess.cookie?.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + maxAge;
      stmtSet.run(sid, expires, JSON.stringify(sess));
      cb?.(null);
    } catch (e) {
      cb?.(e);
    }
  }

  override destroy(sid: string, cb?: (err?: unknown) => void): void {
    try {
      stmtDestroy.run(sid);
      cb?.(null);
    } catch (e) {
      cb?.(e);
    }
  }

  override touch(sid: string, sess: SessionData, cb?: (err?: unknown) => void): void {
    try {
      const maxAge = sess.cookie?.maxAge ?? config.sessionMaxAgeMs;
      const expires = sess.cookie?.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + maxAge;
      stmtTouch.run(expires, sid);
      cb?.(null);
    } catch (e) {
      cb?.(e);
    }
  }

  override all(
    cb: (err: unknown, sessions?: SessionData[] | { [sid: string]: SessionData } | null) => void,
  ): void {
    try {
      const rows = stmtAll.all(Date.now()) as Array<{ sid: string; data: string }>;
      const sessions: { [sid: string]: SessionData } = {};
      for (const row of rows) sessions[row.sid] = JSON.parse(row.data) as SessionData;
      cb(null, sessions);
    } catch (e) {
      cb(e);
    }
  }

  override length(cb: (err: unknown, length?: number) => void): void {
    try {
      const row = stmtLength.get(Date.now()) as { n: number };
      cb(null, row.n);
    } catch (e) {
      cb(e);
    }
  }

  override clear(cb?: (err?: unknown) => void): void {
    try {
      stmtClear.run();
      cb?.(null);
    } catch (e) {
      cb?.(e);
    }
  }
}
