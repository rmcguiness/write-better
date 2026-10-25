import { serve } from '@hono/node-server';
import { Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import {
  isValidEmail,
  isValidPassword,
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
  releaseUsage,
  reserveUsage,
  type UserRow,
} from './db.js';
import { billingEnabled, env } from './env.js';
import { accountFor, planLimit } from './plans.js';
import { generatePrompt, grade, review } from './providers.js';
import { clientIp, rateLimit } from './ratelimit.js';
import { LIMITS, parseHistory, parsePiece, parsePromptRequest } from './validate.js';

type Vars = { Variables: { user: UserRow } };
const app = new Hono<Vars>();

const allowedOrigins =
  env.corsOrigins.length > 0 ? env.corsOrigins : env.isProduction ? [new URL(env.appUrl).origin] : ['*'];
app.use('*', cors({ origin: allowedOrigins.includes('*') ? '*' : allowedOrigins }));
app.use(
  '*',
  bodyLimit({ maxSize: LIMITS.maxBodyBytes, onError: (c) => c.json({ error: 'Request is too large.' }, 413) }),
);

/** Parse a JSON body without throwing on malformed input. */
async function jsonBody(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

app.get('/', (c) => c.json({ ok: true, service: 'write-better', billing: billingEnabled }));

// --- Auth --------------------------------------------------------------------

app.use('/auth/*', rateLimit({ perMinute: env.authRateLimitPerMinute, key: clientIp }));

app.post('/auth/signup', async (c) => {
  const { email, password } = ((await jsonBody(c)) ?? {}) as { email?: unknown; password?: unknown };
  if (!isValidEmail(email)) return c.json({ error: 'Enter a valid email.' }, 400);
  if (!isValidPassword(password))
    return c.json({ error: 'Password must be 8 to 128 characters.' }, 400);
  if (getUserByEmail(email)) return c.json({ error: 'An account with that email already exists.' }, 409);

  const user = createUser(email, await hashPassword(password));
  const token = await issueToken(user.id);
  return c.json({ token, account: accountFor(user) });
});

app.post('/auth/login', async (c) => {
  const { email, password } = ((await jsonBody(c)) ?? {}) as { email?: unknown; password?: unknown };
  const user = isValidEmail(email) ? getUserByEmail(email) : undefined;
  if (!user || !isValidPassword(password) || !(await verifyPassword(password, user.password_hash))) {
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

const aiRateLimit = rateLimit({ perMinute: env.aiRateLimitPerMinute, key: (c) => c.get('user')?.id });
app.use('/feedback/*', aiRateLimit);
app.use('/prompts/*', aiRateLimit);

app.get('/me', (c) => c.json({ account: accountFor(c.get('user')) }));

/** Reserve one unit of quota before calling the provider; null = over quota. */
function reserve(user: UserRow, kind: 'grade' | 'review' | 'prompt'): string | null {
  return reserveUsage(user.id, kind, planLimit(user.plan));
}

function providerError(c: Parameters<MiddlewareHandler>[0], e: unknown, message: string) {
  console.error(`[write-better] ${message}`, e instanceof Error ? e.message : e);
  return c.json({ error: message }, 502);
}

// --- Feedback (metered) ------------------------------------------------------

app.post('/feedback/grade', async (c) => {
  const user = c.get('user');
  const body = (await jsonBody(c)) as { piece?: unknown } | undefined;
  const piece = parsePiece(body?.piece);
  if (!piece) return c.json({ error: 'Missing or invalid piece.' }, 400);
  const reservation = reserve(user, 'grade');
  if (!reservation)
    return c.json(
      { error: 'You’ve used all your feedback for this month. Upgrade to keep going.', code: 'quota_exceeded' },
      402,
    );
  try {
    const feedback = await grade(piece);
    return c.json({ feedback });
  } catch (e) {
    releaseUsage(reservation);
    return providerError(c, e, 'Grading failed. Please try again.');
  }
});

app.post('/feedback/review', async (c) => {
  const user = c.get('user');
  const body = (await jsonBody(c)) as { piece?: unknown; history?: unknown } | undefined;
  const piece = parsePiece(body?.piece);
  const history = parseHistory(body?.history);
  if (!piece || !history) return c.json({ error: 'Missing or invalid piece or history.' }, 400);
  const reservation = reserve(user, 'review');
  if (!reservation)
    return c.json(
      { error: 'You’ve used all your feedback for this month. Upgrade to keep going.', code: 'quota_exceeded' },
      402,
    );
  try {
    const reply = await review(piece, history);
    return c.json({ reply });
  } catch (e) {
    releaseUsage(reservation);
    return providerError(c, e, 'Review failed. Please try again.');
  }
});

app.post('/prompts/generate', async (c) => {
  const user = c.get('user');
  const req = parsePromptRequest(await jsonBody(c));
  if (!req) return c.json({ error: 'Invalid genre or word target.' }, 400);
  const reservation = reserve(user, 'prompt');
  if (!reservation)
    return c.json(
      { error: 'You’ve used all your AI for this month. Upgrade to keep going.', code: 'quota_exceeded' },
      402,
    );
  try {
    const prompt = await generatePrompt(req.genre, req.wordTarget);
    return c.json(prompt);
  } catch (e) {
    releaseUsage(reservation);
    return providerError(c, e, 'Prompt generation failed. Please try again.');
  }
});

// --- Billing -----------------------------------------------------------------

app.post('/billing/checkout', async (c) => {
  if (!billingEnabled) return c.json({ error: 'Billing is not configured on this server.' }, 503);
  try {
    return c.json({ url: await createCheckoutUrl(c.get('user')) });
  } catch (e) {
    return providerError(c, e, 'Checkout failed. Please try again.');
  }
});

app.post('/billing/portal', async (c) => {
  if (!billingEnabled) return c.json({ error: 'Billing is not configured on this server.' }, 503);
  try {
    return c.json({ url: await createPortalUrl(c.get('user')) });
  } catch (e) {
    return providerError(c, e, 'Could not open the billing portal. Please try again.');
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
    console.error('[write-better] Stripe webhook rejected', e instanceof Error ? e.message : e);
    return c.json({ error: 'Webhook error.' }, 400);
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
