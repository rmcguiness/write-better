import { expect, it, vi } from 'vitest';
import { resolveAIConfig } from './ai';
import { getAccount } from './api';
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
it('ignores persisted managed credentials in the static web demo', async () => {
  expect(resolveAIConfig({ aiMode: 'managed', backendUrl: 'https://managed.invalid', authToken: 'fake-token' })).toBeNull();
  await expect(getAccount('https://managed.invalid', 'fake-token')).rejects.toThrow('own API key only');
  expect(fetch).not.toHaveBeenCalled();
});
it('uses BYOK even when a legacy managed selection is persisted', () => {
  expect(resolveAIConfig({ aiMode: 'managed', apiKeys: { anthropic: 'sk-ant-fake-test' } })).toMatchObject({ mode: 'byok', apiKey: 'sk-ant-fake-test' });
});
