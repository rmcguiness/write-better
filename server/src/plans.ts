import { env } from './env.js';
import { monthlyUsageCount, startOfNextMonth, type UserRow } from './db.js';

export type PlanId = 'free' | 'pro';

export function planLimit(plan: PlanId): number {
  return plan === 'pro' ? env.proMonthlyLimit : env.freeMonthlyLimit;
}

/** True if the user is under their monthly quota (-1 limit = unlimited). */
export function withinQuota(user: UserRow): boolean {
  const limit = planLimit(user.plan);
  if (limit < 0) return true;
  return monthlyUsageCount(user.id) < limit;
}

/** Shape returned to the client for the account/usage panel. */
export function accountFor(user: UserRow) {
  const limit = planLimit(user.plan);
  return {
    email: user.email,
    plan: user.plan,
    usage: {
      used: monthlyUsageCount(user.id),
      limit,
      resetsAt: new Date(startOfNextMonth()).toISOString(),
    },
  };
}
