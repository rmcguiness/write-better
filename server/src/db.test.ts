import { beforeEach, expect, it, vi } from 'vitest';
import { db, createUser, reserveUsage, releaseUsage, monthlyUsageCount, startOfNextMonth } from './db.js';
import { accountFor, planLimit, withinQuota } from './plans.js';
beforeEach(() => { db.exec('DELETE FROM usage_events; DELETE FROM users'); });
it('enforces plan limits and reserves the last slot atomically', async () => {
 const user = createUser('quota@example.com', 'hash');
 expect(planLimit('free')).toBe(2);
 expect(planLimit('pro')).toBe(-1);
 const results = await Promise.all(Array.from({ length: 20 }, async () => reserveUsage(user.id, 'grade', 2)));
 expect(results.filter(Boolean)).toHaveLength(2);
 expect(monthlyUsageCount(user.id)).toBe(2);
 expect(withinQuota(user)).toBe(false);
 expect(accountFor(user).usage).toMatchObject({ used: 2, limit: 2 });
 releaseUsage(results.find(Boolean)!);
 expect(withinQuota(user)).toBe(true);
 expect(reserveUsage(user.id, 'review', 2)).toBeTruthy();
 expect(reserveUsage(user.id, 'prompt', 2)).toBeNull();
});
it('keeps unlimited plans and separate users independent', () => {
 const a = createUser('a@example.com', 'hash');
 const b = createUser('b@example.com', 'hash');
 for (let i = 0; i < 5; i++) expect(reserveUsage(a.id, 'prompt', -1)).toBeTruthy();
 expect(withinQuota({ ...a, plan: 'pro' })).toBe(true);
 expect(monthlyUsageCount(b.id)).toBe(0);
 expect(reserveUsage(b.id, 'grade', 0)).toBeNull();
});
it('resets at the UTC month boundary including year rollover', () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-31T23:59:59Z'));
 const user = createUser('roll@example.com', 'hash');
 reserveUsage(user.id, 'grade', 1);
 expect(startOfNextMonth()).toBe(Date.parse('2027-01-01T00:00:00Z'));
 vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
 expect(monthlyUsageCount(user.id)).toBe(0);
 expect(reserveUsage(user.id, 'grade', 1)).toBeTruthy();
 expect(monthlyUsageCount(user.id)).toBe(1);
});
