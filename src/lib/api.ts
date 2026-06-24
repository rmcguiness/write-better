import type { Feedback, Piece, ReviewTurn } from './types';

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
    limit: number; // -1 = unlimited
    resetsAt: string; // ISO date
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  backendUrl: string,
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${backendUrl.replace(/\/$/, '')}${path}`, {
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
    if (res.status === 402)
      throw new ApiError(402, msg ?? 'You’ve hit your plan’s monthly limit.', code ?? 'quota_exceeded');
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
