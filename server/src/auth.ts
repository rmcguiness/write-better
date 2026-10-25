import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sign, verify } from 'hono/jwt';

import { env } from './env.js';

/** Password hashing (scrypt) and JWT issue/verify. No external auth deps. */

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

// Async scrypt so hashing doesn't block the event loop.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)).toString('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = await scryptAsync(password, salt, 64);
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

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}
