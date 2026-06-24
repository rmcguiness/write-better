import { serve } from '@hono/node-server';
import { Hono, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';

import {
  isValidEmail,
  hashPassword,
  issueToken,
  userIdFromAuthHeader,
  verifyPassword,
} from './auth.js';
import { createCheckoutUrl, createPortalUrl, handleWebhook } from './billing.js';
import {
  createUser,
  getUserByEmail,
  getUserById,
  recordUsage,
  type UserRow,
} from './db.js';
import { billingEnabled, env } from './env.js';
import { accountFor, withinQuota } from './plans.js';
import { generatePrompt, grade, review, type Piece, type ReviewTurn } from './providers.js';

type Vars = { Variables: { user: UserRow } };
const app = new Hono<Vars>();

app.use('*', cors());

app.get('/', (c) => c.json({ ok: true, service: 'write-better', billing: billingEnabled }));

// --- Auth --------------------------------------------------------------------

app.post('/auth/signup', async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  if (!email || !isValidEmail(email)) return c.json({ error: 'Enter a valid email.' }, 400);
  if (!password || password.length < 8)
    return c.json({ error: 'Password must be at least 8 characters.' }, 400);
  if (getUserByEmail(email)) return c.json({ error: 'An account with that email already exists.' }, 409);

  const user = createUser(email, hashPassword(password));
  const token = await issueToken(user.id);
  return c.json({ token, account: accountFor(user) });
});

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  const user = email ? getUserByEmail(email) : undefined;
  if (!user || !password || !verifyPassword(password, user.password_hash)) {
    return c.json({ error: 'Wrong email or password.' }, 401);
  }
  const token = await issueToken(user.id);
  return c.json({ token, account: accountFor(user) });
});

// --- Auth middleware for protected routes ------------------------------------

const requireAuth: MiddlewareHandler<Vars> = async (c, next) => {
  const userId = await userIdFromAuthHeader(c.req.header('authorization'));
  const user = userId ? getUserById(userId) : undefined;
  if (!user) return c.json({ error: 'Please sign in again.', code: 'unauthorized' }, 401);
  c.set('user', user);
  await next();
};

app.use('/me', requireAuth);
app.use('/feedback/*', requireAuth);
app.use('/prompts/*', requireAuth);
app.use('/billing/checkout', requireAuth);
app.use('/billing/portal', requireAuth);

app.get('/me', (c) => c.json({ account: accountFor(c.get('user')) }));

// --- Feedback (metered) ------------------------------------------------------

app.post('/feedback/grade', async (c) => {
  const user = c.get('user');
  if (!withinQuota(user))
    return c.json(
      { error: 'You’ve used all your feedback for this month. Upgrade to keep going.', code: 'quota_exceeded' },
      402,
    );
  const { piece } = await c.req.json<{ piece: Piece }>();
  if (!piece?.body) return c.json({ error: 'Missing piece.' }, 400);
  try {
    const feedback = await grade(piece);
    recordUsage(user.id, 'grade');
    return c.json({ feedback });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Grading failed.' }, 502);
  }
});

app.post('/feedback/review', async (c) => {
  const user = c.get('user');
  if (!withinQuota(user))
    return c.json(
      { error: 'You’ve used all your feedback for this month. Upgrade to keep going.', code: 'quota_exceeded' },
      402,
    );
  const { piece, history } = await c.req.json<{ piece: Piece; history?: ReviewTurn[] }>();
  if (!piece?.body) return c.json({ error: 'Missing piece.' }, 400);
  try {
    const reply = await review(piece, history ?? []);
    recordUsage(user.id, 'review');
    return c.json({ reply });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Review failed.' }, 502);
  }
});

app.post('/prompts/generate', async (c) => {
  const user = c.get('user');
  if (!withinQuota(user))
    return c.json(
      { error: 'You’ve used all your AI for this month. Upgrade to keep going.', code: 'quota_exceeded' },
      402,
    );
  const { genre, wordTarget } = await c.req.json<{ genre?: string; wordTarget?: number }>();
  try {
    const prompt = await generatePrompt(genre ?? 'literary', wordTarget ?? 0);
    recordUsage(user.id, 'prompt');
    return c.json(prompt);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Prompt generation failed.' }, 502);
  }
});

// --- Billing -----------------------------------------------------------------

app.post('/billing/checkout', async (c) => {
  if (!billingEnabled) return c.json({ error: 'Billing is not configured on this server.' }, 503);
  try {
    return c.json({ url: await createCheckoutUrl(c.get('user')) });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Checkout failed.' }, 502);
  }
});

app.post('/billing/portal', async (c) => {
  if (!billingEnabled) return c.json({ error: 'Billing is not configured on this server.' }, 503);
  try {
    return c.json({ url: await createPortalUrl(c.get('user')) });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Could not open billing portal.' }, 502);
  }
});

// Stripe webhook — needs the raw body and no auth.
app.post('/billing/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) return c.json({ error: 'Missing signature.' }, 400);
  const raw = await c.req.text();
  try {
    await handleWebhook(raw, signature);
    return c.json({ received: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Webhook error.' }, 400);
  }
});

// Friendly landing page after Stripe redirects back.
app.get('/billing/return', (c) =>
  c.html(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
     <body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b0c;color:#ececee">
     <div style="text-align:center"><h2>All set 🎉</h2><p>You can close this tab and return to Write Better.</p></div>`,
  ),
);

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Write Better backend on http://localhost:${info.port}  (billing: ${billingEnabled ? 'on' : 'off'})`);
});
