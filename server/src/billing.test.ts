import { beforeEach, expect, it } from 'vitest';
import Stripe from 'stripe';
import { handleWebhook } from './billing.js';
import { db, createUser, setStripeCustomer, getUserById } from './db.js';
beforeEach(() => { db.exec('DELETE FROM users; DELETE FROM usage_events'); });
it.each([
 ['customer.subscription.created', 'active', 'pro'],
 ['customer.subscription.updated', 'trialing', 'pro'],
 ['customer.subscription.updated', 'past_due', 'free'],
 ['customer.subscription.deleted', 'active', 'free'],
 ['checkout.session.completed', 'active', 'free'],
])('applies entitlement for %s / %s', async (type, status, plan) => {
 const user = createUser('billing@example.com', 'hash'); setStripeCustomer(user.id, 'cus_fake');
 const payload = JSON.stringify({ id: 'evt_fake', type, data: { object: { customer: 'cus_fake', status } } });
 await handleWebhook(payload, Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fake' }));
 expect(getUserById(user.id)?.plan).toBe(plan);
});
it('does not mutate entitlement for a bad signature', async () => {
 const user = createUser('billing@example.com', 'hash');
 await expect(handleWebhook('{}', 'bad')).rejects.toThrow();
 expect(getUserById(user.id)?.plan).toBe('free');
});
