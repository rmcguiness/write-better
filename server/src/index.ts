import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env, billingEnabled } from './env.js';

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Write Better backend on http://localhost:${info.port}  (billing: ${billingEnabled ? 'on' : 'off'})`);
});
