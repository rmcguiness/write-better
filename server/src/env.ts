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

export const env = {
  port: num('PORT', 8787),
  appUrl: process.env.APP_URL || 'http://localhost:8787',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',

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
};

export const billingEnabled = !!env.stripeSecret && !!env.stripePriceId;
