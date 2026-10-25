import { afterEach, beforeEach, vi } from 'vitest';

// Vitest aliases env.js to tests/env.ts, so deployment keys and .env are never loaded.
// SQLite is always isolated from the deployment database.
vi.hoisted(() => { process.env.DB_PATH = ':memory:'; });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network call'); }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
