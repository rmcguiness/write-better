import { beforeEach, expect, it, vi } from 'vitest';
import {
  db, createUser, reserveUsage, releaseUsage, monthlyUsageCount, dailyUsageCount, startOfNextMonth, startOfNextDay,
} from './db.js';
import { accountFor, planLimit, planLimits, withinQuota } from './plans.js';
beforeEach(() => { db.exec('DELETE FROM usage_events; DELETE FROM users'); });
const big = { monthly: 1000, daily: 1000 };
it('enforces plan limits and reserves the last slot atomically', async () => {
 const user = createUser('quota@example.com', 'hash');
 expect(planLimit('free')).toBe(2);
 const results = await Promise.all(Array.from({ length: 20 }, async () => reserveUsage(user.id, 'grade', planLimits('free'))));
 expect(results.filter(r => r.ok)).toHaveLength(2);
 expect(monthlyUsageCount(user.id)).toBe(2);
 expect(withinQuota(user)).toBe(false);
 expect(accountFor(user).usage).toMatchObject({ used: 2, limit: 2 });
 const first = results.find(r => r.ok);
 releaseUsage(first!.ok ? first!.id : '');
 expect(withinQuota(user)).toBe(true);
 expect(reserveUsage(user.id, 'review', planLimits('free')).ok).toBe(true);
 expect(reserveUsage(user.id, 'prompt', planLimits('free'))).toEqual({ ok: false, scope: 'month' });
});
it('caps the Pro plan monthly and daily (no unlimited plan)', () => {
 expect(planLimits('pro')).toEqual({ monthly: 5, daily: 3 });
 const user = { ...createUser('pro@example.com', 'hash'), plan: 'pro' as const };
 for (let i = 0; i < 3; i++) expect(reserveUsage(user.id, 'grade', planLimits('pro')).ok).toBe(true);
 expect(reserveUsage(user.id, 'grade', planLimits('pro'))).toEqual({ ok: false, scope: 'day' });
 expect(withinQuota(user)).toBe(false);
 expect(accountFor(user).usage).toMatchObject({ used: 3, limit: 5, today: { used: 3, limit: 3 } });
});
it('reports the monthly cap before the daily cap', () => {
 const user = createUser('both@example.com', 'hash');
 reserveUsage(user.id, 'grade', big);
 expect(reserveUsage(user.id, 'grade', { monthly: 1, daily: 1 })).toEqual({ ok: false, scope: 'month' });
});
it('keeps separate users independent and a zero cap blocks everything', () => {
 const a = createUser('a@example.com', 'hash');
 const b = createUser('b@example.com', 'hash');
 for (let i = 0; i < 5; i++) expect(reserveUsage(a.id, 'prompt', big).ok).toBe(true);
 expect(monthlyUsageCount(b.id)).toBe(0);
 expect(reserveUsage(b.id, 'grade', { monthly: 0, daily: 10 })).toEqual({ ok: false, scope: 'month' });
});
it('resets the daily cap at the UTC day boundary', () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-10T23:59:59Z'));
 const user = createUser('day@example.com', 'hash');
 expect(reserveUsage(user.id, 'grade', { monthly: 10, daily: 1 }).ok).toBe(true);
 expect(reserveUsage(user.id, 'grade', { monthly: 10, daily: 1 })).toEqual({ ok: false, scope: 'day' });
 expect(startOfNextDay()).toBe(Date.parse('2026-11-11T00:00:00Z'));
 vi.setSystemTime(new Date('2026-11-11T00:00:00Z'));
 expect(dailyUsageCount(user.id)).toBe(0);
 expect(monthlyUsageCount(user.id)).toBe(1);
 expect(reserveUsage(user.id, 'grade', { monthly: 10, daily: 1 }).ok).toBe(true);
});
it('resets at the UTC month boundary including year rollover', () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-31T23:59:59Z'));
 const user = createUser('roll@example.com', 'hash');
 reserveUsage(user.id, 'grade', { monthly: 1, daily: 5 });
 expect(startOfNextMonth()).toBe(Date.parse('2027-01-01T00:00:00Z'));
 vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
 expect(monthlyUsageCount(user.id)).toBe(0);
 expect(reserveUsage(user.id, 'grade', { monthly: 1, daily: 5 }).ok).toBe(true);
 expect(monthlyUsageCount(user.id)).toBe(1);
});
