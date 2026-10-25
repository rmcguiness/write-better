/** Centralized environment access with sensible defaults. */

// Load .env if present (Node 20.12+ / 22+ built-in; no dependency needed).
try {
  process.loadEnvFile();
} catch {
  /* no .env file — rely on real environment variables */
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const isProduction = process.env.NODE_ENV === 'production';

/** JWT signing secret. Fails closed in production if missing, short or a placeholder. */
function jwtSecret(): string {
  const v = process.env.JWT_SECRET ?? '';
  const weak = v.length < 32 || /change-me|dev-insecure/i.test(v);
  if (!weak) return v;
  if (isProduction) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
  }
  console.warn('[write-better] JWT_SECRET is missing or weak; using an insecure dev secret. Never do this in production.');
  return v || 'dev-insecure-secret-change-me';
}

function list(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  isProduction,
  port: num('PORT', 8787),
  appUrl: process.env.APP_URL || 'http://localhost:8787',
  jwtSecret: jwtSecret(),
  // Browser origins allowed to call the API (comma-separated). Native apps don't need CORS.
  // Unset: any origin in development, only APP_URL's origin in production.
  corsOrigins: list('CORS_ORIGINS'),
  // Set to 1 only behind a reverse proxy you control, so X-Forwarded-For can be trusted.
  trustProxy: process.env.TRUST_PROXY === '1',

  aiProvider: (process.env.AI_PROVIDER || 'anthropic') as 'anthropic' | 'openai' | 'xai',
  aiModel: process.env.AI_MODEL || 'claude-haiku-4-5',

  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  openaiKey: process.env.OPENAI_API_KEY || '',
  xaiKey: process.env.XAI_API_KEY || '',

  stripeSecret: process.env.STRIPE_SECRET_KEY || '',
  stripePriceId: process.env.STRIPE_PRICE_ID || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  freeMonthlyLimit: num('FREE_MONTHLY_LIMIT', 10),
  proMonthlyLimit: num('PRO_MONTHLY_LIMIT', -1),

  // Basic abuse limits (per server instance, in memory).
  authRateLimitPerMinute: num('AUTH_RATE_LIMIT_PER_MINUTE', 10),
  aiRateLimitPerMinute: num('AI_RATE_LIMIT_PER_MINUTE', 20),
};

export const billingEnabled = !!env.stripeSecret && !!env.stripePriceId;
