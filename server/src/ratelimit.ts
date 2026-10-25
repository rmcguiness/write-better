import type { Context, MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

import { env } from './env.js';

/**
 * Minimal fixed-window rate limiter kept in memory. Good enough for a single
 * instance; use a shared store (Redis, the platform firewall, etc.) when scaling out.
 */
export function rateLimit(opts: {
  perMinute: number;
  key: (c: Context) => string | undefined;
}): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    if (opts.perMinute <= 0) return next();
    const key = opts.key(c) ?? 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + 60_000 };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    if (entry.count > opts.perMinute) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: 'Too many requests. Please wait a minute and try again.', code: 'rate_limited' }, 429);
    }
    await next();
  };
}

/** Client IP. X-Forwarded-For is only trusted when TRUST_PROXY=1. */
export function clientIp(c: Context): string | undefined {
  if (env.trustProxy) {
    const fwd = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (fwd) return fwd;
  }
  try {
    return getConnInfo(c).remote.address;
  } catch {
    return undefined;
  }
}
