import { beforeEach, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import { app } from './app.js';
import { db, createUser, reserveUsage, monthlyUsageCount } from './db.js';
import { issueToken } from './auth.js';
import { grade, review, generatePrompt } from './providers.js';
vi.mock('./providers.js', () => ({ grade: vi.fn(), review: vi.fn(), generatePrompt: vi.fn() }));
const piece = { body: 'A story', prompt: { genre: 'literary', text: 'A door' } };
beforeEach(() => { db.exec('DELETE FROM usage_events; DELETE FROM users'); vi.clearAllMocks(); });
function post(path: string, body: unknown, token?: string) {
 return app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
}
async function userToken() { const user = createUser(`${crypto.randomUUID()}@example.com`, 'hash'); return { user, token: await issueToken(user.id) }; }
it.each(['/me', '/feedback/grade', '/feedback/review', '/prompts/generate', '/billing/checkout', '/billing/portal'])('requires auth for %s', async path => {
 for (const authorization of ['', 'Bearer invalid.jwt.token']) {
  const res = await app.request(path, { method: path === '/me' ? 'GET' : 'POST', headers: { authorization } });
  expect(res.status).toBe(401);
 }
});
it('validates signup and login and supports real password/token round trips', async () => {
 expect((await post('/auth/signup', { email: 'bad', password: '12345678' })).status).toBe(400);
 expect((await post('/auth/signup', { email: 'valid@example.com', password: 'short' })).status).toBe(400);
 expect((await post('/auth/login', { email: 'bad', password: '12345678' })).status).toBe(401);
 const credentials = { email: 'valid@example.com', password: 'test-password' };
 const signup = await post('/auth/signup', credentials);
 expect(signup.status).toBe(200);
 const { token } = await signup.json() as { token: string };
 expect((await app.request('/me', { headers: { authorization: `Bearer ${token}` } })).status).toBe(200);
 expect((await post('/auth/signup', credentials)).status).toBe(409);
 expect((await post('/auth/login', { ...credentials, password: 'wrong-password' })).status).toBe(401);
 expect((await post('/auth/login', credentials)).status).toBe(200);
});
it('returns 429 with retry-after after the auth request limit', async () => {
 vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120000);
 const results = [];
 for (let i = 0; i < 11; i++) results.push(await post('/auth/login', {}));
 expect(results[9].status).toBe(401);
 expect(results[10].status).toBe(429);
 expect(results[10].headers.get('retry-after')).toBe('60');
});
it('rejects missing and invalid Stripe signatures', async () => {
 vi.spyOn(console, 'error').mockImplementation(() => {});
 expect((await post('/billing/webhook', {})).status).toBe(400);
 expect((await app.request('/billing/webhook', { method: 'POST', headers: { 'stripe-signature': 'invalid' }, body: '{}' })).status).toBe(400);
 expect(fetch).not.toHaveBeenCalled();
});
it('accepts a correctly signed Stripe test event', async () => {
 const payload = JSON.stringify({ id: 'evt_test', type: 'unhandled.test', data: { object: {} } });
 const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fake' });
 expect((await app.request('/billing/webhook', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload })).status).toBe(200);
});
it.each(['/feedback/grade', '/feedback/review', '/prompts/generate'])('returns quota_exceeded without calling AI: %s', async path => {
 const { user, token } = await userToken();
 reserveUsage(user.id, 'grade', 2); reserveUsage(user.id, 'review', 2);
 const res = await post(path, { piece, genre: 'poetry', wordTarget: 100 }, token);
 expect(res.status).toBe(402); expect(await res.json()).toHaveProperty('code', 'quota_exceeded');
 expect(grade).not.toHaveBeenCalled(); expect(review).not.toHaveBeenCalled(); expect(generatePrompt).not.toHaveBeenCalled();
});
it.each([
 ['/feedback/grade', { piece: { ...piece, body: 'x'.repeat(50001) } }],
 ['/feedback/grade', { piece: { ...piece, body: '' } }],
 ['/feedback/review', { piece, history: Array(21).fill({ role: 'writer', text: 'x' }) }],
 ['/feedback/review', { piece, history: [{ role: 'system', text: 'x' }] }],
 ['/feedback/review', { piece, history: [{ role: 'writer', text: 'x'.repeat(4001) }] }],
 ['/prompts/generate', { genre: 'x'.repeat(41) }],
 ['/prompts/generate', { wordTarget: 20001 }],
 ['/prompts/generate', { wordTarget: -1 }],
 ['/prompts/generate', { wordTarget: 1.5 }],
] as const)('validates input %s %#', async (path, body) => {
 const { user, token } = await userToken();
 expect((await post(path, body, token)).status).toBe(400);
 expect(monthlyUsageCount(user.id)).toBe(0);
});
it('rejects oversized request bodies', async () => {
 const { token } = await userToken();
 expect((await post('/feedback/grade', { piece: { ...piece, body: 'x'.repeat(128 * 1024) } }, token)).status).toBe(413);
});
it('releases reserved quota after a provider failure', async () => {
 vi.spyOn(console, 'error').mockImplementation(() => {});
 const { user, token } = await userToken();
 vi.mocked(grade).mockRejectedValue(new Error('fake failure'));
 expect((await post('/feedback/grade', { piece }, token)).status).toBe(502);
 expect(monthlyUsageCount(user.id)).toBe(0);
 vi.mocked(grade).mockResolvedValue({ overall: 90 } as Awaited<ReturnType<typeof grade>>);
 expect((await post('/feedback/grade', { piece }, token)).status).toBe(200);
 expect(monthlyUsageCount(user.id)).toBe(1);
});
it('rate limits AI calls per authenticated user', async () => {
 const { token } = await userToken();
 for (let i = 0; i < 20; i++) expect((await post('/feedback/grade', {}, token)).status).toBe(400);
 expect((await post('/feedback/grade', {}, token)).status).toBe(429);
});
