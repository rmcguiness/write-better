import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { sign, verify } from 'hono/jwt';

import { env } from './env.js';

/** Password hashing (scrypt) and JWT issue/verify. No external auth deps. */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function issueToken(userId: string): Promise<string> {
  return sign({ sub: userId, exp: Math.floor(Date.now() / 1000) + THIRTY_DAYS }, env.jwtSecret, 'HS256');
}

/** Returns the user id from a Bearer token, or null if missing/invalid. */
export async function userIdFromAuthHeader(header: string | undefined): Promise<string | null> {
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = await verify(header.slice(7), env.jwtSecret, 'HS256');
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
