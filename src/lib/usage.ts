import type { Account } from './api';

/**
 * Pure helpers that turn the server's usage numbers into what the app shows.
 * Every plan is capped (monthly, plus a daily limit), so nothing here says "unlimited".
 */

export type CapScope = 'month' | 'day';

/** Extra facts the server sends with a 402 (cap reached) or 429 (rate limited). */
export interface LimitDetails {
  scope?: CapScope;
  limit?: number;
  resetsAt?: string;
  canUpgrade?: boolean;
  retryAfter?: number;
}

export interface FormatOptions {
  locale?: string;
  timeZone?: string;
}

/**
 * Monthly caps reset at 00:00 UTC on the 1st, so the date defaults to UTC.
 * Otherwise US users would see "Oct 31" while the server says "November 1".
 */
export function formatResetDate(iso: string, opts: FormatOptions = {}): string {
  return new Date(iso).toLocaleDateString(opts.locale ?? 'en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: opts.timeZone ?? 'UTC',
  });
}

export function formatResetTime(iso: string, opts: FormatOptions = {}): string {
  return new Date(iso).toLocaleTimeString(opts.locale ?? 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: opts.timeZone,
  });
}

export interface UsageSummary {
  /** AI uses left right now (the smaller of month and today). */
  remaining: number;
  /** Which cap is exhausted, if any (month wins). */
  capped: CapScope | null;
  /** One-line status for the usage pill. */
  label: string;
  /** Call to action next to the label. */
  action: 'Upgrade' | 'Manage';
  /** When the current blocking cap (or the month) resets, readable. */
  resetText: string;
}

export function usageSummary(account: Account, opts: FormatOptions = {}): UsageSummary {
  const { usage, plan } = account;
  const monthLeft = Math.max(0, usage.limit - usage.used);
  const today = usage.today;
  const dayLeft = today ? Math.max(0, today.limit - today.used) : Infinity;

  // Older servers sent -1 for an uncapped plan; show the count without promising anything.
  if (usage.limit < 0) {
    return {
      remaining: Infinity,
      capped: null,
      label: `${usage.used} AI uses this month`,
      action: 'Manage',
      resetText: `Resets ${formatResetDate(usage.resetsAt, opts)}`,
    };
  }

  const capped: CapScope | null = monthLeft === 0 ? 'month' : dayLeft === 0 ? 'day' : null;
  const monthReset = formatResetDate(usage.resetsAt, opts);
  let label: string;
  let resetText = `Resets ${monthReset}`;
  if (capped === 'month') {
    label = plan === 'pro' ? `Monthly cap reached · resets ${monthReset}` : 'No AI uses left this month';
  } else if (capped === 'day' && today) {
    resetText = `Back at ${formatResetTime(today.resetsAt, opts)}`;
    label = `Daily limit reached · back at ${formatResetTime(today.resetsAt, opts)}`;
  } else if (dayLeft < monthLeft) {
    label = `${dayLeft} AI uses left today · ${monthLeft} this month`;
  } else {
    label = `${monthLeft} of ${usage.limit} AI uses left this month`;
  }

  return {
    remaining: Math.min(monthLeft, dayLeft),
    capped,
    label,
    action: capped && plan === 'free' ? 'Upgrade' : 'Manage',
    resetText,
  };
}

/** Plan description for Settings, e.g. "300 AI uses a month, up to 50 a day". */
export function planAllowance(account: Account): string {
  const { usage } = account;
  if (usage.limit < 0) return 'Usage is metered by your server';
  const month = `${usage.limit} AI uses a month`;
  return usage.today && usage.today.limit < usage.limit ? `${month}, up to ${usage.today.limit} a day` : month;
}

export interface LimitAlert {
  title: string;
  message: string;
  /** Offer an Upgrade button (Free plan, and Pro would actually help). */
  canUpgrade: boolean;
}

/** Title and copy for the alert shown when an AI call is refused by a cap or rate limit. */
export function limitAlert(err: { status?: number; code?: string; message: string; details?: LimitDetails }): LimitAlert | null {
  if (err.code === 'quota_exceeded') {
    const scope = err.details?.scope ?? 'month';
    return {
      title: scope === 'day' ? 'Daily AI limit reached' : 'Monthly AI limit reached',
      message: err.message,
      canUpgrade: err.details?.canUpgrade ?? true,
    };
  }
  if (err.code === 'rate_limited') {
    const secs = err.details?.retryAfter;
    return {
      title: 'Slow down a moment',
      message: secs ? `Too many AI requests in a short time. Try again in ${secs} seconds.` : err.message,
      canUpgrade: false,
    };
  }
  return null;
}
