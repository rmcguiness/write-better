import { Hono } from 'hono';
import { expect, it, vi } from 'vitest';
import { rateLimit } from './ratelimit.js';
function appWith(key: (ip: string | undefined) => string | undefined, skipUnknownKey = false) {
 const app = new Hono();
 app.use('*', rateLimit({ perMinute: 2, key: c => key(c.req.header('x-test-ip')), skipUnknownKey }));
 app.get('/', c => c.text('ok'));
 return app;
}
it('limits per key, reports retryAfter, and resets after the window', async () => {
 const app = appWith(ip => ip);
 const hit = (ip: string) => app.request('/', { headers: { 'x-test-ip': ip } });
 expect((await hit('1.1.1.1')).status).toBe(200);
 expect((await hit('1.1.1.1')).status).toBe(200);
 const limited = await hit('1.1.1.1');
 expect(limited.status).toBe(429);
 expect(await limited.json()).toMatchObject({ code: 'rate_limited', retryAfter: 60 });
 expect((await hit('2.2.2.2')).status).toBe(200);
 vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
 expect((await hit('1.1.1.1')).status).toBe(200);
});
it('can skip requests with no key instead of pooling them', async () => {
 const pooled = appWith(() => undefined);
 const skipped = appWith(() => undefined, true);
 for (let i = 0; i < 2; i++) await pooled.request('/');
 expect((await pooled.request('/')).status).toBe(429);
 for (let i = 0; i < 5; i++) expect((await skipped.request('/')).status).toBe(200);
});
