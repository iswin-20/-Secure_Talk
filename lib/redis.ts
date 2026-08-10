// lib/redis.ts — SQLite drop-in replacement for Upstash Redis
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data.db');

class SQLiteStore {
  private db: Database.Database;

  constructor() {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER
      )
    `);
    // Clean expired keys periodically
    db.exec(`DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at < ${Date.now()}`);
    this.db = db;
  }

  async set(key: string, value: unknown, opts?: { ex?: number }) {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : null;
    const json = typeof value === 'string' ? value : JSON.stringify(value);
    this.db.prepare(
      'INSERT OR REPLACE INTO kv (key, value, expires_at) VALUES (?, ?, ?)'
    ).run(key, json, expiresAt);
    return 'OK';
  }

  async get(key: string) {
    this._clean();
    const row = this.db.prepare(
      'SELECT value FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)'
    ).get(key, Date.now()) as { value: string } | undefined;
    if (!row) return null;
    try { return JSON.parse(row.value); } catch { return row.value; }
  }

  async del(key: string) {
    this.db.prepare('DELETE FROM kv WHERE key = ?').run(key);
    return 1;
  }

  async scan(_cursor: number, opts?: { match?: string; count?: number }) {
    this._clean();
    let query = 'SELECT key FROM kv';
    const params: string[] = [];
    if (opts?.match) {
      const pattern = opts.match.replace(/\*/g, '%');
      query += ' WHERE key LIKE ?';
      params.push(pattern);
    }
    if (opts?.count) {
      query += ' LIMIT ?';
      params.push(String(opts.count));
    }
    const rows = this.db.prepare(query).all(...params) as { key: string }[];
    return [0, rows.map(r => r.key)] as [number, string[]];
  }

  private _clean() {
    this.db.prepare('DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at < ?').run(Date.now());
  }
}

const store = new SQLiteStore();

export const redis = {
  set: (key: string, value: unknown, opts?: { ex?: number }) => store.set(key, value, opts),
  get: <T = unknown>(key: string): Promise<T | null> => store.get(key) as Promise<T | null>,
  del: (key: string) => store.del(key),
  scan: (cursor: number, opts?: { match?: string; count?: number }) => store.scan(cursor, opts),
  pipeline: () => {
    const commands: Array<() => Promise<unknown>> = [];
    const p = {
      del: (key: string) => { commands.push(() => store.del(key)); return p; },
      exec: async () => {
        for (const cmd of commands) await cmd();
        return commands.map(() => [null, 1] as [null, number]);
      },
    };
    return p;
  },
};
