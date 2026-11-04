import { WEB_DEMO } from './demo';
import type { Feedback, Piece, ReviewTurn } from './types';
import type { LimitDetails } from './usage';

/**
 * Client for the Write Better managed backend. In managed mode the app never
 * sees a provider key — it authenticates with the backend, which holds the
 * keys, meters usage, and enforces plan quotas.
 */

export type PlanId = 'free' | 'pro';

export interface Account {
  email: string;
  plan: PlanId;
  usage: {
    used: number;
    limit: number; // monthly cap (older servers may send -1)
    resetsAt: string; // ISO date
    /** Daily cap; absent on older servers. */
    today?: { used: number; limit: number; resetsAt: string };
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: LimitDetails;
  constructor(status: number, message: string, code?: string, details?: LimitDetails) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Validate the configured backend URL. Credentials and writing are sent to it, so
 * plain HTTP is only allowed in development builds or for this device (localhost).
 */
export function checkBackendUrl(backendUrl: string): string {
  let url: URL;
  try {
    url = new URL(backendUrl);
  } catch {
    throw new ApiError(0, 'The backend URL is not valid. Check it in Settings.');
  }
  if (url.username || url.password) throw new ApiError(0, 'The backend URL must not contain a username or password.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const httpAllowed = (typeof __DEV__ !== 'undefined' && __DEV__) || local;
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && httpAllowed)) {
    throw new ApiError(0, 'Use an https:// backend URL.');
  }
  return backendUrl.replace(/\/$/, '');
}

async function request<T>(
  backendUrl: string,
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  if (WEB_DEMO) throw new ApiError(0, 'This web demo supports your own API key only.');
  const base = checkBackendUrl(backendUrl);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check the backend URL in Settings.');
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const msg = (data as { error?: string })?.error;
    const code = (data as { code?: string })?.code;
    if (res.status === 401) throw new ApiError(401, msg ?? 'Please sign in again.', code ?? 'unauthorized');
    if (res.status === 402) {
      const d = data as LimitDetails | null;
      throw new ApiError(402, msg ?? 'You’ve reached your plan’s AI limit.', code ?? 'quota_exceeded', {
        scope: d?.scope,
        limit: d?.limit,
        resetsAt: d?.resetsAt,
        canUpgrade: d?.canUpgrade,
      });
    }
    if (res.status === 429) {
      const retryAfter = Number((data as LimitDetails | null)?.retryAfter ?? res.headers.get('retry-after')) || undefined;
      throw new ApiError(429, msg ?? 'Too many requests. Please wait a minute.', code ?? 'rate_limited', { retryAfter });
    }
    throw new ApiError(res.status, msg ?? `Request failed (${res.status}).`, code);
  }
  return data as T;
}

export async function signUp(
  backendUrl: string,
  email: string,
  password: string,
): Promise<{ token: string; account: Account }> {
  return request(backendUrl, '/auth/signup', { method: 'POST', body: { email, password } });
}

export async function logIn(
  backendUrl: string,
  email: string,
  password: string,
): Promise<{ token: string; account: Account }> {
  return request(backendUrl, '/auth/login', { method: 'POST', body: { email, password } });
}

export async function getAccount(backendUrl: string, token: string): Promise<Account> {
  const { account } = await request<{ account: Account }>(backendUrl, '/me', { token });
  return account;
}

export async function gradeViaBackend(
  backendUrl: string,
  token: string,
  piece: Piece,
): Promise<Feedback> {
  const { feedback } = await request<{ feedback: Feedback }>(backendUrl, '/feedback/grade', {
    method: 'POST',
    token,
    body: { piece },
  });
  return feedback;
}

export async function reviewViaBackend(
  backendUrl: string,
  token: string,
  piece: Piece,
  history: ReviewTurn[],
): Promise<string> {
  const { reply } = await request<{ reply: string }>(backendUrl, '/feedback/review', {
    method: 'POST',
    token,
    body: { piece, history },
  });
  return reply;
}

export async function generatePromptViaBackend(
  backendUrl: string,
  token: string,
  genre: string,
  wordTarget: number,
): Promise<{ text: string; tip: string }> {
  return request(backendUrl, '/prompts/generate', {
    method: 'POST',
    token,
    body: { genre, wordTarget },
  });
}

/** Returns a Stripe Checkout URL to open in a browser to upgrade. */
export async function startCheckout(backendUrl: string, token: string): Promise<string> {
  const { url } = await request<{ url: string }>(backendUrl, '/billing/checkout', {
    method: 'POST',
    token,
  });
  return url;
}

/** Returns a Stripe customer-portal URL for managing/canceling a subscription. */
export async function openBillingPortal(backendUrl: string, token: string): Promise<string> {
  const { url } = await request<{ url: string }>(backendUrl, '/billing/portal', {
    method: 'POST',
    token,
  });
  return url;
}
