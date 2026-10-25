import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

/** SQLite persistence. One file on disk; swap for Postgres in production. */

export const db = new Database(process.env.DB_PATH || 'write-better.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usage_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_usage_user_time ON usage_events (user_id, created_at);
`);

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  plan: 'free' | 'pro';
  stripe_customer_id: string | null;
  created_at: number;
}

export function createUser(email: string, passwordHash: string): UserRow {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, plan, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, email, passwordHash, 'free', Date.now());
  return getUserById(id)!;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function setUserPlan(id: string, plan: 'free' | 'pro'): void {
  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, id);
}

export function setStripeCustomer(id: string, customerId: string): void {
  db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, id);
}

export function getUserByStripeCustomer(customerId: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId) as
    | UserRow
    | undefined;
}

/** Start (ms) of the current UTC calendar month. */
export function startOfMonth(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

/** Start (ms) of next UTC month — when the quota resets. */
export function startOfNextMonth(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
}

export function monthlyUsageCount(userId: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS n FROM usage_events WHERE user_id = ? AND kind IN ('grade','review','prompt') AND created_at >= ?",
    )
    .get(userId, startOfMonth()) as { n: number };
  return row.n;
}

export function recordUsage(
  userId: string,
  kind: 'grade' | 'review' | 'prompt',
  tokensIn = 0,
  tokensOut = 0,
): void {
  db.prepare(
    'INSERT INTO usage_events (id, user_id, kind, tokens_in, tokens_out, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(randomUUID(), userId, kind, tokensIn, tokensOut, Date.now());
}

/**
 * Atomically check the monthly quota and record a usage event (limit < 0 = unlimited).
 * Returns the event id, or null when the user is over quota. Reserving before the
 * provider call stops parallel requests from overshooting the quota.
 */
export const reserveUsage = db.transaction(
  (userId: string, kind: 'grade' | 'review' | 'prompt', limit: number): string | null => {
    if (limit >= 0 && monthlyUsageCount(userId) >= limit) return null;
    const id = randomUUID();
    db.prepare(
      'INSERT INTO usage_events (id, user_id, kind, tokens_in, tokens_out, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, userId, kind, 0, 0, Date.now());
    return id;
  },
);

/** Give a reserved usage event back (e.g. the provider call failed). */
export function releaseUsage(eventId: string): void {
  db.prepare('DELETE FROM usage_events WHERE id = ?').run(eventId);
}
