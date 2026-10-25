import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Replace configuration before it can load a local .env or deployment keys.
    alias: [{
      find: /^\.\/env\.js$/,
      replacement: fileURLToPath(new URL('./tests/env.ts', import.meta.url)),
    }],
  },
  test: { setupFiles: [fileURLToPath(new URL('./tests/setup.ts', import.meta.url))] },
});
