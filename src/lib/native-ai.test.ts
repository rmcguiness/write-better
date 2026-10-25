import { expect, it, vi } from 'vitest';
import { resolveAIConfig } from './ai';
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
it('preserves native managed mode and requires account credentials', () => {
  expect(resolveAIConfig({ aiMode: 'managed', backendUrl: 'https://managed.invalid', authToken: 'fake-token' }))
    .toEqual({ mode: 'managed', backendUrl: 'https://managed.invalid', token: 'fake-token' });
  expect(resolveAIConfig({ aiMode: 'managed' })).toBeNull();
});
