import { env } from './env.js';
import {
  dailyUsageCount,
  monthlyUsageCount,
  startOfNextDay,
  startOfNextMonth,
  type CapScope,
  type UserRow,
} from './db.js';

export type PlanId = 'free' | 'pro';

export interface PlanLimits {
  /** AI uses included per UTC calendar month. */
  monthly: number;
  /** AI uses allowed per UTC day, so a month's allowance can't be burned in one sitting. */
  daily: number;
}

/** Every plan is capped (see env.ts). */
export function planLimits(plan: PlanId): PlanLimits {
  return plan === 'pro'
    ? { monthly: env.proMonthlyLimit, daily: env.proDailyLimit }
    : { monthly: env.freeMonthlyLimit, daily: env.freeDailyLimit };
}

/** Monthly cap for a plan. */
export function planLimit(plan: PlanId): number {
  return planLimits(plan).monthly;
}

/** True if the user is under both their monthly and daily caps. */
export function withinQuota(user: UserRow): boolean {
  const limits = planLimits(user.plan);
  return monthlyUsageCount(user.id) < limits.monthly && dailyUsageCount(user.id) < limits.daily;
}

/** Shape returned to the client for the account/usage panel. */
export function accountFor(user: UserRow) {
  const limits = planLimits(user.plan);
  return {
    email: user.email,
    plan: user.plan,
    usage: {
      used: monthlyUsageCount(user.id),
      limit: limits.monthly,
      resetsAt: new Date(startOfNextMonth()).toISOString(),
      today: {
        used: dailyUsageCount(user.id),
        limit: limits.daily,
        resetsAt: new Date(startOfNextDay()).toISOString(),
      },
    },
  };
}

function monthDay(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Body of the 402 returned when a cap is hit: a readable message plus the facts the app shows. */
export function capReached(user: UserRow, scope: CapScope) {
  const plan = user.plan;
  const limits = planLimits(plan);
  const limit = scope === 'month' ? limits.monthly : limits.daily;
  const resetsAt = scope === 'month' ? startOfNextMonth() : startOfNextDay();
  const proHasMore = scope === 'month' ? env.proMonthlyLimit > limits.monthly : env.proDailyLimit > limits.daily;
  const canUpgrade = plan === 'free' && proHasMore;

  let error: string;
  if (scope === 'month') {
    error =
      plan === 'pro'
        ? `You’ve reached the Pro plan’s monthly cap of ${limit} AI uses. It resets on ${monthDay(resetsAt)}.`
        : `You’ve used all ${limit} AI uses included with the Free plan this month. ` +
          (canUpgrade ? `Upgrade to Pro for more, or wait for the reset on ${monthDay(resetsAt)}.` : `It resets on ${monthDay(resetsAt)}.`);
  } else {
    error =
      `You’ve reached today’s limit of ${limit} AI uses. It resets at midnight UTC.` +
      (canUpgrade ? ' Pro has a higher daily limit.' : '');
  }

  return { error, code: 'quota_exceeded' as const, scope, plan, limit, resetsAt: new Date(resetsAt).toISOString(), canUpgrade };
}
