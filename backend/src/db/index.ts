import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { config } from '../config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

const dbPath = path.join(config.dataDir, 'activity-share.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Session-Secret beim ersten Start erzeugen und in meta ablegen
function getOrCreateSessionSecret(): string {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('session_secret') as
    | { value: string }
    | undefined;
  if (row) return row.value;
  const secret = crypto.randomBytes(48).toString('hex');
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('session_secret', secret);
  return secret;
}

export const sessionSecret = getOrCreateSessionSecret();

// Helper für Settings (JSON-Werte)
export const settingsRepo = {
  get<T>(key: string, fallback: T): T {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    if (!row) return fallback;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch())
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()`,
    ).run(key, JSON.stringify(value));
  },
  delete(key: string): void {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  },
  all(): Record<string, unknown> {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        out[r.key] = JSON.parse(r.value);
      } catch {
        out[r.key] = r.value;
      }
    }
    return out;
  },
};

export const userRepo = {
  exists(): boolean {
    const row = db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number };
    return row.n > 0;
  },
  getFirst(): { id: number; password_hash: string } | undefined {
    return db.prepare('SELECT id, password_hash FROM users ORDER BY id ASC LIMIT 1').get() as
      | { id: number; password_hash: string }
      | undefined;
  },
  create(passwordHash: string): number {
    const result = db
      .prepare('INSERT INTO users (password_hash) VALUES (?)')
      .run(passwordHash);
    return Number(result.lastInsertRowid);
  },
  updatePassword(id: number, passwordHash: string): void {
    db.prepare(
      'UPDATE users SET password_hash = ?, updated_at = unixepoch() WHERE id = ?',
    ).run(passwordHash, id);
  },
};
