import Stripe from 'stripe';

import { env, billingEnabled } from './env.js';
import { getUserByStripeCustomer, setStripeCustomer, setUserPlan, type UserRow } from './db.js';

/** Stripe integration: checkout, customer portal, and webhook plan sync. */

export const stripe = billingEnabled ? new Stripe(env.stripeSecret) : null;

async function ensureCustomer(user: UserRow): Promise<string> {
  if (!stripe) throw new Error('Billing is not configured.');
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });
  setStripeCustomer(user.id, customer.id);
  return customer.id;
}

export async function createCheckoutUrl(user: UserRow): Promise<string> {
  if (!stripe) throw new Error('Billing is not configured.');
  const customer = await ensureCustomer(user);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price: env.stripePriceId, quantity: 1 }],
    success_url: `${env.appUrl}/billing/return?status=success`,
    cancel_url: `${env.appUrl}/billing/return?status=cancel`,
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return session.url;
}

export async function createPortalUrl(user: UserRow): Promise<string> {
  if (!stripe) throw new Error('Billing is not configured.');
  const customer = await ensureCustomer(user);
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${env.appUrl}/billing/return?status=portal`,
  });
  return session.url;
}

/** Verify and apply a Stripe webhook event. Throws on bad signature. */
export async function handleWebhook(rawBody: string, signature: string): Promise<void> {
  if (!stripe) throw new Error('Billing is not configured.');
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      applyPlanByCustomer(session.customer, 'pro');
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === 'active' || sub.status === 'trialing';
      applyPlanByCustomer(sub.customer, active ? 'pro' : 'free');
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      applyPlanByCustomer(sub.customer, 'free');
      break;
    }
    default:
      break;
  }
}

function applyPlanByCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null, plan: 'free' | 'pro') {
  const customerId = typeof customer === 'string' ? customer : customer?.id;
  if (!customerId) return;
  const user = getUserByStripeCustomer(customerId);
  if (user) setUserPlan(user.id, plan);
}
