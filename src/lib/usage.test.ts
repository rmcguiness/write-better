import { describe, expect, it } from 'vitest';
import type { Account } from './api';
import { formatResetDate, limitAlert, planAllowance, usageSummary } from './usage';

const utc = { timeZone: 'UTC' };
function account(plan: 'free' | 'pro', used: number, limit: number, today?: [number, number]): Account {
  return {
    email: 'writer@example.com',
    plan,
    usage: {
      used,
      limit,
      resetsAt: '2026-11-01T00:00:00.000Z',
      ...(today ? { today: { used: today[0], limit: today[1], resetsAt: '2026-10-26T00:00:00.000Z' } } : {}),
    },
  };
}

describe('usageSummary', () => {
  it('shows what is left this month', () => {
    expect(usageSummary(account('free', 3, 10, [3, 10]), utc)).toMatchObject({
      remaining: 7, capped: null, label: '7 of 10 AI uses left this month', action: 'Manage',
    });
  });
  it('shows the daily limit when it is the tighter one', () => {
    expect(usageSummary(account('pro', 100, 300, [45, 50]), utc)).toMatchObject({
      remaining: 5, capped: null, label: '5 AI uses left today · 200 this month',
    });
  });
  it('offers an upgrade when a Free user runs out', () => {
    expect(usageSummary(account('free', 10, 10, [2, 10]), utc)).toMatchObject({
      remaining: 0, capped: 'month', label: 'No AI uses left this month', action: 'Upgrade',
    });
  });
  it('tells a capped Pro user when it resets, without an upgrade', () => {
    expect(usageSummary(account('pro', 300, 300, [10, 50]), utc)).toMatchObject({
      capped: 'month', label: 'Monthly cap reached · resets Nov 1', action: 'Manage', resetText: 'Resets Nov 1',
    });
  });
  it('reports the daily cap with the reset time', () => {
    expect(usageSummary(account('pro', 120, 300, [50, 50]), utc)).toMatchObject({
      capped: 'day', label: 'Daily limit reached · back at 12:00 AM', action: 'Manage',
    });
  });
  it('never says unlimited, even for an older server that sends -1', () => {
    const s = usageSummary(account('pro', 42, -1), utc);
    expect(s.label).toBe('42 AI uses this month');
    expect(JSON.stringify(s)).not.toMatch(/unlimited/i);
  });
});

it('describes the plan allowance', () => {
  expect(planAllowance(account('pro', 0, 300, [0, 50]))).toBe('300 AI uses a month, up to 50 a day');
  expect(planAllowance(account('free', 0, 10, [0, 10]))).toBe('10 AI uses a month');
});

describe('limitAlert', () => {
  it('titles cap errors by scope and respects canUpgrade', () => {
    expect(limitAlert({ code: 'quota_exceeded', message: 'm', details: { scope: 'day', canUpgrade: false } }))
      .toEqual({ title: 'Daily AI limit reached', message: 'm', canUpgrade: false });
    expect(limitAlert({ code: 'quota_exceeded', message: 'm' }))
      .toEqual({ title: 'Monthly AI limit reached', message: 'm', canUpgrade: true });
  });
  it('explains rate limits with the retry time', () => {
    expect(limitAlert({ code: 'rate_limited', message: 'x', details: { retryAfter: 42 } })?.message)
      .toBe('Too many AI requests in a short time. Try again in 42 seconds.');
  });
  it('ignores other errors', () => {
    expect(limitAlert({ code: 'unauthorized', message: 'x' })).toBeNull();
  });
});

it('shows the monthly reset as the UTC calendar date in every time zone', () => {
  const iso = '2026-11-01T00:00:00.000Z';
  expect(formatResetDate(iso)).toBe('Nov 1');
  expect(formatResetDate(iso, { timeZone: 'America/New_York' })).toBe('Oct 31');
});
